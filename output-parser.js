/**
 * Multi-agent output parser for terminal prompts.
 *
 * Detects interactive prompts from popular AI coding CLIs (Claude Code, Codex,
 * Gemini, Aider, Copilot, Goose, Crush) and from generic shell prompts (Y/n,
 * numbered lists, Allow/Deny). Returns structured data the frontend uses to
 * render one-tap smart buttons.
 *
 * Per-agent behaviour lives in lib/agent-profiles.js.
 */

const { PROFILES, generic } = require('./lib/agent-profiles');

function stripAnsi(str) {
  return str
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b[()][AB012]/g, '');
}

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bTRUNCATE\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bchmod\s+-?R?\s*777\b/i,
  /\bchown\s+-R\b/i,
  /\bgit\s+push\s+(?:-f|--force)/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[fdx]/i,
  /\bgit\s+branch\s+-D\b/i,
  /\bnpm\s+publish\b/i,
  /\bcurl\s+[^|]*\|\s*(?:bash|sh|zsh)\b/i,
  /\bwget\s+[^|]*\|\s*(?:bash|sh)\b/i,
  /:\(\)\s*{\s*:\|:&\s*}/, // fork bomb
];

function isDangerous(text) {
  return DANGEROUS_PATTERNS.some((p) => p.test(text));
}

/**
 * Detect which agent is currently active in the recent terminal output.
 * Returns the profile id, or null if none detected.
 */
function detectAgent(rawOutput) {
  const clean = stripAnsi(rawOutput);
  for (const profile of PROFILES) {
    if (profile.detect && profile.detect.test(clean)) return profile.id;
  }
  return null;
}

function tryProfile(profile, clean, tail, dangerousFlag) {
  for (const matcher of profile.prompts) {
    if (!matcher.match.test(tail)) continue;
    const items = matcher.extract ? matcher.extract(clean) : matcher.items;
    if (!items || items.length === 0) continue;
    return {
      type: matcher.type,
      items,
      dangerous: dangerousFlag,
      send: matcher.send || 'key+enter',
      agent: profile.id,
    };
  }
  return null;
}

/**
 * Parse the recent terminal output and return a prompt descriptor, or null
 * if no interactive prompt is currently waiting for input.
 *
 * @param {string} rawOutput  – recent terminal bytes (with ANSI escapes)
 * @param {object} [opts]
 * @param {string} [opts.activeAgent] – id of the agent already detected for
 *        this session; takes priority over re-detection
 */
function parseOutput(rawOutput, opts = {}) {
  const clean = stripAnsi(rawOutput || '');
  const lines = clean.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return null;
  const tail = lines.slice(-30).join('\n');
  const danger = isDangerous(tail);

  // 1) If caller knows which agent owns this session, try it first.
  if (opts.activeAgent) {
    const profile = PROFILES.find((p) => p.id === opts.activeAgent);
    if (profile) {
      const hit = tryProfile(profile, clean, tail, danger);
      if (hit) return hit;
    }
  }

  // 2) Try to detect an agent from the recent output, then run its matchers.
  for (const profile of PROFILES) {
    if (!profile.detect || !profile.detect.test(clean)) continue;
    const hit = tryProfile(profile, clean, tail, danger);
    if (hit) return hit;
  }

  // 3) Fall back to generic shell-prompt patterns.
  return tryProfile(generic, clean, tail, danger);
}

module.exports = { parseOutput, stripAnsi, detectAgent, DANGEROUS_PATTERNS };
