/**
 * «القرآن ٢» — the section's own state: preferences, where you stopped, and your
 * memorisation. Kept on the device only.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CardState } from "./hifz/fsrs";
import type { HifzDirection } from "./hifz/plan";

export type Q2Palette = "paper" | "night";
export type Q2Order = "mushaf" | "revelation";

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
};

type State = {
  prefs: Q2Prefs;
  lastRead: { s: number; a: number; at: number } | null;
  /** Page number (1–604) → its memory. */
  hifz: Record<number, Q2HifzPage>;
  /** Day (YYYY-MM-DD) → pages first learned that day, for the last month. */
  learnedLog: Record<string, number[]>;
  setPrefs: (patch: Partial<Q2Prefs>) => void;
  setLastRead: (s: number, a: number) => void;
  putHifz: (page: number, card: Q2HifzPage) => void;
  removeHifz: (page: number) => void;
  logLearned: (day: string, page: number) => void;
};

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
};

export const useQ2Store = create<State>()(
  persist(
    (set) => ({
      prefs: Q2_DEFAULT_PREFS,
      lastRead: null,
      hifz: {},
      learnedLog: {},
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
    }),
    {
      name: "athar_quran2_v1",
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, prefs: { ...Q2_DEFAULT_PREFS, ...(p.prefs ?? {}) } };
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
};

/** The section's state for the account backup. */
export function exportQuran2(): Q2Backup {
  const s = useQ2Store.getState();
  return { v: 1, prefs: s.prefs, lastRead: s.lastRead, hifz: s.hifz, learnedLog: s.learnedLog };
}

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

function validPage(card: unknown): card is Q2HifzPage {
  if (!card || typeof card !== "object") return false;
  const c = card as Record<string, unknown>;
  return [c.s, c.d, c.last, c.due, c.reps, c.lapses, c.learnedAt].every(num) && (c.s as number) > 0;
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(pages)) learnedLog[day] = pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= 604);
  }
  useQ2Store.setState((s) => ({
    prefs: { ...Q2_DEFAULT_PREFS, ...s.prefs, ...(b.prefs && typeof b.prefs === "object" ? b.prefs : {}) },
    lastRead: lastRead ?? s.lastRead,
    hifz,
    learnedLog,
  }));
  return true;
}
