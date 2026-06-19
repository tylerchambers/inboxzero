# AGENTS.md

This repository contains **Inbox Zero**, a small arcade email-triage game built with React, TypeScript, Vite, Zustand, and a deterministic simulation engine.

Project documentation lives under `doc/`.

## Read first

- `doc/APP.md` — game premise, current product shape, and player-facing rules.
- `doc/ARCHITECTURE.md` — core engine/UI boundaries and state decisions.
- `doc/STYLE.md` — TypeScript style, modularity, and testability expectations.

## Working rules

- Keep gameplay logic out of React components.
- Route meaningful state changes through `src/game/engine.ts` and reducers.
- Keep state normalized: ids in arrays, entities in records.
- Prefer pure functions and small typed modules over component-local logic.
- Test behavior through the engine, store, or rendered view boundary. Do not add mocks when a pure state fixture or real store is enough.
- Keep production and debug roots separate:
  - production: `index.html` -> `src/main.tsx` -> `src/ui/PlayableApp.tsx`
  - debug QA: `debug.html` -> `src/debug.tsx` -> `src/ui/DebugApp.tsx`
- Production must not expose debug controls, scheduled-event details, template ids, email ids, or thread ids.

## Commands

```sh
pnpm test
pnpm build
pnpm lint
```

Run focused checks while developing, then run the full set before handing off behavior changes.
