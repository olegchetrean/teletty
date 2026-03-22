# teletty

**A full terminal in your pocket, via Telegram.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

Access any server from your phone using a Telegram Mini App. Smart buttons for interactive prompts, Claude Code integration, voice input, multi-tab tmux sessions — no SSH app needed.

```
$ claude "fix the login bug"
  Reading src/auth.js...
  Editing src/auth.js...

  Allow Edit tool?  [Allow]  [Deny]     <-- smart buttons appear
```

## Features

- **Smart buttons** — auto-detects interactive prompts (Y/n, numbered options, Allow/Deny) and shows one-tap buttons
- **Claude Code ready** — recognizes Claude Code CLI permission prompts with approve/deny buttons
- **Auto-approve mode** — automatically accepts prompts with safety checks (blocks rm -rf, DROP, DELETE)
- **Multi-tab** — up to 4 concurrent tmux sessions that survive disconnects
- **Voice input** — push-to-talk via Web Speech API, with optional Azure Whisper fallback
- **Telegram-native auth** — HMAC-SHA256 verification, user ID whitelist, IP-bound JWT sessions
- **Management API** — execute commands via HTTPS when SSH is down
- **Mobile controls** — buttons for arrow keys, Tab, Esc, Ctrl+C
- **Tokyo Night theme** — dark theme, optimized for mobile screens
- **889 lines of code** — zero frameworks, zero build step, zero transpilation

## Quick Start

### npx (fastest)

```bash
npx teletty init    # creates .env from template
nano .env           # set BOT_TOKEN, ALLOWED_USER_IDS, SESSION_SECRET
npx teletty
```

### Docker

```bash
git clone https://github.com/teletty/teletty.git && cd teletty
cp .env.example .env && nano .env
docker compose up -d
```

### Manual

```bash
git clone https://github.com/teletty/teletty.git && cd teletty
cp .env.example .env && nano .env
npm install
node server.js
```

### Set up HTTPS (required by Telegram)

```bash
# Copy and edit nginx config
cp nginx.conf.template /etc/nginx/sites-enabled/teletty.conf
# Edit server_name, then:
sudo nginx -t && sudo nginx -s reload
sudo certbot --nginx -d terminal.yourdomain.com
```

### Configure your Telegram bot

1. Open [@BotFather](https://t.me/BotFather)
2. `/mybots` > your bot > Bot Settings > Menu Button
3. Set URL: `https://terminal.yourdomain.com/`
4. Set text: `Terminal`

### Find your Telegram user ID

Send any message to your bot, then check logs for `[ws] Connected: user=XXXXXXX`. Add that ID to `ALLOWED_USER_IDS` in `.env`.

## How It Works

```
Telegram (tap Menu Button)
  -> Mini App WebView loads
  -> POST /auth (HMAC-SHA256 verification + whitelist check)
  -> WebSocket connection established
  -> node-pty spawns tmux session
  -> xterm.js renders terminal output
  -> output-parser detects prompts -> smart buttons appear
```

## Smart Buttons

The output parser detects 7 types of interactive prompts:

| Prompt Type | Example | Buttons |
|-------------|---------|---------|
| Y/n confirmation | `Continue? [Y/n]` | Yes / No |
| Numbered options | `1) Install  2) Update` | 1: Install / 2: Update |
| Letter options | `a) Option A  b) Option B` | a / b |
| Allow/Deny | `Allow this action?` | Allow / Deny |
| Claude Code | `Do you want to proceed?` | Yes / No |
| Tool permission | `Bash command: ls` | Yes / No |
| Press Enter | `Press Enter to continue` | Enter |

Buttons for dangerous commands (`rm -rf`, `DROP`, `DELETE`, `shutdown`) are highlighted in red.

## Auto-Approve Mode

Two-click activation for safety:
1. First click: "Confirm?" (yellow)
2. Second click: Active (red, pulsing) — auto-accepts Y/n and Allow prompts
3. Does NOT auto-approve dangerous commands
4. Auto-disables after 10 minutes

## Configuration

All via `.env` file. See [.env.example](.env.example) for details.

### Required

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `ALLOWED_USER_IDS` | Comma-separated Telegram user IDs |
| `SESSION_SECRET` | Random string for JWT signing (`openssl rand -hex 32`) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 7681 | Server port |
| `ALLOWED_ORIGINS` | (all) | HTTPS origins for WebSocket |
| `MAX_SESSIONS` | 4 | Max terminal tabs per user |
| `IDLE_TIMEOUT_MINUTES` | 30 | Kill idle sessions after N minutes |
| `SHELL_COMMAND` | tmux | Shell to spawn |
| `SHELL_CWD` | /root | Working directory |
| `MGMT_TOKEN` | (disabled) | Token for management API |
| `VOICE_LANGUAGE` | en | Voice recognition language |

## Security

- **Telegram HMAC-SHA256** — cryptographic verification of Mini App data
- **User whitelist** — only specified Telegram user IDs
- **IP-bound JWT** — 4h session tokens tied to client IP
- **Rate limiting** — /auth endpoint limited to 10 req/min per IP
- **Origin check** — WebSocket accepts only configured domains
- **Audit logging** — terminal I/O logged via tmux pipe-pane
- **Management API** — disabled by default

## Project Structure

| File | Lines | Purpose |
|------|-------|---------|
| `server.js` | 230 | Express + WebSocket server, auth, voice, management API |
| `auth.js` | 87 | Telegram HMAC verification, JWT sessions, whitelist |
| `terminal-manager.js` | 103 | tmux session lifecycle, idle timeout, audit |
| `output-parser.js` | 88 | Smart prompt detection engine (7 types) |
| `public/app.js` | 320 | Frontend: xterm.js, tabs, auto-approve, voice |
| `public/index.html` | 79 | UI layout, Tokyo Night CSS |
| `bin/teletty.js` | 35 | CLI entry point |

## Testing

```bash
npm test
```

26 tests covering output-parser (prompt detection, ANSI stripping, dangerous patterns) and auth (HMAC verification, JWT sessions, whitelist).

## Use Cases

- **Server management from phone** — restart services, check logs, deploy
- **Claude Code on the go** — run AI coding agents with one-tap approve
- **Emergency access** — HTTPS management API when SSH is down
- **Team access** — whitelist multiple Telegram users, each gets isolated sessions

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE) -- Oleg Chetrean
