import { useEffect, useState } from "react";
import type { Email, EmailId, GameState } from "../game/state";
import {
  type ActionHandler,
  formatAge,
  PlayableEmailCard,
  PressureMeter,
} from "./sharedComponents";
import { playableGameStore, selectInboxEmails, useGameStore } from "./useGame";

export function PlayableApp() {
  const [selectedEmailId, setSelectedEmailId] = useState<EmailId | null>(null);
  const state = useGameStore(playableGameStore, (store) => store.state);
  const tick = useGameStore(playableGameStore, (store) => store.tick);
  const process = useGameStore(playableGameStore, (store) => store.process);
  const restart = useGameStore(playableGameStore, (store) => store.restart);
  const pause = useGameStore(playableGameStore, (store) => store.pause);
  const resume = useGameStore(playableGameStore, (store) => store.resume);

  useEffect(() => {
    if (state.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => tick(1000), 1000);
    return () => window.clearInterval(intervalId);
  }, [state.status, tick]);

  const emails = selectInboxEmails(state);
  const selectedEmail = emails.find((email) => email.id === selectedEmailId) ?? emails[0] ?? null;

  const restartRun = () => {
    restart();
    setSelectedEmailId(null);
  };

  return (
    <PlayableView
      state={state}
      emails={emails}
      selectedEmail={selectedEmail}
      onRestart={restartRun}
      onPause={pause}
      onResume={resume}
      onSelectEmail={setSelectedEmailId}
      onProcessEmail={process}
    />
  );
}

export function PlayableView({
  state,
  emails,
  selectedEmail,
  onRestart,
  onPause,
  onResume,
  onSelectEmail,
  onProcessEmail,
}: {
  state: GameState;
  emails: readonly Email[];
  selectedEmail: Email | null;
  onRestart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSelectEmail: (emailId: EmailId) => void;
  onProcessEmail: ActionHandler;
}) {
  return (
    <main className="app-shell">
      <section aria-label="Playable inbox" className="playable-layout">
        <aside className="status-rail">
          <section aria-label="Run controls" className="production-controls">
            <button type="button" className="primary-button" onClick={onRestart}>
              Reload mailbox
            </button>
            {state.status === "running" ? (
              <button type="button" onClick={onPause}>
                Pause sync
              </button>
            ) : (
              <button type="button" onClick={onResume} disabled={state.status === "gameOver"}>
                Resume sync
              </button>
            )}
          </section>
          <PressureMeter inboxCount={state.inbox.emailIds.length} capacity={state.inbox.capacity} />
          {state.status === "gameOver" ? (
            <section aria-label="Mailbox full" className="mailbox-alert" role="alert">
              <strong>Mailbox capacity reached.</strong>
              <p>Reload the mailbox to continue receiving messages.</p>
              <button type="button" onClick={onRestart}>
                Reload mailbox
              </button>
            </section>
          ) : null}
        </aside>

        <section aria-label="Inbox message list" className="message-list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Mail</p>
              <h2>Inbox</h2>
            </div>
            <span className="message-count">{emails.length} messages</span>
          </div>
          {emails.length === 0 ? <p className="empty-state">No messages.</p> : null}
          <div className="message-list scroll-after-four">
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
            <div className="empty-detail start-panel">
              <p className="eyebrow">Reading pane</p>
              <h2>No message selected</h2>
              <p>Select a message to preview its contents.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
