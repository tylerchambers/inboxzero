import type { Email, GameState } from "../game/state";
import { ActionButtons, type ActionHandler, Metric } from "./sharedComponents";

export function DebugEmailCard({
  email,
  disabled,
  onProcessEmail,
}: {
  email: Email;
  disabled: boolean;
  onProcessEmail: ActionHandler;
}) {
  return (
    <article className="email-card debug-card">
      <h3>{email.subject}</h3>
      <p>{email.previewText}</p>
      <dl className="stat-grid debug-metadata">
        <Metric label="Sender" value={email.sender} />
        <Metric label="Category" value={email.category} />
        <Metric label="Urgency" value={email.urgency} />
        <Metric label="Template" value={email.templateId} />
        <Metric label="ID" value={email.id} />
        <Metric label="Thread" value={email.threadId ?? "none"} />
      </dl>
      <ActionButtons emailId={email.id} disabled={disabled} onProcessEmail={onProcessEmail} />
    </article>
  );
}

export function DebugScheduledEvents({ state }: { state: GameState }) {
  return (
    <section aria-label="Scheduled events" className="debug-panel">
      <h2>Scheduled events</h2>
      {state.scheduled.length === 0 ? <p>No scheduled events.</p> : null}
      <ul className="scheduled-list">
        {state.scheduled.map((scheduled) => (
          <li key={scheduled.id}>
            <strong>{scheduled.id}</strong> due {scheduled.dueAt}{" "}
            {scheduled.event.type === "SPAWN_EMAIL" ? scheduled.event.source : "game_over"}
            {scheduled.event.type === "SPAWN_EMAIL" && scheduled.event.templateId !== undefined ? (
              <> template {scheduled.event.templateId}</>
            ) : null}
            {scheduled.event.type === "SPAWN_EMAIL" &&
            scheduled.event.parentEmailId !== undefined ? (
              <> parent {scheduled.event.parentEmailId}</>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
