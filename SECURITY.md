# Security policy

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Use GitHub's private advisory form: <https://github.com/olegchetrean/teletty/security/advisories/new>

Include:
- A clear description of the issue
- Steps to reproduce, with the smallest possible test case
- The teletty version (`teletty --version`) and Node.js version
- Whether you've verified the issue against `main`

You'll get an acknowledgement within 72 hours and a status update within 7 days. If the issue is confirmed, expect:

1. A fix on a private branch.
2. A coordinated disclosure date (typically within 30 days).
3. A CVE if the impact warrants it.
4. Public credit in the release notes (unless you prefer to stay anonymous).

## Supported versions

Only the latest minor version of teletty receives security fixes. Older versions are not patched — upgrade to stay safe.

## Scope

In scope:
- Authentication and authorisation flow (`auth.js`, `/auth`, WebSocket upgrade)
- Telegram initData verification
- Rate limiting and timing-safe comparisons
- The `/api/exec` management endpoint when `MGMT_TOKEN` is set
- The terminal session lifecycle (`terminal-manager.js`)
- The output parser and dangerous-command heuristic (`output-parser.js`, `lib/agent-profiles.js`)
- Default Dockerfile and `nginx.conf.template` postures

Out of scope (these are by design — see `docs/SECURITY.md`):
- A user voluntarily running the server as root
- A user voluntarily setting `MGMT_TOKEN` and sharing it
- A user voluntarily setting `AUDIT_LOG_DIR` and exposing the resulting log
- Compromise of the user's Telegram account itself (SIM swap, leaked SMS code)
- Compromise of the user's server filesystem
- Trust in TLS providers when `cloudflared tunnel` is used (Cloudflare terminates TLS)

## Threat model and chain of trust

For the architectural write-up — including how the bot is bound to the server, what every layer protects against, and how to rotate credentials — read [`docs/SECURITY.md`](docs/SECURITY.md).

## Hardening checklist for operators

- Run `teletty doctor` after every install or env change
- Use `NODE_ENV=production` (server fail-fasts on missing env)
- Run as a non-root user
- Set `ALLOWED_ORIGINS` to your public HTTPS URL
- Leave `MGMT_TOKEN` and `AUDIT_LOG_DIR` empty unless you really need them
- Enable Telegram two-step verification on your account
- Rotate `BOT_TOKEN` (`@BotFather → /revoke`) and `SESSION_SECRET` if either ever appears in logs, dumps, or screenshots
