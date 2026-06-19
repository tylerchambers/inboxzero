# Architecture

Inbox Zero uses a deterministic simulation engine with React as a renderer and command surface.

```text
React UI
  subscribes to
Zustand store
  dispatches into
Simulation engine
  updates
Normalized game state
```

## Core boundary

React components do not own gameplay rules.

React may:

- render `GameState`
- keep view-only selection state
- dispatch player commands and simulation events through the store

React must not:

- decide whether an action is correct
- mutate inbox, email, score, thread, difficulty, or scheduler state directly
- create per-email timers
- duplicate engine selectors except for view-local presentation

Meaningful game changes go through `src/game/engine.ts`.

## Engine input model

The engine consumes two kinds of input.

Player commands are intentional:

```ts
type PlayerCommand =
  | { type: "PROCESS_EMAIL"; emailId: EmailId; action: PlayerAction }
  | { type: "PAUSE" }
  | { type: "RESUME" };
```

Simulation events are facts:

```ts
type SimEvent =
  | { type: "TICK"; now: number; dt: number }
  | { type: "SPAWN_EMAIL"; source: SpawnSource; templateId?: TemplateId };
```

Rule: commands are intent, events are facts, reducers consume both through `update`.

## State shape

Game state is normalized.

```ts
type GameState = {
  status: "running" | "paused" | "gameOver";
  clock: ClockState;
  inbox: { capacity: number; emailIds: EmailId[] };
  emails: Record<EmailId, Email>;
  threads: Record<ThreadId, EmailThread>;
  scheduled: ScheduledEvent[];
  score: ScoreState;
  difficulty: DifficultyState;
  lastActionResult: ActionResult | null;
  rngSeed: string;
};
```

Use ids for relationships. Avoid nested object graphs such as thread -> email -> thread. Normalized state keeps updates cheap, serialization simple, and tests precise.

## Scheduler

The engine owns the scheduler. Do not create JavaScript timers for individual emails or threads.

Scheduled work is represented as data:

```ts
type ScheduledEvent = {
  id: ScheduledEventId;
  dueAt: number;
  event: ScheduledSimEvent;
};
```

`TICK` advances time, drains due events, applies scheduled simulation events, updates difficulty, spawns due ambient emails, and checks game over.

This keeps runs deterministic and testable.

## Store boundary

`src/ui/useGame.ts` adapts the engine to UI.

Current store modes:

```text
createGameStore()                      -> quiet debug default
createGameStore({ mode: "debug" })     -> quiet/manual debug state
createGameStore({ mode: "playable" })  -> ambient playable state, capacity 12
createGameStore({ initialState })      -> cloned custom baseline
```

Exports:

- `debugGameStore` for `DebugApp`
- `playableGameStore` for `PlayableApp`
- `selectInboxEmails(state)` for ordered inbox rendering with stale-id tolerance

## Production/debug split

Production and debug are separate roots, not runtime modes inside one root.

Production build input is explicitly `index.html`. `debug.html` is served by Vite dev but is not a production HTML entry.

Do not reintroduce:

- root mode toggles
- a combined `App` that knows about both production and debug
- `showMetadata` props on shared cards
- debug metadata in shared production components

Share only small controls and view helpers that do not know whether debug exists.

## Processing email

Processing an email should follow this path:

```text
Player action
  -> processEmail reducer
  -> compare action to correctActionByCategory[email.category]
  -> update score and lastActionResult
  -> remove or transform email
  -> schedule consequences when needed
```

Correct actions remove the email, award score, and preserve/carry streak.

Wrong actions remove the original, penalize score/streak/mistakes, and may schedule consequence emails. Delay-zero consequences are scheduled at `state.clock.now`; they are spawned by the next tick, not inline inside `processEmail`.

## Cancellation and parent ids

Ignored-email follow-ups use `parentEmailId` because they are scheduled while the parent exists. Processing the parent removes matching scheduled follow-ups.

Wrong-action consequences intentionally omit `parentEmailId`: the original email is removed before consequences are spawned. Do not add parent ids there unless reducer ordering changes and stale-parent/thread tests cover it.

## Testing strategy

Prefer tests at stable boundaries:

- pure reducers and engine behavior in `src/game/engine.test.ts`
- store behavior in `src/ui/useGame.test.ts`
- production/debug rendering boundaries in `src/main.test.tsx`

Use real state fixtures and real stores. Avoid mocks unless the dependency is genuinely external and non-deterministic.
