/**
 * Wird table — a person's own list of daily awrad and how the week went.
 *
 * An item is something to do a number of times (or pages) on some days; progress
 * per day lives in a log of "YYYY-MM-DD|itemId" -> count that ADDS across devices
 * (two phones each recording a part of the day have recorded both parts). Some
 * items read their progress from something the app already tracks — Quran ayahs
 * read, the morning and evening adhkar — so the person is not asked to say twice
 * what the app already knows.
 *
 * Pure: items and logs in, numbers out.
 */
import { addDays, parseISO } from "@/lib/qadaa";

export type WirdKind = "quran" | "dhikr" | "task";
export type WirdSlot = "fajr" | "morning" | "duha" | "afternoon" | "evening" | "night" | "any";
export type WirdAuto = "quranAyahs" | "morningAdhkar" | "eveningAdhkar";

export type WirdItem = {
  id: string;
  title: string;
  kind: WirdKind;
  /** What one count is: "آية", "وجه", "مرة"… shown next to the target. */
  unit: string;
  target: number;
  slot: WirdSlot;
  /** Weekdays it is due (0 = Sunday). Empty = every day. */
  days: number[];
  createdISO: string;
  auto?: WirdAuto | null;
};

export const SLOT_LABELS: Record<WirdSlot, string> = {
  fajr: "بعد الفجر",
  morning: "الصباح",
  duha: "الضحى",
  afternoon: "العصر",
  evening: "المساء",
  night: "قبل النوم",
  any: "أي وقت",
};
export const SLOT_ORDER: WirdSlot[] = ["fajr", "morning", "duha", "afternoon", "evening", "night", "any"];

export const WEEKDAY_SHORT = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export type WirdLog = Record<string, number>;
export const wirdKey = (day: string, id: string) => `${day}|${id}`;

const whole = (n: unknown, max = 100_000) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? Math.min(v, max) : 0;
};

/** Whether the item is due on a day. */
export function isDue(item: WirdItem, day: string): boolean {
  const ms = parseISO(day);
  if (ms === null) return false;
  if (day < item.createdISO) return false;
  return item.days.length === 0 || item.days.includes(new Date(ms).getUTCDay());
}

/** Count made on a day: the item's own log plus whatever the app already tracks for it. */
export function countOn(log: WirdLog, item: WirdItem, day: string, external?: (auto: WirdAuto, day: string) => number): number {
  const own = whole(log[wirdKey(day, item.id)]);
  const ext = item.auto && external ? whole(external(item.auto, day)) : 0;
  // An auto-linked item shows the larger of the two, so a manual tap on a day the app
  // also tracked cannot make it look LESS done.
  return item.auto ? Math.max(own, ext) : own;
}

export const ratio = (count: number, target: number) => (target <= 0 ? 0 : Math.min(1, count / target));

export type Cell = { day: string; due: boolean; count: number; ratio: number; done: boolean };

/** The seven days ending at `end` for one item. */
export function weekRow(log: WirdLog, item: WirdItem, end: string, external?: Parameters<typeof countOn>[3]): Cell[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(end, i - 6);
    const due = isDue(item, day);
    const count = countOn(log, item, day, external);
    const r = ratio(count, item.target);
    return { day, due, count, ratio: r, done: due && r >= 1 };
  });
}

/** Consecutive DUE days, ending at `end`, on which the target was met. Today unfilled does not break it. */
export function streak(log: WirdLog, item: WirdItem, end: string, external?: Parameters<typeof countOn>[3]): number {
  let run = 0;
  for (let i = 0; i < 400; i += 1) {
    const day = addDays(end, -i);
    if (day < item.createdISO) break;
    if (!isDue(item, day)) continue;
    const met = ratio(countOn(log, item, day, external), item.target) >= 1;
    if (met) run += 1;
    else if (i === 0) continue;
    else break;
  }
  return run;
}

/** Share of due item-days met over the last `n` days (today included only once met, so the day is not judged early). */
export function completionRate(log: WirdLog, items: WirdItem[], end: string, n: number, external?: Parameters<typeof countOn>[3]): number | null {
  let due = 0;
  let met = 0;
  for (let i = 0; i < n; i += 1) {
    const day = addDays(end, -i);
    for (const it of items) {
      if (!isDue(it, day)) continue;
      const done = ratio(countOn(log, it, day, external), it.target) >= 1;
      if (i === 0 && !done) continue;
      due += 1;
      if (done) met += 1;
    }
  }
  return due ? met / due : null;
}

/** Items due on a day, in slot order, for the day list. */
export function dueOn(items: WirdItem[], day: string): WirdItem[] {
  return items
    .filter((i) => isDue(i, day))
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.title.localeCompare(b.title, "ar"));
}

