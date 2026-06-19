import type { Draft } from "immer";
import type { PlayerCommand } from "../commands";
import { wrongActionReplicationRules } from "../content/replicationRules";
import { scheduleInto } from "../scheduler";
import type { EmailCategory, GameState, PlayerAction } from "../state";
import { correctActionByCategory } from "../state";
import { removeEmail } from "./emailLifecycle";

export function processEmail(state: Draft<GameState>, command: PlayerCommand): void {
  if (command.type !== "PROCESS_EMAIL" || state.status === "gameOver") {
    return;
  }

  const email = state.emails[command.emailId];
  if (!email) {
    return;
  }

  const wasCorrect = correctActionByCategory[email.category] === command.action;
  const category = email.category;
  const action = command.action;
  const subject = email.subject;
  const scoreBefore = state.score.value;
  const mistakesBefore = state.score.mistakes;
  removeEmail(state, command.emailId);
  const scheduledBefore = state.scheduled.length;

  state.score.processed += 1;

  if (wasCorrect) {
    state.score.value += 100 + state.score.streak * 10;
    state.score.streak += 1;
  } else {
    state.score.value = Math.max(0, state.score.value - 50);
    state.score.streak = 0;
    state.score.mistakes += 1;
    scheduleWrongActionConsequences(state, category, action);
  }

  state.lastActionResult = {
    emailId: command.emailId,
    subject,
    action,
    wasCorrect,
    scoreDelta: state.score.value - scoreBefore,
    mistakesDelta: state.score.mistakes - mistakesBefore,
    scheduledConsequences: state.scheduled.length - scheduledBefore,
  };
}

function scheduleWrongActionConsequences(
  state: Draft<GameState>,
  category: EmailCategory,
  action: PlayerAction,
): void {
  for (const rule of wrongActionReplicationRules) {
    if (rule.category !== category || rule.action !== action) {
      continue;
    }

    for (const spawn of rule.spawns) {
      scheduleInto(
        state,
        spawn.count === undefined
          ? { type: "SPAWN_EMAIL", source: "wrong_action", templateId: spawn.templateId }
          : {
              type: "SPAWN_EMAIL",
              source: "wrong_action",
              templateId: spawn.templateId,
              count: spawn.count,
            },
        state.clock.now + spawn.delayMs,
      );
    }
    return;
  }
}
