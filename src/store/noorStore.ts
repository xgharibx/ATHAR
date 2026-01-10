import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NoorTheme =
  | "system"
  | "dark"
  | "light"
  | "noor"
  | "midnight"
  | "forest"
  | "bees"
  | "roses"
  | "sapphire"
  | "violet"
  | "sunset"
  | "mist";

export type Preferences = {
  theme: NoorTheme;
  fontScale: number; // 0.9 - 1.6
  lineHeight: number; // 1.6 - 2.4
  showBenefits: boolean;
  stripDiacritics: boolean;
  enable3D: boolean;
  enableHaptics: boolean;
  enableSounds: boolean;
  reduceMotion: boolean;
  transparentMode: boolean;
};

export type ExportBlobV1 = {
  version: 1;
  exportedAt: string;
  prefs: Preferences;
  progress: Record<string, number>;
  favorites: Record<string, boolean>;
  activity: Record<string, number>;
  quickTasbeeh?: Record<string, number>;
  quranBookmarks?: Record<string, boolean>;
  quranLastRead?: { surahId: number; ayahIndex: number } | null;
  quranNotes?: Record<string, string>;
  dailyWirdDone?: Record<string, boolean>;
};

type NoorState = {
  prefs: Preferences;
  progress: Record<string, number>; // key: `${sectionId}:${index}`
  favorites: Record<string, boolean>;
  activity: Record<string, number>; // dateISO -> actions count

  // Home quick tasbeeh
  quickTasbeeh: Record<string, number>; // key: string -> count
  incQuickTasbeeh: (key: string, target?: number) => number;
  resetQuickTasbeeh: (key: string) => void;
  resetAllQuickTasbeeh: () => void;

  // Quran
  quranBookmarks: Record<string, boolean>; // key: `${surahId}:${ayahIndex}`
  toggleQuranBookmark: (surahId: number, ayahIndex: number) => void;
  quranLastRead: { surahId: number; ayahIndex: number } | null;
  setQuranLastRead: (surahId: number, ayahIndex: number) => void;

  quranNotes: Record<string, string>; // key: `${surahId}:${ayahIndex}`
  setQuranNote: (surahId: number, ayahIndex: number, note: string) => void;
  clearQuranNote: (surahId: number, ayahIndex: number) => void;

  // Daily Wird
  dailyWirdDone: Record<string, boolean>; // dateISO -> done
  setDailyWirdDone: (dateISO: string, done: boolean) => void;

  setPrefs: (partial: Partial<Preferences>) => void;

  increment: (opts: { sectionId: string; index: number; target: number }) => number;
  decrement: (opts: { sectionId: string; index: number }) => number;
  resetItem: (sectionId: string, index: number) => void;
  resetSection: (sectionId: string) => void;

  toggleFavorite: (sectionId: string, index: number) => void;

  bumpActivityToday: () => void;

  exportState: () => ExportBlobV1;
  importState: (blob: ExportBlobV1) => void;

  // UX-only
  lastCelebrationAt: number;
  setLastCelebrationAt: (ts: number) => void;

  lastVisitedSectionId: string | null;
  setLastVisitedSectionId: (sectionId: string | null) => void;
};

