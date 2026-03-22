require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');
const auth = require('./auth');
const terminalManager = require('./terminal-manager');
const { parseOutput } = require('./output-parser');

const PORT = parseInt(process.env.PORT || '7681', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ─── Management API ─────────────────────────────────────────────────────────
// Execute commands remotely via HTTPS (useful when SSH is down).
// Protected by MGMT_TOKEN. Disabled if MGMT_TOKEN is not set.
const { execSync } = require('child_process');
const MGMT_TOKEN = process.env.MGMT_TOKEN;

if (MGMT_TOKEN) {
  app.post('/api/exec', (req, res) => {
    const token = req.headers['x-mgmt-token'];
    if (token !== MGMT_TOKEN) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { command, timeout } = req.body;
    if (!command) return res.status(400).json({ error: 'Missing command' });
    try {
      const output = execSync(command, {
        timeout: Math.min(timeout || 30000, 120000),
        encoding: 'utf8',
        env: { ...process.env },
      });
      res.json({ output, exitCode: 0 });
    } catch (err) {
      res.json({ output: (err.stdout || '') + (err.stderr || ''), exitCode: err.status || 1, error: err.message });
    }
  });
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeSessions: terminalManager.getSessionCount(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Telegram Auth ───────────────────────────────────────────────────────────
app.post('/auth', (req, res) => {
  const { token, initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'Missing initData' });

  const tgData = auth.verifyTelegramInitData(initData);
  if (!tgData) return res.status(401).json({ error: 'Invalid Telegram data' });

  // Optional: verify JWT from /terminal bot command matches Telegram user
  if (token) {
    const jwtPayload = auth.verifyBotJWT(token);
    if (jwtPayload && String(jwtPayload.telegramId) !== String(tgData.telegramId)) {
      return res.status(401).json({ error: 'User mismatch' });
    }
  }

  if (!auth.isAllowed(tgData.telegramId)) return res.status(403).json({ error: 'Access denied' });

  const clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
  const sessionToken = auth.createSessionToken(String(tgData.telegramId), clientIp);
  res.json({ sessionToken });
});

// ─── Voice Transcription (optional) ─────────────────────────────────────────
// Server-side voice-to-text via Azure OpenAI Whisper.
// Falls back to browser Web Speech API if not configured.
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY;
const WHISPER_DEPLOYMENT = process.env.WHISPER_DEPLOYMENT || 'whisper';
const VOICE_LANGUAGE = process.env.VOICE_LANGUAGE || 'en';

if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_KEY) {
  app.post('/voice/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No audio file' });

    try {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', req.file.buffer, { filename: 'voice.webm', contentType: req.file.mimetype || 'audio/webm' });
      form.append('language', VOICE_LANGUAGE);

      const resp = await fetch(
        `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${WHISPER_DEPLOYMENT}/audio/transcriptions?api-version=2025-03-01-preview`,
        {
          method: 'POST',
          headers: { 'api-key': AZURE_OPENAI_KEY, ...form.getHeaders() },
          body: form,
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`[Voice] Whisper error ${resp.status}: ${err.slice(0, 200)}`);
        return res.status(resp.status).json({ error: `Whisper error: ${resp.status}` });
      }

      const data = await resp.json();
      console.log(`[Voice] Transcribed: "${(data.text || '').slice(0, 50)}..." (${req.file.size} bytes)`);
      res.json({ text: data.text || '' });
    } catch (e) {
      console.error(`[Voice] Error: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });
  console.log(`[terminal-server] Voice transcription enabled (${WHISPER_DEPLOYMENT})`);
} else {
  // Return 404 so the client falls back to Web Speech API
  app.post('/voice/transcribe', (req, res) => {
    res.status(404).json({ error: 'Voice transcription not configured. Using browser speech API.' });
  });
}

// ─── WebSocket ───────────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  if (ALLOWED_ORIGINS.length > 0 && origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.log(`[ws] Rejected origin: ${origin}`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  const { query } = url.parse(request.url, true);
  const clientIp = request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  const payload = auth.verifySessionToken(query.session, clientIp);

  if (!payload) {
    console.log('[ws] Auth failed');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  request.telegramId = payload.telegramId;
  request.tabId = query.tab || 'main';

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  const { telegramId, tabId } = request;
  console.log(`[ws] Connected: user=${telegramId}, tab=${tabId}`);

  let ptyProcess;
  try {
    ptyProcess = terminalManager.createSession(telegramId, tabId);
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
    ws.close();
    return;
  }

  let outputBuffer = '';
  let parseTimer = null;

  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
      outputBuffer += data;
      if (outputBuffer.length > 5000) outputBuffer = outputBuffer.slice(-3000);
      clearTimeout(parseTimer);
      parseTimer = setTimeout(() => {
        const parsed = parseOutput(outputBuffer);
        if (parsed) ws.send(JSON.stringify({ type: 'prompt', ...parsed }));
      }, 300);
    }
  });

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'input' && typeof data.data === 'string') {
        ptyProcess.write(data.data);
        terminalManager.touchSession(telegramId, tabId);
        outputBuffer = '';
      }
      if (data.type === 'resize' && data.cols && data.rows) {
        terminalManager.resizeSession(telegramId, tabId, data.cols, data.rows);
      }
    } catch {}
  });

  ws.on('close', () => {
    console.log(`[ws] Disconnected: user=${telegramId}, tab=${tabId}`);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  teletty v1.0.0`);
  console.log(`  http://127.0.0.1:${PORT}`);
  if (ALLOWED_ORIGINS.length > 0) {
    console.log(`  Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  } else {
    console.log(`  WARNING: No ALLOWED_ORIGINS set`);
  }
  console.log('');
});
