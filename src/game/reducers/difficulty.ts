import type { Draft } from "immer";
import type { GameState } from "../state";

export function updateDifficulty(state: Draft<GameState>): void {
  const elapsedMinutes = Math.floor(state.clock.elapsedMs / 60000);
  state.difficulty.level = elapsedMinutes + 1;
  state.difficulty.spawnIntervalMs = Math.max(1000, 5000 - elapsedMinutes * 500);
  state.difficulty.batchSize = elapsedMinutes >= 5 ? 2 : 1;
}
