# One-Prompt Install for AI Agents

Copy-paste this prompt into Claude Code, Cursor, Aider, or any AI coding agent connected to your server:

---

## The Prompt

```
Deploy teletty (https://github.com/teletty/teletty) on this server.

My details:
- Telegram bot token: [PASTE YOUR BOT TOKEN]
- My Telegram user ID: [PASTE YOUR USER ID]
- Domain: [YOUR DOMAIN or "none" for Cloudflare tunnel]

Steps:
1. Install Node.js 20+ and tmux if not present
2. Clone the repo to /opt/teletty
3. Run npm install
4. Create .env with my bot token, user ID, and a generated SESSION_SECRET
5. If I provided a domain: install Caddy, configure reverse proxy with automatic HTTPS
6. If no domain: install cloudflared, start a quick tunnel, tell me the URL
7. Create a systemd service for teletty
8. Start the service
9. Tell me how to configure my bot's Menu Button in @BotFather

Read the CLAUDE.md file in the repo for detailed instructions.
```

---

## How to get your details

### Bot Token
1. Open Telegram, search for @BotFather
2. Send `/newbot`, follow the prompts
3. Copy the token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### Telegram User ID
1. Open Telegram, search for @userinfobot
2. Send any message
3. It replies with your user ID (a number like `621545666`)

### Domain (optional)
- Point an A record to your server's IP address
- Example: `terminal.yourdomain.com -> 123.45.67.89`
- If you don't have a domain, say "none" — we'll use Cloudflare Tunnel for instant HTTPS

---

## That's it

Your AI agent reads the CLAUDE.md in the repo, follows the steps, and you get a working terminal in Telegram in about 2 minutes.
