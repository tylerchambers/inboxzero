import type { Draft } from "immer";
import type { GameState } from "../state";

export function awardSurvivalTick(state: Draft<GameState>, dt: number): void {
  if (dt > 0 && state.status === "running") {
    state.score.value += Math.floor(dt / 1000);
  }
}
