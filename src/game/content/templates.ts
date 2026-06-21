import type { EmailCategory, EmailUrgency, TemplateId, ThreadType, WeirdnessLevel } from "../state";

export type EscalationStep = {
  delayMs: number;
  templateId: TemplateId;
};

export type EmailTemplate = {
  id: TemplateId;
  sender: string;
  subject: string;
  previewText: string;
  bodyText: string;
  category: EmailCategory;
  urgency: EmailUrgency;
  threadType: ThreadType;
  weirdnessLevel: WeirdnessLevel;
  ambientSpawn?: false;
  escalation?: EscalationStep[];
};

const templates = [
  {
    id: "team_question",
    sender: "alex@company.com",
    subject: "Question about the rollout",
    previewText: "Can you confirm the launch checklist is current?",
    bodyText:
      "Hi — can you confirm the launch checklist is current before I update the release notes? I mainly need a yes or no on the owner column and the rollback step.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
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
    bodyText:
      "Checking again before I update the launch notes. If the checklist is still stale, please reply with the blocker so I can flag it in the channel.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
    ambientSpawn: false,
  },
  {
    id: "adding_project_channel",
    sender: "alex@company.com",
    subject: "Adding the project channel",
    previewText: "Looping in the channel so the rollout notes do not drift.",
    bodyText:
      "Looping in the project channel so the rollout notes do not drift. Please reply here before the thread forks again.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
    ambientSpawn: false,
  },
  {
    id: "document_approval",
    sender: "docs@company.com",
    subject: "Document approval requested",
    previewText: "Open the approval link to review the latest draft.",
    bodyText:
      "A document is waiting for your approval. Open the approval link, review the highlighted changes, and submit your decision before the end of day.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "newsletter",
    sender: "updates@vendor.example",
    subject: "This week in productivity",
    previewText: "Five workflow tips nobody asked for.",
    bodyText:
      "This week: five workflow tips nobody asked for, one webinar replay, and a downloadable checklist about checklists. Archive this unless you need vendor noise.",
    category: "junk",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "fake_security_alert",
    sender: "security@amaz0n-alerts.example",
    subject: "Verify your account",
    previewText: "Your account will be locked unless you act now.",
    bodyText:
      "Your account will be locked unless you act now. Use the attached verification portal to restore access. This sender is not your company security team.",
    category: "spam",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "need_budget_numbers",
    sender: "ceo@company.com",
    subject: "Need Budget Numbers",
    previewText: "Please send the board packet numbers before the meeting.",
    bodyText:
      "Please send the board packet numbers before the meeting. I need the current forecast, the variance note, and the headcount delta in one reply.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 0,
    ambientSpawn: false,
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
    bodyText:
      "Still waiting on those budget numbers. Reply in this thread so I can paste them directly into the board packet.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 0,
    ambientSpawn: false,
  },
  {
    id: "need_response_asap",
    sender: "ceo@company.com",
    subject: "Need Response ASAP",
    previewText: "Looping this back to the top of your inbox.",
    bodyText:
      "Looping this back to the top of your inbox. I need the final numbers now, even if they are caveated.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 0,
    ambientSpawn: false,
  },
  {
    id: "hr_training_due",
    sender: "peopleops@company.com",
    subject: "Action required: Q3 compliance training",
    previewText: "Complete the required module before Friday.",
    bodyText:
      "Our records show that you have not completed the Q3 compliance training. Open the learning portal, complete the module, and acknowledge the policy receipt before Friday.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "security_awareness_reminder",
    sender: "security@company.com",
    subject: "Security awareness refresher assigned",
    previewText: "Your annual security refresher is ready in the portal.",
    bodyText:
      "Your annual security refresher has been assigned. Open the security portal and complete the refresher so the audit dashboard stops flagging your account.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "vpn_certificate_expiring",
    sender: "it-helpdesk@company.com",
    subject: "VPN certificate expires soon",
    previewText: "Renew your device certificate before remote access fails.",
    bodyText:
      "Your laptop VPN certificate expires soon. Open the device management link and renew the certificate before remote access starts failing during standup.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "quarterly_goals_ack",
    sender: "manager@company.com",
    subject: "Please acknowledge your quarterly goals",
    previewText: "Reply once the goals in the tracker look correct.",
    bodyText:
      "Please review the quarterly goals in the tracker and reply here once they look correct. If anything is off, send the exact edit in your reply.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
  },
  {
    id: "calendar_sync_request",
    sender: "programs@company.com",
    subject: "Can you meet about the dependency map?",
    previewText: "Please reply with a time that works this week.",
    bodyText:
      "Can you meet about the dependency map this week? Reply with a time that works and whether the API migration item still belongs in phase two.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
  },
  {
    id: "expense_policy_update",
    sender: "finance@company.com",
    subject: "Updated expense policy for meal receipts",
    previewText: "A policy update was posted for meal receipt handling.",
    bodyText:
      "Finance has updated the expense policy for meal receipts. No action is needed unless you submit travel expenses this month.",
    category: "junk",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "merge_request_review",
    sender: "gitlab@company.com",
    subject: "Review requested: auth timeout cleanup",
    previewText: "Open the merge request and review the latest changes.",
    bodyText:
      "You have been requested as a reviewer on auth timeout cleanup. Open the merge request, review the diff, and leave an approval or blocking comment.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
    escalation: [
      { delayMs: 12000, templateId: "mr_review_follow_up" },
      { delayMs: 22000, templateId: "release_blocked_review" },
    ],
  },
  {
    id: "mr_review_follow_up",
    sender: "gitlab@company.com",
    subject: "Reminder: auth timeout cleanup needs review",
    previewText: "The merge request is still waiting on your review.",
    bodyText:
      "The auth timeout cleanup merge request is still waiting on your review. Open it and leave feedback so the author can move the release train.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
    ambientSpawn: false,
  },
  {
    id: "release_blocked_review",
    sender: "release-bot@company.com",
    subject: "Release blocked by pending review",
    previewText: "The release branch is waiting for your merge request review.",
    bodyText:
      "The release branch is blocked by your pending merge request review. Open the review and approve or comment with the blocking issue.",
    category: "needs_link_click",
    urgency: "urgent",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
    ambientSpawn: false,
  },
  {
    id: "access_request_approval",
    sender: "access-control@company.com",
    subject: "Access request pending approval",
    previewText: "Open the access portal to approve or deny the request.",
    bodyText:
      "A teammate requested access to the staging dashboard. Open the access portal and approve or deny the request based on the project role listed there.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "incident_review_notes",
    sender: "incident-command@company.com",
    subject: "Incident review notes needed",
    previewText: "Reply with your timeline notes for the postmortem.",
    bodyText:
      "Please reply with your timeline notes for yesterday's incident review. Include exact times, customer impact, and any follow-up action you own.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 0,
  },
  {
    id: "onboarding_buddy_checkin",
    sender: "newhire-program@company.com",
    subject: "Onboarding buddy check-in",
    previewText: "Reply with whether your new hire completed setup.",
    bodyText:
      "Please reply with whether your new hire completed repository access, local setup, and the first-week checklist. People Ops is closing the onboarding report.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
  },
  {
    id: "vendor_webinar_invite",
    sender: "events@saas-vendor.example",
    subject: "Webinar: maximizing developer velocity",
    previewText: "Join us for a thought leadership session next Tuesday.",
    bodyText:
      "Join us next Tuesday for a thought leadership session about maximizing developer velocity with dashboards, maturity curves, and one customer panel.",
    category: "junk",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "invoice_approval_request",
    sender: "ap@company.com",
    subject: "Invoice approval requested",
    previewText: "Open the finance workflow to approve the vendor invoice.",
    bodyText:
      "A vendor invoice is waiting for your approval in the finance workflow. Open the invoice, verify the cost center, and approve or reject it.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "media_request_quote",
    sender: "comms@company.com",
    subject: "Media request: short technical quote",
    previewText: "Reply with a safe quote for the product launch brief.",
    bodyText:
      "Comms needs a short technical quote for the product launch brief. Reply with one sentence that is accurate, bland, and safe to publish.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
  },
  {
    id: "standup_notes_correction",
    sender: "scrum-master@company.com",
    subject: "Correction needed in standup notes",
    previewText: "Reply with the accurate status for the API task.",
    bodyText:
      "The standup notes list your API task as blocked. Reply with the accurate status so I can correct the project digest before it posts.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 0,
  },
  {
    id: "repo_permission_request",
    sender: "source-control@company.com",
    subject: "Repository permission request",
    previewText: "Open the request to grant or deny maintainer access.",
    bodyText:
      "A contractor requested maintainer access to the reporting repository. Open the request and approve or deny access based on the linked ticket.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 0,
  },
  {
    id: "office_plant_reply",
    sender: "facilities@company.com",
    subject: "Please reply about the plant by your desk",
    previewText: "Facilities needs to know whether the plant is yours.",
    bodyText:
      "Facilities is inventorying office plants. Please reply to confirm whether the plant by your desk is yours, abandoned, or part of the workplace experience pilot.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 1,
  },
  {
    id: "badge_reader_whisper",
    sender: "physical-security@company.com",
    subject: "Badge reader anomaly near floor 4",
    previewText: "Reply if you entered the stairwell at 03:14.",
    bodyText:
      "A badge reader anomaly was recorded near floor 4 at 03:14. Please reply if you entered the stairwell or if your badge was in a coat pocket at that time.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 1,
  },
  {
    id: "copier_calendar_invite",
    sender: "mfp-17@company.com",
    subject: "The copier invited you to a sync",
    previewText: "A multifunction printer created a calendar hold.",
    bodyText:
      "A multifunction printer created a calendar hold titled Toner Alignment Sync. The invite has no agenda and can be archived.",
    category: "junk",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 1,
  },
  {
    id: "wellness_survey_mirror",
    sender: "wellness@company.com",
    subject: "Wellness survey follow-up",
    previewText: "Open the survey to confirm your reflection preference.",
    bodyText:
      "The wellness survey requires one more response. Open the survey and confirm whether you prefer windows, mirrors, or no reflective surfaces in focus rooms.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 1,
  },
  {
    id: "data_room_temperature",
    sender: "datacenter@company.com",
    subject: "Temperature variance in Room C",
    previewText: "Reply if your service depends on the warm rack.",
    bodyText:
      "Room C is reporting a localized temperature variance near the warm rack. Reply if your service depends on that rack or if the alert can be muted.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 1,
  },
  {
    id: "calendar_sync_alignment",
    sender: "calendar-daemon@company.com",
    subject: "Meeting alignment issue detected",
    previewText: "Reply to confirm which version of the meeting occurred.",
    bodyText:
      "Calendar detected two versions of the same meeting with different attendees and identical notes. Reply to confirm which version occurred.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 1,
  },
  {
    id: "all_hands_basement",
    sender: "events@company.com",
    subject: "All-hands moved to Basement B",
    previewText: "Open the room map before the company all-hands.",
    bodyText:
      "The company all-hands has moved to Basement B. Open the room map before attending; several stairwells are marked as temporarily conceptual.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 2,
  },
  {
    id: "policy_exception_black_cube",
    sender: "governance@company.com",
    subject: "Policy exception: black cube on desk",
    previewText: "Reply with the owner and business justification.",
    bodyText:
      "A black cube was observed on your desk during workspace review. Reply with the owner, business justification, and whether it emits sound after hours.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 2,
  },
  {
    id: "doc_approval_redacted_appendix",
    sender: "docs@company.com",
    subject: "Approval requested: redacted appendix",
    previewText: "Open the document and approve the visible sections.",
    bodyText:
      "A redacted appendix needs approval. Open the document, review the visible sections, and approve the sections you are authorized to perceive.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 2,
  },
  {
    id: "mr_review_dream_branch",
    sender: "gitlab@company.com",
    subject: "Review requested: dream-journal branch",
    previewText: "Open the merge request and review the generated diff.",
    bodyText:
      "You were requested on a merge request from branch dream-journal. Open the diff and check whether the generated migration matches the schema you remember.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 2,
  },
  {
    id: "security_notice_shadow_login",
    sender: "security@company.com",
    subject: "Unusual login from your shadow account",
    previewText: "Reply if this login was expected.",
    bodyText:
      "Security detected a login from your shadow account using your normal posture score. Reply if this was expected or if the shadow account should be disabled.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 2,
  },
  {
    id: "invoice_from_future_quarter",
    sender: "ap@company.com",
    subject: "Invoice dated next quarter needs approval",
    previewText: "Open the workflow and approve the future-dated invoice.",
    bodyText:
      "A vendor invoice dated next quarter is blocking close. Open the finance workflow and approve it if the amount matches the purchase order you have not received yet.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 2,
  },
  {
    id: "compliance_sigil_draft",
    sender: "compliance@company.com",
    subject: "Review requested: sigil retention policy",
    previewText: "Open the policy draft and approve the retention table.",
    bodyText:
      "The sigil retention policy draft is ready for review. Open the document and approve the table mapping retention period to moon phase and data classification.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 3,
  },
  {
    id: "facilities_locked_floor",
    sender: "facilities@company.com",
    subject: "Do not use the floor that is no longer listed",
    previewText: "Reply if you still have meetings on the missing floor.",
    bodyText:
      "Facilities has removed one floor from the directory. Reply if your calendar still contains meetings there or if the elevator continues to offer it.",
    category: "needs_reply",
    urgency: "normal",
    threadType: "work_follow_up",
    weirdnessLevel: 3,
  },
  {
    id: "legal_hold_oracle_archive",
    sender: "legal@company.com",
    subject: "Legal hold: oracle archive",
    previewText: "Open the hold notice and acknowledge preservation duties.",
    bodyText:
      "You have been added to a legal hold for the oracle archive. Open the notice and acknowledge preservation duties for files, chats, dreams, and adjacent metadata.",
    category: "needs_link_click",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 3,
  },
  {
    id: "security_training_eyes",
    sender: "security@company.com",
    subject: "Mandatory training: eyes in screenshots",
    previewText: "Complete the module on recognizing faces in telemetry.",
    bodyText:
      "A mandatory security module has been assigned: recognizing eyes in screenshots, dashboards, and telemetry. Open the module before your access review.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 3,
  },
  {
    id: "procurement_salt_circle",
    sender: "procurement@company.com",
    subject: "Purchase request requires salt-circle approval",
    previewText: "Open the purchase request and approve the added line item.",
    bodyText:
      "A purchase request for standard monitors now includes a salt-circle line item. Open the request and approve it if the quantity matches your seating chart.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 3,
  },
  {
    id: "field_office_observation",
    sender: "field-office@internal.example",
    subject: "Observation window updated",
    previewText: "Reply to confirm you saw the sedan outside your apartment.",
    bodyText:
      "The observation window has been updated. Reply to confirm you saw the gray sedan outside your apartment and whether the driver made eye contact.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 4,
  },
  {
    id: "sigil_attendance_required",
    sender: "ritual-scheduling@company.com",
    subject: "Attendance required: quarterly sigil review",
    previewText: "Open the calendar hold and confirm your place in the circle.",
    bodyText:
      "Attendance is required for the quarterly sigil review. Open the calendar hold, confirm your place in the circle, and bring the laptop assigned in the sealed inventory.",
    category: "needs_link_click",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 4,
    escalation: [{ delayMs: 9000, templateId: "sigil_second_notice" }],
  },
  {
    id: "sigil_second_notice",
    sender: "ritual-scheduling@company.com",
    subject: "Second notice: sigil review attendance",
    previewText: "Your empty place in the circle has been observed.",
    bodyText:
      "Your empty place in the circle has been observed. Open the calendar hold now or reply with the name of the person attending in your shape.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 4,
    ambientSpawn: false,
  },
  {
    id: "cia_media_request",
    sender: "public-affairs@cia-office.example",
    subject: "Media request concerning your commute",
    previewText: "Reply with a statement about the route you took today.",
    bodyText:
      "We are preparing a media response concerning your commute. Reply with a short statement about the route you took today and why you paused near the blue mailbox.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 4,
  },
  {
    id: "dead_drop_calendar_hold",
    sender: "calendar-daemon@company.com",
    subject: "Calendar hold: dead drop maintenance",
    previewText: "Open the invite and acknowledge the maintenance window.",
    bodyText:
      "A calendar hold has been created for dead drop maintenance behind the cafeteria. Open the invite and acknowledge the window if you still possess the locker key.",
    category: "needs_link_click",
    urgency: "normal",
    threadType: "normal",
    weirdnessLevel: 4,
  },
  {
    id: "directorate_read_receipt",
    sender: "directorate@internal.example",
    subject: "Read receipt required for this thought",
    previewText: "Reply after reading the sentence currently in your head.",
    bodyText:
      "A read receipt is required for the sentence currently in your head. Reply with ACK and do not include the sentence itself; we already have it.",
    category: "urgent_reply",
    urgency: "urgent",
    threadType: "urgent_escalation",
    weirdnessLevel: 4,
  },
] satisfies EmailTemplate[];

