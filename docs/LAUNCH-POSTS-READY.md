# teletty — ALL LAUNCH POSTS (Copy-Paste Ready)

**Repo:** https://github.com/olegchetrean/teletty
**Landing:** https://olegchetrean.github.io/teletty/
**Data lansare:** [SETEAZA DATA]

---

## REGULI IMPORTANTE

1. **X/Twitter:** NU pune link in tweet-ul principal (algoritm -50-90% reach). Link DOAR in reply.
2. **Reddit:** 90% valoare, 10% promovare. Nu spamui acelasi text.
3. **LinkedIn:** Tonul e profesional, nu casual.
4. **Telegram:** Scurt, direct, cu demo GIF daca posibil.
5. **Raspunde la FIECARE comentariu** in primele 60 minute pe orice platforma.

---

## 1. X / TWITTER

### 1A. LAUNCH TWEET (posteaza la 9:00 AM EST, marti-joi)

```
I put a full Linux terminal inside Telegram.

Then I connected it to Claude Code.

Now I can build, deploy, and fix servers — from my phone.

Here's teletty. Open source. Free.

Thread:
```

**REPLY IMEDIAT pe launch tweet (cu link-ul):**
```
GitHub: github.com/olegchetrean/teletty

889 lines of code. Zero frameworks. Zero build step.

Smart buttons + Claude Code approve/deny + voice input + multi-tab tmux.

Star it if you think every dev should have terminal access from their phone.

#opensource #devtools #ClaudeCode
```

---

### 1B. THREAD COMPLET (10 tweets, posteaza ca thread)

**Tweet 1/10:**
```
I put a full Linux terminal inside Telegram.

Then I connected it to Claude Code.

Now I can build, deploy, and fix servers — from my phone.

Here's teletty. Open source. Free.
```

**Tweet 2/10:**
```
The problem:

Server goes down at dinner.
CI/CD fails on the train.
Quick SSH fix needed, laptop is home.

You pull out your phone and... nothing works.
Termux is clunky. SSH apps timeout.
No AI assistance.
```

**Tweet 3/10:**
```
teletty fixes this.

It's a Telegram Mini App that gives you:

- Real terminal session on your phone
- Smart buttons (no tiny keyboard typing)
- Claude Code integration built-in
- One-tap approval for AI actions

All inside an app you already have: Telegram.
```

**Tweet 4/10:**
```
Here's what it looks like:

1. Open Telegram
2. Launch teletty
3. Ask Claude Code to fix the bug
4. Review the diff
5. Tap "Approve"
6. Done. From your phone.

[ATASEAZA: video demo 30 sec SAU GIF cu terminalul in Telegram]
```

**Tweet 5/10:**
```
Why Telegram and not a standalone app?

- 1 billion monthly users already have it
- Mini Apps = zero install friction
- Push notifications built-in
- Works on any phone, any OS
- You can share terminal sessions in chat

Meet your users where they already are.
```

**Tweet 6/10:**
```
The Claude Code integration is the killer feature.

You're not just running bash commands on your phone.

You're running an AI coding agent that can:
- Read your codebase
- Write fixes
- Run tests
- Deploy changes

And YOU approve every action with one tap.
```

**Tweet 7/10:**
```
Typing commands on a phone keyboard = pain.

teletty has smart context-aware buttons:

- Y/n confirmations become [Yes] [No]
- Numbered options become [1] [2] [3]
- Claude Code prompts become [Allow] [Deny]
- Dangerous commands highlighted in RED

It's a Stream Deck for your terminal.
```

**Tweet 8/10:**
```
Real use cases:

- Emergency server fix from a restaurant
- Reviewing PRs on the subway
- Running deployments from the couch
- Monitoring logs while walking the dog
- Quick git operations between meetings

Your phone is now a dev machine.
```

**Tweet 9/10:**
```
teletty is 100% open source.

MIT licensed.
Self-hostable.
No telemetry.
No vendor lock-in.
889 lines of code.
7 files.
Zero frameworks.

Star it. Fork it. Break it. Improve it.
```

**Tweet 10/10:**
```
If you've ever wished you could code from your phone without it being terrible — try teletty.

Star it, I'd appreciate it.

What would YOU build with a terminal on your phone?

#opensource #buildinpublic #devtools
```

