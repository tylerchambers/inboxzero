import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { emailTemplates } from "./game/content/templates";
import type { ActionResult, Email, EmailId, GameState, PlayerAction } from "./game/state";
import { debugGameStore, playableGameStore, useGameStore } from "./ui/useGame";

type AppMode = "debug" | "playable";

type RunControlsProps = {
  mode: AppMode;
  state: GameState;
  autoTick: boolean;
  setAutoTick: (autoTick: boolean) => void;
  tick: (dt?: number) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
};

type ActionHandler = (emailId: EmailId, action: PlayerAction) => void;

const playerActions: readonly { action: PlayerAction; label: string }[] = [
  { action: "reply", label: "Reply" },
  { action: "open_link", label: "Open Link" },
  { action: "archive", label: "Archive" },
  { action: "report_spam", label: "Report Spam" },
];

export function App() {
  const [mode, setMode] = useState<AppMode>("playable");
  const [autoTick, setAutoTick] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<EmailId | null>(null);
  const activeStore = mode === "debug" ? debugGameStore : playableGameStore;
  const state = useGameStore(activeStore, (store) => store.state);
  const tick = useGameStore(activeStore, (store) => store.tick);
  const spawn = useGameStore(activeStore, (store) => store.spawn);
  const process = useGameStore(activeStore, (store) => store.process);
  const pause = useGameStore(activeStore, (store) => store.pause);
  const resume = useGameStore(activeStore, (store) => store.resume);
  const restart = useGameStore(activeStore, (store) => store.restart);

  useEffect(() => {
    if (!autoTick) {
      return;
    }

    const intervalId = window.setInterval(() => tick(1000), 1000);
    return () => window.clearInterval(intervalId);
  }, [autoTick, tick]);

  const emails = state.inbox.emailIds.reduce<Email[]>((accumulator, id) => {
    const email = state.emails[id];
    if (email) {
      accumulator.push(email);
    }
    return accumulator;
  }, []);
  const selectedEmail = emails.find((email) => email.id === selectedEmailId) ?? emails[0] ?? null;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Inbox Zero</p>
          <h1>{mode === "playable" ? "Survive the inbox" : "Mechanic cockpit"}</h1>
          <p className="lede">
            {mode === "playable"
              ? "Read the message, pick the right action, and keep the queue below capacity."
              : "Deterministic debug controls for spawn, schedule, and thread QA."}
          </p>
        </div>
        <nav aria-label="Mode controls" className="mode-toggle">
          <button type="button" disabled={mode === "playable"} onClick={() => setMode("playable")}>
            Playable run
          </button>
          <button type="button" disabled={mode === "debug"} onClick={() => setMode("debug")}>
            Debug mode
          </button>
        </nav>
      </header>

      {mode === "playable" ? (
        <PlayableRun
          state={state}
          emails={emails}
          selectedEmail={selectedEmail}
          onSelectEmail={setSelectedEmailId}
          onProcessEmail={process}
          controls={{ mode, state, autoTick, setAutoTick, tick, pause, resume, restart }}
        />
      ) : (
        <DebugRun
          state={state}
          emails={emails}
          autoTick={autoTick}
          setAutoTick={setAutoTick}
          tick={tick}
          spawn={spawn}
          process={process}
          pause={pause}
          resume={resume}
          restart={restart}
        />
      )}
    </main>
  );
}