const DEFAULT_PREFS: Preferences = {
  theme: "roses",
  fontScale: 1.05,
  lineHeight: 1.95,
  showBenefits: true,
  stripDiacritics: false,
  enable3D: true,
  enableHaptics: true,
  enableSounds: false,
  reduceMotion: false,
  transparentMode: true
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export const useNoorStore = create<NoorState>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_PREFS,
      progress: {},
      favorites: {},
      activity: {},

      quickTasbeeh: {},
      incQuickTasbeeh: (key, target = 100) => {
        const current = get().quickTasbeeh[key] ?? 0;
        if (current >= target) return current;
        const next = current + 1;
        set((s) => ({ quickTasbeeh: { ...s.quickTasbeeh, [key]: next } }));
        get().bumpActivityToday();
        return next;
      },
      resetQuickTasbeeh: (key) =>
        set((s) => {
          const next = { ...s.quickTasbeeh };
          delete next[key];
          return { quickTasbeeh: next };
        }),
      resetAllQuickTasbeeh: () => set({ quickTasbeeh: {} }),

      quranBookmarks: {},
      toggleQuranBookmark: (surahId, ayahIndex) => {
        const key = `${surahId}:${ayahIndex}`;
        set((s) => ({ quranBookmarks: { ...s.quranBookmarks, [key]: !s.quranBookmarks[key] } }));
      },
      quranLastRead: null,
      setQuranLastRead: (surahId, ayahIndex) => set({ quranLastRead: { surahId, ayahIndex } }),

      quranNotes: {},
      setQuranNote: (surahId, ayahIndex, note) => {
        const key = `${surahId}:${ayahIndex}`;
        const clean = (note ?? "").trim();
        set((s) => ({ quranNotes: { ...s.quranNotes, [key]: clean } }));
      },
      clearQuranNote: (surahId, ayahIndex) => {
        const key = `${surahId}:${ayahIndex}`;
        set((s) => {
          const next = { ...s.quranNotes };
          delete next[key];
          return { quranNotes: next };
        });
      },

      dailyWirdDone: {},
      setDailyWirdDone: (dateISO, done) =>
        set((s) => ({ dailyWirdDone: { ...s.dailyWirdDone, [dateISO]: !!done } })),

      setPrefs: (partial) =>
        set((s) => ({
          prefs: {
            ...s.prefs,
            ...partial,
            // Always-on immersive mode
            transparentMode: true
          }
        })),

      increment: ({ sectionId, index, target }) => {
        const key = `${sectionId}:${index}`;
        const current = get().progress[key] ?? 0;
        if (current >= target) return current;
        const next = current + 1;

        set((s) => ({ progress: { ...s.progress, [key]: next } }));

        // Activity tracking (for streaks / insights)
        get().bumpActivityToday();

        return next;
      },

      decrement: ({ sectionId, index }) => {
        const key = `${sectionId}:${index}`;
        const current = get().progress[key] ?? 0;
        const next = Math.max(0, current - 1);
        set((s) => ({ progress: { ...s.progress, [key]: next } }));
        return next;
      },

      resetItem: (sectionId, index) => {
        const key = `${sectionId}:${index}`;
        set((s) => {
          const next = { ...s.progress };
          delete next[key];
          return { progress: next };
        });
      },

      resetSection: (sectionId) => {
        set((s) => {
          const next = { ...s.progress };
          for (const k of Object.keys(next)) {
            if (k.startsWith(sectionId + ":")) delete next[k];
          }
          return { progress: next };
        });
      },

      toggleFavorite: (sectionId, index) => {
        const key = `${sectionId}:${index}`;
        set((s) => ({ favorites: { ...s.favorites, [key]: !s.favorites[key] } }));
      },

      bumpActivityToday: () => {
        const key = todayISO();
        set((s) => ({ activity: { ...s.activity, [key]: (s.activity[key] ?? 0) + 1 } }));
      },

      exportState: () => {
        const s = get();
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          prefs: s.prefs,
          progress: s.progress,
          favorites: s.favorites,
          activity: s.activity,
          quickTasbeeh: s.quickTasbeeh,
          quranBookmarks: s.quranBookmarks,
          quranLastRead: s.quranLastRead,
          quranNotes: s.quranNotes,
          dailyWirdDone: s.dailyWirdDone
        };
      },

      importState: (blob) => {
        if (!blob || blob.version !== 1) return;
        set({
          prefs: { ...DEFAULT_PREFS, ...blob.prefs },
          progress: blob.progress ?? {},
          favorites: blob.favorites ?? {},
          activity: blob.activity ?? {},
          quickTasbeeh: blob.quickTasbeeh ?? {},
          quranBookmarks: blob.quranBookmarks ?? {},
          quranLastRead: blob.quranLastRead ?? null,
          quranNotes: blob.quranNotes ?? {},
          dailyWirdDone: blob.dailyWirdDone ?? {}
        });
      },

      lastCelebrationAt: 0,
      setLastCelebrationAt: (ts) => set({ lastCelebrationAt: ts }),

      lastVisitedSectionId: null,
      setLastVisitedSectionId: (sectionId) => set({ lastVisitedSectionId: sectionId })
    }),
    {
      name: "noor_store_v1",
      storage: createJSONStorage(() => localStorage),
      version: 1
    }
  )
);
