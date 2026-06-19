# Inbox Zero

Inbox Zero is a fast arcade game about processing email before the inbox fills. It is intentionally stupid in premise and serious in implementation: Tetris pressure, Papers Please-style recognition, and modern-email dread.

## Core premise

Emails arrive continuously. The player reads each message and chooses the correct action before the inbox reaches capacity.

There is one losing condition:

```text
inbox count >= inbox capacity -> game over
```

There is no health bar, energy meter, mana, prestige loop, or win condition. The run continues until the inbox collapses.

## Player actions

Every email has exactly one correct action, derived from its category.

| Email category | Correct action |
| --- | --- |
| `spam` | Report Spam |
| `needs_reply` | Reply |
| `needs_link_click` | Open Link |
| `urgent_reply` | Reply |
| `junk` | Archive |

The player sees sender, subject, preview text, urgency, and age. The player should not see debug ids, templates, thread ids, or category labels in production.

## Pressure loops

The game is about preventing future inbox growth, not simply clearing current messages.

Current pressure sources:

- Ambient spawn rate accelerates from elapsed time and processed-email count, so correct clearing and spam-clicked wrong clearing both move the run into higher pressure.
- Ignored urgent emails scheduling urgent follow-ups.
- Ignored ordinary work emails scheduling thread follow-ups.
- Wrong actions scheduling consequence emails.

Good penalties are material. They create more inbox.

## Current product shape

There are two app roots.

```text
index.html
  -> src/main.tsx
  -> src/ui/PlayableApp.tsx
  -> production player app

debug.html
  -> src/debug.tsx
  -> src/ui/DebugApp.tsx
  -> local QA cockpit
```

Production starts in a running engine state. It shows:

- inbox pressure
- score, processed count, mistakes, streak
- Restart Run
- Pause / Resume
- player-facing email cards
- action feedback

Production must not show:

- manual tick controls
- auto tick
- spawn controls
- scheduled-event internals
- email template lists
- category, template, email id, or thread id metadata

Debug is a local QA tool. It may show deterministic controls, manual spawning, scheduled events, template ids, and other simulation internals.

## Current content model

Emails are generated from templates in `src/game/content/templates.ts`. Templates encode category, urgency, sender, subject, preview, and thread behavior.

Known template families:

- ordinary work thread: `team_question`, `checking_on_rollout`, `adding_project_channel`
- link workflow: `document_approval`
- junk/newsletter: `newsletter`
- spam/phishing: `fake_security_alert`
- urgent escalation: `need_budget_numbers`, `following_up`, `need_response_asap`

Wrong-action consequence rules live in `src/game/content/replicationRules.ts`.

## Design north star

The game should feel closer to Tetris than an idle game.

The player is not managing a character. The player is managing a hostile queue. Difficulty should increase mostly through volume, timing, and recognition pressure, not by adding unrelated mechanics.
