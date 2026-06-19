import { describe, expect, test } from "vitest";
import {
  deriveDifficulty,
  PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
} from "../game/reducers/difficulty";
import { createInitialState, type Email, type EmailId } from "../game/state";
import {
  createGameStore,
  type GameStoreState,
  PLAYABLE_INBOX_CAPACITY,
  selectInboxEmails,
} from "./useGame";

function firstEmailId(store: GameStoreState): EmailId {
  const emailId = store.state.inbox.emailIds[0];
  if (!emailId) {
    throw new Error("Expected at least one inbox email");
  }
  return emailId;
}

function emailById(store: GameStoreState, emailId: EmailId): Email {
  const email = store.state.emails[emailId];
  if (!email) {
    throw new Error(`Expected email ${emailId}`);
  }
  return email;
}

function templateIds(store: GameStoreState): string[] {
  return store.state.inbox.emailIds.map((emailId) => emailById(store, emailId).templateId);
}

describe("game UI store", () => {
  test("selects inbox emails in inbox order and skips stale ids", () => {
    const state = createInitialState();
    const firstEmail: Email = {
      id: "email_1",
      sender: "first@example.com",
      subject: "First message",
      previewText: "First preview",
      category: "needs_reply",
      urgency: "normal",
      createdAt: 0,
      threadId: "thread_1",
      templateId: "team_question",
      state: "unprocessed",
    };
    const secondEmail: Email = {
      id: "email_2",
      sender: "second@example.com",
      subject: "Second message",
      previewText: "Second preview",
      category: "junk",
      urgency: "normal",
      createdAt: 0,
      threadId: "thread_2",
      templateId: "newsletter",
      state: "unprocessed",
    };

    state.emails.email_2 = secondEmail;
    state.emails.email_1 = firstEmail;
    state.inbox.emailIds = ["missing_email", "email_1", "email_2"];

    expect(selectInboxEmails(state).map((email) => email.id)).toEqual(["email_1", "email_2"]);
  });

  test("spawns and processes a needs-reply email through the engine", () => {
    const store = createGameStore();

    store.getState().spawn("team_question");

    let current = store.getState();
    expect(current.state.inbox.emailIds).toHaveLength(1);
    const emailId = firstEmailId(current);
    expect(emailById(current, emailId)).toMatchObject({ templateId: "team_question" });

    current.process(emailId, "reply");

    current = store.getState();
    expect(current.state.inbox.emailIds).toHaveLength(0);
    expect(current.state.score).toMatchObject({ value: 100, streak: 1, processed: 1, mistakes: 0 });
  });

  test("ticks scheduled urgent follow-up through the engine", () => {
    const store = createGameStore();

    store.getState().spawn("need_budget_numbers");
    store.getState().tick(8000);

    const current = store.getState();
    expect(current.state.inbox.emailIds).toHaveLength(2);
    expect(
      current.state.inbox.emailIds.some(
        (emailId) => emailById(current, emailId).templateId === "following_up",
      ),
    ).toBe(true);
  });

  test("manual ticks stay quiet before and after debug restart", () => {
    const store = createGameStore();
    expect(store.getState().state.difficulty.nextSpawnAt).toBeNull();

    store.getState().tick(10000);
    expect(store.getState().state.inbox.emailIds).toHaveLength(0);

    store.getState().restart();
    expect(store.getState().state.difficulty.nextSpawnAt).toBeNull();
    store.getState().tick(10000);

    expect(store.getState().state.inbox.emailIds).toHaveLength(0);
  });

  test("restart keeps ordinary thread pressure deterministic in the debug store", () => {
    const store = createGameStore();

    store.getState().restart();
    store.getState().spawn("team_question");
    store.getState().tick(10000);

    const current = store.getState();
    expect(templateIds(current)).toEqual(["team_question", "checking_on_rollout"]);
    expect(current.state.scheduled.map((scheduled) => scheduled.event)).toEqual([
      {
        type: "SPAWN_EMAIL",
        source: "escalation",
        templateId: "adding_project_channel",
        parentEmailId: "email_1",
      },
    ]);
  });

  test("playable restart preserves ambient spawning", () => {
    const store = createGameStore({ mode: "playable" });

    expect(store.getState().state.inbox.capacity).toBe(PLAYABLE_INBOX_CAPACITY);
    store.getState().tick(5000);
    expect(store.getState().state.inbox.emailIds).toHaveLength(1);

    store.getState().restart();
    expect(store.getState().state.inbox.emailIds).toHaveLength(0);
    expect(store.getState().state.difficulty.nextSpawnAt).toBe(5000);

    store.getState().tick(5000);
    expect(store.getState().state.inbox.emailIds).toHaveLength(1);
  });

  test("playable ticks spawn ambient mail at the normal interval", () => {
    const store = createGameStore({ mode: "playable" });

    store.getState().tick(4999);
    expect(store.getState().state.inbox.emailIds).toHaveLength(0);

    store.getState().tick(1);
    expect(store.getState().state.inbox.emailIds).toHaveLength(1);
    expect(store.getState().state.difficulty.nextSpawnAt).toBe(10000);
  });

  test("playable processing accelerates the next ambient spawn", () => {
    const store = createGameStore({ mode: "playable", capacity: 100 });

    for (let i = 0; i < PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL; i += 1) {
      store.getState().spawn("team_question");
      store.getState().process(firstEmailId(store.getState()), "archive");
    }

    const expected = deriveDifficulty({
      elapsedMs: 0,
      processed: PROCESSED_EMAILS_PER_DIFFICULTY_LEVEL,
    });
    expect(store.getState().state.difficulty.level).toBe(expected.level);
    expect(store.getState().state.difficulty.spawnIntervalMs).toBe(expected.spawnIntervalMs);
    expect(store.getState().state.difficulty.nextSpawnAt).toBe(expected.spawnIntervalMs);

    store.getState().tick(expected.spawnIntervalMs - 1);
    expect(store.getState().state.inbox.emailIds).toHaveLength(0);

    store.getState().tick(1);
    expect(store.getState().state.inbox.emailIds).toHaveLength(1);
  });

  test("playable capacity reaches game over through ambient spawning", () => {
    const store = createGameStore({ mode: "playable", capacity: 2 });

    store.getState().tick(5000);
    expect(store.getState().state.status).toBe("running");
    expect(store.getState().state.inbox.emailIds).toHaveLength(1);

    store.getState().tick(5000);
    expect(store.getState().state.inbox.emailIds).toHaveLength(2);
    expect(store.getState().state.status).toBe("gameOver");
  });

  test("records correct action feedback at the store boundary", () => {
    const store = createGameStore({ mode: "playable" });

    store.getState().spawn("team_question");
    const emailId = firstEmailId(store.getState());
    store.getState().process(emailId, "reply");

    expect(store.getState().state.lastActionResult).toEqual({
      emailId,
      subject: "Question about the rollout",
      action: "reply",
      wasCorrect: true,
      scoreDelta: 100,
      mistakesDelta: 0,
      scheduledConsequences: 0,
    });
  });

  test("records wrong action feedback and scheduled consequences", () => {
    const store = createGameStore({ mode: "playable" });

    store.getState().spawn("fake_security_alert");
    const emailId = firstEmailId(store.getState());
    store.getState().process(emailId, "open_link");

    expect(store.getState().state.lastActionResult).toEqual({
      emailId,
      subject: "Verify your account",
      action: "open_link",
      wasCorrect: false,
      scoreDelta: 0,
      mistakesDelta: 1,
      scheduledConsequences: 3,
    });
  });

  test("custom initial state restarts to the captured custom defaults", () => {
    const initialState = createInitialState({ capacity: 2, rngSeed: "custom-debug" });
    initialState.difficulty.nextSpawnAt = 12345;

    const store = createGameStore({ initialState });
    initialState.inbox.capacity = 99;

    store.getState().spawn("team_question");
    store.getState().restart();

    const current = store.getState();
    expect(current.state.inbox.emailIds).toHaveLength(0);
    expect(current.state.inbox.capacity).toBe(2);
    expect(current.state.rngSeed).toBe("custom-debug");
    expect(current.state.difficulty.nextSpawnAt).toBe(12345);
  });
});