export const emailTemplates: readonly EmailTemplate[] = templates;
assertUniqueTemplateIds(templates);

export const emailTemplatesById: Readonly<Record<TemplateId, EmailTemplate>> = Object.fromEntries(
  emailTemplates.map((template) => [template.id, template]),
);

const weirdnessLevels = [0, 1, 2, 3, 4] satisfies readonly WeirdnessLevel[];

export const ambientSpawnTemplateIdsByWeirdnessLevel: Readonly<
  Record<WeirdnessLevel, readonly TemplateId[]>
> = buildAmbientSpawnTemplateIdsByWeirdnessLevel(emailTemplates);

function buildAmbientSpawnTemplateIdsByWeirdnessLevel(
  templates: readonly EmailTemplate[],
): Record<WeirdnessLevel, TemplateId[]> {
  const pools: Record<WeirdnessLevel, TemplateId[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
  };

  for (const template of templates) {
    if (template.ambientSpawn === false) {
      continue;
    }

    for (const level of weirdnessLevels) {
      if (template.weirdnessLevel <= level) {
        pools[level].push(template.id);
      }
    }
  }

  return pools;
}

export function getAmbientSpawnTemplateIds(weirdnessLevel: WeirdnessLevel): readonly TemplateId[] {
  return ambientSpawnTemplateIdsByWeirdnessLevel[weirdnessLevel];
}

