# teletty

Telegram Mini App — full terminal on your phone with multi-agent smart buttons (Claude Code, Codex, Gemini, Aider, Copilot, Goose, Crush) and voice input.

## Commands
- Start: `node server.js` (require BOT_TOKEN, ALLOWED_USER_IDS, SESSION_SECRET in `.env`)
- Dev: `npm run dev` (--watch)
- Test: `npm test`
- CLI: `npx teletty` or `node bin/teletty.js`

## Architecture
- `server.js` — Express + WebSocket, auth, voice, management API, per-tab agent dispatch
- `auth.js` — Telegram HMAC-SHA256, JWT (4h, IP-bound), whitelist
- `terminal-manager.js` — node-pty + tmux sessions, idle timeout, opt-in audit (AUDIT_LOG_DIR)
- `output-parser.js` — multi-agent prompt detector + dangerous-command heuristic
- `lib/agent-profiles.js` — per-agent regex + buttons + send strategy (`key+enter` / `key` / `enter`)
- `public/app.js` — xterm.js frontend, tabs, smart buttons, agent indicator, auto-approve, voice
- `public/index.html` — UI, Tokyo Night theme, CSP header

## Adding a new AI agent
1. Append a profile object to `PROFILES` in @lib/agent-profiles.js (id, label, detect regex, prompts[]).
2. `prompts[].send` controls how the click translates to keystrokes — `key+enter` (default), `key` (single keystroke, e.g. Crush), `enter` (just newline).
3. Add fixture-style tests to `test/output-parser.test.js`. Run `npm test`.

## Key rules
- NEVER hardcode secrets — all config via `.env` (see @.env.example)
- Auth uses `crypto.timingSafeEqual` — keep it that way
- PTY env is sanitized (only PATH, HOME, USER, SHELL, LANG, TERM) — don't leak secrets
- `userId` must be numeric (validated in terminal-manager.js) — prevents command injection
- initData has 5-minute freshness check — anti-replay protection
- `NODE_ENV=production` makes the server fail-fast on missing required env vars
- Audit logging is opt-in via AUDIT_LOG_DIR — captures terminal contents, treat as sensitive
- `/api/exec` is rate-limited and (when `MGMT_AUDIT_LOG` is set) audit-logged

## Deployment
- See @docs/AGENT-INSTALL-PROMPT.md for one-prompt server deployment
- Docker: `docker compose up -d` (see @Dockerfile and @docker-compose.yml — runs as non-root, tini-supervised)
- Requires: Node.js >= 20, tmux, HTTPS (Telegram requirement)

## Testing
- 52 tests: `npm test` (Node built-in test runner)
- Coverage: ANSI strip, generic prompts, every agent profile, danger flag patterns (rm -rf/-fr/-Rf/--recursive, find -delete, force-push, chmod 777, dd, fork bomb, sudo rm, plus negative cases), detectAgent, HMAC/JWT auth
