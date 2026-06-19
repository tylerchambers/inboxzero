import type { Draft } from "immer";
import type { EmailId, GameState } from "../state";

export function inboxIsFull(state: Draft<GameState>): boolean {
  return state.inbox.emailIds.length >= state.inbox.capacity;
}

export function removeEmail(state: Draft<GameState>, emailId: EmailId): void {
  const email = state.emails[emailId];
  if (!email) {
    return;
  }

  state.inbox.emailIds = state.inbox.emailIds.filter((id) => id !== emailId);

  if (email.threadId !== null) {
    const thread = state.threads[email.threadId];
    if (thread) {
      thread.emailIds = thread.emailIds.filter((id) => id !== emailId);
      if (thread.emailIds.length === 0) {
        delete state.threads[email.threadId];
      } else {
        if (thread.rootEmailId === emailId) {
          const replacementRootEmailId = thread.emailIds[0];
          if (!replacementRootEmailId) {
            throw new Error("Thread has no replacement root");
          }
          thread.rootEmailId = replacementRootEmailId;
        }
        thread.lastActivityAt = state.clock.now;
      }
    }
  }

  state.scheduled = state.scheduled.filter(
    (scheduled) =>
      scheduled.event.type !== "SPAWN_EMAIL" || scheduled.event.parentEmailId !== emailId,
  );
  delete state.emails[emailId];
}
