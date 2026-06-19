import type { EmailId, ScheduledEventId, TemplateId } from "./state";

export type SpawnSource =
  | "normal_spawn"
  | "manual"
  | "replication"
  | "escalation"
  | "wrong_action"
  | "thread_branch";

export type SimEvent =
  | { type: "TICK"; now: number; dt: number }
  | {
      type: "SPAWN_EMAIL";
      source: SpawnSource;
      templateId?: TemplateId;
      count?: number;
      parentEmailId?: EmailId;
    }
  | { type: "GAME_OVER" };

export type ScheduledSimEvent = Extract<SimEvent, { type: "SPAWN_EMAIL" | "GAME_OVER" }>;

export type ScheduledEvent = {
  id: ScheduledEventId;
  dueAt: number;
  event: ScheduledSimEvent;
};
