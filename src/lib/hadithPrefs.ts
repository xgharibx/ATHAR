/**
 * The hadith reader's own settings and the last hadith you opened, kept on
 * this device. The reading size starts from the app-wide font size and is
 * fine-tuned here, the way a reading app lets you size one book.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IsnadView = "chain" | "text" | "hidden";

export type LastHadith = { bookKey: string; n: number; at: number };

type HadithPrefsState = {
  /** Multiplies the matn size: 0.8 … 1.6. */
  textScale: number;
  /** How the chain of narrators is shown above the matn. */
  isnadView: IsnadView;
  /** Show the harakat; off gives a plain, quicker read. */
  harakat: boolean;
  /** The last hadith opened in any book, for «أكمل القراءة». */
  last: LastHadith | null;
  setTextScale: (v: number) => void;
  setIsnadView: (v: IsnadView) => void;
  setHarakat: (v: boolean) => void;
  setLast: (bookKey: string, n: number) => void;
};

export const TEXT_SCALE_MIN = 0.8;
export const TEXT_SCALE_MAX = 1.6;

export const useHadithPrefs = create<HadithPrefsState>()(
  persist(
    (set) => ({
      textScale: 1,
      isnadView: "chain",
      harakat: true,
      last: null,
      setTextScale: (v) => set({ textScale: Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(v * 20) / 20)) }),
      setIsnadView: (v) => set({ isnadView: v }),
      setHarakat: (v) => set({ harakat: v }),
      setLast: (bookKey, n) =>
        set((s) => (s.last?.bookKey === bookKey && s.last.n === n ? s : { last: { bookKey, n, at: Date.now() } })),
    }),
    { name: "athar-hadith-prefs", version: 1 },
  ),
);

/** Removes harakat and Quranic marks, keeping the letters. */
export function withoutHarakat(text: string): string {
  return text.replace(/[\u064B-\u0652\u0670\u0640]/g, "").replace(/[\u06D6-\u06ED]/g, "");
}
