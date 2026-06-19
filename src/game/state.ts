import type { ScheduledEvent } from "./events";

export type GameStatus = "running" | "paused" | "gameOver";

export type EmailId = string;
export type ThreadId = string;
export type TemplateId = string;
export type ScheduledEventId = string;

export type EmailCategory = "spam" | "needs_reply" | "needs_link_click" | "urgent_reply" | "junk";

export type PlayerAction = "reply" | "open_link" | "archive" | "report_spam";

export type EmailUrgency = "normal" | "urgent";

export type EmailState = "unprocessed" | "replicated";

export type ThreadType = "normal" | "urgent_escalation" | "work_follow_up";

export type ActionResult = {
  emailId: EmailId;
  subject: string;
  action: PlayerAction;
  wasCorrect: boolean;
  scoreDelta: number;
  mistakesDelta: number;
  scheduledConsequences: number;
};

export type Email = {
  id: EmailId;
  sender: string;
  subject: string;
  previewText: string;
  category: EmailCategory;
  urgency: EmailUrgency;
  createdAt: number;
  threadId: ThreadId | null;
  templateId: TemplateId;
  state: EmailState;
};

export type EmailThread = {
  id: ThreadId;
  rootEmailId: EmailId;
  emailIds: EmailId[];
  threadType: ThreadType;
  growthRate: number;
  lastActivityAt: number;
};

export type ClockState = {
  now: number;
  elapsedMs: number;
  tick: number;
};

export type InboxState = {
  capacity: number;
  emailIds: EmailId[];
};

export type ScoreState = {
  value: number;
  streak: number;
  processed: number;
  mistakes: number;
};

export type DifficultyState = {
  level: number;
  spawnIntervalMs: number;
  nextSpawnAt: number;
  batchSize: number;
};

export type GameState = {
  status: GameStatus;
  clock: ClockState;
  inbox: InboxState;
  emails: Record<EmailId, Email>;
  threads: Record<ThreadId, EmailThread>;
  scheduled: ScheduledEvent[];
  score: ScoreState;
  difficulty: DifficultyState;
  lastActionResult: ActionResult | null;
  rngSeed: string;
  nextEmailId: number;
  nextThreadId: number;
  nextScheduledEventId: number;
};

export type InitialStateOptions = {
  capacity?: number;
  rngSeed?: string;
};

export function createInitialState(options: InitialStateOptions = {}): GameState {
  return {
    status: "running",
    clock: {
      now: 0,
      elapsedMs: 0,
      tick: 0,
    },
    inbox: {
      capacity: options.capacity ?? 1000,
      emailIds: [],
    },
    emails: {},
    threads: {},
    scheduled: [],
    score: {
      value: 0,
      streak: 0,
      processed: 0,
      mistakes: 0,
    },
    difficulty: {
      level: 1,
      spawnIntervalMs: 5000,
      nextSpawnAt: 5000,
      batchSize: 1,
    },
    lastActionResult: null,
    rngSeed: options.rngSeed ?? "inbox-zero",
    nextEmailId: 1,
    nextThreadId: 1,
    nextScheduledEventId: 1,
  };
}

export const correctActionByCategory: Record<EmailCategory, PlayerAction> = {
  spam: "report_spam",
  needs_reply: "reply",
  needs_link_click: "open_link",
  urgent_reply: "reply",
  junk: "archive",
};
