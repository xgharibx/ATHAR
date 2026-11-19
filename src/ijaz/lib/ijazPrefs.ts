/**
 * «الإعجاز» on this device: whether to show the English translations next to
 * the Arabic (off by default), which miracles you have read, and which you
 * saved.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
    { name: "athar-ijaz-prefs", version: 1 },
  ),
);
