# AGENTS.md — instructions for AI coding agents

This file follows the [agents.md](https://agents.md) convention. Codex CLI, OpenCode, Aider, Cursor agent and other tools that read AGENTS.md will pick up these conventions automatically. The same content lives in `CLAUDE.md` (for Claude Code) and `GEMINI.md` (for Gemini CLI).

## Project: teletty

Telegram Mini App that wraps a tmux terminal and renders smart buttons when popular AI coding CLIs ask for permission. Supports Claude Code, Codex CLI, Gemini CLI, Aider, Copilot CLI, Goose, and Crush.

## Setup

```bash
npm install
cp .env.example .env   # fill BOT_TOKEN, ALLOWED_USER_IDS, SESSION_SECRET
npm test
```

`NODE_ENV=production` makes the server fail-fast if any required env var is missing.

## Code map

| File                        | Purpose                                                                                   |
|-----------------------------|-------------------------------------------------------------------------------------------|
| `server.js`                 | Express + WebSocket entry point, auth, voice, /api/exec, per-WS agent dispatch            |
| `auth.js`                   | Telegram HMAC-SHA256 + IP-bound JWT sessions                                              |
| `terminal-manager.js`       | node-pty + tmux session lifecycle, idle timeout, opt-in audit logging (AUDIT_LOG_DIR)     |
| `output-parser.js`          | Multi-agent prompt detector + dangerous-command heuristic                                 |
| `lib/agent-profiles.js`     | Per-agent regex + button mappings + send strategy (`key+enter` / `key` / `enter`)         |
| `public/app.js`             | Frontend: xterm.js, tabs, smart buttons, agent indicator, auto-approve, voice             |
| `public/index.html`         | UI layout (Tokyo Night), CSP header                                                       |
| `bin/teletty.js`            | `npx teletty` / `npx teletty init` CLI                                                    |
| `test/*.test.js`            | Node built-in test runner (`node --test`)                                                 |

## Coding conventions

- Plain Node.js + browser JS. Zero build step. No transpilation. Keep it that way.
- No frameworks on the frontend (no React, no Tailwind, no bundler).
- CommonJS on the server. ES modules only inside `<script>` if absolutely needed.
- Comments only when intent isn't obvious from the code.
- All secrets come from `.env`. Never hardcode tokens.
- Use `crypto.timingSafeEqual` for any token comparison.

## Adding a new AI coding agent to the parser

1. Append a profile to `PROFILES` in `lib/agent-profiles.js`:
   ```js
   {
     id: 'foo',
     label: 'Foo CLI',
     detect: /Foo CLI v\d|foo\s+>\s/,         // matches recent output
     prompts: [{
       match:  /Apply this change\? \[Y\/n\]/i,
       type:   'permission',                   // 'confirm' | 'permission' | 'options'
       items:  [{ key: 'y', label: 'Yes' }, { key: 'n', label: 'No' }],
       send:   'key+enter',                    // 'key+enter' | 'key' | 'enter'
     }],
   }
   ```
2. Add fixture-style tests in `test/output-parser.test.js`. The fixtures should be realistic: include the agent banner / prompt as it actually appears in a terminal, plus an `it('returns null for unrelated output')` negative case.
3. `npm test` — must keep the suite green (currently 52 tests).
4. Update the supported-agent table in `README.md`.

## Verification before claiming done

- `npm test` — all 52 tests must pass.
- `BOT_TOKEN=test ALLOWED_USER_IDS=1 SESSION_SECRET=$(openssl rand -hex 32) PORT=17681 node server.js` then `curl localhost:17681/health` returns `{"status":"ok",...}`.
- For frontend changes: visually verify the agent indicator pill in the status bar lights up when running the agent in question. The fallback page (when opened outside Telegram) must still load.

## Things to leave alone

- The 7 security layers in `auth.js` and `server.js`. Don't relax HMAC checks, IP binding, freshness window, rate limits, or PTY env sanitization.
- The dangerous-command heuristic. If you add a pattern, add it; don't loosen existing ones.
- The single-process / no-build-step architecture. Don't introduce webpack/vite/typescript.
