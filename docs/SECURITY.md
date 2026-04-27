# Security model

teletty is a private terminal — only the bot owner should be able to open it.
This document explains the chain of trust and how to prove to yourself that
nobody else can get in.

## TL;DR — three keys, three checks

| Secret              | Where it lives                                | Who else has it |
|---------------------|-----------------------------------------------|-----------------|
| `BOT_TOKEN`         | Telegram (BotFather) + your `.env` on the server | Only Telegram and you |
| `SESSION_SECRET`    | Your `.env` on the server                     | Only you        |
| `ALLOWED_USER_IDS`  | Your `.env` on the server                     | Only you        |

For somebody else to access your terminal they need to forge a request whose
HMAC matches `BOT_TOKEN`, AND the user_id inside it has to be in
`ALLOWED_USER_IDS`, AND they have to be sending it from your IP. You'd have to
leak all three secrets simultaneously.

## How the bot is bound to this server

There is no "shared service" — the binding is purely cryptographic.

```
You at @BotFather                   Your server (.env)
─────────────────────────           ──────────────────────────
/newbot → BOT_TOKEN  ──────────►   BOT_TOKEN copied here
                                   SESSION_SECRET   = openssl rand -hex 32
                                   ALLOWED_USER_IDS = your numeric tg id

/mybots → Menu Button URL ─────►   https://terminal.yourdomain.com/
/mybots → Domain (login widget) ►  terminal.yourdomain.com   (optional)
```

The Mini App URL you set in BotFather is NOT a secret — anyone can see it. The
only thing that matters is that the server with that URL has YOUR `BOT_TOKEN`.

## What happens at login (Path A — Mini App)

1. You tap the bot's Menu Button in Telegram.
2. Telegram opens `https://terminal.yourdomain.com/` in a WebView and injects
   `Telegram.WebApp.initData` — a signed payload that includes your numeric
   `user.id` and an `auth_date`.
3. The browser POSTs `initData` to `/auth`.
4. Server reconstructs the data-check-string and computes
   `HMAC_SHA256(secret = HMAC_SHA256("WebAppData", BOT_TOKEN), data_check_string)`.
   It must match the `hash` field. **This is the bot binding** — only Telegram
   has both `BOT_TOKEN` and the data, so only it can produce a valid hash.
5. Server checks `auth_date` is < 5 minutes old (replay protection).
6. Server checks `user.id` is in `ALLOWED_USER_IDS` (the user binding).
7. Server issues a JWT bound to the client IP and signed with
   `SESSION_SECRET`, valid for 4 hours.
8. WebSocket upgrade re-verifies the JWT and the IP on every connection.

## What happens at login (Path B — Login Widget, optional)

For accessing teletty from a desktop browser when not inside the Telegram app.

1. Set `LOGIN_WIDGET_BOT=yourbot_username` in `.env`.
2. Whitelist your domain via `@BotFather → /setdomain → terminal.yourdomain.com`.
   Telegram refuses to render the widget if the domain isn't whitelisted, so
   nobody can host a phishing copy of the widget for your bot on a different
   domain.
3. User visits `https://terminal.yourdomain.com/` in any browser. The page
   detects there is no `Telegram.WebApp` and renders the official Login
   Widget script from `telegram.org`.
4. User taps "Log in with Telegram" → Telegram OAuth popup → on success, the
   widget calls `onTelegramAuth(user)` with `{id, first_name, username,
   auth_date, hash, ...}`.
5. Browser POSTs the payload to `/auth/login`.
6. Server verifies the hash with key = `SHA256(BOT_TOKEN)` (this is a
   different scheme than the Mini App initData but the principle is the same).
7. Same `ALLOWED_USER_IDS` check.
8. Same JWT issued.

A user who is not in `ALLOWED_USER_IDS` will see "Access denied" even if their
Telegram login is genuine.

## Why I can trust this

Threat: **somebody steals the URL and tries to log in themselves.**
- They reach the page. They cannot produce valid `initData` because they don't
  have `BOT_TOKEN`. They cannot get a valid Login Widget signature for your
  bot because Telegram only signs after they pass an OAuth flow that already
  reveals their user id — which won't be in your `ALLOWED_USER_IDS`.
  Result: `403 Access denied`.

Threat: **somebody intercepts a session token (e.g. WiFi sniff).**
- Tokens are bound to the issuing IP. From any other IP the WebSocket upgrade
  is rejected. Tokens also expire in 4 hours.

Threat: **somebody runs a phishing copy of the Mini App on a different domain.**
- Mini Apps are launched from inside Telegram via the Menu Button URL you set
  at BotFather. There is no other entry point. For Login Widget, Telegram
  refuses to render it on any domain except the one you set with `/setdomain`.

Threat: **somebody compromises my server filesystem.**
- They get `BOT_TOKEN`, `SESSION_SECRET`, `.env` — game over for the bot. The
  fix is the same as for any leaked secret: rotate `BOT_TOKEN` via BotFather
  (`/revoke`) and rotate `SESSION_SECRET`. All previously issued JWTs become
  invalid immediately because they were signed with the old `SESSION_SECRET`.
  This is also why teletty in `NODE_ENV=production` refuses to start with a
  randomly generated `SESSION_SECRET` — a missing secret would silently
  invalidate all sessions on every restart.

## Recommended posture

- Run with `NODE_ENV=production`. teletty will fail-fast on missing required
  env. Don't disable that.
- Set `ALLOWED_ORIGINS=https://terminal.yourdomain.com` (or whatever your
  domain is). With this set, WebSocket upgrades from any other origin get
  `403`.
- Don't set `MGMT_TOKEN` unless you actually need the emergency `/api/exec`
  endpoint. If you do, also set `MGMT_AUDIT_LOG=/var/log/teletty/exec.log` to
  keep an append-only record.
- Leave `AUDIT_LOG_DIR` empty unless you specifically want full pane capture
  (it logs every prompt, every reply, every paste — sensitive).
- Use the supplied `nginx.conf.template` — it ships HSTS, X-Content-Type-
  Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.
- Whitelist your bot's domain via `@BotFather → /setdomain` even if you don't
  use the Login Widget — that is what locks `t.me/yourbot?startapp=...`-style
  deep links to your server.

## Rotating credentials

| If this leaks            | Run                                        |
|--------------------------|--------------------------------------------|
| `BOT_TOKEN`              | `@BotFather → /revoke → pick bot`, copy new token to `.env`, restart |
| `SESSION_SECRET`         | `openssl rand -hex 32` → replace in `.env` → restart (kicks all sessions) |
| `MGMT_TOKEN`             | `openssl rand -hex 32` → replace in `.env` → restart |
| `ALLOWED_USER_IDS` change| Edit `.env` → restart                      |
