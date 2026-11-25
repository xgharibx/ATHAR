/**
 * «القرآن ٢» — the section's own state: preferences, where you stopped, and your
 * memorisation. Kept on the device only.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CardState } from "./hifz/fsrs";
import type { HifzDirection } from "./hifz/plan";
import { addBits, emptyBits, TOTAL_AYAHS } from "./reading/khatma";

export type Q2Palette = "paper" | "night";
export type Q2Order = "mushaf" | "revelation";

export type Q2MarkColor = "green" | "gold" | "rose" | "blue";
export const Q2_MARK_COLORS: Q2MarkColor[] = ["green", "gold", "rose", "blue"];
export const Q2_MARK_COLOR_NAMES: Record<Q2MarkColor, string> = { green: "أخضر", gold: "ذهبي", rose: "وردي", blue: "أزرق" };

/** What you keep on an ayah: a bookmark, a colour, a note. */
export type Q2Mark = { bookmark?: boolean; color?: Q2MarkColor; note?: string; at: number };

/** The khatma in progress: the ayahs read since it began (one bit each). */
export type Q2Khatma = {
  bits: string;
  startedAt: number;
  /** Finish in this many days, or no goal. */
  goalDays: number | null;
  /** Khatmas finished, and when. */
  finished: number[];
};

export type Q2HifzPage = CardState & {
  /** When you first learned it (ms). */
  learnedAt: number;
};

export type Q2Prefs = {
  palette: Q2Palette;
  reciter: number;
  /** Reading size, 0.8 – 1.6. */
  scale: number;
  follow: boolean;
  order: Q2Order;
  /** New pages a day for memorisation: ¼, ½, 1 or 2. */
  newPerDay: number;
  /** How many of your latest pages are revised every day (the near review). */
  nearCount: number;
  /** Memorise from the end of the mushaf (Juz' 'Amma first) or from its start. */
  direction: HifzDirection;
  /** Translation shown under each ayah in the reader (Quran.com id), or none. */
  translation: number | null;
  /** Talqeen: how many times each ayah is recited before the next. */
  talqeenTimes: number;
  /** A daily reminder for the memorisation session (phones only). */
  hifzReminder: { enabled: boolean; time: string };
  /** Word-by-word meanings: the language (Quran.com code), or none. */
  wordLang: string | null;
  /** Show each word's meaning under it in the reader. */
  interlinear: boolean;
};

type State = {
  prefs: Q2Prefs;
  lastRead: { s: number; a: number; at: number } | null;
  /** Page number (1–604) → its memory. */
  hifz: Record<number, Q2HifzPage>;
  /** Day (YYYY-MM-DD) → pages first learned that day, for the last month. */
  learnedLog: Record<string, number[]>;
  /** "surah:ayah" → your bookmark, colour and note on it. */
  marks: Record<string, Q2Mark>;
  khatma: Q2Khatma;
  /** Day (YYYY-MM-DD) → ayahs of the khatma read that day, for the last year. */
  readLog: Record<string, number>;
  setPrefs: (patch: Partial<Q2Prefs>) => void;
  setLastRead: (s: number, a: number) => void;
  putHifz: (page: number, card: Q2HifzPage) => void;
  removeHifz: (page: number) => void;
  logLearned: (day: string, page: number) => void;
  /** Change an ayah's mark; an empty mark is removed. */
  setMark: (s: number, a: number, patch: Partial<Omit<Q2Mark, "at">>) => void;
  /** Ayahs read (mushaf indexes 0–6235) on a day. */
  markRead: (indexes: number[], day: string) => void;
  setKhatmaGoal: (days: number | null) => void;
  newKhatma: () => void;
};

export const markKey = (s: number, a: number) => `${s}:${a}`;

function emptyMark(m: Q2Mark): boolean {
  return !m.bookmark && !m.color && !m.note?.trim();
}

const freshKhatma = (now = Date.now()): Q2Khatma => ({ bits: emptyBits(), startedAt: now, goalDays: null, finished: [] });

export const Q2_DEFAULT_PREFS: Q2Prefs = {
  palette: "paper",
  reciter: 7,
  scale: 1,
  follow: true,
  order: "mushaf",
  newPerDay: 1,
  nearCount: 10,
  direction: "end",
  translation: null,
  talqeenTimes: 3,
  hifzReminder: { enabled: false, time: "06:30" },
  wordLang: null,
  interlinear: false,
};

