import type { ActionResult, Email, EmailId, GameState, PlayerAction } from "../game/state";

export type ActionHandler = (emailId: EmailId, action: PlayerAction) => void;

const playerActions: readonly { action: PlayerAction; label: string }[] = [
  { action: "reply", label: "Reply" },
  { action: "open_link", label: "Open Link" },
  { action: "archive", label: "Archive" },
  { action: "report_spam", label: "Report Spam" },
];

export function PlayableEmailCard({
  email,
  now,
  disabled,
  onProcessEmail,
}: {
  email: Email;
  now: number;
  disabled: boolean;
  onProcessEmail: ActionHandler;
}) {
  return (
    <article className="email-card playable-card">
      <div className="card-kicker">
        <span className={email.urgency === "urgent" ? "priority urgent" : "priority"}>
          {email.urgency === "urgent" ? "Urgent" : "Routine"}
        </span>
        <span>{formatAge(now, email.createdAt)}</span>
      </div>
      <h2>{email.subject}</h2>
      <p className="sender-line">From {email.sender}</p>
      <p className="message-body">{email.bodyText}</p>
      <ActionButtons emailId={email.id} disabled={disabled} onProcessEmail={onProcessEmail} />
    </article>
  );
}

export function ActionFeedback({ result }: { result: ActionResult | null }) {
  if (!result) {
    return <p className="feedback muted">No actions processed yet.</p>;
  }

  return (
    <section
      aria-label="Last action feedback"
      className={result.wasCorrect ? "feedback" : "feedback danger"}
    >
      <p className="eyebrow">Last action</p>
      <strong>{result.wasCorrect ? "Correct action" : "Wrong action"}</strong>
      <p>
        {formatActionLabel(result.action)} on “{result.subject}”. Score{" "}
        {result.scoreDelta > 0 ? `+${result.scoreDelta}` : result.scoreDelta}.
      </p>
      {result.mistakesDelta > 0 ? <p>Mistakes +{result.mistakesDelta}.</p> : null}
      {result.scheduledConsequences > 0 ? (
        <p>Consequences scheduled: {result.scheduledConsequences}.</p>
      ) : null}
    </section>
  );
}

export function GameOverSummary({ state, restart }: { state: GameState; restart: () => void }) {
  return (
    <section aria-label="Game over summary" className="game-over" role="alert">
      <p className="eyebrow">Run ended</p>
      <h2>Inbox capacity reached.</h2>
      <p>
        Final score {state.score.value}. Processed {state.score.processed}. Mistakes{" "}
        {state.score.mistakes}.
      </p>
      <button type="button" className="primary-button" onClick={restart}>
        Restart run
      </button>
    </section>
  );
}

export function PressureMeter({ inboxCount, capacity }: { inboxCount: number; capacity: number }) {
  const capacityUsed =
    capacity === 0 ? 0 : Math.min(100, Math.round((inboxCount / capacity) * 100));

  return (
    <section aria-label="Inbox pressure" className="pressure-card">
      <div className="pressure-heading">
        <span>Inbox pressure</span>
        <strong>
          {inboxCount}/{capacity}
        </strong>
      </div>
      <div className="pressure-track" aria-hidden="true">
        <div className="pressure-fill" style={{ width: `${capacityUsed}%` }} />
      </div>
      <p>{capacity - inboxCount} slots before overload.</p>
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ActionButtons({
  emailId,
  disabled,
  onProcessEmail,
}: {
  emailId: EmailId;
  disabled: boolean;
  onProcessEmail: ActionHandler;
}) {
  return (
    <div className="action-bar">
      {playerActions.map(({ action, label }) => (
        <button
          key={action}
          type="button"
          disabled={disabled}
          onClick={() => onProcessEmail(emailId, action)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function formatAge(now: number, createdAt: number): string {
  const ageMs = Math.max(0, now - createdAt);
  if (ageMs < 1000) {
    return "Just now";
  }

  const ageSeconds = Math.floor(ageMs / 1000);
  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  }

  return `${Math.floor(ageSeconds / 60)}m ago`;
}

function formatActionLabel(action: PlayerAction): string {
  switch (action) {
    case "reply":
      return "Reply";
    case "open_link":
      return "Open Link";
    case "archive":
      return "Archive";
    case "report_spam":
      return "Report Spam";
  }
}
