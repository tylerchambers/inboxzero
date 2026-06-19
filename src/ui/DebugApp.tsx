import { useEffect, useState } from "react";
import { emailTemplates } from "../game/content/templates";
import type { Email, GameState, TemplateId } from "../game/state";
import { DebugEmailCard, DebugScheduledEvents } from "./debugComponents";
import { type ActionHandler, Metric } from "./sharedComponents";
import { debugGameStore, selectInboxEmails, useGameStore } from "./useGame";

export function DebugApp() {
  const [autoTick, setAutoTick] = useState(false);
  const state = useGameStore(debugGameStore, (store) => store.state);
  const tick = useGameStore(debugGameStore, (store) => store.tick);
  const spawn = useGameStore(debugGameStore, (store) => store.spawn);
  const process = useGameStore(debugGameStore, (store) => store.process);
  const pause = useGameStore(debugGameStore, (store) => store.pause);
  const resume = useGameStore(debugGameStore, (store) => store.resume);
  const restart = useGameStore(debugGameStore, (store) => store.restart);

  useEffect(() => {
    if (!autoTick) {
      return;
    }

    const intervalId = window.setInterval(() => tick(1000), 1000);
    return () => window.clearInterval(intervalId);
  }, [autoTick, tick]);

  return (
    <DebugView
      state={state}
      emails={selectInboxEmails(state)}
      autoTick={autoTick}
      setAutoTick={setAutoTick}
      tick={tick}
      spawn={spawn}
      process={process}
      pause={pause}
      resume={resume}
      restart={restart}
    />
  );
}

const DEBUG_SPAWN_BUTTONS: readonly { label: string; templateId?: TemplateId }[] = [
  { label: "Spawn Random" },
  { label: "Spawn Spam", templateId: "fake_security_alert" },
  { label: "Spawn Link", templateId: "document_approval" },
  { label: "Spawn Newsletter", templateId: "newsletter" },
  { label: "Spawn Needs Reply", templateId: "team_question" },
  { label: "Spawn Urgent", templateId: "need_budget_numbers" },
];

export function DebugView({
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
  spawn: (templateId?: TemplateId) => void;
  process: ActionHandler;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Inbox Zero</p>
          <h1>Mechanic cockpit</h1>
          <p className="lede">Deterministic debug controls for spawn, schedule, and thread QA.</p>
        </div>
      </header>

      <section aria-label="Debug cockpit" className="debug-layout">
        <DebugRunControls
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
            {DEBUG_SPAWN_BUTTONS.map((button) => (
              <button
                key={button.label}
                type="button"
                onClick={() =>
                  button.templateId === undefined ? spawn() : spawn(button.templateId)
                }
              >
                {button.label}
              </button>
            ))}
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
    </main>
  );
}

function DebugRunControls({
  state,
  autoTick,
  setAutoTick,
  tick,
  pause,
  resume,
  restart,
}: {
  state: GameState;
  autoTick: boolean;
  setAutoTick: (autoTick: boolean) => void;
  tick: (dt?: number) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
}) {
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
          Restart Debug
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