export const useQ2Store = create<State>()(
  persist(
    (set) => ({
      prefs: Q2_DEFAULT_PREFS,
      lastRead: null,
      hifz: {},
      learnedLog: {},
      marks: {},
      khatma: freshKhatma(),
      readLog: {},
      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
      setLastRead: (s, a) => set({ lastRead: { s, a, at: Date.now() } }),
      putHifz: (page, card) => set((s) => ({ hifz: { ...s.hifz, [page]: card } })),
      removeHifz: (page) =>
        set((s) => {
          const next = { ...s.hifz };
          delete next[page];
          return { hifz: next };
        }),
      logLearned: (day, page) =>
        set((s) => {
          const log: Record<string, number[]> = {};
          const cutoff = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);
          for (const [d, pages] of Object.entries(s.learnedLog)) if (d >= cutoff) log[d] = pages;
          const today = log[day] ?? [];
          log[day] = today.includes(page) ? today : [...today, page];
          return { learnedLog: log };
        }),
      setMark: (s, a, patch) =>
        set((st) => {
          const key = markKey(s, a);
          const next: Q2Mark = { ...(st.marks[key] ?? { at: 0 }), ...patch, at: Date.now() };
          if (next.note !== undefined && !next.note.trim()) delete next.note;
          if (!next.color) delete next.color;
          if (!next.bookmark) delete next.bookmark;
          const marks = { ...st.marks };
          if (emptyMark(next)) delete marks[key];
          else marks[key] = next;
          return { marks };
        }),
      markRead: (indexes, day) =>
        set((st) => {
          const { bits, added, total } = addBits(st.khatma.bits, indexes);
          if (!added) return {};
          const readLog: Record<string, number> = {};
          const cutoff = new Date(Date.now() - 366 * 86_400_000).toISOString().slice(0, 10);
          for (const [d, n] of Object.entries(st.readLog)) if (d >= cutoff) readLog[d] = n;
          readLog[day] = (readLog[day] ?? 0) + added;
          const finished = total === TOTAL_AYAHS ? [...st.khatma.finished, Date.now()] : st.khatma.finished;
          return { khatma: { ...st.khatma, bits, finished }, readLog };
        }),
      setKhatmaGoal: (days) => set((st) => ({ khatma: { ...st.khatma, goalDays: days } })),
      newKhatma: () => set((st) => ({ khatma: { ...freshKhatma(), goalDays: st.khatma.goalDays, finished: st.khatma.finished } })),
    }),
    {
      name: "athar_quran2_v1",
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          prefs: { ...Q2_DEFAULT_PREFS, ...(p.prefs ?? {}) },
          marks: p.marks ?? {},
          khatma: p.khatma && typeof p.khatma.bits === "string" ? { ...freshKhatma(), ...p.khatma } : freshKhatma(),
          readLog: p.readLog ?? {},
        };
      },
    },
  ),
);

/* ── Backup with the account ─────────────────────────────────────────── */

type Q2Backup = {
  v: 1;
  prefs: Q2Prefs;
  lastRead: State["lastRead"];
  hifz: Record<number, Q2HifzPage>;
  learnedLog: Record<string, number[]>;
  marks?: Record<string, Q2Mark>;
  khatma?: Q2Khatma;
  readLog?: Record<string, number>;
};

/** The section's state for the account backup. */
export function exportQuran2(): Q2Backup {
  const s = useQ2Store.getState();
  return { v: 1, prefs: s.prefs, lastRead: s.lastRead, hifz: s.hifz, learnedLog: s.learnedLog, marks: s.marks, khatma: s.khatma, readLog: s.readLog };
}

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

function validPage(card: unknown): card is Q2HifzPage {
  if (!card || typeof card !== "object") return false;
  const c = card as Record<string, unknown>;
  return [c.s, c.d, c.last, c.due, c.reps, c.lapses, c.learnedAt].every(num) && (c.s as number) > 0;
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Only well-formed marks on real ayah keys; notes kept to a sane length. */
function validMarks(raw: unknown): Record<string, Q2Mark> {
  const out: Record<string, Q2Mark> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const m = /^(\d{1,3}):(\d{1,3})$/.exec(key);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 114 || Number(m[2]) < 1 || !value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const mark: Q2Mark = { at: num(v.at) ? v.at : 0 };
    if (v.bookmark === true) mark.bookmark = true;
    if (typeof v.color === "string" && (Q2_MARK_COLORS as string[]).includes(v.color)) mark.color = v.color as Q2MarkColor;
    if (typeof v.note === "string" && v.note.trim()) mark.note = v.note.slice(0, 4000);
    if (!emptyMark(mark)) out[key] = mark;
  }
  return out;
}

function validKhatma(raw: unknown): Q2Khatma | null {
  if (!raw || typeof raw !== "object") return null;
  const k = raw as Record<string, unknown>;
  if (typeof k.bits !== "string" || !/^[A-Za-z0-9+/=]{0,1200}$/.test(k.bits) || !num(k.startedAt)) return null;
  return {
    bits: k.bits,
    startedAt: k.startedAt,
    goalDays: num(k.goalDays) && k.goalDays > 0 ? k.goalDays : null,
    finished: Array.isArray(k.finished) ? k.finished.filter(num) : [],
  };
}

/** Take back a backup; false (and nothing changed) if it is not a valid one. */
export function adoptQuran2(blob: unknown): boolean {
  if (!blob || typeof blob !== "object") return false;
  const b = blob as Partial<Q2Backup>;
  const hifz: Record<number, Q2HifzPage> = {};
  for (const [page, card] of Object.entries(b.hifz ?? {})) {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1 || p > 604 || !validPage(card)) return false;
    hifz[p] = card;
  }
  const lastRead = b.lastRead && num(b.lastRead.s) && num(b.lastRead.a) && num(b.lastRead.at) ? b.lastRead : null;
  const learnedLog: Record<string, number[]> = {};
  for (const [day, pages] of Object.entries(b.learnedLog ?? {})) {
    if (DAY_KEY.test(day) && Array.isArray(pages)) learnedLog[day] = pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= 604);
  }
  const readLog: Record<string, number> = {};
  for (const [day, n] of Object.entries(b.readLog ?? {})) if (DAY_KEY.test(day) && num(n) && n > 0) readLog[day] = n;
  useQ2Store.setState((s) => ({
    prefs: { ...Q2_DEFAULT_PREFS, ...s.prefs, ...(b.prefs && typeof b.prefs === "object" ? b.prefs : {}) },
    lastRead: lastRead ?? s.lastRead,
    hifz,
    learnedLog,
    // Backups from before marks and the khatma leave them as they are.
    marks: b.marks ? validMarks(b.marks) : s.marks,
    khatma: validKhatma(b.khatma) ?? s.khatma,
    readLog: b.readLog ? readLog : s.readLog,
  }));
  return true;
}