export type Template = { id: string; title: string; blurb: string; items: Array<Omit<WirdItem, "id" | "createdISO">> };

export const TEMPLATES: Template[] = [
  {
    id: "starter",
    title: "ورد المبتدئ",
    blurb: "خفيف وسهل الاستمرار: أذكار الصباح والمساء ووجه من القرآن",
    items: [
      { title: "أذكار الصباح", kind: "dhikr", unit: "مرة", target: 1, slot: "morning", days: [], auto: "morningAdhkar" },
      { title: "أذكار المساء", kind: "dhikr", unit: "مرة", target: 1, slot: "evening", days: [], auto: "eveningAdhkar" },
      { title: "وجه من القرآن", kind: "quran", unit: "وجه", target: 1, slot: "fajr", days: [], auto: null },
    ],
  },
  {
    id: "khatma-month",
    title: "ختمة في شهر",
    blurb: "جزء كل يوم تقريبًا (٢٠ وجهًا)",
    items: [{ title: "ورد الختمة", kind: "quran", unit: "وجه", target: 20, slot: "fajr", days: [], auto: null }],
  },
  {
    id: "steady",
    title: "ورد المثابرة",
    blurb: "قرآن وأذكار واستغفار وصلاة على النبي ﷺ",
    items: [
      { title: "ورد القرآن", kind: "quran", unit: "وجه", target: 5, slot: "fajr", days: [], auto: null },
      { title: "أذكار الصباح", kind: "dhikr", unit: "مرة", target: 1, slot: "morning", days: [], auto: "morningAdhkar" },
      { title: "أذكار المساء", kind: "dhikr", unit: "مرة", target: 1, slot: "evening", days: [], auto: "eveningAdhkar" },
      { title: "الاستغفار", kind: "dhikr", unit: "مرة", target: 100, slot: "any", days: [], auto: null },
      { title: "الصلاة على النبي ﷺ", kind: "dhikr", unit: "مرة", target: 100, slot: "any", days: [], auto: null },
    ],
  },
  {
    id: "ramadan",
    title: "ورد رمضان",
    blurb: "ختمة وأذكار وقيام",
    items: [
      { title: "ورد القرآن", kind: "quran", unit: "وجه", target: 20, slot: "fajr", days: [], auto: null },
      { title: "أذكار الصباح", kind: "dhikr", unit: "مرة", target: 1, slot: "morning", days: [], auto: "morningAdhkar" },
      { title: "أذكار المساء", kind: "dhikr", unit: "مرة", target: 1, slot: "evening", days: [], auto: "eveningAdhkar" },
      { title: "قيام الليل", kind: "task", unit: "مرة", target: 1, slot: "night", days: [], auto: null },
    ],
  },
];

const KINDS: WirdKind[] = ["quran", "dhikr", "task"];
const AUTOS: WirdAuto[] = ["quranAyahs", "morningAdhkar", "eveningAdhkar"];

/** Accepts anything stored or imported and returns a safe item, or null if it is not one. */
export function sanitizeItem(raw: unknown): WirdItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && /^[\w-]{1,40}$/.test(r.id) ? r.id : null;
  const title = typeof r.title === "string" ? r.title.trim().slice(0, 60) : "";
  if (!id || !title) return null;
  const kind = KINDS.includes(r.kind as WirdKind) ? (r.kind as WirdKind) : "task";
  const slot = SLOT_ORDER.includes(r.slot as WirdSlot) ? (r.slot as WirdSlot) : "any";
  const days = Array.isArray(r.days) ? [...new Set(r.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [];
  const created = typeof r.createdISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.createdISO) ? r.createdISO : "1970-01-01";
  const auto = AUTOS.includes(r.auto as WirdAuto) ? (r.auto as WirdAuto) : null;
  return {
    id,
    title,
    kind,
    unit: typeof r.unit === "string" ? r.unit.trim().slice(0, 12) || "مرة" : "مرة",
    target: Math.max(1, whole(r.target, 10_000) || 1),
    slot,
    days: days.length === 7 ? [] : days,
    createdISO: created,
    auto,
  };
}

export function sanitizeLog(raw: unknown): WirdLog {
  const out: WirdLog = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const [day, id] = k.split("|");
    if (!day || !id || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^[\w-]{1,40}$/.test(id)) continue;
    const n = whole(v);
    if (n > 0) out[k] = n;
  }
  return out;
}

export function pruneWirdLog(log: WirdLog, today: string, keepDays = 400): WirdLog {
  const cutoff = addDays(today, -keepDays);
  const out: WirdLog = {};
  for (const [k, v] of Object.entries(log)) if ((k.split("|")[0] ?? "") >= cutoff) out[k] = v;
  return out;
}
