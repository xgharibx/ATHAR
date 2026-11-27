/**
 * The hadith reader's own settings and the last hadith you opened, kept on
 * this device. The reading size starts from the app-wide font size and is
 * fine-tuned here, the way a reading app lets you size one book.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { planDef, type HadithPlanId, type HadithPlanState } from "@/lib/hadithPlans";
import { localDayKey } from "@/lib/reviewToday";

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
  /** Your folders («مجموعاتي») for saved hadiths, in the order you made them. */
  folders: string[];
  /** The folders each saved hadith is in, keyed like `cards` (or a curated entry's key). */
  inFolders: Record<string, string[]>;
  /** Your reading plan, if you started one. */
  plan: HadithPlanState | null;
  setTextScale: (v: number) => void;
  setIsnadView: (v: IsnadView) => void;
  setHarakat: (v: boolean) => void;
  setLast: (bookKey: string, n: number, r?: string) => void;
  rememberCard: (key: string, card: SavedHadithCard) => void;
  setIsnadOpen: (v: boolean) => void;
  addFolder: (name: string) => void;
  removeFolder: (name: string) => void;
  toggleInFolder: (key: string, name: string) => void;
  startPlan: (id: HadithPlanId) => void;
  stopPlan: () => void;
  /** You read the hadith at this position (from 0) of `book`: a plan in that book moves on to after it. */
  advancePlan: (book: string, position: number) => void;
  setPlanReminder: (time: string | null) => void;
};

export const FOLDER_NAME_MAX = 30;

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
      folders: [],
      inFolders: {},
      plan: null,
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
      addFolder: (raw) =>
        set((s) => {
          const name = raw.trim().slice(0, FOLDER_NAME_MAX);
          return !name || s.folders.includes(name) ? s : { folders: [...s.folders, name] };
        }),
      removeFolder: (name) =>
        set((s) => ({
          folders: s.folders.filter((f) => f !== name),
          inFolders: Object.fromEntries(
            Object.entries(s.inFolders)
              .map(([k, names]) => [k, names.filter((f) => f !== name)] as const)
              .filter(([, names]) => names.length),
          ),
        })),
      startPlan: (id) => set({ plan: { id, start: localDayKey(), read: 0, reminder: null } }),
      stopPlan: () => set({ plan: null }),
      advancePlan: (book, position) =>
        set((s) => {
          const plan = s.plan;
          if (!plan || position < 0) return s;
          // Only reading on from where you are counts: the next one, or a little further.
          if (planDef(plan.id).book !== book || position + 1 <= plan.read || position > plan.read + 60) return s;
          return { plan: { ...plan, read: position + 1 } };
        }),
      setPlanReminder: (time) => set((s) => (s.plan ? { plan: { ...s.plan, reminder: time } } : s)),
      toggleInFolder: (key, name) =>
        set((s) => {
          if (!s.folders.includes(name)) return s;
          const now = s.inFolders[key] ?? [];
          const next = now.includes(name) ? now.filter((f) => f !== name) : [...now, name];
          const inFolders = { ...s.inFolders };
          if (next.length) inFolders[key] = next;
          else delete inFolders[key];
          return { inFolders };
        }),
    }),
    { name: "athar-hadith-prefs", version: 1 },
  ),
);

/** Removes harakat and Quranic marks, keeping the letters. */
export function withoutHarakat(text: string): string {
  return text.replace(/[\u064B-\u0652\u0670\u0640]/g, "").replace(/[\u06D6-\u06ED]/g, "");
}

/** What a backup keeps of these: your folders, which hadiths are in them, your reading plan and the saved rows' text. */
export type HadithPrefsBackup = {
  v: 1;
  folders: string[];
  inFolders: Record<string, string[]>;
  plan: HadithPlanState | null;
  cards: Record<string, SavedHadithCard>;
};

export function exportHadithPrefs(): HadithPrefsBackup {
  const s = useHadithPrefs.getState();
  return { v: 1, folders: s.folders, inFolders: s.inFolders, plan: s.plan, cards: s.cards };
}

const PLAN_IDS = ["nawawi", "qudsi", "bukhari-year", "muslim-year"];
const isStr = (x: unknown): x is string => typeof x === "string";

/** Restores a backup's folders, plan and saved text, checking each piece; anything malformed is left out. */
export function adoptHadithPrefs(raw: unknown): void {
  if (!raw || typeof raw !== "object" || (raw as { v?: unknown }).v !== 1) return;
  const b = raw as Partial<HadithPrefsBackup>;
  const folders = Array.isArray(b.folders) ? [...new Set(b.folders.filter(isStr).map((f) => f.trim().slice(0, FOLDER_NAME_MAX)).filter(Boolean))] : [];
  const inFolders: Record<string, string[]> = {};
  if (b.inFolders && typeof b.inFolders === "object") {
    for (const [key, names] of Object.entries(b.inFolders)) {
      const kept = Array.isArray(names) ? names.filter((n): n is string => isStr(n) && folders.includes(n)) : [];
      if (kept.length) inFolders[key] = kept;
    }
  }
  const p = b.plan as Partial<HadithPlanState> | null | undefined;
  const plan = p && isStr(p.id) && PLAN_IDS.includes(p.id) && isStr(p.start) && /^\d{4}-\d{2}-\d{2}$/.test(p.start) && typeof p.read === "number" && p.read >= 0
    ? { id: p.id as HadithPlanId, start: p.start, read: Math.floor(p.read), reminder: isStr(p.reminder) && /^\d{2}:\d{2}$/.test(p.reminder) ? p.reminder : null }
    : null;
  const cards: Record<string, SavedHadithCard> = {};
  if (b.cards && typeof b.cards === "object") {
    for (const [key, c] of Object.entries(b.cards)) {
      if (c && isStr(c.r) && isStr(c.x)) cards[key] = { r: c.r, x: c.x.slice(0, 400), ...(isStr(c.ti) ? { ti: c.ti } : {}) };
    }
  }
  useHadithPrefs.setState((s) => ({ folders, inFolders, plan, cards: { ...s.cards, ...cards } }));
}
