import type { Draft } from "immer";
import { getAmbientSpawnTemplateIds, getTemplate } from "../content/templates";
import type { SimEvent } from "../events";
import { pickIndex } from "../rng";
import { scheduleInto } from "../scheduler";
import type { Email, GameState, TemplateId, ThreadId, ThreadType } from "../state";
import { inboxIsFull } from "./emailLifecycle";

export function spawnEmail(state: Draft<GameState>, event: SimEvent): void {
  if (event.type !== "SPAWN_EMAIL" || state.status === "gameOver") {
    return;
  }

  const parentEmail = event.parentEmailId ? state.emails[event.parentEmailId] : null;
  if (event.parentEmailId && !parentEmail) {
    return;
  }

  if (inboxIsFull(state)) {
    state.status = "gameOver";
    return;
  }

  const count = event.count ?? 1;
  for (let index = 0; index < count; index += 1) {
    if (inboxIsFull(state)) {
      state.status = "gameOver";
      break;
    }

    const template = getTemplate(event.templateId ?? pickDefaultTemplateId(state));
    const emailId = `email_${state.nextEmailId}`;
    state.nextEmailId += 1;

    const threadId = resolveThreadId(
      state,
      template.threadType,
      emailId,
      parentEmail?.threadId ?? null,
    );
    const email: Email = {
      id: emailId,
      sender: template.sender,
      subject: template.subject,
      previewText: template.previewText,
      bodyText: template.bodyText,
      weirdnessLevel: template.weirdnessLevel,
      category: template.category,
      urgency: template.urgency,
      createdAt: state.clock.now,
      threadId,
      templateId: template.id,
      state: "unprocessed",
    };

    state.emails[emailId] = email;
    state.inbox.emailIds.push(emailId);
    if (inboxIsFull(state)) {
      state.status = "gameOver";
    }

    if (threadId) {
      const thread = state.threads[threadId];
      if (!thread) {
        throw new Error(`Unknown email thread: ${threadId}`);
      }
      thread.emailIds.push(emailId);
      thread.lastActivityAt = state.clock.now;
    }

    if (parentEmail) {
      parentEmail.state = "replicated";
    }

    for (const step of template.escalation ?? []) {
      scheduleInto(
        state,
        {
          type: "SPAWN_EMAIL",
          source: "escalation",
          templateId: step.templateId,
          parentEmailId: emailId,
        },
        state.clock.now + step.delayMs,
      );
    }
  }
}

function pickDefaultTemplateId(state: Draft<GameState>): TemplateId {
  const templateIds = getAmbientSpawnTemplateIds(state.difficulty.weirdnessLevel);
  const templateId = templateIds[pickIndex(state.rngSeed, state.nextEmailId, templateIds.length)];
  if (!templateId) {
    throw new Error("No ambient email templates configured");
  }
  return templateId;
}

function resolveThreadId(
  state: Draft<GameState>,
  threadType: ThreadType,
  emailId: string,
  parentThreadId: ThreadId | null,
): ThreadId | null {
  if (parentThreadId) {
    return parentThreadId;
  }

  if (threadType === "normal") {
    return null;
  }

  const threadId = `thread_${state.nextThreadId}`;
  state.nextThreadId += 1;
  state.threads[threadId] = {
    id: threadId,
    rootEmailId: emailId,
    emailIds: [],
    threadType,
    growthRate: 1,
    lastActivityAt: state.clock.now,
  };
  return threadId;
}
