# teletty — One-Prompt Install via AI Agent

Give this prompt to **any AI coding agent** SSH'd into your server. Tested with Claude Code, OpenAI Codex CLI, Gemini CLI, Aider, GitHub Copilot CLI, Cursor agent, Goose, Crush, OpenCode, Continue.

The agent only needs three pieces of information from you:
1. `BOT_TOKEN` (from @BotFather, ~1 minute)
2. Your numeric Telegram user ID (from @userinfobot, ~30 seconds)
3. Nothing else. No domain, no DNS.

The default path uses Cloudflare Tunnel for instant free HTTPS — no domain required. If you already have a domain and want a custom one, the prompt mentions that as a one-line variant at the end.

---

## The Prompt

Copy everything between the triple backticks and paste it to your AI agent:

```
Install teletty — a Telegram Mini App terminal with multi-agent smart buttons — on this server. Follow every step exactly.

## Step 1: Prerequisites

Check and install if missing:
- Node.js 20+ (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs)
- tmux (sudo apt-get install -y tmux)
- cloudflared (curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && sudo chmod +x /usr/local/bin/cloudflared)
- Verify: node --version && tmux -V && cloudflared --version

## Step 2: Clone and install

cd /opt
sudo git clone https://github.com/olegchetrean/teletty.git
sudo chown -R $USER:$USER /opt/teletty
cd /opt/teletty
npm install --omit=dev

## Step 3: Configure .env

Create /opt/teletty/.env with these values:

NODE_ENV=production
BOT_TOKEN=[I WILL PROVIDE THIS — ask me for it]
ALLOWED_USER_IDS=[I WILL PROVIDE THIS — ask me for my Telegram user ID]
SESSION_SECRET=[generate with: openssl rand -hex 32]
PORT=7681
VOICE_LANGUAGE=en
SHELL_CWD=/home/$USER

Ask me for the BOT_TOKEN and ALLOWED_USER_IDS before proceeding. Tell me how to get them:

### How to get BOT_TOKEN
1. Open Telegram, search for @BotFather
2. Send /newbot, pick a name, pick a username ending in _bot
3. Copy the token (looks like 123456:ABC-DEF...)

### How to get your Telegram User ID
1. Open Telegram, search for @userinfobot
2. Send any message, copy the number it replies with

Wait for me to provide both before continuing. With NODE_ENV=production set,
the server WILL refuse to start unless all three required env vars are
present — that is intentional fail-fast behaviour.

## Step 4: Set up systemd services

We run TWO services so both teletty and the Cloudflare Tunnel auto-restart.

### 4a. teletty service

sudo tee /etc/systemd/system/teletty.service << 'EOF'
[Unit]
Description=teletty terminal server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/teletty
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/teletty/.env
User=CURRENT_USER

[Install]
WantedBy=multi-user.target
EOF

Replace CURRENT_USER with the actual non-root username (whoami).
NEVER use User=root — it would give Telegram-side approvals root on this box.

sudo systemctl daemon-reload
sudo systemctl enable --now teletty

### 4b. Cloudflare Tunnel service

sudo tee /etc/systemd/system/teletty-tunnel.service << 'EOF'
[Unit]
Description=teletty Cloudflare Tunnel
After=network.target teletty.service
Requires=teletty.service

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://127.0.0.1:7681 --no-autoupdate
Restart=always
RestartSec=5
StandardOutput=append:/var/log/teletty-tunnel.log
StandardError=append:/var/log/teletty-tunnel.log
User=CURRENT_USER

[Install]
WantedBy=multi-user.target
EOF

sudo touch /var/log/teletty-tunnel.log && sudo chown CURRENT_USER /var/log/teletty-tunnel.log
sudo systemctl daemon-reload
sudo systemctl enable --now teletty-tunnel

## Step 5: Get the public HTTPS URL

Wait ~5 seconds for the tunnel to come up, then read the URL Cloudflare assigned:

URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /var/log/teletty-tunnel.log | head -1)
echo "Public URL: $URL"

If empty, run: sudo journalctl -u teletty-tunnel -n 30 — look for the trycloudflare URL line.
Save the URL — you'll need it in the next step.

## Step 6: Configure Telegram bot Menu Button

Tell me to do these steps manually in Telegram:
1. Open @BotFather
2. Send /mybots
3. Select my bot
4. Tap "Bot Settings" → "Menu Button" → "Configure Menu Button"
5. URL: paste the trycloudflare URL from Step 5
6. Button text: enter "Terminal"

## Step 7: Verify

Run these checks and report results:
1. sudo systemctl status teletty teletty-tunnel (both should be "active (running)")
2. curl http://127.0.0.1:7681/health (should return {"status":"ok","version":"...",...})
3. curl $URL/health (should return same via HTTPS)
4. cd /opt/teletty && npm test (all 52 tests should pass)

Tell me: "teletty is ready. Open your bot in Telegram and tap the Terminal button."

## Note on the trycloudflare URL

By default the URL is random and CHANGES every time the tunnel restarts.
That is fine for personal/private use — when it changes, just paste the new
URL into BotFather Menu Button. If I ever want a stable URL or to use my
own domain, I can tell you to switch to a named Cloudflare tunnel
(cloudflared tunnel login → tunnel create → tunnel route dns), or to nginx +
certbot. Both are documented in the repo's README under "Custom domain".

## Security summary (explain to me)

teletty has 7 layers of security:
1. Telegram HMAC-SHA256 — only Telegram can generate valid auth data with my BOT_TOKEN
2. User ID whitelist — only my Telegram account can pass /auth
3. IP-bound JWT — tokens locked to my IP, expire in 4 hours
4. initData freshness — rejects auth data older than 5 minutes (anti-replay)
5. Timing-safe comparisons — prevents timing attacks
6. Rate limiting — 10 auth attempts/min/IP, 20 /api/exec/min/IP, 256 KB WS frames
7. Sanitized environment — terminal sessions cannot read server secrets

In NODE_ENV=production the server refuses to start without BOT_TOKEN,
SESSION_SECRET, and ALLOWED_USER_IDS — that's the fail-fast behaviour.

Honest limits I should know about:
- Auto-approve mode is heuristic; treat it as convenience, not a safety net
- /api/exec is RCE-as-a-feature when MGMT_TOKEN is set; leave it unset unless I need it
- Cloudflare Tunnel terminates TLS at Cloudflare; for full privacy use a custom domain
- Two-step verification on my Telegram account is recommended (Settings → Privacy)
```

---

## How to get your details

### Bot Token (~1 minute)
1. Open Telegram, search for **@BotFather**
2. Send `/newbot`, pick a name, pick a username ending in `_bot`
3. Copy the token (looks like `123456:ABC-DEF...`)

### Telegram User ID (~30 seconds)
1. Open Telegram, search for **@userinfobot**
2. Send any message, copy the number it replies with

---

That's it. ~5 minutes from blank server to terminal-on-phone.
