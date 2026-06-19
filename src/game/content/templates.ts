import type { EmailCategory, EmailUrgency, TemplateId, ThreadType } from "../state";

export type EscalationStep = {
  delayMs: number;
  templateId: TemplateId;
};

export type EmailTemplate = {
  id: TemplateId;
  sender: string;
  subject: string;
  previewText: string;
  category: EmailCategory;
  urgency: EmailUrgency;
  threadType: ThreadType;
  escalation?: EscalationStep[];
};

const templates = [
  {
    id: "team_question",
    sender: "alex@company.com",
    subject: "Question about the rollout",
    previewText: "Can you confirm the launch checklist is current?",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    escalation: [
      { delayMs: 10000, templateId: "checking_on_rollout" },
      { delayMs: 20000, templateId: "adding_project_channel" },
    ],
  },
  {
    id: "checking_on_rollout",
    sender: "alex@company.com",
    subject: "Re: Question about the rollout",
    previewText: "Checking again before I update the launch notes.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
  },
  {
    id: "adding_project_channel",
    sender: "alex@company.com",
    subject: "Adding the project channel",
    previewText: "Looping in the channel so the rollout notes do not drift.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
  },
  {
    id: "document_approval",
    sender: "docs@company.com",
    subject: "Document approval requested",
    previewText: "Open the approval link to review the latest draft.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
  },
  {
    id: "newsletter",
    sender: "updates@vendor.example",
    subject: "This week in productivity",
    previewText: "Five workflow tips nobody asked for.",
    category: "junk",
    urgency: "normal",
    threadType: "normal",
  },
  {
    id: "fake_security_alert",
    sender: "security@amaz0n-alerts.example",
    subject: "Verify your account",
    previewText: "Your account will be locked unless you act now.",
    category: "spam",
    urgency: "normal",
    threadType: "normal",
  },
  {
    id: "need_budget_numbers",
    sender: "ceo@company.com",
    subject: "Need Budget Numbers",
    previewText: "Please send the board packet numbers before the meeting.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    escalation: [
      { delayMs: 8000, templateId: "following_up" },
      { delayMs: 15000, templateId: "need_response_asap" },
    ],
  },
  {
    id: "following_up",
    sender: "ceo@company.com",
    subject: "Following Up",
    previewText: "Still waiting on those budget numbers.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
  },
  {
    id: "need_response_asap",
    sender: "ceo@company.com",
    subject: "Need Response ASAP",
    previewText: "Looping this back to the top of your inbox.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
  },
] satisfies EmailTemplate[];

export const emailTemplates: readonly EmailTemplate[] = templates;
assertUniqueTemplateIds(templates);

export const emailTemplatesById: Readonly<Record<TemplateId, EmailTemplate>> = Object.fromEntries(
  emailTemplates.map((template) => [template.id, template]),
);

export const defaultSpawnTemplateIds: readonly TemplateId[] = [
  "team_question",
  "document_approval",
  "newsletter",
  "fake_security_alert",
];

validateTemplateReferences();

function assertUniqueTemplateIds(templates: readonly EmailTemplate[]): void {
  const seenTemplateIds = new Set<TemplateId>();
  for (const template of templates) {
    if (seenTemplateIds.has(template.id)) {
      throw new Error(`Duplicate email template id: ${template.id}`);
    }
    seenTemplateIds.add(template.id);
  }
}

function assertKnownTemplateId(templateId: TemplateId, context: string): void {
  if (!emailTemplatesById[templateId]) {
    throw new Error(`Unknown email template reference ${templateId} in ${context}`);
  }
}

function validateTemplateReferences(): void {
  if (defaultSpawnTemplateIds.length === 0) {
    throw new Error("defaultSpawnTemplateIds must not be empty");
  }

  for (const templateId of defaultSpawnTemplateIds) {
    assertKnownTemplateId(templateId, "defaultSpawnTemplateIds");
  }

  for (const template of templates) {
    for (const step of template.escalation ?? []) {
      assertKnownTemplateId(step.templateId, `${template.id}.escalation`);
    }
  }
}

export function getTemplate(templateId: TemplateId): EmailTemplate {
  const template = emailTemplatesById[templateId];
  if (!template) {
    throw new Error(`Unknown email template: ${templateId}`);
  }
  return template;
}
