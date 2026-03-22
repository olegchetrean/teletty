(function () {
  'use strict';

  const state = {
    sessionToken: null,
    activeTab: 'main',
    tabs: {},
    autoApprove: false,
    autoApproveTimer: null,
    autoApproveState: 'off',
    voiceRecording: false,
  };

  const AUTO_APPROVE_TIMEOUT = 10 * 60 * 1000;
  const WS_BASE = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_URL = `${WS_BASE}//${location.host}/ws`;

  async function authenticate() {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      showAuthError('Access denied. Open from Telegram.');
      return false;
    }
    try {
      const body = { initData: tg.initData };
      if (token) body.token = token;
      const resp = await fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showAuthError(err.error || `Authentication error (${resp.status})`);
        return false;
      }
      const data = await resp.json();
      state.sessionToken = data.sessionToken;
      history.replaceState(null, '', location.pathname);
      return true;
    } catch (e) {
      showAuthError('Server connection error');
      return false;
    }
  }

  function showAuthError(msg) {
    const overlay = document.getElementById('authOverlay');
    overlay.textContent = '';
    const div = document.createElement('div');
    div.className = 'auth-error';
    div.textContent = msg;
    overlay.appendChild(div);
  }

  function createTerminal(tabId) {
    const container = document.createElement('div');
    container.className = 'terminal-wrapper' + (tabId === state.activeTab ? ' active' : '');
    container.id = `term-${tabId}`;
    document.getElementById('terminalContainer').appendChild(container);

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
      theme: {
        background: '#1a1b26', foreground: '#c0caf5', cursor: '#c0caf5',
        selectionBackground: '#33467c',
        black: '#15161e', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68',
        blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#a9b1d6',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    try { terminal.loadAddon(new WebglAddon.WebglAddon()); } catch (e) {}
    fitAddon.fit();

    const ws = connectWS(tabId, terminal, fitAddon);
    state.tabs[tabId] = { terminal, fitAddon, ws, container };

    const ro = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }));
    });
    ro.observe(container);

    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', data }));
    });

    return state.tabs[tabId];
  }

  function connectWS(tabId, terminal, fitAddon, retries = 0) {
    const wsUrl = `${WS_URL}?session=${encodeURIComponent(state.sessionToken)}&tab=${encodeURIComponent(tabId)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      updateStatus(true);
      retries = 0;
      fitAddon.fit();
      ws.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') terminal.write(msg.data);
        if (msg.type === 'prompt') handlePrompt(msg, tabId);
        if (msg.type === 'error') terminal.write(`\r\n\x1b[31mError: ${msg.message}\x1b[0m\r\n`);
      } catch {}
    };

    ws.onclose = () => {
      updateStatus(false);
      const delays = [1000, 3000, 10000];
      if (retries < delays.length) {
        setTimeout(() => {
          if (state.tabs[tabId]) state.tabs[tabId].ws = connectWS(tabId, terminal, fitAddon, retries + 1);
        }, delays[retries]);
      } else {
        terminal.write('\r\n\x1b[31mReconnect failed. Tap terminal to retry.\x1b[0m\r\n');
        terminal.textarea?.addEventListener('focus', () => {
          if (state.tabs[tabId]?.ws?.readyState !== WebSocket.OPEN) state.tabs[tabId].ws = connectWS(tabId, terminal, fitAddon, 0);
        }, { once: true });
      }
    };
    ws.onerror = () => {};
    return ws;
  }

  function handlePrompt(prompt, tabId) {
    const container = document.getElementById('smartButtons');
    if (state.autoApproveState === 'active' && !prompt.dangerous) {
      if (prompt.type === 'confirm' || prompt.type === 'permission') {
        sendInput(tabId, (prompt.items[0]?.key || 'Y') + '\n');
        return;
      }
    }
    container.innerHTML = '';
    prompt.items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'smart-btn' + (prompt.dangerous ? ' danger' : '');
      btn.textContent = item.label || item.key;
      btn.addEventListener('click', () => { sendInput(tabId, item.key + '\n'); container.classList.remove('visible'); });
      container.appendChild(btn);
    });
    container.classList.add('visible');
  }

  function sendInput(tabId, data) {
    const tab = state.tabs[tabId];
    if (tab?.ws?.readyState === WebSocket.OPEN) tab.ws.send(JSON.stringify({ type: 'input', data }));
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    document.querySelectorAll('.terminal-wrapper').forEach(w => w.classList.toggle('active', w.id === `term-${tabId}`));
    state.tabs[tabId]?.fitAddon?.fit();
    state.tabs[tabId]?.terminal?.focus();
    document.getElementById('smartButtons').classList.remove('visible');
  }

  function addTab() {
    const existing = Object.keys(state.tabs);
    if (existing.length >= 4) return;
    const tabId = `tab-${Date.now()}`;
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tab = tabId;
    tabEl.innerHTML = `${existing.length + 1} <span class="close" data-close="${tabId}">&times;</span>`;
    document.getElementById('addTab').before(tabEl);
    createTerminal(tabId);
    switchTab(tabId);
  }

  function closeTab(tabId) {
    if (tabId === 'main' && Object.keys(state.tabs).length === 1) return;
    const tab = state.tabs[tabId];
    if (tab) { tab.ws?.close(); tab.terminal?.dispose(); tab.container?.remove(); delete state.tabs[tabId]; }
    document.querySelector(`.tab[data-tab="${tabId}"]`)?.remove();
    if (state.activeTab === tabId) switchTab(Object.keys(state.tabs)[0] || 'main');
  }

  function setupControls() {
    const send = (data) => sendInput(state.activeTab, data);
    document.getElementById('btnUp').addEventListener('click', () => send('\x1b[A'));
    document.getElementById('btnDown').addEventListener('click', () => send('\x1b[B'));
    document.getElementById('btnTab').addEventListener('click', () => send('\t'));
    document.getElementById('btnEsc').addEventListener('click', () => send('\x1b'));
    document.getElementById('btnCtrlC').addEventListener('click', () => send('\x03'));

    document.getElementById('btnAutoApprove').addEventListener('click', () => {
      const btn = document.getElementById('btnAutoApprove');
      if (state.autoApproveState === 'off') {
        state.autoApproveState = 'confirming';
        btn.classList.add('confirming');
        btn.textContent = '\u26A1 Confirm?';
      } else if (state.autoApproveState === 'confirming') {
        state.autoApproveState = 'active';
        btn.classList.remove('confirming');
        btn.classList.add('active');
        btn.textContent = '\u26A1 ON';
        state.autoApproveTimer = setTimeout(disableAutoApprove, AUTO_APPROVE_TIMEOUT);
      } else {
        disableAutoApprove();
      }
    });

    document.getElementById('tabBar').addEventListener('click', (e) => {
      const close = e.target.dataset?.close;
      if (close) { closeTab(close); return; }
      const tab = e.target.closest('.tab');
      if (tab?.dataset?.tab) switchTab(tab.dataset.tab);
    });
    document.getElementById('addTab').addEventListener('click', addTab);
  }

  function disableAutoApprove() {
    state.autoApproveState = 'off';
    clearTimeout(state.autoApproveTimer);
    const btn = document.getElementById('btnAutoApprove');
    btn.classList.remove('active', 'confirming');
    btn.textContent = '\u26A1 Auto';
  }

  function setupVoice() {
    const btn = document.getElementById('btnVoice');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btn.addEventListener('click', () => {
        if (!state.voiceRecording) startWhisperRecording(btn);
        else stopWhisperRecording(btn);
      });
      return;
    }
    let recognition = null;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); startSpeech(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); stopSpeech(); });
    btn.addEventListener('mousedown', startSpeech);
    btn.addEventListener('mouseup', stopSpeech);
    function startSpeech() {
      recognition = new SpeechRecognition();
      recognition.lang = state.voiceLanguage || 'en';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => sendInput(state.activeTab, event.results[0][0].transcript);
      recognition.onerror = () => btn.classList.remove('recording');
      recognition.onend = () => btn.classList.remove('recording');
      recognition.start();
      btn.classList.add('recording');
    }
    function stopSpeech() { if (recognition) { recognition.stop(); recognition = null; } }
  }

  let mediaRecorder = null;
  let audioChunks = [];
  function startWhisperRecording(btn) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => sendToWhisper(btn);
      mediaRecorder.start();
      state.voiceRecording = true;
      btn.classList.add('recording');
    }).catch(() => {});
  }
  function stopWhisperRecording(btn) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') { mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t => t.stop()); }
    state.voiceRecording = false;
    btn.classList.remove('recording');
  }
  async function sendToWhisper(btn) {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');
    try {
      btn.textContent = '...';
      const resp = await fetch('/voice/transcribe', {
        method: 'POST',
        headers: { 'X-Session-Token': state.sessionToken },
        body: formData,
      });
      const data = await resp.json();
      if (data.text) sendInput(state.activeTab, data.text);
    } catch (e) {
      console.error('Voice transcription error:', e);
    } finally {
      btn.textContent = '\uD83C\uDFA4';
    }
  }

  function updateStatus(connected) {
    document.getElementById('statusDot').classList.toggle('disconnected', !connected);
    document.getElementById('statusText').textContent = connected ? 'Connected' : 'Disconnected...';
  }

  async function init() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.setHeaderColor('#16161e');
      tg.setBackgroundColor('#1a1b26');
      if (tg.colorScheme === 'light') document.body.classList.add('light');
    }
    const ok = await authenticate();
    if (!ok) return;
    document.getElementById('authOverlay').classList.add('hidden');

    // Fetch server config
    try {
      const cfgResp = await fetch('/config');
      if (cfgResp.ok) {
        const cfg = await cfgResp.json();
        state.voiceLanguage = cfg.voiceLanguage || 'en';
      }
    } catch {}

    createTerminal('main');
    setupControls();
    setupVoice();
    document.getElementById('terminalContainer').addEventListener('click', () => tg?.expand(), { once: true });
  }

  init();
})();
