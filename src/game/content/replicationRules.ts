import type { EmailCategory, PlayerAction, TemplateId } from "../state";

export type ReplicationTrigger = "wrong_action";

export type ReplicationRule = {
  trigger: ReplicationTrigger;
  category: EmailCategory;
  action: PlayerAction;
  spawns: readonly {
    delayMs: number;
    templateId: TemplateId;
    count?: number;
  }[];
};

export const wrongActionReplicationRules: readonly ReplicationRule[] = [
  {
    trigger: "wrong_action",
    category: "spam",
    action: "reply",
    spawns: [
      { delayMs: 1000, templateId: "fake_security_alert" },
      { delayMs: 3000, templateId: "newsletter" },
    ],
  },
  {
    trigger: "wrong_action",
    category: "spam",
    action: "open_link",
    spawns: [
      { delayMs: 0, templateId: "fake_security_alert" },
      { delayMs: 0, templateId: "newsletter" },
      { delayMs: 5000, templateId: "fake_security_alert" },
    ],
  },
  {
    trigger: "wrong_action",
    category: "urgent_reply",
    action: "archive",
    spawns: [{ delayMs: 2000, templateId: "following_up" }],
  },
  {
    trigger: "wrong_action",
    category: "urgent_reply",
    action: "open_link",
    spawns: [{ delayMs: 2000, templateId: "following_up" }],
  },
  {
    trigger: "wrong_action",
    category: "urgent_reply",
    action: "report_spam",
    spawns: [
      { delayMs: 2000, templateId: "following_up" },
      { delayMs: 5000, templateId: "need_response_asap" },
    ],
  },
];
