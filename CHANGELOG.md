# Changelog

All notable changes to teletty are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0]

### Added
- Interactive `teletty init` — asks for `BOT_TOKEN` and your Telegram user id, auto-generates `SESSION_SECRET`, writes `.env` with mode 0600. No more manual `openssl rand -hex 32`.
- `teletty tunnel` subcommand — starts Cloudflare Tunnel, prints the public URL with copy-paste instructions for BotFather.
- `teletty doctor` subcommand — checks Node version, `.env` presence, `BOT_TOKEN` format, `ALLOWED_USER_IDS` shape, `SESSION_SECRET` length, `ALLOWED_ORIGINS`, risky toggles, tmux/cloudflared availability, and whether the configured port is free.
- Friendly `hint` field on `/auth` errors. The frontend now shows actionable diagnostics instead of just "Invalid Telegram data".
- `BOT_TOKEN` format validation at startup. Wrong format (whitespace, partial copy, surrounding quotes) is detected and warned about loudly.
- GitHub Actions CI on every PR — `npm test` on Node 20.x and 22.x, plus `npm audit --audit-level=high`.
- Dependabot weekly updates for npm, monthly for Docker and GitHub Actions.
- Issue templates (bug, feature, new agent profile) and pull-request template with security checklist.
- Root-level `SECURITY.md` (security disclosure policy) and `CODE_OF_CONDUCT.md`.
- `CHANGELOG.md` (this file).

### Changed
- `.env` is now read from the current working directory by default, not just from the install location. This means `npx teletty init` followed by `npx teletty` works in any directory without symlinking.
- Server startup banner is more diagnostic — points at `teletty doctor` if anything looks off.

### Security
- `BOT_TOKEN` format check at boot prevents the silent "every login fails with 401" failure mode caused by a malformed token.

## [1.1.0]

### Added
- Multi-agent prompt detection. `lib/agent-profiles.js` ships profiles for Claude Code, OpenAI Codex CLI, Google Gemini CLI, Aider, GitHub Copilot CLI, Block Goose, Charm Crush — plus a generic shell-prompt fallback.
- Per-agent send strategy (`key+enter` / `key` / `enter`) so single-letter TUIs like Crush no longer get spurious newlines.
- Agent indicator pill in the status bar — shows which CLI teletty believes is active.
- `AGENTS.md` (the agents.md convention) and `GEMINI.md` so non-Claude AI coding agents discover the project's conventions.
- `docs/SECURITY.md` — chain-of-trust write-up, threat scenarios, credential-rotation runbook, and an honest list of trade-offs.
- Cloudflare-Tunnel-first install path. README Quick Start is now 5 minutes with zero DNS.

### Changed
- Server reads version from `package.json` instead of hardcoded `v1.0.0`.
- Output parser inspects the last 30 lines (was 10) and accepts an `activeAgent` priority hint from the WebSocket caller.
- Frontend payload-for-button logic is per-prompt-type instead of always `key + '\n'`.
- `Dockerfile` runs as the non-root `node` user under `tini`.
- `docker-compose.yml` binds to `127.0.0.1` only (was `0.0.0.0`).
- `nginx.conf.template` ships HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- `multer` bumped to `^2.0.0` (1.x has known CVEs).
- `form-data` dependency dropped in favour of native `FormData` (Node 20+).
- `url.parse()` (DEP0169) replaced with WHATWG URL API.

### Security
- Production fail-fast: `NODE_ENV=production` refuses to start without `BOT_TOKEN`, `SESSION_SECRET`, `ALLOWED_USER_IDS`.
- `/api/exec` rate-limited (20/min/IP) with optional audit log via `MGMT_AUDIT_LOG`.
- WebSocket frames capped at 256 KB, JSON body capped at 64 KB.
- Audit logging via tmux pipe-pane is now opt-in via `AUDIT_LOG_DIR` (was silently writing to /var/log).
- Dangerous-command heuristic substantially expanded: matches `rm -rf` / `-fr` / `-Rf` / `--recursive --force`, `find -delete`, `dd if=/of=`, redirects to `/dev/sd*`, `shutdown` / `halt` / `poweroff` / `reboot` / `init 0`, `chmod 777` / `chown -R`, `git push -f` / `--force` / `--force-with-lease`, `git reset --hard`, `git clean -fdx`, `npm publish` / `unpublish`, `curl|wget|fetch` piped to any shell, the classic `:(){:|:&};:` fork bomb, and `sudo` + any of the above.

### Removed
- Marketing/launch documents that did not belong in a code repository (`docs/LAUNCH-POSTS-READY.md`, `docs/PROMOTION-STRATEGY.md`, `docs/LAUNCH-STRATEGY.md`, the rebrand-launch plan).
- `docs/landing/index.html` (byte-identical duplicate of `docs/index.html`).

## [1.0.0]

Initial public release.

[Unreleased]: https://github.com/olegchetrean/teletty/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/olegchetrean/teletty/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/olegchetrean/teletty/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/olegchetrean/teletty/releases/tag/v1.0.0
