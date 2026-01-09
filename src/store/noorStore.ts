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
};

type NoorState = {
  prefs: Preferences;
  progress: Record<string, number>; // key: `${sectionId}:${index}`
  favorites: Record<string, boolean>;
  activity: Record<string, number>; // dateISO -> actions count
  setPrefs: (partial: Partial<Preferences>) => void;

  increment: (opts: { sectionId: string; index: number; target: number }) => number;
  resetItem: (sectionId: string, index: number) => void;
  resetSection: (sectionId: string) => void;

  toggleFavorite: (sectionId: string, index: number) => void;

  bumpActivityToday: () => void;

  exportState: () => ExportBlobV1;
  importState: (blob: ExportBlobV1) => void;

  // UX-only
  lastCelebrationAt: number;
  setLastCelebrationAt: (ts: number) => void;
};

const DEFAULT_PREFS: Preferences = {
  theme: "system",
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
          activity: s.activity
        };
      },

      importState: (blob) => {
        if (!blob || blob.version !== 1) return;
        set({
          prefs: { ...DEFAULT_PREFS, ...blob.prefs },
          progress: blob.progress ?? {},
          favorites: blob.favorites ?? {},
          activity: blob.activity ?? {}
        });
      },

      lastCelebrationAt: 0,
      setLastCelebrationAt: (ts) => set({ lastCelebrationAt: ts })
    }),
    {
      name: "noor_store_v1",
      storage: createJSONStorage(() => localStorage),
      version: 1
    }
  )
);
