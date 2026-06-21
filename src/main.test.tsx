import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { createInitialState, type Email } from "./game/state";
import stylesheet from "./index.css?inline";
import { DebugApp, DebugView } from "./ui/DebugApp";
import { DebugEmailCard, DebugScheduledEvents } from "./ui/debugComponents";
import { PlayableApp, PlayableView } from "./ui/PlayableApp";
import { ActionFeedback, GameOverSummary, PlayableEmailCard } from "./ui/sharedComponents";

const email: Email = {
  id: "email_1",
  sender: "security@amaz0n-alerts.example",
  subject: "Verify your account",
  previewText: "Your account will be locked unless you act now.",
  bodyText:
    "Your account will be locked unless you act now. Use the attached verification portal to restore access. This sender is not your company security team.",
  weirdnessLevel: 0,
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
    expect(markup).toContain("This sender is not your company security team.");
    expect(markup).toContain("Routine");
    expect(markup).not.toContain("Category");
    expect(markup).not.toContain("Template");
    expect(markup).not.toContain("Thread");
    expect(markup).not.toContain("Weirdness");
    expect(markup).not.toContain("Weirdness level");
    expect(markup).not.toContain("fake_security_alert");
    expect(markup).not.toContain("email_1");
    expect(markup).not.toContain("thread_1");
    expect(markup).not.toContain("Reply message");
    expect(markup).not.toContain("Type your reply");
  });

  test("debug card keeps email metadata visible", () => {
    const markup = renderToStaticMarkup(
      <DebugEmailCard email={email} disabled={false} onProcessEmail={noopProcess} />,
    );

    expect(markup).toContain("Category");
    expect(markup).toContain("Template");
    expect(markup).toContain("ID");
    expect(markup).toContain("Thread");
    expect(markup).toContain("Weirdness");
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

  test("production app hides debug controls and metadata", () => {
    const markup = renderToStaticMarkup(<PlayableApp />);

    expect(markup).toContain("Reload mailbox");
    expect(markup).toContain("Pause sync");
    expect(markup).toContain("Inbox pressure");
    for (const hiddenText of ["Survive the inbox", "Score", "Processed", "Mistakes", "Streak"]) {
      expect(markup).not.toContain(hiddenText);
    }
    for (const hiddenText of [
      "Debug mode",
      "Playable run",
      "Tick +1s",
      "Tick +8s",
      "Auto tick",
      "Spawn",
      "Scheduled events",
      "Email templates",
      "Category",
      "Template",
      "ID",
      "Thread",
      "Weirdness",
      "Weirdness level",
    ]) {
      expect(markup).not.toContain(hiddenText);
    }
  });

  test("playable view hides debug metadata with a populated inbox", () => {
    const state = createInitialState({ capacity: 12 });
    state.emails[email.id] = email;
    state.inbox.emailIds = [email.id];

    const markup = renderToStaticMarkup(
      <PlayableView
        state={state}
        emails={[email]}
        selectedEmail={email}
        onRestart={noopRestart}
        onPause={noopRestart}
        onResume={noopRestart}
        onSelectEmail={() => undefined}
        onProcessEmail={noopProcess}
      />,
    );

    for (const visibleText of [
      "security@amaz0n-alerts.example",
      "Verify your account",
      "Your account will be locked unless you act now.",
      "This sender is not your company security team.",
      "Report Spam",
      "Reload mailbox",
    ]) {
      expect(markup).toContain(visibleText);
    }
    expect(markup).toContain("Reply");
    expect(markup).toContain("Archive");
    expect(markup).toContain("Report Spam");
    for (const hiddenText of [
      "Category",
      "Template",
      "ID",
      "Thread",
      "Weirdness",
      "Weirdness level",
      "fake_security_alert",
      "email_1",
      "thread_1",
      "Scheduled events",
      "Spawn",
    ]) {
      expect(markup).not.toContain(hiddenText);
    }
  });

  test("playable view renders all messages with a four-row scroll cap", () => {
    const state = createInitialState({ capacity: 12 });
    const emails = Array.from({ length: 5 }, (_, index): Email => {
      const messageNumber = index + 1;
      return {
        ...email,
        id: `email_${messageNumber}`,
        subject: `Subject ${messageNumber}`,
        threadId: `thread_${messageNumber}`,
        templateId: `template_${messageNumber}`,
      };
    });

    for (const inboxEmail of emails) {
      state.emails[inboxEmail.id] = inboxEmail;
    }
    state.inbox.emailIds = emails.map((inboxEmail) => inboxEmail.id);

    const markup = renderToStaticMarkup(
      <PlayableView
        state={state}
        emails={emails}
        selectedEmail={emails[0] ?? null}
        onRestart={noopRestart}
        onPause={noopRestart}
        onResume={noopRestart}
        onSelectEmail={() => undefined}
        onProcessEmail={noopProcess}
      />,
    );

    for (const inboxEmail of emails) {
      expect(markup).toContain(inboxEmail.subject);
    }
    expect(markup).toContain("message-list scroll-after-four");
  });

  test("message list css caps visible rows before scrolling", () => {
    expect(stylesheet).toContain(".message-list.scroll-after-four");
    expect(stylesheet).toContain("--visible-message-rows: 4");
    expect(stylesheet).toContain("(var(--message-row-height) * var(--visible-message-rows))");
    expect(stylesheet).toContain("(var(--message-row-gap) * (var(--visible-message-rows) - 1))");
    expect(stylesheet).toContain("height: var(--message-row-height)");
    expect(stylesheet).toContain("overflow-y: auto");
  });

  test("debug view exposes QA metadata with a populated inbox", () => {
    const state = createInitialState();
    state.emails[email.id] = email;
    state.inbox.emailIds = [email.id];
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

    const markup = renderToStaticMarkup(
      <DebugView
        state={state}
        emails={[email]}
        autoTick={false}
        setAutoTick={() => undefined}
        tick={() => undefined}
        spawn={() => undefined}
        process={noopProcess}
        pause={noopRestart}
        resume={noopRestart}
        restart={noopRestart}
      />,
    );

    for (const visibleText of [
      "Mechanic cockpit",
      "Spawn Random",
      "Spawn Occult Compliance",
      "Spawn Secret Police",
      "Scheduled events",
      "Category",
      "Template",
      "ID",
      "Thread",
      "Weirdness",
      "Weirdness level",
      "fake_security_alert",
      "email_1",
      "thread_1",
      "template checking_on_rollout",
      "parent email_1",
    ]) {
      expect(markup).toContain(visibleText);
    }
  });

  test("debug app renders cockpit controls without mode toggle navigation", () => {
    const markup = renderToStaticMarkup(<DebugApp />);

    for (const visibleText of [
      "Mechanic cockpit",
      "Tick +1s",
      "Tick +8s",
      "Auto tick",
      "Restart Debug",
      "Spawn Random",
      "Spawn HR Training",
      "Scheduled events",
      "Email templates",
      "Weirdness level",
      "Spawn Occult Compliance",
      "Spawn Secret Police",
    ]) {
      expect(markup).toContain(visibleText);
    }
    expect(markup).not.toContain("Playable run");
    expect(markup).not.toContain("Debug mode");
  });
});
