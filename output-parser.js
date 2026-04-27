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
  // Recursive delete in any flag order: rm -rf, -fr, -Rf, -fR, -r -f, --recursive --force
  /\brm\s+(?:-[a-zA-Z]*[rRfF][a-zA-Z]*\b|--(?:recursive|force)\b)(?:\s+(?:-[a-zA-Z]*[rRfF][a-zA-Z]*\b|--(?:recursive|force)\b))*/i,
  // find … -delete / -exec rm
  /\bfind\s+\S+.*-(?:delete|exec\s+rm)\b/i,
  // Destructive SQL
  /\bDROP\s+(?:TABLE|DATABASE|SCHEMA|INDEX|VIEW)\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bTRUNCATE\s+(?:TABLE\s+)?\w/i,
  // Power / boot
  /\b(?:shutdown|halt|poweroff|reboot|init\s+0|init\s+6)\b/i,
  // Block-device wipes
  /\bmkfs(?:\.\w+)?\b/i,
  /\bdd\s+(?:if|of)=/i,
  />\s*\/dev\/(?:sd[a-z]|nvme|hd[a-z]|disk\d|null\s*;\s*rm)/i,
  // Permission / ownership chaos
  /\bchmod\s+-?R?\s*0?[67]77\b/i,
  /\bchown\s+-R\b/i,
  // Git foot-guns
  /\bgit\s+push\s+(?:-f|--force|--force-with-lease)/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[fdx]/i,
  /\bgit\s+branch\s+-D\b/i,
  // Package publishing / supply-chain
  /\bnpm\s+publish\b/i,
  /\bnpm\s+unpublish\b/i,
  // Pipe-to-shell from network
  /\b(?:curl|wget|fetch)\s+[^|;]*\|\s*(?:bash|sh|zsh|ksh|fish)\b/i,
  // Classic fork bomb
  /:\s*\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;?\s*:/,
  // sudo + any of the above passes through (bare `sudo` alone is fine)
  /\bsudo\s+(?:rm|mkfs|dd|shutdown|reboot|chmod\s+777|chown\s+-R)\b/i,
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