**REPLY pe tweet 10/10 (cu link):**
```
github.com/olegchetrean/teletty

Install in 60 seconds:
npx teletty init && npx teletty

Or Docker:
docker compose up -d
```

---

### 1C. TWEET-URI INDIVIDUALE (pentru zilele urmatoare)

**Ziua 2 — Social proof:**
```
teletty got [X] stars in [Y] hours.

Top 3 feature requests so far:
1. [feature]
2. [feature]
3. [feature]

What else would you want from a phone terminal?

#opensource
```

**Ziua 3 — Technical angle:**
```
teletty's smart button engine in 88 lines:

It scans terminal output for patterns:
- [Y/n] prompts
- Numbered options (1, 2, 3...)
- Claude Code Allow/Deny
- "Press Enter to continue"

Then renders one-tap buttons.

No AI needed. Just regex.

github.com/olegchetrean/teletty
```

**Ziua 4 — Hot take:**
```
Hot take:

In 2026, not being able to deploy from your phone is like not having mobile email in 2010.

The tooling just wasn't there.

Until now.
```

**Ziua 5 — Behind the scenes:**
```
Architecture of teletty in one diagram:

Telegram -> Mini App WebView
  -> POST /auth (HMAC-SHA256)
  -> WebSocket (wss://)
  -> node-pty -> tmux
  -> xterm.js renders terminal
  -> output-parser -> smart buttons

889 lines. 7 files. That's it.
```

**Ziua 7 — Week recap:**
```
Week 1 of teletty:

Stars: [X]
Forks: [X]
Issues: [X]
PRs: [X]

Top surprise: [something unexpected]

What I'm building next: [feature]

Thank you to everyone who starred, shared, and contributed.
```

---

## 2. REDDIT

### r/selfhosted

**Title:** `I built teletty - a self-hosted Telegram Mini App that gives you a full terminal on your phone`

**Body:**
```
Hey r/selfhosted!

I built teletty because I kept needing terminal access when I was away from my laptop. SSH apps are clunky on mobile, and I wanted something that just works.

**What it is:** A Telegram Mini App that connects to your server via WebSocket and gives you a full terminal with xterm.js + tmux. Sessions persist across disconnects.

**Why it's different:**
- Smart buttons — detects Y/n prompts, numbered options, etc. and shows one-tap buttons (huge on mobile)
- Claude Code integration — approve/deny AI actions from your phone
- Voice input — dictate commands with push-to-talk
- Multi-tab — up to 4 concurrent tmux sessions
- Telegram auth — HMAC-SHA256, no passwords to manage

**Tech:** Node.js, Express, ws, node-pty, xterm.js. 889 lines total. Zero frameworks.

**Install:**
```
npx teletty init && npx teletty
# or
docker compose up -d
```

**Self-hosted:** Runs on any VPS. Needs Node.js 18+ and tmux. HTTPS required (Telegram Mini App requirement).

**GitHub:** https://github.com/olegchetrean/teletty

MIT licensed, no telemetry, no external dependencies at runtime.

Happy to answer any questions!
```

---

### r/commandline

**Title:** `teletty: full terminal on your phone via Telegram Mini App, with smart buttons for interactive prompts`

**Body:**
```
I built a terminal tool for those moments when you need shell access but only have your phone.

teletty is a Telegram Mini App that gives you a real terminal session:
- xterm.js frontend + WebSocket + node-pty + tmux backend
- Smart buttons: detects Y/n, numbered options, Allow/Deny and renders clickable buttons (game changer on mobile keyboards)
- Multi-tab: up to 4 concurrent tmux sessions
- Sessions survive disconnects (tmux persistence)

The output parser is 88 lines of regex that detects 7 types of interactive prompts. No AI/ML needed for the detection — just pattern matching.

It also has Claude Code CLI integration — recognizes approve/deny prompts and renders them as buttons, plus an auto-approve mode with safety checks (won't auto-approve rm -rf, DROP, etc.).

889 lines total. Vanilla JS. No build step.

https://github.com/olegchetrean/teletty

Would love feedback from the CLI community on the output parser patterns — are there prompt types I'm missing?
```

---

### r/programming

**Title:** `I built a Telegram Mini App terminal in 889 lines with smart buttons for interactive prompts`

