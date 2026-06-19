import type { Draft } from "immer";
import { produce } from "immer";
import type { PlayerCommand } from "./commands";
import type { ScheduledSimEvent, SimEvent } from "./events";
import { updateDifficulty } from "./reducers/difficulty";
import { inboxIsFull } from "./reducers/emailLifecycle";
import { processEmail } from "./reducers/processEmail";
import { awardSurvivalTick } from "./reducers/score";
import { spawnEmail } from "./reducers/spawnEmail";
import { drainDueEvents } from "./scheduler";
import type { GameState } from "./state";
import { createInitialState } from "./state";

export type GameInput = SimEvent | PlayerCommand;

export function update(state: GameState, input: GameInput): GameState {
  switch (input.type) {
    case "TICK":
      return updateTick(state, input);
    case "SPAWN_EMAIL":
      return produce(state, (draft) => {
        spawnEmail(draft, input);
        checkGameOver(draft);
      });
    case "PROCESS_EMAIL":
      return produce(state, (draft) => {
        const didProcessEmail = processEmail(draft, input);
        if (didProcessEmail) {
          updateDifficulty(draft);
        }
        checkGameOver(draft);
      });
    case "PAUSE":
      return produce(state, (draft) => {
        if (draft.status === "running") {
          draft.status = "paused";
        }
      });
    case "RESUME":
      return produce(state, (draft) => {
        if (draft.status === "paused") {
          draft.status = "running";
        }
      });
    case "RESTART":
      return createInitialState({ capacity: state.inbox.capacity, rngSeed: state.rngSeed });
    case "GAME_OVER":
      return produce(state, (draft) => {
        draft.status = "gameOver";
      });
  }
}

function updateTick(state: GameState, event: Extract<SimEvent, { type: "TICK" }>): GameState {
  if (state.status !== "running") {
    return state;
  }

  return produce(state, (draft) => {
    draft.clock.now = event.now;
    draft.clock.elapsedMs += event.dt;
    draft.clock.tick += 1;

    awardSurvivalTick(draft, event.dt);
    updateDifficulty(draft);
    spawnDueEmails(draft);
    processDueScheduledEvents(draft);
    checkGameOver(draft);
  });
}

function spawnDueEmails(state: Draft<GameState>): void {
  while (
    state.difficulty.nextSpawnAt !== null &&
    state.difficulty.nextSpawnAt <= state.clock.now &&
    state.status === "running"
  ) {
    spawnEmail(state, {
      type: "SPAWN_EMAIL",
      source: "normal_spawn",
      count: state.difficulty.batchSize,
    });
    if (state.status !== "running") {
      break;
    }
    state.difficulty.nextSpawnAt += state.difficulty.spawnIntervalMs;
  }
}

function processDueScheduledEvents(state: Draft<GameState>): void {
  let dueEvents = drainDueEvents(state, state.clock.now);
  while (dueEvents.length > 0) {
    for (const scheduledEvent of dueEvents) {
      applyScheduledEvent(state, scheduledEvent.event);
      if (state.status !== "running") {
        return;
      }
    }
    dueEvents = drainDueEvents(state, state.clock.now);
  }
}

function applyScheduledEvent(state: Draft<GameState>, event: ScheduledSimEvent): void {
  switch (event.type) {
    case "SPAWN_EMAIL":
      spawnEmail(state, event);
      return;
    case "GAME_OVER":
      state.status = "gameOver";
      return;
  }
}

function checkGameOver(state: Draft<GameState>): void {
  if (inboxIsFull(state)) {
    state.status = "gameOver";
  }
}
