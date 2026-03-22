# teletty — AI Agent Deployment Guide

This file tells AI coding agents (Claude Code, Cursor, Aider, etc.) how to deploy teletty on a server.

## What is teletty?

A Telegram Mini App that gives full terminal access from your phone. Smart buttons for interactive prompts, Claude Code integration, voice input, multi-tab tmux sessions.

## Deploy on a Fresh Ubuntu/Debian VPS

### Prerequisites
- Ubuntu 22.04+ or Debian 12+
- Root or sudo access
- A domain pointing to this server (A record)
- A Telegram bot token (from @BotFather)

### Step-by-step deployment

```bash
# 1. Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install tmux
sudo apt-get install -y tmux

# 3. Clone and install
cd /opt
sudo git clone https://github.com/teletty/teletty.git
cd teletty
sudo npm install --omit=dev

# 4. Create .env (EDIT THESE VALUES)
sudo cp .env.example .env
# Required: BOT_TOKEN, ALLOWED_USER_IDS, SESSION_SECRET
# Generate secret: openssl rand -hex 32

# 5. Install Caddy (automatic HTTPS, simpler than nginx+certbot)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# 6. Configure Caddy reverse proxy
# Replace YOURDOMAIN.COM with your actual domain
sudo tee /etc/caddy/Caddyfile << 'CADDY'
YOURDOMAIN.COM {
    reverse_proxy localhost:7681
}
CADDY
sudo systemctl restart caddy

# 7. Create systemd service
sudo tee /etc/systemd/system/teletty.service << 'SERVICE'
[Unit]
Description=teletty terminal server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/teletty
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/opt/teletty/.env

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable teletty
sudo systemctl start teletty

# 8. Configure Telegram bot menu button
# Go to @BotFather > /mybots > your bot > Bot Settings > Menu Button
# Set URL: https://YOURDOMAIN.COM/
# Set text: Terminal
```

### Verify deployment
```bash
# Check service status
sudo systemctl status teletty

# Check health endpoint
curl http://localhost:7681/health

# Check HTTPS
curl https://YOURDOMAIN.COM/health

# View logs
sudo journalctl -u teletty -f
```

### Quick test without a domain (Cloudflare Tunnel)
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Start tunnel (gives you a random HTTPS URL)
cloudflared tunnel --url http://localhost:7681
# Use the generated URL as your bot's Menu Button URL
```

## Project structure

| File | Purpose |
|------|---------|
| `server.js` | Express + WebSocket server, auth, voice, management API |
| `auth.js` | Telegram HMAC-SHA256 auth, JWT sessions, whitelist |
| `terminal-manager.js` | tmux session lifecycle, idle timeout |
| `output-parser.js` | Smart prompt detection (7 types) |
| `public/app.js` | Frontend: xterm.js, tabs, auto-approve, voice |
| `public/index.html` | UI layout, Tokyo Night theme |

## Key configuration (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | Yes | From @BotFather |
| `ALLOWED_USER_IDS` | Yes | Comma-separated Telegram user IDs |
| `SESSION_SECRET` | Yes | `openssl rand -hex 32` |
| `PORT` | No | Default: 7681 |
| `ALLOWED_ORIGINS` | No | HTTPS origins for WebSocket |
| `VOICE_LANGUAGE` | No | Default: en |

## Security notes

- Never commit `.env` or `keys/` directory
- MGMT_TOKEN enables remote command execution — use a strong random value or leave empty to disable
- All auth uses timing-safe comparison (crypto.timingSafeEqual)
- PTY processes get sanitized env (no secrets leaked)
- initData has 5-minute freshness check (anti-replay)
