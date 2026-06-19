import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { type GameInput, update } from "../game/engine";
import {
  createInitialState,
  type Email,
  type EmailId,
  type GameState,
  type PlayerAction,
  type TemplateId,
} from "../game/state";

const DEFAULT_TICK_MS = 1000;

function createDebugInitialState(): GameState {
  const state = createInitialState();
  return {
    ...state,
    difficulty: {
      ...state.difficulty,
      nextSpawnAt: Number.MAX_SAFE_INTEGER,
    },
  };
}

export const PLAYABLE_INBOX_CAPACITY = 12;
export function selectInboxEmails(state: GameState): Email[] {
  return state.inbox.emailIds.reduce<Email[]>((emails, id) => {
    const email = state.emails[id];
    if (email) {
      emails.push(email);
    }
    return emails;
  }, []);
}

export type CreateGameStoreOptions =
  | { mode?: "debug" }
  | { mode: "playable"; capacity?: number }
  | { initialState: GameState };

export type GameStoreState = {
  state: GameState;
  dispatch: (input: GameInput) => void;
  tick: (dt?: number) => void;
  spawn: (templateId?: TemplateId) => void;
  process: (emailId: EmailId, action: PlayerAction) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
};

export function createGameStore(
  options: CreateGameStoreOptions = { mode: "debug" },
): StoreApi<GameStoreState> {
  const restartStateFactory = createRestartStateFactory(options);

  return createStore<GameStoreState>((set, get) => ({
    state: restartStateFactory(),
    dispatch: (input) => {
      set({ state: update(get().state, input) });
    },
    tick: (dt = DEFAULT_TICK_MS) => {
      const current = get().state;
      get().dispatch({ type: "TICK", now: current.clock.now + dt, dt });
    },
    spawn: (templateId) => {
      if (templateId === undefined) {
        get().dispatch({ type: "SPAWN_EMAIL", source: "manual" });
        return;
      }

      get().dispatch({ type: "SPAWN_EMAIL", source: "manual", templateId });
    },
    process: (emailId, action) => {
      get().dispatch({ type: "PROCESS_EMAIL", emailId, action });
    },
    pause: () => {
      get().dispatch({ type: "PAUSE" });
    },
    resume: () => {
      get().dispatch({ type: "RESUME" });
    },
    restart: () => {
      set({ state: restartStateFactory() });
    },
  }));
}

function createRestartStateFactory(options: CreateGameStoreOptions): () => GameState {
  if ("initialState" in options) {
    const restartState = structuredClone(options.initialState);
    return () => structuredClone(restartState);
  }

  if (options.mode === "playable") {
    const capacity = options.capacity ?? PLAYABLE_INBOX_CAPACITY;
    return () => createInitialState({ capacity });
  }

  return createDebugInitialState;
}

export const debugGameStore = createGameStore({ mode: "debug" });
export const playableGameStore = createGameStore({ mode: "playable" });

export function useGameStore<T>(
  store: StoreApi<GameStoreState>,
  selector: (store: GameStoreState) => T,
): T {
  return useStore(store, selector);
}
