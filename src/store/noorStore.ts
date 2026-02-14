import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { isDailySection } from "@/lib/dailySections";

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
  quranFontScale: number; // 0.9 - 1.6
  quranLineHeight: number; // 1.8 - 3.0
  quranPageSize: number; // ayahs per page
  quranHideMarkers: boolean;
  showBenefits: boolean;
  stripDiacritics: boolean;
  enable3D: boolean;
  enableHaptics: boolean;
  enableSounds: boolean;
  reduceMotion: boolean;
  transparentMode: boolean;
};

export type Reminders = {
  enabled: boolean;
  morningEnabled: boolean;
  morningTime: string; // HH:MM
  eveningEnabled: boolean;
  eveningTime: string; // HH:MM
  dailyWirdEnabled: boolean;
  dailyWirdTime: string; // HH:MM
  khatmaEnabled: boolean;
  khatmaTime: string; // HH:MM
};

export type ExportBlobV1 = {
  version: 1;
  exportedAt: string;
  prefs: Preferences;
  reminders?: Reminders;
  progress: Record<string, number>;
  favorites: Record<string, boolean>;
  activity: Record<string, number>;
  quickTasbeeh?: Record<string, number>;
  quranBookmarks?: Record<string, boolean>;
  quranLastRead?: { surahId: number; ayahIndex: number } | null;
  quranNotes?: Record<string, string>;
  dailyWirdDone?: Record<string, boolean>;
  dailyWirdStartISO?: string | null;
  khatmaStartISO?: string | null;
  khatmaDays?: number | null;
  khatmaDone?: Record<string, boolean>;
  lastDailyResetISO?: string | null;
  dailyChecklist?: Record<string, Record<string, boolean>>;
  missedRecoveryDone?: Record<string, boolean>;
  missedTrackingStartISO?: string | null;
  dailyBetterStepDone?: Record<string, boolean>;
  ramadanRoutineByDay?: Record<string, {
    suhoor: boolean;
    niyyah: boolean;
    fastCompleted: boolean;
    iftarDua: boolean;
    qiyam: boolean;
    taraweehUnits: number;
  }>;
  lastTenNightGoals?: Record<string, Record<string, boolean>>;
};

export type RamadanRoutine = {
  suhoor: boolean;
  niyyah: boolean;
  fastCompleted: boolean;
  iftarDua: boolean;
  qiyam: boolean;
  taraweehUnits: number;
};

type NoorState = {
  prefs: Preferences;
  reminders: Reminders;
  progress: Record<string, number>; // key: `${sectionId}:${index}`
  favorites: Record<string, boolean>;
  activity: Record<string, number>; // dateISO -> actions count
  lastDailyResetISO: string | null;

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
  dailyWirdStartISO: string | null;
  setDailyWirdStartISO: (dateISO: string) => void;

  // Daily Muslim checklist and growth step
  dailyChecklist: Record<string, Record<string, boolean>>; // dateISO -> itemId -> done
  toggleDailyChecklist: (dateISO: string, itemId: string, done?: boolean) => void;
  resetDailyChecklist: (dateISO: string) => void;
  missedRecoveryDone: Record<string, boolean>; // key: `${dateISO}:${itemId}` -> done
  missedTrackingStartISO: string | null;
  setMissedRecoveryDone: (key: string, done: boolean) => void;
  markMissedRecoveryBulk: (keys: string[], done: boolean) => void;
  clearMissedRecoveryDone: () => void;

  dailyBetterStepDone: Record<string, boolean>; // dateISO -> done
  setDailyBetterStepDone: (dateISO: string, done: boolean) => void;

  // Ramadan workflow
  ramadanRoutineByDay: Record<string, RamadanRoutine>;
  setRamadanRoutine: (dateISO: string, partial: Partial<RamadanRoutine>) => void;
  lastTenNightGoals: Record<string, Record<string, boolean>>;
  toggleLastTenNightGoal: (dateISO: string, goalId: string, done?: boolean) => void;

  // Khatma plan
  khatmaStartISO: string | null;
  khatmaDays: number | null;
  khatmaDone: Record<string, boolean>; // dateISO -> done
  setKhatmaPlan: (opts: { startISO: string; days: number }) => void;
  setKhatmaDone: (dateISO: string, done: boolean) => void;
  resetKhatma: () => void;

  setPrefs: (partial: Partial<Preferences>) => void;
  setReminders: (partial: Partial<Reminders>) => void;

  increment: (opts: { sectionId: string; index: number; target: number }) => number;
  decrement: (opts: { sectionId: string; index: number; target?: number }) => number;
  resetItem: (sectionId: string, index: number, target?: number) => void;
  resetSection: (sectionId: string) => void;

  toggleFavorite: (sectionId: string, index: number) => void;

  bumpActivityToday: () => void;
  ensureDailyResets: () => void;

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
  quranFontScale: 1.1,
  quranLineHeight: 2.55,
  quranPageSize: 12,
  quranHideMarkers: false,
  showBenefits: true,
  stripDiacritics: false,
  enable3D: true,
  enableHaptics: true,
  enableSounds: false,
  reduceMotion: false,
  transparentMode: true
};

