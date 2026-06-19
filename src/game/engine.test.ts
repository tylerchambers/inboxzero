import { describe, expect, test } from "vitest";
import { wrongActionReplicationRules } from "./content/replicationRules";
import { defaultSpawnTemplateIds, emailTemplates, getTemplate } from "./content/templates";
import { update } from "./engine";
import {
  deriveDifficulty,
  LEVELS_PER_BATCH_INCREASE,
  PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
} from "./reducers/difficulty";
import { processDueEvents, schedule } from "./scheduler";
import type { Email, EmailId, EmailThread, GameState, ThreadId } from "./state";
import { createInitialState } from "./state";

function createQuietState(options: { capacity?: number } = {}): GameState {
  return createInitialState({ ...options, ambientSpawn: "disabled" });
}

function firstEmailId(state: GameState): EmailId {
  const emailId = state.inbox.emailIds[0];
  if (!emailId) {
    throw new Error("Expected at least one inbox email");
  }
  return emailId;
}

function emailById(state: GameState, emailId: EmailId): Email {
  const email = state.emails[emailId];
  if (!email) {
    throw new Error(`Expected email ${emailId}`);
  }
  return email;
}

function threadById(state: GameState, threadId: ThreadId): EmailThread {
  const thread = state.threads[threadId];
  if (!thread) {
    throw new Error(`Expected thread ${threadId}`);
  }
  return thread;
}

function inboxTemplateIds(state: GameState): string[] {
  return state.inbox.emailIds.map((emailId) => emailById(state, emailId).templateId);
}

