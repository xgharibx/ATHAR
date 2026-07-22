/**
 * Standalone helpers for the user-defined custom-reminder slice.
 *
 * The base store (`useNoorStore`) exposes a minimal `addCustomReminder`,
 * `toggleCustomReminder`, `deleteCustomReminder` for the AI companion.
 * This module adds the richer surface needed by the user-facing reminder
 * UI without touching the store's `NoorState` type:
 *
 *  - `addCustomReminder` / `updateCustomReminder` / `deleteCustomReminder`
 *  - `toggleCustomReminder` (wrapper)
 *  - `dismissTemplateFlag` / `getSeenTemplateIds` for the
 *    `noor_custom_reminders_v1:templates_seen` flags
 *  - `flushCustomReminderWrites` for tests + graceful shutdown
 *
 * Mutations debounce-flush to IndexedDB via `@/lib/reminderStorage`.
 */
import { useNoorStore } from "@/store/noorStore";
import {
  saveCustomReminders,
  saveCustomReminderTemplates,
  dismissTemplate as idbDismissTemplate,
} from "@/lib/reminderStorage";
import type { CustomReminder, ReminderWeekday } from "@/data/reminderTypes";

let _remindersSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _templatesSaveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 400;

function scheduleRemindersSave(reminders: CustomReminder[]) {
  if (_remindersSaveTimer) clearTimeout(_remindersSaveTimer);
  _remindersSaveTimer = setTimeout(() => {
    _remindersSaveTimer = null;
    void saveCustomReminders(reminders);
  }, SAVE_DEBOUNCE_MS);
}

function scheduleTemplatesSave(flags: Record<string, boolean>) {
  if (_templatesSaveTimer) clearTimeout(_templatesSaveTimer);
  _templatesSaveTimer = setTimeout(() => {
    _templatesSaveTimer = null;
    void saveCustomReminderTemplates(flags);
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Flush pending debounced IDB writes immediately (used by tests
 * + graceful shutdown).
 */
export async function flushCustomReminderWrites(): Promise<void> {
  if (_remindersSaveTimer) {
    clearTimeout(_remindersSaveTimer);
    _remindersSaveTimer = null;
    await saveCustomReminders(useNoorStore.getState().customReminders);
  }
  if (_templatesSaveTimer) {
    clearTimeout(_templatesSaveTimer);
    _templatesSaveTimer = null;
    const flags = getSeenTemplateIds();
    await saveCustomReminderTemplates(flags);
  }
}

export interface AddCustomReminderInput {
  category: CustomReminder["category"];
  title: string;
  description?: string;
  body?: string;
  icon?: string;
  enabled?: boolean;
  repeat: CustomReminder["repeat"];
  atTimeOfDay?: string;
  dayOfWeek?: ReminderWeekday | number;
  dayOfMonth?: number;
  anchorKey?: CustomReminder["anchorKey"];
  anchorOffsetMinutes?: number;
  startDate?: string;
  endDate?: string;
  deeplink?: CustomReminder["deeplink"];
  notification?: CustomReminder["notification"];
  suggestion?: string;
}

function readSeenTemplateIds(): Record<string, boolean> {
  return useNoorStore.getState().seenTemplateIds ?? {};
}

export function getSeenTemplateIds(): Record<string, boolean> {
  return readSeenTemplateIds();
}

/** Write-through helper. Avoids touching the store's `NoorState` type. */
export function addCustomReminder(r: AddCustomReminderInput): string {
  const id = `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const full: CustomReminder = {
    id,
    createdAt: now,
    updatedAt: now,
    enabled: r.enabled ?? true,
    category: r.category,
    title: r.title,
    description: r.description,
    body: r.body,
    icon: r.icon,
    repeat: r.repeat,
    atTimeOfDay: r.atTimeOfDay,
    dayOfWeek: r.dayOfWeek as ReminderWeekday | undefined,
    dayOfMonth: r.dayOfMonth,
    anchorKey: r.anchorKey,
    anchorOffsetMinutes: r.anchorOffsetMinutes,
    startDate: r.startDate,
    endDate: r.endDate,
    deeplink: r.deeplink,
    notification: r.notification,
    suggestion: r.suggestion,
  };
  useNoorStore.setState((s) => {
    const next = [full, ...(s.customReminders ?? [])];
    scheduleRemindersSave(next);
    return { customReminders: next };
  });
  return id;
}

export function updateCustomReminder(id: string, patch: Partial<CustomReminder>): void {
  useNoorStore.setState((s) => {
    let changed = false;
    const list = s.customReminders ?? [];
    const next = list.map((r) => {
      if (r.id !== id) return r;
      changed = true;
      return {
        ...r,
        ...patch,
        id: r.id,
        createdAt: r.createdAt,
        updatedAt: new Date().toISOString(),
      };
    });
    if (!changed) return {};
    scheduleRemindersSave(next);
    return { customReminders: next };
  });
}

export function toggleCustomReminder(id: string, enabled: boolean): void {
  useNoorStore.setState((s) => {
    let changed = false;
    const list = s.customReminders ?? [];
    const next = list.map((r) => {
      if (r.id !== id) return r;
      changed = true;
      return { ...r, enabled: !!enabled, updatedAt: new Date().toISOString() };
    });
    if (!changed) return {};
    scheduleRemindersSave(next);
    return { customReminders: next };
  });
}

export function deleteCustomReminder(id: string): void {
  useNoorStore.setState((s) => {
    const list = s.customReminders ?? [];
    const next = list.filter((r) => r.id !== id);
    if (next.length === list.length) return {};
    scheduleRemindersSave(next);
    return { customReminders: next };
  });
}

export function dismissTemplateFlag(templateId: string): void {
  if (!templateId) return;
  const current = readSeenTemplateIds();
  if (current[templateId]) return;
  const next = { ...current, [templateId]: true };
  scheduleTemplatesSave(next);
  useNoorStore.setState({ seenTemplateIds: next });
  void idbDismissTemplate(templateId);
}
