const pty = require('node-pty');
const { execSync } = require('child_process');

const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '4', 10);
const IDLE_TIMEOUT_MS = parseInt(process.env.IDLE_TIMEOUT_MINUTES || '30', 10) * 60 * 1000;
const SHELL_CWD = process.env.SHELL_CWD || process.env.HOME || '/root';
const TAB_ID_REGEX = /^[a-zA-Z0-9_-]{1,20}$/;

const sessions = new Map();

function createSession(userId, tabId) {
  if (!/^\d+$/.test(userId)) throw new Error(`Invalid userId: ${userId}`);
  if (!TAB_ID_REGEX.test(tabId)) throw new Error(`Invalid tabId: ${tabId}`);
  const userSessions = getActiveSessions(userId);
  if (userSessions.length >= MAX_SESSIONS) throw new Error(`Max ${MAX_SESSIONS} sessions reached`);

  const key = `${userId}:${tabId}`;
  if (sessions.has(key)) return sessions.get(key).pty;

  const tmuxSession = `term-${userId}-${tabId}`;

  // Parse shell command from env or default to tmux
  const shellCmd = process.env.SHELL_COMMAND || 'tmux';
  const shellArgs = process.env.SHELL_ARGS
    ? process.env.SHELL_ARGS.split(',').map(a => a === '{session}' ? tmuxSession : a)
    : ['new-session', '-A', '-s', tmuxSession];

  const shell = pty.spawn(shellCmd, shellArgs, {
    name: 'xterm-256color',
    cols: 120,
    rows: 40,
    cwd: SHELL_CWD,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME || '/root',
      USER: process.env.USER || 'root',
      SHELL: process.env.SHELL || '/bin/bash',
      LANG: process.env.LANG || 'en_US.UTF-8',
      TERM: 'xterm-256color',
    },
  });

  // Enable audit logging via tmux pipe-pane (optional, fails silently)
  setTimeout(() => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logDir = '/var/log/terminal-sessions';
      execSync(`mkdir -p ${logDir} 2>/dev/null`, { timeout: 2000 });
      const logFile = `${logDir}/${userId}-${timestamp}.log`;
      execSync(`tmux pipe-pane -t "${tmuxSession}" -o 'cat >> ${logFile}'`, { timeout: 5000 });
    } catch {
      // Audit logging is optional — don't fail if tmux pipe-pane doesn't work
    }
  }, 1000);

  const session = { pty: shell, userId, tabId, tmuxSession, lastActivity: Date.now(), idleTimer: null };
  resetIdleTimer(session, key);
  sessions.set(key, session);
  shell.onExit(() => cleanup(key));
  return shell;
}

function killSession(userId, tabId) {
  const key = `${userId}:${tabId}`;
  const session = sessions.get(key);
  if (!session) return false;
  try { session.pty.kill(); } catch {}
  try { execSync(`tmux kill-session -t "${session.tmuxSession}" 2>/dev/null`); } catch {}
  cleanup(key);
  return true;
}

function getActiveSessions(userId) {
  const result = [];
  for (const [, session] of sessions) {
    if (session.userId === userId) result.push({ tabId: session.tabId });
  }
  return result;
}

function touchSession(userId, tabId) {
  const key = `${userId}:${tabId}`;
  const session = sessions.get(key);
  if (session) { session.lastActivity = Date.now(); resetIdleTimer(session, key); }
}

function resizeSession(userId, tabId, cols, rows) {
  const key = `${userId}:${tabId}`;
  const session = sessions.get(key);
  if (session) session.pty.resize(Math.max(cols, 10), Math.max(rows, 5));
}

function getSessionCount() { return sessions.size; }

function resetIdleTimer(session, key) {
  if (session.idleTimer) clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => {
    console.log(`[terminal-manager] Idle timeout for ${key}`);
    killSession(session.userId, session.tabId);
  }, IDLE_TIMEOUT_MS);
}

function cleanup(key) {
  const session = sessions.get(key);
  if (session) { if (session.idleTimer) clearTimeout(session.idleTimer); sessions.delete(key); }
}

module.exports = { createSession, killSession, getActiveSessions, touchSession, resizeSession, getSessionCount };
