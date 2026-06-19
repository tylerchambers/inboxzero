import type { Draft } from "immer";
import { produce } from "immer";
import type { ScheduledEvent, ScheduledSimEvent } from "./events";
import type { GameState } from "./state";

export type DueEventsResult = {
  state: GameState;
  events: ScheduledEvent[];
};

export function schedule(state: GameState, event: ScheduledSimEvent, dueAt: number): GameState {
  return produce(state, (draft) => {
    scheduleInto(draft, event, dueAt);
  });
}

export function scheduleInto(
  state: Draft<GameState>,
  event: ScheduledSimEvent,
  dueAt: number,
): ScheduledEvent {
  const scheduledEvent: ScheduledEvent = {
    id: `scheduled_${state.nextScheduledEventId}`,
    dueAt,
    event,
  };

  state.nextScheduledEventId += 1;
  state.scheduled.push(scheduledEvent);
  state.scheduled.sort((left, right) => left.dueAt - right.dueAt);

  return scheduledEvent;
}

export function processDueEvents(state: GameState, now: number): DueEventsResult {
  const events = collectDueEvents(state.scheduled, now);
  const dueIds = new Set(events.map((event) => event.id));

  return {
    state: produce(state, (draft) => {
      draft.scheduled = draft.scheduled.filter((event) => !dueIds.has(event.id));
    }),
    events,
  };
}

export function drainDueEvents(state: Draft<GameState>, now: number): ScheduledEvent[] {
  const events = collectDueEvents(state.scheduled, now);
  const dueIds = new Set(events.map((event) => event.id));
  state.scheduled = state.scheduled.filter((event) => !dueIds.has(event.id));
  return events;
}

function collectDueEvents(events: readonly ScheduledEvent[], now: number): ScheduledEvent[] {
  return events
    .filter((event) => event.dueAt <= now)
    .sort((left, right) => left.dueAt - right.dueAt);
}
