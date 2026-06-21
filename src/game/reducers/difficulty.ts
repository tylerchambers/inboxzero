import type { Draft } from "immer";
import type { AmbientSpawnMode, DifficultyState, GameState, WeirdnessLevel } from "../state";

export const BASE_SPAWN_INTERVAL_MS = 5000;
export const MIN_SPAWN_INTERVAL_MS = 1000;
export const SPAWN_INTERVAL_STEP_MS = 500;
export const MS_PER_DIFFICULTY_LEVEL = 60000;
export const PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL = 6;
export type DifficultyCurve = Pick<DifficultyState, "level" | "spawnIntervalMs" | "batchSize">;

export function deriveDifficulty(input: { elapsedMs: number; processed: number }): DifficultyCurve {
  const elapsedProgressLevel = Math.floor(input.elapsedMs / MS_PER_DIFFICULTY_LEVEL);
  const processedProgressLevel = Math.floor(
    input.processed / PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
  );
  const progressLevel = Math.max(elapsedProgressLevel, processedProgressLevel);
  const level = progressLevel + 1;
  const spawnIntervalMs = Math.max(
    MIN_SPAWN_INTERVAL_MS,
    BASE_SPAWN_INTERVAL_MS - progressLevel * SPAWN_INTERVAL_STEP_MS,
  );
  const batchSize = progressLevel >= 5 ? 2 : 1;

  return { level, spawnIntervalMs, batchSize };
}

export function createInitialDifficultyState(
  options: { ambientSpawn?: AmbientSpawnMode } = {},
): DifficultyState {
  const difficulty = deriveDifficulty({ elapsedMs: 0, processed: 0 });
  return {
    ...difficulty,
    nextSpawnAt: options.ambientSpawn === "disabled" ? null : difficulty.spawnIntervalMs,
    weirdnessLevel: 0,
  };
}

export function getWeirdnessLevel(elapsedMs: number): WeirdnessLevel {
  const elapsedMinutes = Math.floor(elapsedMs / MS_PER_DIFFICULTY_LEVEL);
  if (elapsedMinutes >= 8) return 4;
  if (elapsedMinutes >= 6) return 3;
  if (elapsedMinutes >= 4) return 2;
  if (elapsedMinutes >= 2) return 1;
  return 0;
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
  state.difficulty.weirdnessLevel = getWeirdnessLevel(state.clock.elapsedMs);
}