function PlayableRun({
  state,
  emails,
  selectedEmail,
  onSelectEmail,
  onProcessEmail,
  controls,
}: {
  state: GameState;
  emails: readonly Email[];
  selectedEmail: Email | null;
  onSelectEmail: (emailId: EmailId) => void;
  onProcessEmail: ActionHandler;
  controls: RunControlsProps;
}) {
  return (
    <section aria-label="Playable inbox" className="playable-layout">
      <aside className="status-rail">
        <RunControls {...controls} />
        <PressureMeter inboxCount={state.inbox.emailIds.length} capacity={state.inbox.capacity} />
        <div className="stat-grid compact">
          <Metric label="Score" value={state.score.value} />
          <Metric label="Processed" value={state.score.processed} />
          <Metric label="Mistakes" value={state.score.mistakes} />
          <Metric label="Streak" value={state.score.streak} />
        </div>
        {state.status === "gameOver" ? (
          <GameOverSummary state={state} restart={controls.restart} />
        ) : null}
        <ActionFeedback result={state.lastActionResult} />
      </aside>

      <section aria-label="Inbox message list" className="message-list-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2>{emails.length} open</h2>
          </div>
          <span className={state.status === "running" ? "status-pill running" : "status-pill"}>
            {state.status}
          </span>
        </div>
        {emails.length === 0 ? (
          <p className="empty-state">No emails. Enjoy the suspicious quiet.</p>
        ) : null}
        <div className="message-list">
          {emails.map((email) => (
            <button
              key={email.id}
              type="button"
              className={email.id === selectedEmail?.id ? "message-row selected" : "message-row"}
              aria-pressed={email.id === selectedEmail?.id}
              onClick={() => onSelectEmail(email.id)}
            >
              <span className="row-topline">
                <strong>{email.sender}</strong>
                <span>{formatAge(state.clock.now, email.createdAt)}</span>
              </span>
              <span className="row-subject">{email.subject}</span>
              <span className="row-preview">{email.previewText}</span>
              <span className={email.urgency === "urgent" ? "priority urgent" : "priority"}>
                {email.urgency === "urgent" ? "Urgent" : "Routine"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Selected message" className="detail-panel">
        {selectedEmail ? (
          <PlayableEmailCard
            email={selectedEmail}
            now={state.clock.now}
            disabled={state.status === "gameOver"}
            onProcessEmail={onProcessEmail}
          />
        ) : (
          <div className="empty-detail">
            <p className="eyebrow">Selected message</p>
            <h2>Nothing to triage.</h2>
            <p>The run starts quiet. Tick time forward or enable auto tick.</p>
          </div>
        )}
      </section>
    </section>
  );
}

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
      <p className="message-body">{email.previewText}</p>
      <ActionButtons email={email} disabled={disabled} onProcessEmail={onProcessEmail} />
    </article>
  );
}

function DebugRun({
  state,
  emails,
  autoTick,
  setAutoTick,
  tick,
  spawn,
  process,
  pause,
  resume,
  restart,
}: {
  state: GameState;
  emails: readonly Email[];
  autoTick: boolean;
  setAutoTick: (autoTick: boolean) => void;
  tick: (dt?: number) => void;
  spawn: (templateId?: string) => void;
  process: ActionHandler;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}) {
  return (
    <section aria-label="Debug mode" className="debug-layout">
      <RunControls
        mode="debug"
        state={state}
        autoTick={autoTick}
        setAutoTick={setAutoTick}
        tick={tick}
        pause={pause}
        resume={resume}
        restart={restart}
      />

      <section aria-label="Debug spawn controls" className="debug-panel">
        <h2>Debug spawns</h2>
        <div className="button-row">
          <button type="button" onClick={() => spawn()}>
            Spawn Random
          </button>
          <button type="button" onClick={() => spawn("fake_security_alert")}>
            Spawn Spam
          </button>
          <button type="button" onClick={() => spawn("document_approval")}>
            Spawn Link
          </button>
          <button type="button" onClick={() => spawn("newsletter")}>
            Spawn Newsletter
          </button>
          <button type="button" onClick={() => spawn("team_question")}>
            Spawn Needs Reply
          </button>
          <button type="button" onClick={() => spawn("need_budget_numbers")}>
            Spawn Urgent
          </button>
        </div>
      </section>

      <section aria-label="Game state" className="debug-panel">
        <h2>State</h2>
        <div className="stat-grid">
          <Metric label="Mode" value="debug" />
          <Metric label="Status" value={state.status} />
          <Metric label="Clock now" value={state.clock.now} />
          <Metric label="Clock tick" value={state.clock.tick} />
          <Metric label="Inbox count" value={state.inbox.emailIds.length} />
          <Metric label="Inbox capacity" value={state.inbox.capacity} />
          <Metric label="Score" value={state.score.value} />
          <Metric label="Streak" value={state.score.streak} />
          <Metric label="Processed" value={state.score.processed} />
          <Metric label="Mistakes" value={state.score.mistakes} />
          <Metric label="Difficulty level" value={state.difficulty.level} />
          <Metric label="Spawn interval" value={state.difficulty.spawnIntervalMs} />
          <Metric label="Next spawn at" value={state.difficulty.nextSpawnAt} />
          <Metric label="Batch size" value={state.difficulty.batchSize} />
          <Metric label="Scheduled" value={state.scheduled.length} />
          <Metric label="Threads" value={Object.keys(state.threads).length} />
        </div>
      </section>

      <DebugScheduledEvents state={state} />

      <section aria-label="Inbox" className="debug-panel">
        <h2>Inbox</h2>
        {emails.length === 0 ? <p>No emails.</p> : null}
        <div className="debug-card-grid">
          {emails.map((email) => (
            <DebugEmailCard
              key={email.id}
              email={email}
              disabled={state.status === "gameOver"}
              onProcessEmail={process}
            />
          ))}
        </div>
      </section>

      <details className="debug-panel">
        <summary>Email templates</summary>
        <ul>
          {emailTemplates.map((template) => (
            <li key={template.id}>
              <strong>{template.id}</strong> — {template.category}, {template.urgency},{" "}
              {template.sender}, {template.subject}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

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
      <ActionButtons email={email} disabled={disabled} onProcessEmail={onProcessEmail} />
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

function RunControls({
  mode,
  state,
  autoTick,
  setAutoTick,
  tick,
  pause,
  resume,
  restart,
}: RunControlsProps) {
  return (
    <section aria-label="Run controls" className="run-controls">
      <div className="button-row">
        <button type="button" onClick={() => tick(1000)}>
          Tick +1s
        </button>
        <button type="button" onClick={() => tick(8000)}>
          Tick +8s
        </button>
        {state.status === "running" ? (
          <button type="button" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" onClick={resume} disabled={state.status === "gameOver"}>
            Resume
          </button>
        )}
        <button type="button" className="primary-button" onClick={restart}>
          {mode === "playable" ? "Start / Restart Run" : "Restart Debug"}
        </button>
      </div>

      <label className="auto-tick">
        <input
          type="checkbox"
          checked={autoTick}
          onChange={(event) => setAutoTick(event.currentTarget.checked)}
        />
        Auto tick
      </label>
    </section>
  );
}

function PressureMeter({ inboxCount, capacity }: { inboxCount: number; capacity: number }) {
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

function ActionButtons({
  email,
  disabled,
  onProcessEmail,
}: {
  email: Email;
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
          onClick={() => onProcessEmail(email.id, action)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatAge(now: number, createdAt: number): string {
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

if (typeof document !== "undefined") {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
