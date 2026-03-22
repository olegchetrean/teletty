# Contributing to teletty

Thanks for your interest in contributing!

## Development Setup

1. Fork and clone the repo
2. `cp .env.example .env` and configure
3. `npm install`
4. `npm run dev` (starts with --watch)

## Running Tests

```bash
npm test
```

## Project Structure

| File | Purpose |
|------|---------|
| `server.js` | Express + WebSocket server |
| `auth.js` | Telegram auth + JWT sessions |
| `terminal-manager.js` | tmux session management |
| `output-parser.js` | Smart prompt detection |
| `public/` | Frontend (vanilla JS, no build step) |

## Guidelines

- Keep it simple — no build tools, no frameworks, no transpilation
- Test your changes: `npm test`
- One feature per PR
- Write clear commit messages

## Adding Smart Button Patterns

To add a new prompt pattern, edit `output-parser.js`:

1. Add your regex pattern in the `parseOutput` function
2. Return `{ type, items, dangerous }` matching existing format
3. Add tests in `test/output-parser.test.js`

## Reporting Bugs

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
