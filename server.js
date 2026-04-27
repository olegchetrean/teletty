require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const auth = require('./auth');
const terminalManager = require('./terminal-manager');
const { parseOutput, detectAgent } = require('./output-parser');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const PORT = parseInt(process.env.PORT || '7681', 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Fail-fast in production ────────────────────────────────────────────────
if (NODE_ENV === 'production') {
  const missing = [];
  if (!process.env.BOT_TOKEN) missing.push('BOT_TOKEN');
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!process.env.ALLOWED_USER_IDS) missing.push('ALLOWED_USER_IDS');
  if (missing.length) {
    console.error(`[teletty] Missing required env in production: ${missing.join(', ')}`);
    process.exit(1);
  }
} else {
  if (!process.env.BOT_TOKEN) console.warn('[teletty] WARNING: BOT_TOKEN not set — Telegram auth will fail');
  if (!process.env.SESSION_SECRET) console.warn('[teletty] WARNING: SESSION_SECRET not set — sessions will reset on restart');
  if (!process.env.ALLOWED_USER_IDS) console.warn('[teletty] WARNING: ALLOWED_USER_IDS empty — no users will be authorized');
}

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(express.static('public'));

// ─── Generic IP-bucket rate limiter ─────────────────────────────────────────
function makeRateLimiter(max, windowMs) {
  const buckets = new Map();
  const t = setInterval(() => buckets.clear(), windowMs);
  if (t.unref) t.unref();
  return function (req, res, next) {
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
    const count = (buckets.get(ip) || 0) + 1;
    buckets.set(ip, count);
    if (count > max) return res.status(429).json({ error: 'Too many attempts' });
    next();
  };
}

const authLimiter = makeRateLimiter(10, 60_000);
const execLimiter = makeRateLimiter(20, 60_000);

// ─── Management API ─────────────────────────────────────────────────────────
// Execute commands remotely via HTTPS (useful when SSH is down).
// Protected by MGMT_TOKEN. Disabled if MGMT_TOKEN is not set.
const { execSync } = require('child_process');
const crypto = require('crypto');
const MGMT_TOKEN = process.env.MGMT_TOKEN;
const MGMT_AUDIT_LOG = process.env.MGMT_AUDIT_LOG;

