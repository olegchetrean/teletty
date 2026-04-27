# teletty

**A full terminal in your pocket, via Telegram.**

[![ci](https://github.com/olegchetrean/teletty/actions/workflows/ci.yml/badge.svg)](https://github.com/olegchetrean/teletty/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/teletty.svg)](https://www.npmjs.com/package/teletty)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

Access any server from your phone using a Telegram Mini App. Smart buttons for interactive prompts, multi-agent CLI integration (Claude Code, Codex, Gemini, Aider, Copilot, Goose, Crush), voice input, multi-tab tmux sessions — no SSH app needed.

```
$ claude "fix the login bug"
  Reading src/auth.js...
  Editing src/auth.js...

  Allow Edit tool?  [Allow]  [Deny]     <-- smart buttons appear
```

## Features

- **Multi-agent smart buttons** — auto-detects prompts from **Claude Code, OpenAI Codex CLI, Gemini CLI, Aider, GitHub Copilot CLI, Goose, Crush**, plus generic shell prompts (Y/n, numbered options, Allow/Deny)
- **Per-agent send strategy** — knows which CLIs need `Enter` after a digit, which want a single keystroke (Crush), which use `1/2/3` (Claude/Gemini/Copilot) vs `Y/N/D` (Aider)
- **Auto-approve mode** — automatically accepts safe prompts; danger heuristic blocks `rm -rf`, SQL `DROP/DELETE/TRUNCATE`, `git push --force`, `git reset --hard`, `chmod 777`, `curl ... | sh`, fork bombs
- **Multi-tab** — up to 4 concurrent tmux sessions that survive disconnects
- **Voice input** — push-to-talk via Web Speech API, with optional Azure Whisper fallback
- **Telegram-native auth** — HMAC-SHA256 verification, user ID whitelist, IP-bound JWT sessions
- **Management API** — execute commands via HTTPS when SSH is down (rate-limited, audit-logged)
- **Mobile controls** — buttons for arrow keys, Tab, Esc, Ctrl+C
- **Tokyo Night theme** — dark theme, optimized for mobile screens
- **Zero frameworks, zero build step** — plain JS + xterm.js

## Quick Start (5 minutes, no domain, no DNS)

You need a Linux/macOS box, Node.js 20+, and tmux. That's it.

```bash
# 1) Bot token  — open Telegram, message @BotFather → /newbot → copy the token
# 2) Your id    — message @userinfobot → copy the number it replies with

# 3) Set up — interactive, takes ~30 seconds:
npx teletty init       # asks for the two values above, writes ./.env
npx teletty            # starts the server on 127.0.0.1:7681

# 4) In a second terminal, expose it via Cloudflare Tunnel (instant free HTTPS):
npx teletty tunnel     # prints the public URL with copy-paste BotFather steps

# 5) Paste the printed URL into BotFather → /mybots → your bot →
#    Bot Settings → Menu Button. Button text: Terminal.
```

Open your bot in Telegram, tap the **Terminal** button. Done.

If anything is off, run `npx teletty doctor` — it checks Node version, your `.env`, the `BOT_TOKEN` format, ports, tmux, and everything else.

> No domain? Stop here, you're done. Cloudflare Tunnel handed you a free HTTPS URL.
> Want a stable URL on your own domain? See [Custom domain](#custom-domain-optional) at the bottom — entirely optional.

### Need help? Let an AI agent do it for you

If you have Claude Code, Codex, Aider, Cursor, Copilot CLI, Gemini CLI, Goose, Crush, or any other AI coding agent SSH'd into your server, paste [docs/AGENT-INSTALL-PROMPT.md](docs/AGENT-INSTALL-PROMPT.md) into it. The agent will handle everything — Node.js, tmux, clone, `.env`, Cloudflare Tunnel, systemd, verification. You only provide the bot token and your Telegram user id.

### Docker (instead of npx)

```bash
git clone https://github.com/olegchetrean/teletty.git && cd teletty
cp .env.example .env && nano .env
docker compose up -d
# Then expose the container with cloudflared as in step 4 above.
```

## How It Works

```
Telegram (tap Menu Button)
  -> Mini App WebView loads
  -> POST /auth (HMAC-SHA256 verification + whitelist check)
  -> WebSocket connection established
  -> node-pty spawns tmux session
  -> xterm.js renders terminal output
  -> output-parser detects active agent + prompts -> smart buttons appear
```

## Supported AI agents

| Agent          | Detected via                                     | Buttons              | Skip prompts globally        |
|----------------|--------------------------------------------------|----------------------|------------------------------|
| Claude Code    | "Welcome to Claude Code", `❯ 1. Yes`             | 1 / 2 / 3            | `--dangerously-skip-permissions` |
| Codex CLI      | "Codex wants to run", "Allow command?"           | Yes / Always / No    | `--yolo`                     |
| Gemini CLI     | "Apply this change?", "1. Yes, allow once"       | 1 / 2 / 3            | `--yolo`                     |
| Aider          | `(Y)es/(N)o/(D)on't ask again`                   | y / n / d            | `--yes-always`               |
| Copilot CLI    | "Allow Copilot to use the X tool?"               | 1 / 2 / 3            | autopilot mode (Shift+Tab)   |
| Goose          | "Goose would like to call ... Allow?"            | Allow / Always / Deny| `GOOSE_MODE=auto`            |
| Crush          | `[a]llow [d]eny`                                 | a / A / d (no Enter) | `--yolo`                     |
| Generic shell  | `[Y/n]`, `1) Foo  2) Bar`, `Allow / Deny`        | situational          | n/a                          |

Add a new agent: drop a profile object into [`lib/agent-profiles.js`](lib/agent-profiles.js) and add fixture tests in `test/output-parser.test.js`.

## Auto-Approve Mode

Two-click activation for safety:
1. First click: "Confirm?" (yellow)
2. Second click: Active (red, pulsing) — auto-accepts confirm/permission prompts
3. Skips prompts marked **dangerous** (rm -rf, DROP, force-push, chmod 777, curl|sh, etc.)
4. Auto-disables after 10 minutes

## Configuration

All via `.env` file. See [.env.example](.env.example) for details.

### Required

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `ALLOWED_USER_IDS` | Comma-separated Telegram user IDs |
| `SESSION_SECRET` | Random string for JWT signing (`openssl rand -hex 32`) |

In `NODE_ENV=production` the server refuses to start if any of these are missing.

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 7681 | Server port |
| `ALLOWED_ORIGINS` | (any) | Comma-separated HTTPS origins for WebSocket |
| `MAX_SESSIONS` | 4 | Max terminal tabs per user |
| `IDLE_TIMEOUT_MINUTES` | 30 | Kill idle sessions after N minutes |
| `SHELL_COMMAND` | tmux | Shell to spawn |
| `SHELL_CWD` | $HOME | Working directory |
| `MGMT_TOKEN` | (disabled) | Token for management API |
| `MGMT_AUDIT_LOG` | (disabled) | Append-only path for /api/exec audit log |
| `AUDIT_LOG_DIR` | (disabled) | Opt-in tmux pipe-pane audit log directory |
| `VOICE_LANGUAGE` | en | Voice recognition language |

## Authentication

teletty uses Telegram's Mini App `initData` — the WebApp launches inside Telegram (phone or Telegram Desktop), Telegram signs your `user.id` with your `BOT_TOKEN`, the server verifies the signature and checks `ALLOWED_USER_IDS`, then issues an IP-bound JWT for 4 hours. No username/password, no third-party OAuth, no shared services. See [docs/SECURITY.md](docs/SECURITY.md) for the full chain-of-trust write-up and credential-rotation runbook.

## Security — 7 Layers

Your teletty instance is **your private terminal**. No one else can access it.

| Layer | What it does |
|-------|-------------|
| **1. Telegram HMAC-SHA256** | Only Telegram servers can generate valid auth data. Impossible to forge without your bot token. |
| **2. User ID whitelist** | Only YOUR Telegram account (by numeric ID) is allowed. Everyone else gets "Access denied". |
| **3. IP-bound JWT** | Session tokens are locked to your IP address. Stolen token = useless from another IP. Expires in 4 hours. |
| **4. initData freshness** | Auth data older than 5 minutes is rejected. Prevents replay attacks. |
| **5. Timing-safe auth** | All comparisons use `crypto.timingSafeEqual`. Prevents timing side-channel attacks. |
| **6. Rate limiting** | 10 auth attempts/min/IP, 20 /api/exec calls/min/IP, WebSocket frames capped at 256 KB. |
| **7. Sanitized environment** | Terminal sessions only see PATH, HOME, USER, SHELL, LANG, TERM. Server secrets (BOT_TOKEN, SESSION_SECRET) are never leaked to the terminal. |

## Project Structure

| File | Lines | Purpose |
|------|------:|---------|
| `server.js`              | 312 | Express + WebSocket server, auth, voice, management API, agent dispatch |
| `auth.js`                | 108 | Telegram Mini App HMAC verification, JWT sessions, whitelist |
| `terminal-manager.js`    | 111 | tmux session lifecycle, idle timeout, optional audit |
| `output-parser.js`       | 123 | Multi-agent prompt detection engine + dangerous-command heuristic |
| `lib/agent-profiles.js`  | 228 | Per-agent regex + button mappings (Claude / Codex / Gemini / Aider / Copilot / Goose / Crush) |
| `public/app.js`          | 393 | Frontend: xterm.js, tabs, smart buttons, agent indicator, auto-approve, voice |
| `public/index.html`      |  83 | UI layout, Tokyo Night CSS |
| `bin/teletty.js`         | 310 | CLI: `init` (interactive), `tunnel`, `doctor`, default = start server |

## CLI

| Command                  | What it does                                                   |
|--------------------------|----------------------------------------------------------------|
| `teletty init`           | Interactive setup — asks two questions, writes `./.env`        |
| `teletty`                | Start the server (uses `./.env`)                               |
| `teletty tunnel`         | Run Cloudflare Tunnel, print public HTTPS URL                  |
| `teletty doctor`         | Diagnose env, ports, tools, common misconfig                   |
| `teletty --version`      | Print version                                                  |
| `teletty --help`         | Full usage                                                     |

## Testing

```bash
npm test
```

52 tests covering: ANSI stripping, generic prompts, every agent profile (positive + negative), danger flag (covers `rm -rf` / `-fr` / `-Rf` / `--recursive --force`, `find -delete`, `git push -f`/`--force`, `chmod 777`, `curl|sh`, `dd if=`, `shutdown`, fork bomb, `sudo rm`, plus negative cases), `detectAgent`, `activeAgent` priority, and HMAC/JWT auth.

## Use Cases

- **Server management from phone** — restart services, check logs, deploy
- **AI agents on the go** — run Claude Code / Codex / Aider with one-tap approve
- **Emergency access** — HTTPS management API when SSH is down
- **Team access** — whitelist multiple Telegram users, each gets isolated sessions

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Custom domain (optional)

Cloudflare Tunnel is the recommended path because it's instant, free, and needs no DNS. If you already have a domain and want full control / privacy (Cloudflare sees your terminal traffic in the tunnel option), use the included nginx template:

```bash
# DNS: point an A record (e.g. terminal.example.com) at your server IP, then:
cp nginx.conf.template /etc/nginx/sites-enabled/teletty.conf
# edit server_name to match your DNS, then:
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d terminal.example.com

# In .env, set:
ALLOWED_ORIGINS=https://terminal.example.com
```

Use this URL in BotFather's Menu Button instead of the trycloudflare URL.

## License

[MIT](LICENSE) -- Oleg Chetrean