describe("Inbox Zero simulation", () => {
  test("emails spawn correctly", () => {
    const state = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "team_question",
    });

    expect(state.inbox.emailIds).toHaveLength(1);
    const email = emailById(state, firstEmailId(state));
    expect(email).toMatchObject({
      sender: "alex@company.com",
      subject: "Question about the rollout",
      category: "needs_reply",
      state: "unprocessed",
    });
  });

  test("emails can be processed", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "team_question",
    });
    const emailId = firstEmailId(spawned);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "reply" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.emails[emailId]).toBeUndefined();
    expect(processed.score).toMatchObject({ value: 100, streak: 1, processed: 1, mistakes: 0 });
  });

  test("scheduler executes events", () => {
    const scheduled = schedule(
      createQuietState(),
      { type: "SPAWN_EMAIL", source: "manual", templateId: "newsletter" },
      10,
    );

    const result = processDueEvents(scheduled, 10);

    expect(result.events).toHaveLength(1);
    const firstEvent = result.events[0];
    if (!firstEvent) {
      throw new Error("Expected one scheduled event");
    }
    expect(firstEvent.event).toMatchObject({ type: "SPAWN_EMAIL", templateId: "newsletter" });
    expect(result.state.scheduled).toHaveLength(0);
  });

  test("ignored urgent emails replicate", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "need_budget_numbers",
    });
    const rootEmail = emailById(spawned, firstEmailId(spawned));
    if (rootEmail.threadId === null) {
      throw new Error("Expected urgent email thread");
    }
    expect(threadById(spawned, rootEmail.threadId).emailIds).toEqual([rootEmail.id]);

    expect(spawned.scheduled.map((event) => event.dueAt)).toEqual([8000, 15000]);

    const firstEscalation = update(spawned, { type: "TICK", now: 8000, dt: 8000 });
    expect(
      firstEscalation.inbox.emailIds.map((id) => emailById(firstEscalation, id).subject),
    ).toEqual(["Need Budget Numbers", "Following Up"]);

    const secondEscalation = update(firstEscalation, { type: "TICK", now: 15000, dt: 7000 });
    expect(
      secondEscalation.inbox.emailIds.map((id) => emailById(secondEscalation, id).subject),
    ).toEqual(["Need Budget Numbers", "Following Up", "Need Response ASAP"]);
  });

  test("processed urgent emails do not replicate after scheduled events fire", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "need_budget_numbers",
    });
    const emailId = firstEmailId(spawned);
    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "reply" });
    expect(processed.scheduled).toHaveLength(0);

    const afterDueEvents = update(processed, { type: "TICK", now: 15000, dt: 15000 });

    expect(afterDueEvents.inbox.emailIds).toHaveLength(0);
    expect(afterDueEvents.scheduled).toHaveLength(0);
  });

  test("spawning ordinary reply mail schedules follow-up pressure", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "team_question",
    });
    const rootEmail = emailById(spawned, firstEmailId(spawned));

    expect(rootEmail.threadId).not.toBeNull();
    expect(spawned.scheduled.map((event) => event.dueAt)).toEqual([10000, 20000]);
    expect(spawned.scheduled.map((event) => event.event)).toEqual([
      {
        type: "SPAWN_EMAIL",
        source: "escalation",
        templateId: "checking_on_rollout",
        parentEmailId: rootEmail.id,
      },
      {
        type: "SPAWN_EMAIL",
        source: "escalation",
        templateId: "adding_project_channel",
        parentEmailId: rootEmail.id,
      },
    ]);
  });

  test("replying to ordinary reply mail cancels pending follow-ups", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "team_question",
    });
    const emailId = firstEmailId(spawned);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "reply" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.emails[emailId]).toBeUndefined();
    expect(processed.scheduled).toHaveLength(0);

    const afterDueEvents = update(processed, { type: "TICK", now: 20000, dt: 20000 });

    expect(afterDueEvents.inbox.emailIds).toHaveLength(0);
    expect(afterDueEvents.scheduled).toHaveLength(0);
  });

  test("ignored ordinary reply mail spawns related follow-ups", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "team_question",
    });
    const rootEmail = emailById(spawned, firstEmailId(spawned));
    if (rootEmail.threadId === null) {
      throw new Error("Expected ordinary reply thread");
    }

    const afterFollowUps = update(spawned, { type: "TICK", now: 20000, dt: 20000 });

    expect(inboxTemplateIds(afterFollowUps)).toEqual([
      "team_question",
      "checking_on_rollout",
      "adding_project_channel",
    ]);
    for (const emailId of afterFollowUps.inbox.emailIds) {
      expect(emailById(afterFollowUps, emailId).threadId).toBe(rootEmail.threadId);
    }
    expect(threadById(afterFollowUps, rootEmail.threadId).emailIds).toEqual(
      afterFollowUps.inbox.emailIds,
    );
    expect(afterFollowUps.scheduled).toHaveLength(0);
  });

  test("processing ordinary follow-up threads keeps indexes consistent", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "team_question",
    });
    const rootId = firstEmailId(spawned);

    const withChild = update(spawned, { type: "TICK", now: 10000, dt: 10000 });
    const childId = withChild.inbox.emailIds.find((emailId) => emailId !== rootId);
    if (!childId) {
      throw new Error("Expected ordinary follow-up email");
    }

    const rootEmail = emailById(withChild, rootId);
    if (rootEmail.threadId === null) {
      throw new Error("Expected ordinary reply thread");
    }
    const threadId = rootEmail.threadId;

    const withoutRoot = update(withChild, {
      type: "PROCESS_EMAIL",
      emailId: rootId,
      action: "reply",
    });

    expect(withoutRoot.emails[rootId]).toBeUndefined();
    expect(threadById(withoutRoot, threadId).emailIds).toEqual([childId]);
    expect(threadById(withoutRoot, threadId).rootEmailId).toBe(childId);
    expect(withoutRoot.scheduled).toHaveLength(0);

    const withoutChild = update(withoutRoot, {
      type: "PROCESS_EMAIL",
      emailId: childId,
      action: "reply",
    });

    expect(withoutChild.threads[threadId]).toBeUndefined();
    expect(withoutChild.inbox.emailIds).toHaveLength(0);
  });

  test("inbox count changes correctly and full inbox ends the run", () => {
    const oneEmail = update(createQuietState({ capacity: 2 }), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "newsletter",
    });
    expect(oneEmail.inbox.emailIds).toHaveLength(1);
    expect(oneEmail.status).toBe("running");

    const cleared = update(oneEmail, {
      type: "PROCESS_EMAIL",
      emailId: firstEmailId(oneEmail),
      action: "archive",
    });
    expect(cleared.inbox.emailIds).toHaveLength(0);

    const full = update(cleared, {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "newsletter",
      count: 2,
    });
    expect(full.inbox.emailIds).toHaveLength(2);
    expect(full.status).toBe("gameOver");
  });

  test("catch-up spawning stops at inbox capacity", () => {
    const state = update(createInitialState({ capacity: 1 }), {
      type: "TICK",
      now: 20000,
      dt: 20000,
    });

    expect(state.status).toBe("gameOver");
    expect(state.inbox.emailIds).toHaveLength(1);
  });

  test("processed mail increases difficulty even when actions are wrong", () => {
    let state = createQuietState({ capacity: 100 });

    for (let i = 0; i < PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL; i += 1) {
      state = update(state, {
        type: "SPAWN_EMAIL",
        source: "manual",
        templateId: "team_question",
      });
      state = update(state, {
        type: "PROCESS_EMAIL",
        emailId: firstEmailId(state),
        action: "archive",
      });
    }

    const expected = deriveDifficulty({
      elapsedMs: 0,
      processed: PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
    });
    expect(state.score.processed).toBe(PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL);
    expect(state.score.mistakes).toBe(PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL);
    expect(state.difficulty).toEqual({ ...expected, nextSpawnAt: null });
    expect(state.scheduled).toEqual([]);
  });

  test("processed difficulty pulls the next ambient spawn forward", () => {
    let state = createInitialState({ capacity: 100 });

    for (let i = 0; i < PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL; i += 1) {
      state = update(state, {
        type: "SPAWN_EMAIL",
        source: "manual",
        templateId: "team_question",
      });
      state = update(state, {
        type: "PROCESS_EMAIL",
        emailId: firstEmailId(state),
        action: "archive",
      });
    }

    const expected = deriveDifficulty({
      elapsedMs: 0,
      processed: PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
    });
    expect(state.difficulty.nextSpawnAt).toBe(expected.spawnIntervalMs);

    state = update(state, {
      type: "TICK",
      now: expected.spawnIntervalMs - 1,
      dt: expected.spawnIntervalMs - 1,
    });
    expect(state.inbox.emailIds).toHaveLength(0);

    state = update(state, { type: "TICK", now: expected.spawnIntervalMs, dt: 1 });
    expect(state.inbox.emailIds).toHaveLength(1);
    expect(state.difficulty.nextSpawnAt).toBe(expected.spawnIntervalMs * 2);
  });

  test("accelerated batch spawning still stops at inbox capacity", () => {
    const state = createInitialState({ capacity: 2 });
    state.score.processed = PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL * LEVELS_PER_BATCH_INCREASE;

    const next = update(state, { type: "TICK", now: 5000, dt: 5000 });

    expect(next.status).toBe("gameOver");
    expect(next.inbox.emailIds).toHaveLength(2);
  });

  test("paused processing keeps derived difficulty consistent", () => {
    let state = createQuietState({ capacity: 100 });

    state = update(state, { type: "PAUSE" });
    for (let i = 0; i < PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL; i += 1) {
      state = update(state, {
        type: "SPAWN_EMAIL",
        source: "manual",
        templateId: "team_question",
      });
      state = update(state, {
        type: "PROCESS_EMAIL",
        emailId: firstEmailId(state),
        action: "archive",
      });
    }

    const expected = deriveDifficulty({
      elapsedMs: 0,
      processed: PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
    });
    expect(state.status).toBe("paused");
    expect(state.score.processed).toBe(PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL);
    expect(state.difficulty).toEqual({ ...expected, nextSpawnAt: null });
  });

  test("processing threaded mail keeps thread indexes consistent", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "need_budget_numbers",
    });
    const rootId = firstEmailId(spawned);

    const withChild = update(spawned, { type: "TICK", now: 8000, dt: 8000 });
    const childId = withChild.inbox.emailIds.find((emailId) => emailId !== rootId);
    if (!childId) {
      throw new Error("Expected child email");
    }

    const rootEmail = emailById(withChild, rootId);
    if (rootEmail.threadId === null) {
      throw new Error("Expected root email thread");
    }
    const threadId = rootEmail.threadId;

    const withoutRoot = update(withChild, {
      type: "PROCESS_EMAIL",
      emailId: rootId,
      action: "reply",
    });

    expect(withoutRoot.emails[rootId]).toBeUndefined();
    expect(threadById(withoutRoot, threadId).emailIds).toEqual([childId]);
    expect(threadById(withoutRoot, threadId).rootEmailId).toBe(childId);

    const withoutChild = update(withoutRoot, {
      type: "PROCESS_EMAIL",
      emailId: childId,
      action: "reply",
    });

    expect(withoutChild.threads[threadId]).toBeUndefined();
  });

  test("scheduled game over events are executed", () => {
    const scheduled = schedule(createQuietState(), { type: "GAME_OVER" }, 10);

    const state = update(scheduled, { type: "TICK", now: 10, dt: 10 });

    expect(state.status).toBe("gameOver");
    expect(state.scheduled).toHaveLength(0);
  });

  test("same-time scheduled events keep creation order past ten items", () => {
    let state = createQuietState();
    for (let index = 0; index < 12; index += 1) {
      state = schedule(
        state,
        { type: "SPAWN_EMAIL", source: "manual", templateId: "team_question" },
        10,
      );
    }

    const result = processDueEvents(state, 10);

    expect(result.events.map((event) => event.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `scheduled_${index + 1}`),
    );
  });

  test("wrong processing action resets streak and records mistake", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "team_question",
    });
    const emailId = firstEmailId(spawned);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "archive" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.emails[emailId]).toBeUndefined();
    expect(processed.score.processed).toBe(1);
    expect(processed.score.mistakes).toBe(1);
    expect(processed.score.streak).toBe(0);
    expect(processed.score.value).toBe(0);
  });

  test("replying to spam records a mistake and creates future spam pressure", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "fake_security_alert",
    });
    const emailId = firstEmailId(spawned);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "reply" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.emails[emailId]).toBeUndefined();
    expect(processed.score).toMatchObject({ processed: 1, mistakes: 1, streak: 0, value: 0 });
    expect(processed.scheduled.map((event) => event.dueAt)).toEqual([1000, 3000]);
    expect(processed.scheduled.map((event) => event.event)).toEqual([
      { type: "SPAWN_EMAIL", source: "wrong_action", templateId: "fake_security_alert" },
      { type: "SPAWN_EMAIL", source: "wrong_action", templateId: "newsletter" },
    ]);

    const afterConsequences = update(processed, { type: "TICK", now: 3000, dt: 3000 });

    expect(inboxTemplateIds(afterConsequences)).toEqual(["fake_security_alert", "newsletter"]);
    expect(afterConsequences.scheduled).toHaveLength(0);
  });

  test("opening a spam link creates multiple inbox pressure events", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "fake_security_alert",
    });
    const emailId = firstEmailId(spawned);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "open_link" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.scheduled.map((event) => event.dueAt)).toEqual([0, 0, 5000]);

    const afterImmediatePressure = update(processed, { type: "TICK", now: 0, dt: 0 });

    expect(inboxTemplateIds(afterImmediatePressure)).toEqual(["fake_security_alert", "newsletter"]);
    expect(afterImmediatePressure.scheduled.map((event) => event.dueAt)).toEqual([5000]);

    const afterDelayedPressure = update(afterImmediatePressure, {
      type: "TICK",
      now: 5000,
      dt: 5000,
    });

    expect(inboxTemplateIds(afterDelayedPressure)).toEqual([
      "fake_security_alert",
      "newsletter",
      "fake_security_alert",
    ]);
  });

  test("wrong urgent action replaces cleared escalation with urgent pressure", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "need_budget_numbers",
    });
    const emailId = firstEmailId(spawned);
    expect(spawned.scheduled.map((event) => event.dueAt)).toEqual([8000, 15000]);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "report_spam" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.emails[emailId]).toBeUndefined();
    expect(processed.score.mistakes).toBe(1);
    expect(processed.scheduled.map((event) => event.dueAt)).toEqual([2000, 5000]);
    expect(processed.scheduled.map((event) => event.event)).toEqual([
      { type: "SPAWN_EMAIL", source: "wrong_action", templateId: "following_up" },
      { type: "SPAWN_EMAIL", source: "wrong_action", templateId: "need_response_asap" },
    ]);

    const afterConsequences = update(processed, { type: "TICK", now: 5000, dt: 5000 });

    expect(inboxTemplateIds(afterConsequences)).toEqual(["following_up", "need_response_asap"]);
  });

  test("wrong action without a replication rule keeps current penalty only", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "document_approval",
    });
    const emailId = firstEmailId(spawned);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "archive" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.emails[emailId]).toBeUndefined();
    expect(processed.score).toMatchObject({ processed: 1, mistakes: 1, streak: 0, value: 0 });
    expect(processed.scheduled).toHaveLength(0);
  });

  test("correct action does not apply wrong-action replication", () => {
    const spawned = update(createQuietState(), {
      type: "SPAWN_EMAIL",
      source: "manual",
      templateId: "fake_security_alert",
    });
    const emailId = firstEmailId(spawned);

    const processed = update(spawned, { type: "PROCESS_EMAIL", emailId, action: "report_spam" });

    expect(processed.inbox.emailIds).toHaveLength(0);
    expect(processed.score).toMatchObject({ processed: 1, mistakes: 0, streak: 1, value: 100 });
    expect(processed.scheduled).toHaveLength(0);
  });

  test("pause prevents ticks until resumed", () => {
    const paused = update(createInitialState(), { type: "PAUSE" });
    const whilePaused = update(paused, { type: "TICK", now: 20000, dt: 20000 });

    expect(whilePaused.status).toBe("paused");
    expect(whilePaused.inbox.emailIds).toHaveLength(0);
    expect(whilePaused.clock.tick).toBe(0);

    const resumed = update(whilePaused, { type: "RESUME" });
    const afterTick = update(resumed, { type: "TICK", now: 20000, dt: 20000 });

    expect(afterTick.status).toBe("running");
    expect(afterTick.inbox.emailIds.length).toBeGreaterThan(0);
  });

  test("template references are internally valid", () => {
    for (const templateId of defaultSpawnTemplateIds) {
      expect(getTemplate(templateId).id).toBe(templateId);
    }

    for (const template of emailTemplates) {
      for (const step of template.escalation ?? []) {
        expect(getTemplate(step.templateId).id).toBe(step.templateId);
      }
    }

    for (const rule of wrongActionReplicationRules) {
      for (const spawn of rule.spawns) {
        expect(getTemplate(spawn.templateId).id).toBe(spawn.templateId);
      }
    }
  });
});
