export type CompanionReminderStoreReference = {
  id: string;
  enabled: boolean;
};

const REMINDER_BLOCK_RE = /:::reminder\n([\s\S]*?)\n:::/g;

/** Splice the id and delivery state created by the app into saved tool blocks. */
export function injectReminderStoreIds(
  text: string,
  reminders: CompanionReminderStoreReference[],
): string {
  if (reminders.length === 0 || !text.includes(":::reminder")) return text;
  let i = 0;
  return text.replace(REMINDER_BLOCK_RE, (full, raw: string) => {
    const reminder = reminders[i];
    i += 1;
    if (!reminder) return full;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      parsed.id = reminder.id;
      parsed.enabled = reminder.enabled;
      return `:::reminder\n${JSON.stringify(parsed)}\n:::`;
    } catch {
      return full;
    }
  });
}

/**
 * The reminder tool names its categories in its own words (adhkar, fasting,
 * general); the app's reminders use dhikr, fast and custom. Unmapped, a fasting
 * reminder lost its category and showed as a plain one.
 */
const TOOL_CATEGORY: Record<string, string> = { adhkar: "dhikr", fasting: "fast", general: "custom" };
export function reminderCategory(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return TOOL_CATEGORY[raw] ?? raw;
}
