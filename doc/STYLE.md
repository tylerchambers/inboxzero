# TypeScript Style

This is enterprise-level software engineering for the world's dumbest game.

Write boring, modular, testable TypeScript. The simulation should be easy to reason about six months from now, even when the game design changes.

## Principles

- Model domain rules with explicit types.
- Keep gameplay logic in pure functions or reducer-style modules.
- Keep React components thin: render state, collect user intent, dispatch commands.
- Prefer deterministic data over timers, globals, random side effects, or hidden mutable state.
- Test behavior at real boundaries. Do not add mocks when a plain state fixture, pure function, or real store works.
- Delete obsolete code. Do not keep compatibility shims, aliases, or dead abstractions.

## Module shape

Good modules have one reason to change.

```text
src/game/engine.ts                 orchestrates inputs
src/game/reducers/processEmail.ts  resolves one gameplay action
src/game/reducers/spawnEmail.ts    creates concrete emails
src/game/scheduler.ts              stores scheduled work as data
src/ui/useGame.ts                  adapts engine state to UI stores
```

Avoid files that mix engine rules, React state, rendering, and test helpers.

## Types first, but not type theater

Use types to encode real invariants.

Good:

```ts
type PlayerAction = "reply" | "open_link" | "archive" | "report_spam";

type Email = {
  id: EmailId;
  category: EmailCategory;
  threadId: ThreadId | null;
  state: "unprocessed" | "replicated";
};
```

Bad:

```ts
type Json = Record<string, unknown>;

type Emailish = {
  [key: string]: unknown;
};
```

If the engine depends on a field, name it and type it.

## Pure selectors over duplicated derivation

Keep derived state in small pure selectors when more than one caller needs it.

Good:

```ts
export function selectInboxEmails(state: GameState): Email[] {
  return state.inbox.emailIds.reduce<Email[]>((emails, id) => {
    const email = state.emails[id];
    if (email) {
      emails.push(email);
    }
    return emails;
  }, []);
}
```

This preserves inbox order and tolerates stale ids without teaching every component how normalized state works.

Bad:

```ts
const emails = state.inbox.emailIds.map((id) => state.emails[id]);
```

That leaks `undefined` into rendering and duplicates policy at every callsite.

## Reducers own rules

A component should not decide game outcomes.

Bad:

```tsx
function EmailCard({ email, setScore }: Props) {
  const archive = () => {
    if (email.category === "junk") {
      setScore((score) => score + 100);
    }
  };
}
```

Good:

```tsx
function EmailCard({ email, onProcessEmail }: Props) {
  return <button onClick={() => onProcessEmail(email.id, "archive")}>Archive</button>;
}
```

The reducer compares action to category, updates score, schedules consequences, and removes the email.

## Data-driven logic beats switch sprawl

Use lookup tables when the rule is a stable mapping.

Good:

```ts
export const correctActionByCategory: Record<EmailCategory, PlayerAction> = {
  spam: "report_spam",
  needs_reply: "reply",
  needs_link_click: "open_link",
  urgent_reply: "reply",
  junk: "archive",
};
```

Use a `switch` when behavior differs meaningfully per case and each branch has logic.

## Determinism over ambient effects

Scheduled work should be data in `GameState`, not live timers.

Good:

```ts
state.scheduled.push({
  id,
  dueAt: state.clock.now + 8000,
  event: { type: "SPAWN_EMAIL", source: "escalation", templateId },
});
```

Bad:

```ts
window.setTimeout(() => spawnEmail(templateId), 8000);
```

The data version can be tested with a `TICK`. The timer version needs fake timers, cleanup, and luck.

## Tests should not need mocks

Prefer testing pure behavior with real state.

Good:

```ts
const state = createInitialState();
const next = update(state, { type: "SPAWN_EMAIL", source: "manual", templateId: "team_question" });
expect(next.inbox.emailIds).toHaveLength(1);
```

Good:

```ts
const store = createGameStore({ mode: "playable", capacity: 2 });
store.getState().tick(5000);
expect(store.getState().state.status).toBe("running");
```

Bad:

```ts
const dispatch = vi.fn();
render(<Game dispatch={dispatch} />);
expect(dispatch).toHaveBeenCalledWith(expect.anything());
```

That verifies plumbing, not game behavior.

## React component rules

React components may hold view-only state, such as selected email id or checkbox state. They should not hold shadow gameplay state.

Good:

```ts
const [selectedEmailId, setSelectedEmailId] = useState<EmailId | null>(null);
```

Bad:

```ts
const [runStarted, setRunStarted] = useState(false);
```

If the engine has no `idle` status, the UI must not fake one. Add a real engine state and reducer tests instead.

## Production/debug separation

Keep production UI player-facing. Keep debug UI explicit and local.

Good:

```tsx
<PlayableEmailCard email={email} onProcessEmail={process} />
<DebugEmailCard email={email} onProcessEmail={process} />
```

Bad:

```tsx
<EmailCard email={email} showDebugMetadata={mode === "debug"} />
```

Separate cards make it harder to accidentally ship debug metadata.

## Naming

- Use domain names: `Email`, `EmailThread`, `ScheduledEvent`, `PlayerAction`.
- Use command names for callbacks: `onProcessEmail`, `onRestart`, `onPause`.
- Use selectors for derived reads: `selectInboxEmails`.
- Avoid vague names: `data`, `item`, `manager`, `handler`, `utils`.

## When adding a feature

1. Add or update domain types.
2. Implement engine/reducer behavior.
3. Add behavior tests at the engine boundary.
4. Expose only the needed store command or selector.
5. Render it in production or debug UI as appropriate.
6. Add view-boundary tests if production/debug separation matters.
7. Run `pnpm test`, `pnpm build`, and `pnpm lint`.
