/**
 * IndexedDB persistence for user-created reminders and their
 * template-discovery flags ("template seen/dismissed").
 *
 * Stored under a dedicated Dexie database (`noor-reminders-v1`) so
 * reading/writing never contends with the Quran cache. Keys are
 * scoped under the `noor_custom_reminders_v1` namespace for safe
 * future versioning.
 *
 * Failure to read or write is non-fatal — the calling store will
 * fall back to an empty list and the user can keep using the app.
 */
import Dexie, { type Table } from "dexie";
import type { CustomReminder, ReminderCategory, ReminderRepeat, ReminderWeekday } from "@/data/reminderTypes";

interface ReminderKeyValueRow {
  key: string;
  value: unknown;
  cachedAt: number;
}

const REMINDERS_DB_NAME = "noor-reminders-v1";
const REMINDERS_LIST_KEY = "noor_custom_reminders_v1:list";
const REMINDERS_TEMPLATES_KEY = "noor_custom_reminders_v1:templates_seen";

class NoorRemindersDexie extends Dexie {
  kv!: Table<ReminderKeyValueRow, string>;
  constructor() {
    super(REMINDERS_DB_NAME);
    this.version(1).stores({ kv: "key" });
  }
}

let _db: NoorRemindersDexie | null = null;
function getDB(): NoorRemindersDexie {
  if (!_db) _db = new NoorRemindersDexie();
  return _db;
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const row = await getDB().kv.get(key);
    return (row?.value as T) ?? null;
  } catch {
    return null;
  }
}

async function kvPut(key: string, value: unknown): Promise<void> {
  try {
    await getDB().kv.put({ key, value: value as unknown, cachedAt: Date.now() });
  } catch {
    /* best-effort */
  }
}

const VALID_CATEGORIES: ReminderCategory[] = ["dhikr", "quran", "sunnah", "fast", "salat", "dua", "custom"];
const VALID_REPEATS: ReminderRepeat[] = [
  "once",
  "daily",
  "weekly",
  "monthly",
  "sunnah_aligned",
  "prayer_aligned",
  "fasting_aligned",
];

function isReminderWeekday(n: unknown): n is ReminderWeekday {
  return n === 0 || n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6;
}

function sanitizeReminder(input: unknown): CustomReminder | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Partial<CustomReminder> & Record<string, unknown>;

  if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.enabled !== "boolean") return null;

  const category: ReminderCategory = VALID_CATEGORIES.includes(r.category as ReminderCategory)
    ? (r.category as ReminderCategory)
    : "custom";
  const repeat: ReminderRepeat = VALID_REPEATS.includes(r.repeat as ReminderRepeat)
    ? (r.repeat as ReminderRepeat)
    : "daily";

  const dow = isReminderWeekday(r.dayOfWeek) ? r.dayOfWeek : undefined;
  const domRaw = Number(r.dayOfMonth);
  const dayOfMonth = Number.isInteger(domRaw) && domRaw >= 1 && domRaw <= 31 ? domRaw : undefined;

  return {
    id: r.id,
    category,
    title: r.title,
    description: typeof r.description === "string" ? r.description : undefined,
    body: typeof r.body === "string" ? r.body : undefined,
    icon: typeof r.icon === "string" ? r.icon : undefined,
    enabled: r.enabled,
    repeat,
    atTimeOfDay: typeof r.atTimeOfDay === "string" ? r.atTimeOfDay : undefined,
    dayOfWeek: dow,
    dayOfMonth,
    anchorKey: typeof r.anchorKey === "string" ? r.anchorKey : undefined,
    anchorOffsetMinutes: Number.isFinite(Number(r.anchorOffsetMinutes))
      ? Number(r.anchorOffsetMinutes)
      : undefined,
    startDate: typeof r.startDate === "string" ? r.startDate : undefined,
    endDate: typeof r.endDate === "string" ? r.endDate : undefined,
    notification:
      r.notification && typeof r.notification === "object"
        ? (r.notification as CustomReminder["notification"])
        : undefined,
    deeplink:
      r.deeplink && typeof r.deeplink === "object" && typeof (r.deeplink as { route?: unknown }).route === "string"
        ? ({
            route: (r.deeplink as { route: string }).route,
            hash: typeof (r.deeplink as { hash?: unknown }).hash === "string"
              ? (r.deeplink as { hash?: string }).hash
              : undefined,
          } as CustomReminder["deeplink"])
        : undefined,
    suggestion: typeof r.suggestion === "string" ? r.suggestion : undefined,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export async function loadCustomReminders(): Promise<CustomReminder[]> {
  const raw = await kvGet<unknown[]>(REMINDERS_LIST_KEY);
  if (!Array.isArray(raw)) return [];
  const out: CustomReminder[] = [];
  for (const item of raw) {
    const safe = sanitizeReminder(item);
    if (safe) out.push(safe);
  }
  return out;
}

export async function saveCustomReminders(reminders: CustomReminder[]): Promise<void> {
  const safe = Array.isArray(reminders) ? reminders.filter((r) => !!r && typeof r.id === "string") : [];
  await kvPut(REMINDERS_LIST_KEY, safe);
}

export async function loadCustomReminderTemplates(): Promise<Record<string, boolean>> {
  const raw = await kvGet<Record<string, unknown>>(REMINDERS_TEMPLATES_KEY);
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

export async function saveCustomReminderTemplates(flags: Record<string, boolean>): Promise<void> {
  const clean: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(flags ?? {})) {
    if (typeof v === "boolean") clean[k] = v;
  }
  await kvPut(REMINDERS_TEMPLATES_KEY, clean);
}

export async function dismissTemplate(templateId: string): Promise<void> {
  if (typeof templateId !== "string" || !templateId) return;
  const current = await loadCustomReminderTemplates();
  current[templateId] = true;
  await saveCustomReminderTemplates(current);
}

export const _internal = {
  REMINDERS_LIST_KEY,
  REMINDERS_TEMPLATES_KEY,
  REMINDERS_DB_NAME,
};
