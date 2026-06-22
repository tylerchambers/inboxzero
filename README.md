# Inbox Zero

A dumb arcade game about the modern tragedy of email.

Emails pour into a hostile inbox. Read fast, choose the right action, and keep the queue below capacity for as long as possible. There is no victory state, character build, prestige loop, or productivity lesson. The inbox eventually wins.

## How it plays

Each email has one correct response:

| Email type | Correct action |
| --- | --- |
| Spam | Report Spam |
| Needs a reply | Reply |
| Needs a link click | Open Link |
| Urgent reply | Reply |
| Junk | Archive |

The pressure comes from volume and recognition speed:

- Ambient email spawn rate accelerates over time.
- Processing more email pushes the run into higher pressure.
- Ignored work and urgent emails can create follow-ups.
- Wrong actions can spawn consequences.
- The only loss condition is a full inbox.

## Running it

```sh
pnpm install
pnpm dev
```

Open the Vite URL for the player-facing game.

For the local debug cockpit:

```sh
pnpm dev:debug
```

## Project shape

Production and debug are separate app roots:

```text
index.html -> src/main.tsx -> src/ui/PlayableApp.tsx
debug.html -> src/debug.tsx -> src/ui/DebugApp.tsx
```

Gameplay logic lives in the deterministic simulation engine under `src/game/`. React renders state and dispatches player intent through the Zustand store in `src/ui/useGame.ts`.

Useful docs:

- `doc/APP.md` — premise, rules, and product shape.
- `doc/ARCHITECTURE.md` — engine/UI boundaries and state model.
- `doc/STYLE.md` — TypeScript, testing, and maintainability rules.

## Checks

```sh
pnpm test
pnpm build
pnpm lint
```
