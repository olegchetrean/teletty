---
name: New AI agent profile
about: Add prompt detection for an AI coding CLI not yet supported
title: 'Add agent profile: <agent name>'
labels: agent-profile
assignees: ''
---

## Agent
- Name:
- Install command: <!-- e.g. `npm i -g @vendor/agent` -->
- Docs URL:

## Prompt(s) the agent shows the user
For each interactive prompt the agent renders, include:

1. **Verbatim text** (ANSI-stripped, copy-paste from a real session):
   ```
   <prompt text here>
   ```
2. **Keys the user must press to answer**: e.g. `1` then Enter / single keystroke `a` / arrow keys + Enter
3. **A regex that uniquely matches the prompt** without false positives on plain shell output

## Skip mode
- Does the agent have a `--yolo` / `--auto` / `--yes-always` flag that skips prompts entirely? If yes, mention it so users know they have an alternative to teletty's auto-approve.

## Real-world capture
<!-- Best: a code-fenced block of the actual terminal bytes (with ANSI codes, if you can get them — `script` or `asciinema` works). Without a real capture, the regex is guesswork. -->
