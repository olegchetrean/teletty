# Contributing to teletty

Thanks for your interest. teletty is small on purpose — please read this before sending a PR.

## Setup

```bash
git clone https://github.com/olegchetrean/teletty.git
cd teletty
npm install
node bin/teletty.js init       # one-shot interactive setup, writes ./.env
npm run dev                    # node --watch server.js
```

In another terminal:

```bash
node bin/teletty.js tunnel     # cloudflared tunnel for HTTPS during dev
node bin/teletty.js doctor     # diagnostic
```

## Running tests

```bash
npm test
```

The suite is the Node built-in test runner — no external test framework. CI runs the same command on Node 20.x and 22.x.

## Project structure

| File                    | Purpose                                                                                |
|-------------------------|----------------------------------------------------------------------------------------|
| `server.js`             | Express + WebSocket entry point, auth, voice, `/api/exec`, per-WS agent dispatch       |
| `auth.js`               | Telegram Mini App HMAC verification, JWT sessions, whitelist                           |
| `terminal-manager.js`   | node-pty + tmux session lifecycle, idle timeout, opt-in audit (AUDIT_LOG_DIR)          |
| `output-parser.js`      | Multi-agent prompt detector + dangerous-command heuristic                              |
| `lib/agent-profiles.js` | Per-agent regex + button mappings + send strategy                                      |
| `public/`               | Frontend (vanilla JS, xterm.js — no build step, no bundler)                            |
| `bin/teletty.js`        | CLI entry point: `init`, `tunnel`, `doctor`, default = start                           |
| `test/`                 | Node built-in test runner fixtures                                                     |

## Guidelines

- **Zero build step.** No webpack, no vite, no TypeScript, no PostCSS. If your change needs one, find another way.
- **Plain Node.js + plain browser JS.** No React, no Tailwind, no UI library.
- **Comments rarely.** Names should explain what; comments explain *why* something non-obvious was done.
- **One feature per PR.** Reviewable diffs are merged faster.
- **Match existing style.** 2-space indent, single quotes, semicolons.
- **Tests must stay green.** Add a test for any logic change.

## Adding a new AI agent profile

This is the easiest way to contribute — most popular CLIs are missing or stale.

1. Capture a real prompt. Run the agent locally inside `script(1)` or `asciinema rec`, trigger the prompt the user has to answer, save the raw output (with ANSI codes is fine).
2. Append a profile to `PROFILES` in `lib/agent-profiles.js`:

   ```js
   {
     id: 'foo',                                    // stable identifier
     label: 'Foo CLI',                             // shown in the agent indicator pill
     detect: /Foo CLI v\d|foo\s+>\s/,              // matches anywhere in recent output
     prompts: [{
       match:  /Apply this change\? \[Y\/n\]/i,    // matches the last ~30 lines
       type:   'permission',                       // 'confirm' | 'permission' | 'options'
       items:  [{ key: 'y', label: 'Yes' }, { key: 'n', label: 'No' }],
       send:   'key+enter',                        // 'key+enter' | 'key' | 'enter'
     }],
   }
   ```

   `send` strategy:
   - `key+enter` (default): send the key followed by `\n`. Use this for `Y`/`n`/`1`/`2`/`3`-style prompts.
   - `key`: send only the keystroke, no newline. Use this for single-letter TUI shortcuts (Crush, some Bubble Tea apps).
   - `enter`: ignore the button's `key` and send only `\n`. Use this for "press Enter to continue" prompts.

3. Add fixture-style tests in `test/output-parser.test.js`:
   - Positive: a realistic banner + prompt → expect the right `agent`, `type`, `send`, and first `items.key`.
   - Negative: agent banner alone without a prompt → expect `null`.

4. `npm test` — must keep the suite green.
5. Update the supported-agent table in `README.md` and the changelog.

If you cannot capture a real prompt, open an issue with the [agent profile template](.github/ISSUE_TEMPLATE/agent_profile.md) instead. Guessed regexes have caused real bugs.

## Things to leave alone

- The 7 security layers in `auth.js` and `server.js`. Don't relax HMAC checks, IP binding, freshness window, rate limits, or PTY env sanitization.
- The dangerous-command heuristic. Add patterns; don't loosen existing ones.
- The single-process / no-build-step architecture.

## Reporting bugs

Use the [bug template](.github/ISSUE_TEMPLATE/bug_report.md). Include `teletty doctor` output. **Redact `BOT_TOKEN` and `SESSION_SECRET`** before pasting any logs.

## Reporting security issues

Do not open a public issue. Use [GitHub's private advisory form](https://github.com/olegchetrean/teletty/security/advisories/new). See [SECURITY.md](SECURITY.md) for the full policy.
