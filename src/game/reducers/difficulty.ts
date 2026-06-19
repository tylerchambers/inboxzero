import type { Draft } from "immer";
import type { AmbientSpawnMode, DifficultyState, GameState } from "../state";

export const BASE_SPAWN_INTERVAL_MS = 5000;
export const MIN_SPAWN_INTERVAL_MS = 1500;
export const SPAWN_INTERVAL_STEP_MS = 300;
export const ELAPSED_MS_PER_DIFFICULTY_LEVEL = 30000;
export const PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL = 6;
export const LEVELS_PER_BATCH_INCREASE = 9;
export const MAX_BATCH_SIZE = 2;
export type DifficultyCurve = Pick<DifficultyState, "level" | "spawnIntervalMs" | "batchSize">;

export function deriveDifficulty(input: { elapsedMs: number; processed: number }): DifficultyCurve {
  const timeProgressLevel = Math.floor(input.elapsedMs / ELAPSED_MS_PER_DIFFICULTY_LEVEL);
  const processedProgressLevel = Math.floor(
    input.processed / PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
  );
  const level = Math.max(timeProgressLevel, processedProgressLevel) + 1;
  const spawnIntervalMs = Math.max(
    MIN_SPAWN_INTERVAL_MS,
    BASE_SPAWN_INTERVAL_MS - (level - 1) * SPAWN_INTERVAL_STEP_MS,
  );
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    1 + Math.floor((level - 1) / LEVELS_PER_BATCH_INCREASE),
  );

  return { level, spawnIntervalMs, batchSize };
}

export function createInitialDifficultyState(
  options: { ambientSpawn?: AmbientSpawnMode } = {},
): DifficultyState {
  const difficulty = deriveDifficulty({ elapsedMs: 0, processed: 0 });
  return {
    ...difficulty,
    nextSpawnAt: options.ambientSpawn === "disabled" ? null : difficulty.spawnIntervalMs,
  };
}

export function updateDifficulty(state: Draft<GameState>): void {
  const previousSpawnIntervalMs = state.difficulty.spawnIntervalMs;
  const next = deriveDifficulty({
    elapsedMs: state.clock.elapsedMs,
    processed: state.score.processed,
  });

  state.difficulty.level = next.level;
  if (next.spawnIntervalMs < previousSpawnIntervalMs && state.difficulty.nextSpawnAt !== null) {
    state.difficulty.nextSpawnAt = Math.min(
      state.difficulty.nextSpawnAt,
      state.clock.now + next.spawnIntervalMs,
    );
  }
  state.difficulty.spawnIntervalMs = next.spawnIntervalMs;
  state.difficulty.batchSize = next.batchSize;
}
