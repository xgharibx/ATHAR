import { describe, expect, it } from "vitest";
import { createRecitationFollower, isSilentToken, wordsMatch } from "@/lib/recitationFollower";

const FATIHA_2 = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ".split(" ");
const BAQARA_2 = "ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ".split(" ");

describe("recitation follower", () => {
  it("matches everyday spelling to the Uthmani script", () => {
    expect(wordsMatch("ٱلْعَٰلَمِينَ", "العالمين")).toBe(true);
    expect(wordsMatch("ٱلصَّلَوٰةَ", "الصلاة")).toBe(true);
    expect(wordsMatch("ٱلْكِتَٰبُ", "الكتاب")).toBe(true);
    expect(wordsMatch("ذَٰلِكَ", "ذلك")).toBe(true);
    expect(wordsMatch("رَبِّ", "قلب")).toBe(false);
    expect(isSilentToken("ۛ")).toBe(true);
  });

  it("reveals words as they are recited, holding the unfinished last word", () => {
    const follower = createRecitationFollower();
    expect(follower.push("s1", "الحمد لله", false, FATIHA_2, 0)).toBe(1);
    expect(follower.push("s1", "الحمد لله رب", false, FATIHA_2, 1)).toBe(2);
    expect(follower.push("s1", "الحمد لله رب العالمين", true, FATIHA_2, 2)).toBe(4);
  });

  it("steps over pause marks", () => {
    const follower = createRecitationFollower();
    expect(follower.push("s1", "ذلك الكتاب لا ريب فيه هدى للمتقين", true, BAQARA_2, 0)).toBe(BAQARA_2.length);
  });

  it("skips one misheard word instead of stalling", () => {
    const follower = createRecitationFollower();
    expect(follower.push("s1", "الحمد لاه رب العالمين", true, FATIHA_2, 0)).toBe(4);
  });

  it("does not reveal ahead for words that are not in the ayah", () => {
    const follower = createRecitationFollower();
    expect(follower.push("s1", "مرحبا كيف الحال", true, FATIHA_2, 0)).toBe(0);
  });

  it("does not re-read earlier words of a segment against the next ayah", () => {
    const follower = createRecitationFollower();
    const ayah1 = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".split(" ");
    const ayah3 = "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".split(" ");
    expect(follower.push("s1", "بسم الله الرحمن الرحيم", true, ayah1, 0)).toBe(4);
    // The next ayah starts with the same words; only new speech reveals them.
    expect(follower.push("s1", "بسم الله الرحمن الرحيم", true, ayah3, 0)).toBe(0);
    expect(follower.push("s2", "الرحمن الرحيم", true, ayah3, 0)).toBe(2);
  });
});