validateTemplateReferences();

function assertUniqueTemplateIds(templates: readonly EmailTemplate[]): void {
  const seen = new Set<TemplateId>();
  for (const template of templates) {
    if (seen.has(template.id)) {
      throw new Error(`Duplicate email template id: ${template.id}`);
    }
    seen.add(template.id);
  }
}

function assertKnownTemplateId(templateId: TemplateId, context: string): void {
  if (!emailTemplatesById[templateId]) {
    throw new Error(`Unknown template id ${templateId} referenced by ${context}`);
  }
}

function validateTemplateReferences(): void {
  for (const template of templates) {
    if (!template.id.trim()) throw new Error("Email template id cannot be empty");
    if (!template.sender.trim())
      throw new Error(`Email template ${template.id} sender cannot be empty`);
    if (!template.subject.trim()) {
      throw new Error(`Email template ${template.id} subject cannot be empty`);
    }
    if (!template.previewText.trim()) {
      throw new Error(`Email template ${template.id} previewText cannot be empty`);
    }
    if (!template.bodyText.trim()) {
      throw new Error(`Email template ${template.id} bodyText cannot be empty`);
    }
    for (const step of template.escalation ?? []) {
      assertKnownTemplateId(step.templateId, `escalation for ${template.id}`);
    }
  }

  for (const level of weirdnessLevels) {
    const templateIds = ambientSpawnTemplateIdsByWeirdnessLevel[level];
    if (templateIds.length === 0) {
      throw new Error(`Ambient spawn pool for weirdness level ${level} cannot be empty`);
    }

    for (const templateId of templateIds) {
      if (getTemplate(templateId).weirdnessLevel > level) {
        throw new Error(`Template ${templateId} exceeds ambient spawn weirdness level ${level}`);
      }
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
