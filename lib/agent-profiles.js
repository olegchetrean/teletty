/**
 * Agent profiles for the multi-agent prompt parser.
 *
 * Each profile describes how one AI coding CLI renders interactive prompts
 * and how the frontend should answer when the user taps a smart button.
 *
 * Shape:
 *   id          – stable identifier
 *   label       – human-readable name
 *   detect      – regex that, if it matches the recent terminal output,
 *                 marks the active session as running this agent
 *   prompts[]   – list of prompt matchers, evaluated in order. First match wins.
 *     match     – regex against the last ~30 lines (ANSI-stripped)
 *     type      – 'confirm' | 'permission' | 'options'
 *     items     – buttons; each has { key, label }
 *     send      – 'key+enter' (default) | 'key' (single keystroke, no newline)
 *                 | 'enter'  (just Enter regardless of selection)
 *
 * The "generic" profile at the bottom is the fallback when no agent has been
 * detected yet — it covers vanilla apt/yarn/etc Y/n confirmations.
 */

const claudeCode = {
  id: 'claude-code',
  label: 'Claude Code',
  detect: /(claude(?:\s+code)?\s*[>$]|Welcome to Claude Code|❯\s+\d+\.\s+Yes(?:,)?(?:\s+(?:and|allow))?)/i,
  prompts: [
    {
      // Numbered selector with "❯ 1. Yes / 2. ... / 3. No"
      match: /(Do you want to (?:proceed|make this edit|allow|run)|Bash command:|Read file:|Edit file:|Write to:)/i,
      type: 'permission',
      items: [
        { key: '1', label: 'Yes' },
        { key: '2', label: 'Yes, allow session' },
        { key: '3', label: 'No' },
      ],
      send: 'key+enter',
    },
  ],
};

const codex = {
  id: 'codex',
  label: 'Codex CLI',
  detect: /(Codex wants to (?:run|edit|read|write)|Allow command\?|▌\s*(?:Yes|Always|No))/i,
  prompts: [
    {
      match: /(Codex wants to|Allow command\?|▌\s*Yes\s+Always\s+No)/i,
      type: 'permission',
      items: [
        { key: 'y', label: 'Yes' },
        { key: 'a', label: 'Always' },
        { key: 'n', label: 'No' },
      ],
      send: 'key+enter',
    },
  ],
};

const gemini = {
  id: 'gemini',
  label: 'Gemini CLI',
  detect: /(gemini-cli|Gemini\s+CLI|Apply this change\?|Yes,\s+allow\s+(?:once|always))/i,
  prompts: [
    {
      match: /(Apply this change\?|Run this command\?|1\.\s+Yes,\s+allow\s+once)/i,
      type: 'permission',
      items: [
        { key: '1', label: 'Yes once' },
        { key: '2', label: 'Yes always' },
        { key: '3', label: 'No' },
      ],
      send: 'key+enter',
    },
  ],
};

const aider = {
  id: 'aider',
  label: 'Aider',
  detect: /(aider\s+v?\d|aider\s*[>$]|^Aider\s)/im,
  prompts: [
    {
      // "Run shell command? (Y)es/(N)o/(D)on't ask again [Yes]:"
      match: /\((?:Y|y)\)es\/\((?:N|n)\)o(?:\/\((?:D|d)\)on)?/,
      type: 'permission',
      items: [
        { key: 'y', label: 'Yes' },
        { key: 'n', label: 'No' },
        { key: 'd', label: "Don't ask" },
      ],
      send: 'key+enter',
    },
    {
      match: /Apply edits\?\s*\[Y\/n\]/i,
      type: 'confirm',
      items: [
        { key: 'y', label: 'Apply' },
        { key: 'n', label: 'Skip' },
      ],
      send: 'key+enter',
    },
  ],
};

const copilot = {
  id: 'copilot',
  label: 'Copilot CLI',
  detect: /(GitHub Copilot|Allow Copilot to use the\s+\S+\s+tool|copilot\s+>\s)/i,
  prompts: [
    {
      match: /Allow Copilot to use the\s+\S+\s+tool/i,
      type: 'permission',
      items: [
        { key: '1', label: 'Yes' },
        { key: '2', label: 'Yes, session' },
        { key: '3', label: 'No' },
      ],
      send: 'key+enter',
    },
  ],
};

const goose = {
  id: 'goose',
  label: 'Goose',
  detect: /(Goose would like to call|goose\s+session|Block Goose)/i,
  prompts: [
    {
      match: /Goose would like to call.*Allow\?/is,
      type: 'permission',
      items: [
        { key: '1', label: 'Allow' },
        { key: '2', label: 'Always allow' },
        { key: '3', label: 'Deny' },
      ],
      send: 'key+enter',
    },
  ],
};

const crush = {
  id: 'crush',
  label: 'Crush',
  detect: /(Crush\s+by\s+Charm|\[a\]llow\s+\[d\]eny|crush\s+v?\d)/i,
  prompts: [
    {
      // Crush uses single-letter shortcuts, no Enter
      match: /\[a\]llow\s+\[d\]eny|\[A\]llow\s+all/,
      type: 'permission',
      items: [
        { key: 'a', label: 'Allow' },
        { key: 'A', label: 'Allow all' },
        { key: 'd', label: 'Deny' },
      ],
      send: 'key',
    },
  ],
};

const generic = {
  id: 'generic',
  label: 'Generic',
  detect: null,
  prompts: [
    {
      match: /^\s*(\d+)\)\s+\S/m,
      type: 'options',
      extract: (clean) => {
        const items = [];
        const re = /^\s*(\d+)\)\s+(.+)$/gm;
        let m;
        while ((m = re.exec(clean)) !== null) items.push({ key: m[1], label: m[2].trim() });
        return items.length >= 2 ? items : null;
      },
      send: 'key+enter',
    },
    {
      match: /^\s*([a-z])\)\s+\S/m,
      type: 'options',
      extract: (clean) => {
        const items = [];
        const re = /^\s*([a-z])\)\s+(.+)$/gm;
        let m;
        while ((m = re.exec(clean)) !== null) items.push({ key: m[1], label: m[2].trim() });
        return items.length >= 2 ? items : null;
      },
      send: 'key+enter',
    },
    {
      match: /\[Y\/n\]|\[y\/N\]|\(yes\/no\)/i,
      type: 'confirm',
      items: [
        { key: 'y', label: 'Yes' },
        { key: 'n', label: 'No' },
      ],
      send: 'key+enter',
    },
    {
      match: /\bAllow\b.*\bDeny\b/,
      type: 'permission',
      items: [
        { key: 'a', label: 'Allow' },
        { key: 'd', label: 'Deny' },
      ],
      send: 'key+enter',
    },
    {
      match: /press enter to continue/i,
      type: 'confirm',
      items: [{ key: '', label: 'Enter' }],
      send: 'enter',
    },
    {
      match: /(do you want to|would you like to)/i,
      type: 'confirm',
      items: [
        { key: 'y', label: 'Yes' },
        { key: 'n', label: 'No' },
      ],
      send: 'key+enter',
    },
  ],
};

const PROFILES = [claudeCode, codex, gemini, aider, copilot, goose, crush];

module.exports = { PROFILES, generic };
