import type { ReminderTemplate, ReminderTemplateRepeat } from "@/data/reminderTemplates";
import type { ReminderRepeat } from "@/data/reminderTypes";
import { arNum } from "@/lib/formatNumber";
import type { AddCustomReminderInput } from "@/store/customReminderActions";

const TEMPLATE_REPEAT_TO_REPEAT: Record<ReminderTemplateRepeat, ReminderRepeat> = {
  once: "once",
  daily: "daily",
  weekly: "weekly",
  monthly: "once",
  "sunnah-aligned": "sunnah_aligned",
  "prayer-aligned": "prayer_aligned",
};

export function getReminderTemplateRepeat(template: ReminderTemplate): ReminderRepeat {
  if (template.fastingPattern) return "fasting_aligned";
  return TEMPLATE_REPEAT_TO_REPEAT[template.defaultRepeat] ?? "once";
}

function timeLabel(value: string | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  return arNum(`${match[1]!.padStart(2, "0")}:${match[2]}`);
}

export function buildReminderFromTemplate(template: ReminderTemplate): AddCustomReminderInput {
  return {
    category: template.category,
    title: template.title.ar,
    description: template.description,
    icon: template.defaultIcon,
    repeat: getReminderTemplateRepeat(template),
    atTimeOfDay: timeLabel(template.defaultTime) || undefined,
    dayOfWeek: typeof template.defaultDayOfWeek === "number" ? template.defaultDayOfWeek : undefined,
    anchorKey: template.anchorKey,
    anchorOffsetMinutes: template.anchorOffsetMinutes,
    fastingPattern: template.fastingPattern,
    deeplink: template.deeplink,
    suggestion: template.suggestion,
    enabled: true,
  };
}
