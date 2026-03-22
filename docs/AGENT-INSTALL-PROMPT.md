# teletty — One-Prompt Install via AI Agent

Give this prompt to **Claude Code**, **Cursor**, **Aider**, or any AI coding agent connected to your server via SSH.

---

## The Prompt

Copy everything below between the triple backticks and paste it to your AI agent:

```
Install teletty — a Telegram Mini App terminal — on this server. Follow every step exactly.

## Step 1: Prerequisites

Check and install if missing:
- Node.js 20+ (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs)
- tmux (sudo apt-get install -y tmux)
- Verify: node --version && tmux -V

## Step 2: Clone and install

cd /opt
sudo git clone https://github.com/olegchetrean/teletty.git
sudo chown -R $USER:$USER /opt/teletty
cd /opt/teletty
npm install --omit=dev

## Step 3: Configure .env

Create /opt/teletty/.env with these values:

BOT_TOKEN=[I WILL PROVIDE THIS — ask me for it]
ALLOWED_USER_IDS=[I WILL PROVIDE THIS — ask me for my Telegram user ID]
SESSION_SECRET=[generate with: openssl rand -hex 32]
PORT=7681
VOICE_LANGUAGE=en
SHELL_CWD=/home/$USER

Ask me for the BOT_TOKEN and ALLOWED_USER_IDS before proceeding.
Tell me exactly these instructions so I can get them:

### How to get BOT_TOKEN:
1. Open Telegram on your phone
2. Search for @BotFather
3. Send /newbot
4. Choose a name (e.g., "My Terminal")
5. Choose a username ending in _bot (e.g., "myterminal_bot")
6. BotFather will reply with a token like 123456:ABC-DEF... — that's the BOT_TOKEN

### How to get your Telegram User ID:
1. Open Telegram
2. Search for @userinfobot
3. Send any message to it
4. It replies with your user ID (a number like 621545666) — that's the ALLOWED_USER_IDS

Wait for me to provide both values before continuing.

## Step 4: HTTPS setup

teletty REQUIRES HTTPS (Telegram Mini App requirement).

Option A — If I have a domain pointing to this server:
- Install Caddy: sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list && sudo apt update && sudo apt install caddy
- Create Caddyfile: echo 'MYDOMAIN.COM { reverse_proxy localhost:7681 }' | sudo tee /etc/caddy/Caddyfile
- Start: sudo systemctl restart caddy
- Ask me for the domain name and replace MYDOMAIN.COM

Option B — If I don't have a domain (quick start):
- Install cloudflared: curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
- Start tunnel: cloudflared tunnel --url http://localhost:7681
- Note the generated https://xxxxx.trycloudflare.com URL

Ask me which option I want.

## Step 5: Create systemd service

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
Environment=NODE_ENV=production
EnvironmentFile=/opt/teletty/.env
User=CURRENT_USER

[Install]
WantedBy=multi-user.target
EOF

Replace CURRENT_USER with the actual username (whoami).
Then: sudo systemctl daemon-reload && sudo systemctl enable teletty && sudo systemctl start teletty

## Step 6: Configure Telegram bot Menu Button

Tell me to do these steps manually in Telegram:
1. Open @BotFather
2. Send /mybots
3. Select your bot
4. Tap "Bot Settings"
5. Tap "Menu Button"
6. Tap "Configure Menu Button"
7. For URL: enter the HTTPS URL from Step 4 (either https://MYDOMAIN.COM/ or the cloudflare tunnel URL)
8. For button text: enter "Terminal"

## Step 7: Verify everything works

Run these checks and report results:
1. sudo systemctl status teletty (should be "active (running)")
2. curl http://localhost:7681/health (should return {"status":"ok",...})
3. curl https://YOUR_URL/health (should return same via HTTPS)

Tell me: "teletty is ready. Open your bot in Telegram and tap the Terminal button."

## Security summary (explain to me):

teletty has 7 layers of security:
1. Telegram HMAC-SHA256 — only Telegram can generate valid auth data
2. User ID whitelist — only your Telegram account can access
3. IP-bound JWT sessions — tokens locked to your IP, expire in 4 hours
4. initData freshness — rejects auth data older than 5 minutes (anti-replay)
5. Timing-safe comparisons — prevents timing attacks on all auth checks
6. Rate limiting — max 10 auth attempts per minute per IP
7. Sanitized environment — terminal sessions cannot see server secrets

No one else can access your terminal. The bot is YOUR private terminal.
```

---

## How to get your details

### Bot Token (2 minutes)
1. Open Telegram, search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g., "My Terminal")
4. Choose a username ending in `_bot` (e.g., `myterminal_bot`)
5. Copy the token — looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

### Telegram User ID (30 seconds)
1. Open Telegram, search for **@userinfobot**
2. Send any message
3. It replies with your user ID (a number like `621545666`)

### Domain (optional)
- Point an A record to your server IP
- If you don't have one, teletty uses Cloudflare Tunnel for instant HTTPS

---

## That's it

Your AI agent handles the rest. Total time: ~5 minutes.
