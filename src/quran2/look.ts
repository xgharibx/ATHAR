import { useNoorStore } from "@/store/noorStore";
import { useQ2Store, type Q2UfuqPalette } from "./store";

export type QuranLook = "paper" | "night" | "afaq";

/**
 * The look of the Quran: in the classic designs, «سَحَر» (parchment) or «ليل»;
 * in «أفق», «أفق» itself by default (its sky, garden and colours), or either.
 */
export function useQuranLook(): { look: QuranLook; ufuq: boolean; cycle: () => void; next: QuranLook } {
  const ufuq = useNoorStore((s) => s.prefs.designMode === "ufuq");
  const palette = useQ2Store((s) => s.prefs.palette);
  const ufuqPalette = useQ2Store((s) => s.prefs.ufuqPalette ?? "afaq");
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const look: QuranLook = ufuq ? ufuqPalette : palette;
  const order: Q2UfuqPalette[] = ["afaq", "paper", "night"];
  const next: QuranLook = ufuq ? order[(order.indexOf(ufuqPalette) + 1) % order.length]! : palette === "night" ? "paper" : "night";
  const cycle = () => (ufuq ? setPrefs({ ufuqPalette: next }) : setPrefs({ palette: next === "night" ? "night" : "paper" }));
  return { look, ufuq, cycle, next };
}

