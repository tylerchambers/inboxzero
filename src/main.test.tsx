import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { createInitialState, type Email } from "./game/state";
import {
  ActionFeedback,
  DebugEmailCard,
  DebugScheduledEvents,
  GameOverSummary,
  PlayableEmailCard,
} from "./main";

const email: Email = {
  id: "email_1",
  sender: "security@amaz0n-alerts.example",
  subject: "Verify your account",
  previewText: "Your account will be locked unless you act now.",
  category: "spam",
  urgency: "normal",
  createdAt: 0,
  threadId: "thread_1",
  templateId: "fake_security_alert",
  state: "unprocessed",
};

const noopProcess = () => undefined;
const noopRestart = () => undefined;

describe("playable inbox UI", () => {
  test("playable card renders player-facing details without debug metadata", () => {
    const markup = renderToStaticMarkup(
      <PlayableEmailCard email={email} now={5000} disabled={false} onProcessEmail={noopProcess} />,
    );

    expect(markup).toContain("security@amaz0n-alerts.example");
    expect(markup).toContain("Verify your account");
    expect(markup).toContain("Your account will be locked unless you act now.");
    expect(markup).toContain("Routine");
    expect(markup).not.toContain("Category");
    expect(markup).not.toContain("Template");
    expect(markup).not.toContain("Thread");
    expect(markup).not.toContain("fake_security_alert");
    expect(markup).not.toContain("email_1");
    expect(markup).not.toContain("thread_1");
  });

  test("debug card keeps email metadata visible", () => {
    const markup = renderToStaticMarkup(
      <DebugEmailCard email={email} disabled={false} onProcessEmail={noopProcess} />,
    );

    expect(markup).toContain("Category");
    expect(markup).toContain("Template");
    expect(markup).toContain("ID");
    expect(markup).toContain("Thread");
    expect(markup).toContain("fake_security_alert");
    expect(markup).toContain("email_1");
    expect(markup).toContain("thread_1");
  });

  test("debug scheduled events expose QA details", () => {
    const state = createInitialState();
    state.scheduled.push({
      id: "scheduled_1",
      dueAt: 10000,
      event: {
        type: "SPAWN_EMAIL",
        source: "escalation",
        templateId: "checking_on_rollout",
        parentEmailId: "email_1",
      },
    });

    const markup = renderToStaticMarkup(<DebugScheduledEvents state={state} />);

    expect(markup).toContain("scheduled_1");
    expect(markup).toContain("due 10000");
    expect(markup).toContain("escalation");
    expect(markup).toContain("template checking_on_rollout");
    expect(markup).toContain("parent email_1");
  });

  test("action feedback renders correct and wrong outcomes", () => {
    const correct = renderToStaticMarkup(
      <ActionFeedback
        result={{
          emailId: "email_1",
          subject: "Question about the rollout",
          action: "reply",
          wasCorrect: true,
          scoreDelta: 100,
          mistakesDelta: 0,
          scheduledConsequences: 0,
        }}
      />,
    );
    const wrong = renderToStaticMarkup(
      <ActionFeedback
        result={{
          emailId: "email_2",
          subject: "Verify your account",
          action: "open_link",
          wasCorrect: false,
          scoreDelta: 0,
          mistakesDelta: 1,
          scheduledConsequences: 3,
        }}
      />,
    );

    expect(correct).toContain("Correct action");
    expect(correct).toContain("Score +100");
    expect(wrong).toContain("Wrong action");
    expect(wrong).toContain("Mistakes +1");
    expect(wrong).toContain("Consequences scheduled: 3");
  });

  test("game-over summary explains why the run ended", () => {
    const state = createInitialState({ capacity: 2 });
    state.status = "gameOver";
    state.inbox.emailIds = ["email_1", "email_2"];
    state.score.value = 250;
    state.score.processed = 4;
    state.score.mistakes = 2;

    const markup = renderToStaticMarkup(<GameOverSummary state={state} restart={noopRestart} />);

    expect(markup).toContain("Inbox capacity reached.");
    expect(markup).toContain("Final score 250");
    expect(markup).toContain("Processed 4");
    expect(markup).toContain("Mistakes 2");
    expect(markup).toContain("Restart run");
  });
});
