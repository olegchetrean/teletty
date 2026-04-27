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

There is no shared service — the binding is purely cryptographic.

```
You at @BotFather                   Your server (.env)
─────────────────────────           ──────────────────────────
/newbot → BOT_TOKEN  ──────────►   BOT_TOKEN copied here
                                   SESSION_SECRET   = openssl rand -hex 32
                                   ALLOWED_USER_IDS = your numeric tg id

/mybots → Menu Button URL ─────►   https://your-public-url/
```

The Mini App URL you set in BotFather is NOT a secret — anyone can see it. The
only thing that matters is that the server with that URL has YOUR `BOT_TOKEN`.

## What happens at login

1. You tap the bot's Menu Button in Telegram (works on phone AND on Telegram Desktop).
2. Telegram opens `https://your-public-url/` in a WebView and injects
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

## Why I can trust this

Threat: **somebody steals the URL and tries to log in themselves.**
- They reach the page. They cannot produce valid `initData` because they don't
  have `BOT_TOKEN`. The Mini App they'd open with their own bot would carry
  THEIR `user.id`, which won't be in your `ALLOWED_USER_IDS`.
  Result: `403 Access denied`.

Threat: **somebody intercepts a session token (e.g. WiFi sniff).**
- Tokens are bound to the issuing IP. From any other IP the WebSocket upgrade
  is rejected. Tokens also expire in 4 hours.

Threat: **somebody runs a phishing copy of the Mini App on a different domain.**
- Mini Apps are launched from inside Telegram via the Menu Button URL you set
  at BotFather. There is no other entry point.

Threat: **somebody compromises my server filesystem.**
- They get `BOT_TOKEN`, `SESSION_SECRET`, `.env` — game over for the bot. The
  fix is the same as for any leaked secret: rotate `BOT_TOKEN` via BotFather
  (`/revoke`) and rotate `SESSION_SECRET`. All previously issued JWTs become
  invalid immediately because they were signed with the old `SESSION_SECRET`.
  This is also why teletty in `NODE_ENV=production` refuses to start with a
  randomly generated `SESSION_SECRET` — a missing secret would silently
  invalidate all sessions on every restart.

Threat: **my Telegram account itself gets compromised.**
- SIM swap, leaked SMS code, session hijack on another device → the attacker
  becomes you, and teletty cannot tell the difference. **Mitigation: turn on
  Telegram's two-step verification (cloud password) and never share your
  Telegram session.**

## Honest limits

These are NOT hypothetical attacks; they are real trade-offs you should know:

1. **Auto-approve mode is heuristic, not safe.** It blocks `rm -rf`, force-push,
   `chmod 777`, `curl|sh`, etc., but the regex set is not exhaustive. If you
   leave auto-approve on for a long agent session, you WILL eventually click
   "Yes" on something the heuristic missed. Treat it as a convenience, not a
   safety net.
2. **Don't run the server as root.** The systemd unit in
   `docs/AGENT-INSTALL-PROMPT.md` uses your normal user. If you run
   `node server.js` directly as root, every Telegram-side approval becomes
   root-on-your-server.
3. **Don't enable `MGMT_TOKEN` unless you actually need it.** The `/api/exec`
   endpoint is RCE-as-a-service for whoever holds the token. If you do enable
   it, also set `MGMT_AUDIT_LOG=/var/log/teletty/exec.log`.
4. **Don't enable `AUDIT_LOG_DIR` casually.** It captures every prompt, every
   reply, every paste — including secrets you type.
5. **Cloudflare Tunnel ≠ end-to-end.** If you use `cloudflared tunnel` for
   HTTPS (the easiest install path), Cloudflare terminates TLS and can see
   plaintext terminal traffic. Auth is unaffected (HMAC verifies at origin),
   but the content is visible to Cloudflare. nginx + your own domain is the
   privacy-preserving option.
   - Cloudflare Tunnel forwards the client's real IP via the `CF-Connecting-IP`
     header. Since v1.2.0 teletty trusts that header (alongside `True-Client-IP`,
     `X-Real-IP`, and `X-Forwarded-For`) so JWT IP-binding works correctly
     behind the tunnel. If you put a custom proxy in front and that proxy does
     NOT pass one of these headers, every connection looks like 127.0.0.1 to
     teletty and IP-binding effectively becomes "any IP can use any token".
     Always make sure your reverse proxy forwards the original client IP.
6. **`ALLOWED_USER_IDS` is multi-id but not multi-tenant.** Listing several
   Telegram IDs gives them isolated tmux sessions but the SAME OS user. They
   can read each other's files.
7. **Voice transcription is opt-in cloud.** If you set `AZURE_OPENAI_*`, audio
   leaves your server for Microsoft. Leave the variables empty to keep voice
   on the device (browser Web Speech API).

## Recommended posture

- Run with `NODE_ENV=production`. teletty will fail-fast on missing required
  env. Don't disable that.
- Set `ALLOWED_ORIGINS=https://your-public-url`. With this set, WebSocket
  upgrades from any other origin get `403`.
- Don't set `MGMT_TOKEN` unless you actually need the emergency `/api/exec`
  endpoint.
- Leave `AUDIT_LOG_DIR` empty unless you specifically want full pane capture.
- Use a non-root systemd `User=` for the service.
- Turn on Telegram cloud password (Settings → Privacy → Two-Step Verification).

## Rotating credentials

| If this leaks            | Run                                        |
|--------------------------|--------------------------------------------|
| `BOT_TOKEN`              | `@BotFather → /revoke → pick bot`, copy new token to `.env`, restart |
| `SESSION_SECRET`         | `openssl rand -hex 32` → replace in `.env` → restart (kicks all sessions) |
| `MGMT_TOKEN`             | `openssl rand -hex 32` → replace in `.env` → restart |
| `ALLOWED_USER_IDS` change| Edit `.env` → restart                      |