if (MGMT_TOKEN) {
  app.post('/api/exec', execLimiter, (req, res) => {
    const token = req.headers['x-mgmt-token'] || '';
    try {
      if (token.length !== MGMT_TOKEN.length ||
          !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(MGMT_TOKEN))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { command, timeout } = req.body || {};
    if (!command || typeof command !== 'string') return res.status(400).json({ error: 'Missing command' });

    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
    if (MGMT_AUDIT_LOG) {
      try {
        fs.appendFileSync(MGMT_AUDIT_LOG,
          `${new Date().toISOString()}\t${ip}\t${command.replace(/\n/g, '\\n').slice(0, 500)}\n`);
      } catch {}
    }

    try {
      const output = execSync(command, {
        timeout: Math.min(timeout || 30000, 120000),
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env },
      });
      res.json({ output, exitCode: 0 });
    } catch (err) {
      res.json({
        output: (err.stdout || '') + (err.stderr || ''),
        exitCode: err.status || 1,
        error: err.message,
      });
    }
  });
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    uptime: process.uptime(),
    activeSessions: terminalManager.getSessionCount(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Telegram Auth ───────────────────────────────────────────────────────────
// Path A — Mini App initData (the primary path; HMAC signed by Telegram with
// HMAC("WebAppData", BOT_TOKEN)).
app.post('/auth', authLimiter, (req, res) => {
  const { token, initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'Missing initData' });

  const tgData = auth.verifyTelegramInitData(initData);
  if (!tgData) return res.status(401).json({ error: 'Invalid Telegram data' });

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

// Path B — Telegram Login Widget (for desktop browsers outside Telegram).
// Enabled only when LOGIN_WIDGET_BOT is set to the bot's @username (without @).
// Server verifies HMAC with key = SHA256(BOT_TOKEN), then the same whitelist +
// IP-bound JWT issued for the Mini App path.
const LOGIN_WIDGET_BOT = (process.env.LOGIN_WIDGET_BOT || '').replace(/^@/, '').trim();

app.get('/auth/config', (req, res) => {
  res.json({ loginWidgetBot: LOGIN_WIDGET_BOT || null });
});

if (LOGIN_WIDGET_BOT) {
  app.post('/auth/login', authLimiter, (req, res) => {
    const tgData = auth.verifyTelegramLogin(req.body || {});
    if (!tgData) return res.status(401).json({ error: 'Invalid Telegram login data' });
    if (!auth.isAllowed(tgData.telegramId)) return res.status(403).json({ error: 'Access denied' });
    const clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
    const sessionToken = auth.createSessionToken(String(tgData.telegramId), clientIp);
    res.json({ sessionToken });
  });
  console.log(`[teletty] Telegram Login Widget enabled for @${LOGIN_WIDGET_BOT}`);
}

// ─── Voice Transcription (optional) ─────────────────────────────────────────
// Server-side voice-to-text via Azure OpenAI Whisper.
// Falls back to browser Web Speech API if not configured.
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY;
const WHISPER_DEPLOYMENT = process.env.WHISPER_DEPLOYMENT || 'whisper';
const VOICE_LANGUAGE = process.env.VOICE_LANGUAGE || 'en';

if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_KEY) {
  app.post('/voice/transcribe', upload.single('audio'), async (req, res) => {
    const sessionToken = req.headers['x-session-token'];
    const clientIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
    if (!sessionToken || !auth.verifySessionToken(sessionToken, clientIp)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!req.file) return res.status(400).json({ error: 'No audio file' });

    try {
      const form = new FormData();
      form.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' }), 'voice.webm');
      form.append('language', VOICE_LANGUAGE);

      const resp = await fetch(
        `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${WHISPER_DEPLOYMENT}/audio/transcriptions?api-version=2025-03-01-preview`,
        {
          method: 'POST',
          headers: { 'api-key': AZURE_OPENAI_KEY },
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
  console.log(`[teletty] Voice transcription enabled (${WHISPER_DEPLOYMENT})`);
} else {
  app.post('/voice/transcribe', (req, res) => {
    res.status(404).json({ error: 'Voice transcription not configured. Using browser speech API.' });
  });
}

// ─── Client Config ──────────────────────────────────────────────────────────
app.get('/config', (req, res) => {
  res.json({ voiceLanguage: VOICE_LANGUAGE, version: VERSION });
});

// ─── WebSocket ───────────────────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 256 * 1024, // hard cap on per-frame size; terminal input is tiny
});

server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  if (ALLOWED_ORIGINS.length > 0 && origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.log(`[ws] Rejected origin: ${origin}`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  const reqUrl = new URL(request.url, 'http://localhost');
  const sessionParam = reqUrl.searchParams.get('session') || '';
  const tabParam = reqUrl.searchParams.get('tab') || 'main';
  const clientIp = request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.socket.remoteAddress;
  const payload = auth.verifySessionToken(sessionParam, clientIp);

  if (!payload) {
    console.log('[ws] Auth failed');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  request.telegramId = payload.telegramId;
  request.tabId = tabParam;

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
  let activeAgent = null;

  ptyProcess.onData((data) => {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: 'output', data }));
    outputBuffer += data;
    if (outputBuffer.length > 8000) outputBuffer = outputBuffer.slice(-6000);

    // Re-check agent identity opportunistically
    const detected = detectAgent(outputBuffer);
    if (detected && detected !== activeAgent) {
      activeAgent = detected;
      ws.send(JSON.stringify({ type: 'agent', id: activeAgent }));
    }

    clearTimeout(parseTimer);
    parseTimer = setTimeout(() => {
      const parsed = parseOutput(outputBuffer, { activeAgent });
      if (parsed) ws.send(JSON.stringify({ type: 'prompt', ...parsed }));
    }, 300);
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
  console.log(`\n  teletty v${VERSION}`);
  console.log(`  http://127.0.0.1:${PORT}`);
  if (ALLOWED_ORIGINS.length > 0) {
    console.log(`  Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  } else {
    console.log(`  WARNING: No ALLOWED_ORIGINS set — accepting any origin`);
  }
  console.log('');
});
