import type { EmailId, PlayerAction } from "./state";

export type PlayerCommand =
  | {
      type: "PROCESS_EMAIL";
      emailId: EmailId;
      action: PlayerAction;
    }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESTART" };