**Body:**
```
Sharing a weekend project that turned into something useful.

**Problem:** I needed terminal access from my phone. Existing options (SSH apps, Termux) are clunky on mobile. Typing "yes" + Enter on a phone keyboard 50 times during a deployment is painful.

**Solution:** teletty — a Telegram Mini App that gives you a real terminal with smart buttons.

**How smart buttons work:**
The output parser (88 lines) scans terminal output for patterns:
- `[Y/n]` -> renders [Yes] [No] buttons
- `1) Option A  2) Option B` -> renders [1: Option A] [2: Option B]
- `Allow / Deny` -> renders [Allow] [Deny] buttons
- Dangerous commands (rm -rf, DROP) -> buttons highlighted red

**Architecture:**
```
Telegram WebView -> Express + WebSocket server
  -> node-pty spawns tmux session
  -> xterm.js renders in browser
  -> output-parser detects prompts
  -> frontend renders smart buttons
```

**Stats:** 889 lines, 7 files, zero frameworks, zero build step, zero transpilation.

**Security:** Telegram HMAC-SHA256 auth, IP-bound JWT, timing-safe comparisons, sanitized PTY env.

GitHub: https://github.com/olegchetrean/teletty

MIT licensed. Feedback welcome.
```

---

### r/ClaudeAI

**Title:** `I built teletty — run Claude Code from your phone via Telegram, with one-tap approve/deny buttons`

**Body:**
```
I use Claude Code daily but kept running into situations where I needed to approve actions while away from my laptop.

So I built teletty — a Telegram Mini App that gives you a full terminal on your phone with built-in Claude Code support.

**How it works with Claude Code:**
- Detects Claude Code permission prompts (Allow/Deny, "Do you want to proceed?", tool permissions)
- Renders them as one-tap smart buttons
- Auto-approve mode: automatically accepts safe prompts, blocks dangerous ones (rm -rf, DROP, DELETE)
- Two-click activation for safety (first click = "Confirm?", second = active)
- Auto-disables after 10 minutes

**Use case:** Start a Claude Code session on your server, leave for lunch, approve/deny actions from your phone in Telegram.

The terminal itself is full xterm.js + tmux, so sessions persist even if you disconnect.

889 lines, MIT licensed, self-hosted: https://github.com/olegchetrean/teletty

Anyone else running Claude Code remotely? Curious what workflows you use.
```

---

### r/homelab

**Title:** `teletty - manage your homelab from Telegram with a full terminal + smart buttons`

**Body:**
```
Fellow homelabbers — built a tool that might save you some trips to the basement.

teletty is a self-hosted Telegram Mini App that gives you a full terminal on your phone.

**Homelab use cases:**
- Check docker logs from the couch
- Restart services while away
- Emergency access when SSH apps fail
- Management API (HTTPS) when SSH is completely down
- Quick git pulls and deployments

**Features:**
- Real terminal (xterm.js + tmux, sessions persist)
- Smart buttons (one-tap for Y/n prompts — no more typing on phone keyboards)
- Multi-tab (4 concurrent sessions)
- Voice commands (push-to-talk)
- Telegram auth (no passwords to manage, whitelist by user ID)

**Install:**
```
git clone https://github.com/olegchetrean/teletty && cd teletty
cp .env.example .env && nano .env
docker compose up -d
```

Needs HTTPS (Telegram requirement) — I use Caddy for auto-SSL.

MIT licensed, 889 lines: https://github.com/olegchetrean/teletty
```

---

## 3. LINKEDIN

**Post (professional tone, first person):**

```
I just open-sourced teletty — a tool I built to solve a problem every developer knows:

You need terminal access. Your laptop isn't with you. Your phone is useless.

teletty is a Telegram Mini App that gives you a full terminal session on your phone. But what makes it different is smart buttons: it detects interactive prompts (Y/n confirmations, numbered options, permission dialogs) and renders them as one-tap buttons.

No more typing "yes" + Enter on a phone keyboard 50 times during a deployment.

It also integrates with Claude Code CLI — you can run AI coding agents from your phone and approve/deny actions with a single tap.

The technical details:
-- 889 lines of JavaScript across 7 files
-- Zero frameworks, zero build step
-- Telegram HMAC-SHA256 authentication
-- tmux sessions that survive disconnects
-- Voice input for hands-free operation

Why Telegram? 1 billion monthly users already have it. Mini Apps open instantly — zero install friction. Push notifications built-in.

I built this at MEGA PROMOTING as part of our work on AI-powered development tools.

MIT licensed: https://github.com/olegchetrean/teletty

If you've ever needed server access from your phone — give it a try.

#opensource #devtools #telegram #ClaudeCode #developer
```

