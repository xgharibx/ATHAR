/**
 * The few words a saved hadith shows in a list: its printed-number ref, its
 * title (the forties) and the start of its matn. Kept with the mark itself
 * (useHadithPrefs().cards), so lists of marks never load a whole book.
 */
import type { HadithItem } from "@/data/hadithTypes";
import type { SavedHadithCard } from "@/lib/hadithPrefs";
import { splitHadithText } from "@/lib/hadithText";

export function savedCardFor(item: HadithItem): SavedHadithCard {
  const { matn } = splitHadithText(item.t);
  const text = (matn || item.t).replace(/\s+/g, " ").trim();
  return { r: item.r ?? String(item.a), x: text.slice(0, 240), ...(item.ti ? { ti: item.ti } : {}) };
}
