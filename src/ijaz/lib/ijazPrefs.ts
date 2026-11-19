/**
 * «الإعجاز» on this device: whether to show the English translations next to
 * the Arabic (off by default), which miracles you have read, and which you
 * saved.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { canonicalSlug } from "@/ijaz/data/aliases";

type IjazPrefsState = {
  showEnglish: boolean;
  /** slug → when it was read (ms). */
  read: Record<string, number>;
  saved: string[];
  setShowEnglish: (v: boolean) => void;
  markRead: (slug: string) => void;
  toggleSaved: (slug: string) => void;
};

export const useIjazPrefs = create<IjazPrefsState>()(
  persist(
    (set) => ({
      showEnglish: false,
      read: {},
      saved: [],
      setShowEnglish: (v) => set({ showEnglish: v }),
      markRead: (slug) => set((s) => (s.read[slug] ? s : { read: { ...s.read, [slug]: Date.now() } })),
      toggleSaved: (slug) => set((s) => ({ saved: s.saved.includes(slug) ? s.saved.filter((x) => x !== slug) : [slug, ...s.saved] })),
    }),
    {
      name: "athar-ijaz-prefs",
      version: 2,
      // v2: merged duplicate miracles. Marks on an old address follow it.
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<IjazPrefsState>;
        if (version < 2) {
          const read: Record<string, number> = {};
          for (const [slug, at] of Object.entries(s.read ?? {})) {
            const to = canonicalSlug(slug);
            if (to) read[to] = Math.max(read[to] ?? 0, at);
          }
          s.read = read;
          s.saved = [...new Set((s.saved ?? []).map(canonicalSlug).filter(Boolean))];
        }
        return s as IjazPrefsState;
      },
    },
  ),
);