---

## 4. TELEGRAM

### Telegram Developer Groups

**Short version (for groups that don't allow long posts):**
```
teletty — open source Telegram Mini App terminal

Full terminal on your phone via Telegram. Smart buttons for interactive prompts, Claude Code integration, voice input, multi-tab tmux.

889 lines, MIT licensed.

github.com/olegchetrean/teletty
```

**Medium version (for developer groups):**
```
Just open-sourced teletty — a Telegram Mini App that gives you a full terminal on your phone.

What makes it different from SSH apps:
- Smart buttons: detects Y/n, numbered options, Allow/Deny and shows one-tap buttons
- Claude Code integration: approve/deny AI actions from Telegram
- Auto-approve mode with safety checks
- tmux sessions that persist across disconnects
- Voice commands (push-to-talk)

889 lines of vanilla JS. Node.js + Express + WebSocket + xterm.js + tmux.

Zero frameworks. Zero build step. MIT licensed.

Install: npx teletty init && npx teletty
Docker: docker compose up -d

GitHub: github.com/olegchetrean/teletty

Feedback welcome!
```

### Specific Telegram Groups to Post In

1. **@tikitech** — Telegram Mini Apps developers
2. **@BotDevelopment** — Bot development community
3. **@nodejs_ru** / **@nodejsen** — Node.js communities
4. **@selfhosted_chat** — Self-hosted enthusiasts
5. **@webdevs** — Web developers
6. **@javascript_en** — JavaScript community

---

## 5. DEV.TO

### Article: "How I Built a Full Terminal Inside Telegram in 889 Lines"

**Tags:** #opensource #terminal #telegram #javascript

**Intro:**
```
Every developer has been there. Server goes down, you're on a bus, and all you have is your phone. SSH apps are clunky. Typing commands on a tiny keyboard is painful.

So I built teletty — a Telegram Mini App that gives you a real terminal with smart buttons. Here's how.
```

**Sections:**
1. The Problem (mobile terminal UX is terrible)
2. Why Telegram Mini Apps? (1B users, zero install, push notifications)
3. Architecture (diagram + explanation)
4. The Smart Button Engine (show output-parser.js code)
5. Security (HMAC-SHA256, JWT, timing-safe)
6. Claude Code Integration (auto-approve with safety)
7. What I Learned (lessons from building it)
8. Try It (install instructions)

**CTA:**
```
Star it on GitHub: github.com/olegchetrean/teletty

Feedback, issues, and PRs welcome. What features would you add?
```

---

## 6. HACKER NEWS

### Show HN Post

**Title:**
```
Show HN: teletty – Full terminal on your phone via Telegram, with smart buttons
```

**URL:** `https://github.com/olegchetrean/teletty`

**Comment (post immediately after submission):**
```
Hi HN! I built teletty because I kept needing terminal access from my phone.

The key insight: typing on a phone keyboard is painful for terminal work. So teletty detects interactive prompts (Y/n, numbered options, Allow/Deny) and renders them as one-tap buttons. The output parser is 88 lines of regex — no ML needed.

It also has Claude Code integration: you can run AI coding agents from your phone and approve/deny actions with a tap.

Tech: Node.js + Express + WebSocket + node-pty + xterm.js + tmux. 889 lines total. Zero frameworks. Vanilla JS. No build step.

Auth: Telegram's HMAC-SHA256 verification + IP-bound JWT + user whitelist. Timing-safe comparisons everywhere.

Happy to answer questions about the architecture or the Telegram Mini App platform.
```

**REGULI HN:**
- NU cere upvotes (HN penalizeaza)
- Raspunde la FIECARE comentariu, tehnic si detaliat
- Fii modest — "weekend project", nu "revolutionary"
- NU folosi superlative ("best", "amazing")
- Link direct la GitHub, nu la landing page

---

## 7. AWESOME LISTS (GitHub PRs)

### Repos unde sa faci PR:

1. **awesome-telegram-mini-apps** — `github.com/nicesnippets/awesome-telegram-mini-apps`
   - Add teletty to the list with description

2. **awesome-selfhosted** — `github.com/awesome-selfhosted/awesome-selfhosted`
   - Category: "Remote Access"
   - Format: `- [teletty](https://github.com/olegchetrean/teletty) - Full terminal via Telegram Mini App with smart buttons, Claude Code integration. `MIT` `JavaScript/Node.js``

3. **awesome-ssh** — `github.com/moul/awesome-ssh`
   - Category: "Web"

4. **awesome-cli-apps** — `github.com/agarrharr/awesome-cli-apps`
   - Category: "Utilities > Terminal"

5. **terminals-are-sexy** — `github.com/k4m4/terminals-are-sexy`
   - Category: "Terminal Emulation Applications"

6. **awesome-telegram** — `github.com/ebertti/awesome-telegram`
   - Category: "Bot Tools"

---

## 8. TELEGRAM APPS CENTER (@tapps)

### Submission

1. Deschide @tapps in Telegram
2. Submit Mini App cu:
   - **Name:** teletty
   - **Short description:** Full terminal on your phone with smart buttons
   - **Category:** Developer Tools / Utilities
   - **Bot username:** @[your_bot_username]
   - **Screenshots:** 3-5 screenshots cu terminalul deschis, smart buttons, multi-tab

**Timp moderare:** 3-8 zile

---

## 9. NEWSLETTERE (email submissions)

1. **TLDR Newsletter** (7M+ subscribers) — tldr.tech/submit
2. **Console** (dev tools weekly) — console.dev/submit
3. **Node Weekly** — nodeweekly.com/submit
4. **JavaScript Weekly** — javascriptweekly.com/submit
5. **Changelog** — changelog.com/submit

**Format email submission:**
```
Subject: teletty — Full terminal on your phone via Telegram Mini App

Hi,

I just open-sourced teletty, a Telegram Mini App that gives you a full terminal on your phone.

What makes it unique: it detects interactive terminal prompts (Y/n, numbered options, Allow/Deny) and renders them as one-tap smart buttons. It also integrates with Claude Code CLI for AI-assisted coding from mobile.

889 lines of vanilla JS. MIT licensed. Zero frameworks.

GitHub: github.com/olegchetrean/teletty

Thanks for considering it for [newsletter name]!

Oleg Chetrean
MEGA PROMOTING
```

---

## CHECKLIST LAUNCH DAY

```
BEFORE POSTING:
[ ] Video demo recorded (30-60 sec screen recording of terminal in Telegram)
[ ] GIF created from video (for Twitter/Reddit)
[ ] GitHub README has hero GIF at the top
[ ] All links verified working
[ ] Bot configured in Telegram (@BotFather menu button set)

LAUNCH DAY SCHEDULE:
[ ] 8:00 AM EST — Post X/Twitter launch thread
[ ] 8:01 AM EST — Reply to thread with GitHub link
[ ] 8:05 AM EST — Post on LinkedIn
[ ] 9:00 AM EST — Submit to Hacker News (Show HN)
[ ] 9:01 AM EST — Comment on own HN post
[ ] 9:30 AM EST — Post on r/selfhosted
[ ] 9:45 AM EST — Post on r/commandline
[ ] 10:00 AM EST — Post on r/programming
[ ] 10:15 AM EST — Post on r/ClaudeAI
[ ] 10:30 AM EST — Post on r/homelab
[ ] 11:00 AM EST — Post in Telegram developer groups
[ ] 12:00 PM EST — Submit to Dev.to
[ ] 12:30 PM EST — Submit to Product Hunt / DevHunt
[ ] Ongoing — Submit awesome list PRs
[ ] Ongoing — Submit to newsletters
[ ] Ongoing — Reply to EVERY comment (first 4 hours critical)

POST LAUNCH:
[ ] Track GitHub stars hourly
[ ] Screenshot milestones for social proof tweets
[ ] Respond to all GitHub issues within 2 hours
[ ] Post day 2 "social proof" tweet
[ ] Post day 3 "technical angle" tweet
```
