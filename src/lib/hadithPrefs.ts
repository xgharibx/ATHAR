/**
 * The hadith reader's own settings and the last hadith you opened, kept on
 * this device. The reading size starts from the app-wide font size and is
 * fine-tuned here, the way a reading app lets you size one book.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IsnadView = "chain" | "text" | "hidden";

/** `r` is the printed-number ref (see hadithNumbers.ts), for showing the number people cite. */
export type LastHadith = { bookKey: string; n: number; r?: string; at: number };

/** What a saved hadith shows in lists without loading its whole book: its ref and the start of its matn. */
export type SavedHadithCard = { r: string; x: string; ti?: string };

type HadithPrefsState = {
  /** Multiplies the matn size: 0.8 … 1.6. */
  textScale: number;
  /** How the chain of narrators is shown above the matn. */
  isnadView: IsnadView;
  /** Show the harakat; off gives a plain, quicker read. */
  harakat: boolean;
  /** The last hadith opened in any book, for «أكمل القراءة». */
  last: LastHadith | null;
  /** The printed-number ref you reached in each book, for «وصلت إلى». */
  reached: Record<string, string>;
  /** Text of the hadiths you marked, noted or memorise, keyed "book:n". */
  cards: Record<string, SavedHadithCard>;
  /** The chain of narrators is folded under the matn until you open it. */
  isnadOpen: boolean;
  setTextScale: (v: number) => void;
  setIsnadView: (v: IsnadView) => void;
  setHarakat: (v: boolean) => void;
  setLast: (bookKey: string, n: number, r?: string) => void;
  rememberCard: (key: string, card: SavedHadithCard) => void;
  setIsnadOpen: (v: boolean) => void;
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
      reached: {},
      cards: {},
      isnadOpen: false,
      setTextScale: (v) => set({ textScale: Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(v * 20) / 20)) }),
      setIsnadView: (v) => set({ isnadView: v }),
      setHarakat: (v) => set({ harakat: v }),
      setLast: (bookKey, n, r) =>
        set((s) =>
          s.last?.bookKey === bookKey && s.last.n === n && s.last.r === r
            ? s
            : { last: { bookKey, n, r, at: Date.now() }, reached: r ? { ...s.reached, [bookKey]: r } : s.reached },
        ),
      rememberCard: (key, card) =>
        set((s) => {
          const old = s.cards[key];
          return old && old.r === card.r && old.x === card.x && old.ti === card.ti ? s : { cards: { ...s.cards, [key]: card } };
        }),
      setIsnadOpen: (v) => set({ isnadOpen: v }),
    }),
    { name: "athar-hadith-prefs", version: 1 },
  ),
);

/** Removes harakat and Quranic marks, keeping the letters. */
export function withoutHarakat(text: string): string {
  return text.replace(/[\u064B-\u0652\u0670\u0640]/g, "").replace(/[\u06D6-\u06ED]/g, "");
}
