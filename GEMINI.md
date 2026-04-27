# GEMINI.md

Gemini CLI looks for this file. The full conventions for this repo live in [AGENTS.md](AGENTS.md). Read that first.

Quick summary:

- Plain Node.js (>= 20) + plain browser JS. No frameworks, no build step, no TypeScript.
- Run `npm test` after every change. The suite has 40 tests and must stay green.
- Add new agent profiles in `lib/agent-profiles.js` and matching tests in `test/output-parser.test.js`.
- Don't touch the 7 security layers (HMAC, IP-bound JWT, rate limits, PTY env sanitization, etc.).
- All secrets via `.env` (`.env.example` is the canonical list).