const DEFAULT_REMINDERS: Reminders = {
  enabled: false,
  morningEnabled: true,
  morningTime: "07:00",
  eveningEnabled: true,
  eveningTime: "18:00",
  dailyWirdEnabled: true,
  dailyWirdTime: "21:00",
  khatmaEnabled: false,
  khatmaTime: "21:15"
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toSafeInt(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function sanitizeNumberMap(input: unknown) {
  const src = (input ?? {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const key of Object.keys(src)) {
    const value = toSafeInt(src[key]);
    if (value > 0) out[key] = value;
  }
  return out;
}

export const useNoorStore = create<NoorState>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_PREFS,
      reminders: DEFAULT_REMINDERS,
      progress: {},
      favorites: {},
      activity: {},
      lastDailyResetISO: null,

      quickTasbeeh: {},
      incQuickTasbeeh: (key, target = 100) => {
        get().ensureDailyResets();
        const current = toSafeInt(get().quickTasbeeh[key]);
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

      dailyWirdStartISO: null,
      setDailyWirdStartISO: (dateISO) => set({ dailyWirdStartISO: dateISO }),

      dailyChecklist: {},
      toggleDailyChecklist: (dateISO, itemId, done) =>
        set((s) => {
          const day = { ...(s.dailyChecklist[dateISO] ?? {}) };
          const next = done ?? !day[itemId];
          day[itemId] = !!next;
          return { dailyChecklist: { ...s.dailyChecklist, [dateISO]: day } };
        }),
      resetDailyChecklist: (dateISO) =>
        set((s) => {
          const next = { ...s.dailyChecklist };
          delete next[dateISO];
          return { dailyChecklist: next };
        }),
      missedRecoveryDone: {},
      missedTrackingStartISO: todayISO(),
      setMissedRecoveryDone: (key, done) =>
        set((s) => ({ missedRecoveryDone: { ...s.missedRecoveryDone, [key]: !!done } })),
      markMissedRecoveryBulk: (keys, done) =>
        set((s) => {
          const next = { ...s.missedRecoveryDone };
          for (const key of keys) {
            next[key] = !!done;
          }
          return { missedRecoveryDone: next };
        }),
      clearMissedRecoveryDone: () => set({ missedRecoveryDone: {} }),

      dailyBetterStepDone: {},
      setDailyBetterStepDone: (dateISO, done) =>
        set((s) => ({ dailyBetterStepDone: { ...s.dailyBetterStepDone, [dateISO]: !!done } })),

      ramadanRoutineByDay: {},
      setRamadanRoutine: (dateISO, partial) =>
        set((s) => {
          const current = s.ramadanRoutineByDay[dateISO] ?? {
            suhoor: false,
            niyyah: false,
            fastCompleted: false,
            iftarDua: false,
            qiyam: false,
            taraweehUnits: 0
          };
          return {
            ramadanRoutineByDay: {
              ...s.ramadanRoutineByDay,
              [dateISO]: {
                ...current,
                ...partial,
                taraweehUnits: Math.max(0, Math.min(36, Math.floor(Number((partial.taraweehUnits ?? current.taraweehUnits)) || 0)))
              }
            }
          };
        }),
      lastTenNightGoals: {},
      toggleLastTenNightGoal: (dateISO, goalId, done) =>
        set((s) => {
          const day = { ...(s.lastTenNightGoals[dateISO] ?? {}) };
          const next = done ?? !day[goalId];
          day[goalId] = !!next;
          return { lastTenNightGoals: { ...s.lastTenNightGoals, [dateISO]: day } };
        }),

      khatmaStartISO: null,
      khatmaDays: null,
      khatmaDone: {},
      setKhatmaPlan: ({ startISO, days }) =>
        set({ khatmaStartISO: startISO, khatmaDays: days, khatmaDone: {} }),
      setKhatmaDone: (dateISO, done) =>
        set((s) => ({ khatmaDone: { ...s.khatmaDone, [dateISO]: !!done } })),
      resetKhatma: () => set({ khatmaStartISO: null, khatmaDays: null, khatmaDone: {} }),

      setPrefs: (partial) =>
        set((s) => ({
          prefs: {
            ...s.prefs,
            ...partial,
            // Always-on immersive mode
            transparentMode: true
          }
        })),

      setReminders: (partial) =>
        set((s) => ({
          reminders: {
            ...s.reminders,
            ...partial
          }
        })),

      increment: ({ sectionId, index, target }) => {
        get().ensureDailyResets();
        const key = `${sectionId}:${index}`;
        const current = toSafeInt(get().progress[key]);
        if (current >= target) return current;
        const next = current + 1;

        set((s) => ({ progress: { ...s.progress, [key]: next } }));

        // Activity tracking (for streaks / insights)
        get().bumpActivityToday();

        return next;
      },

      decrement: ({ sectionId, index, target }) => {
        get().ensureDailyResets();
        const key = `${sectionId}:${index}`;
        const current = toSafeInt(get().progress[key]);

        if (isDailySection(sectionId) && target && current >= target) {
          return current;
        }

        const next = Math.max(0, current - 1);
        set((s) => ({ progress: { ...s.progress, [key]: next } }));
        return next;
      },

      resetItem: (sectionId, index, target) => {
        get().ensureDailyResets();
        const key = `${sectionId}:${index}`;

        if (isDailySection(sectionId) && target) {
          const current = toSafeInt(get().progress[key]);
          if (current >= target) return;
        }

        set((s) => {
          const next = { ...s.progress };
          delete next[key];
          return { progress: next };
        });
      },

      resetSection: (sectionId) => {
        get().ensureDailyResets();
        if (isDailySection(sectionId)) return;

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

      ensureDailyResets: () => {
        const today = todayISO();
        const last = get().lastDailyResetISO;
        const trackingStart = get().missedTrackingStartISO;

        if (!trackingStart) {
          set({ missedTrackingStartISO: today, missedRecoveryDone: {} });
        }

        if (!last) {
          set({ lastDailyResetISO: today });
          return;
        }

        if (last === today) return;

        const currentProgress = get().progress;
        const nextProgress = { ...currentProgress };

        for (const key of Object.keys(nextProgress)) {
          const sectionId = key.split(":")[0] ?? "";
          if (isDailySection(sectionId)) {
            delete nextProgress[key];
          }
        }

        set({
          progress: nextProgress,
          quickTasbeeh: {},
          lastDailyResetISO: today
        });
      },

      exportState: () => {
        const s = get();
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          prefs: s.prefs,
          reminders: s.reminders,
          progress: s.progress,
          favorites: s.favorites,
          activity: s.activity,
          quickTasbeeh: s.quickTasbeeh,
          quranBookmarks: s.quranBookmarks,
          quranLastRead: s.quranLastRead,
          quranNotes: s.quranNotes,
          dailyWirdDone: s.dailyWirdDone,
          dailyWirdStartISO: s.dailyWirdStartISO,
          khatmaStartISO: s.khatmaStartISO,
          khatmaDays: s.khatmaDays,
          khatmaDone: s.khatmaDone,
          lastDailyResetISO: s.lastDailyResetISO,
          dailyChecklist: s.dailyChecklist,
          missedRecoveryDone: s.missedRecoveryDone,
          missedTrackingStartISO: s.missedTrackingStartISO,
          dailyBetterStepDone: s.dailyBetterStepDone,
          ramadanRoutineByDay: s.ramadanRoutineByDay,
          lastTenNightGoals: s.lastTenNightGoals
        };
      },

      importState: (blob) => {
        if (!blob || blob.version !== 1) return;
        set({
          prefs: { ...DEFAULT_PREFS, ...blob.prefs },
          reminders: { ...DEFAULT_REMINDERS, ...(blob.reminders ?? {}) },
          progress: sanitizeNumberMap(blob.progress),
          favorites: blob.favorites ?? {},
          activity: blob.activity ?? {},
          quickTasbeeh: sanitizeNumberMap(blob.quickTasbeeh),
          quranBookmarks: blob.quranBookmarks ?? {},
          quranLastRead: blob.quranLastRead ?? null,
          quranNotes: blob.quranNotes ?? {},
          dailyWirdDone: blob.dailyWirdDone ?? {},
          dailyWirdStartISO: blob.dailyWirdStartISO ?? null,
          khatmaStartISO: blob.khatmaStartISO ?? null,
          khatmaDays: blob.khatmaDays ?? null,
          khatmaDone: blob.khatmaDone ?? {},
          lastDailyResetISO: blob.lastDailyResetISO ?? null,
          dailyChecklist: blob.dailyChecklist ?? {},
          missedRecoveryDone: blob.missedRecoveryDone ?? {},
          missedTrackingStartISO: blob.missedTrackingStartISO ?? todayISO(),
          dailyBetterStepDone: blob.dailyBetterStepDone ?? {},
          ramadanRoutineByDay: blob.ramadanRoutineByDay ?? {},
          lastTenNightGoals: blob.lastTenNightGoals ?? {}
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
      version: 4,
      migrate: (persisted: unknown) => {
        const state = (persisted ?? {}) as Partial<NoorState>;
        const startISO = state.missedTrackingStartISO ?? todayISO();
        return {
          ...state,
          prefs: { ...DEFAULT_PREFS, ...(state.prefs ?? {}) },
          reminders: { ...DEFAULT_REMINDERS, ...(state.reminders ?? {}) },
          progress: sanitizeNumberMap(state.progress),
          quickTasbeeh: sanitizeNumberMap(state.quickTasbeeh),
          lastDailyResetISO: state.lastDailyResetISO ?? null,
          dailyChecklist: state.dailyChecklist ?? {},
          missedRecoveryDone: state.missedRecoveryDone ?? {},
          missedTrackingStartISO: startISO,
          dailyBetterStepDone: state.dailyBetterStepDone ?? {},
          ramadanRoutineByDay: state.ramadanRoutineByDay ?? {},
          lastTenNightGoals: state.lastTenNightGoals ?? {}
        } as NoorState;
      }
    }
  )
);
