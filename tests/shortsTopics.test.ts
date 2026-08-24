/**
 * Reading a subject out of a title.
 *
 * With six channels and one holding 88% of the library, "which channel" barely
 * narrows anything. Subject is the signal that does, and titles are the only
 * text there is — so what counts as a word here decides how good the feed gets.
 */
import { describe, expect, it } from "vitest";
import {
  channelNameStopwords,
  foldTopics,
  normaliseArabic,
  topicAffinity,
  topicTokens,
  TOPIC_MEMORY,
} from "@/lib/shortsTopics";

describe("normalising", () => {
  it("folds the alef spellings together", () => {
    expect(normaliseArabic("أحمد")).toBe(normaliseArabic("احمد"));
    expect(normaliseArabic("إسلام")).toBe(normaliseArabic("اسلام"));
  });

  it("folds ta-marbuta and alef-maqsura", () => {
    expect(normaliseArabic("صلاة")).toBe("صلاه");
    expect(normaliseArabic("على")).toBe("علي");
  });

  it("strips harakat", () => {
    expect(normaliseArabic("نَصّ")).toBe("نص");
  });
});

describe("tokenising", () => {
  it("drops the episode number many titles carry", () => {
    expect(topicTokens("726- حكم غسل الثياب")).not.toContain("726");
    expect(topicTokens("726- حكم غسل الثياب")).toContain("حكم");
  });

  it("folds the definite article so الرقية and رقية are one topic", () => {
    expect(topicTokens("الرقية الشرعية")).toContain("رقيه");
    expect(topicTokens("رقية شرعية")).toContain("رقيه");
  });

  it("drops prepositions even after normalisation changes their spelling", () => {
    // The one that bit: على normalises to علي, which is also the name Ali, so
    // comparing raw stopwords against normalised tokens let the three commonest
    // prepositions through as subjects on hundreds of titles each.
    const t = topicTokens("الصلاة على النبي وإلى المسجد");
    expect(t).not.toContain("علي");
    expect(t).not.toContain("الي");
    expect(t).toContain("صلاه");
  });

  it("keeps genuinely topical words that merely happen to be common", () => {
    expect(topicTokens("حكم صيام يوم عرفة")).toEqual(
      expect.arrayContaining(["حكم", "صيام", "عرفه"]),
    );
  });

  it("returns each word once", () => {
    const t = topicTokens("الصلاة الصلاة صلاة");
    expect(t.filter((x) => x === "صلاه")).toHaveLength(1);
  });

  it("survives an empty or punctuation-only title", () => {
    expect(topicTokens("")).toEqual([]);
    expect(topicTokens("؟؟؟ -- !!")).toEqual([]);
  });
});

describe("channel names are not subjects", () => {
  it("excludes the words a channel signs its titles with", () => {
    // "- عثمان الخميس" is appended to 5,352 of the 7,551 clips. Left in, it
    // would be the strongest "topic" in the library and would merely restate
    // the channel weighting the ranker already applies directly.
    const stop = channelNameStopwords(["عثمان الخميس"]);
    const t = topicTokens("حكم صيام عرفة - عثمان الخميس", stop);
    expect(t).not.toContain("عثمان");
    expect(t).not.toContain("خميس");
    expect(t).toContain("صيام");
  });
});

describe("learning what someone likes", () => {
  it("records interest and disinterest alike", () => {
    let a: Record<string, number> = {};
    a = foldTopics(a, "الرقية الشرعية", 1);
    expect(a["رقيه"]).toBe(1);
    a = foldTopics(a, "الرقية الشرعية", -1);
    expect(a["رقيه"]).toBe(0);
  });

  it("clamps, so one obsession cannot own the feed", () => {
    let a: Record<string, number> = {};
    for (let i = 0; i < 50; i += 1) a = foldTopics(a, "الرقية", 1);
    expect(a["رقيه"]).toBeLessThanOrEqual(6);

    for (let i = 0; i < 50; i += 1) a = foldTopics(a, "الرقية", -1);
    // …and cannot be buried so deep it never recovers.
    expect(a["رقيه"]).toBeGreaterThanOrEqual(-3);
  });

  it("keeps memory bounded, holding on to the strongest feelings", () => {
    let a: Record<string, number> = {};
    for (let i = 0; i < TOPIC_MEMORY + 100; i += 1) a = foldTopics(a, `كلمه${i}`, 1);
    a = foldTopics(a, "الرقية", 1);
    a = foldTopics(a, "الرقية", 1);
    a = foldTopics(a, "الرقية", 1);
    expect(Object.keys(a).length).toBeLessThanOrEqual(TOPIC_MEMORY);
    expect(a["رقيه"]).toBeGreaterThan(0); // the strong one survived the prune
  });

  it("scores a matching title above an unrelated one", () => {
    const a = foldTopics(foldTopics({}, "الرقية الشرعية", 2), "الحسد والعين", 2);
    expect(topicAffinity(a, "الرقية من الحسد")).toBeGreaterThan(
      topicAffinity(a, "أحكام البيع والشراء"),
    );
  });

  it("scores a disliked subject below neutral", () => {
    const a = foldTopics({}, "أحكام البيع", -2);
    expect(topicAffinity(a, "أحكام البيع")).toBeLessThan(0);
  });

  it("does not reward a long title for merely being long", () => {
    // Averaged over its own tokens, not summed — otherwise padding a title
    // with words would outrank a precise match.
    const a = foldTopics({}, "الرقية", 3);
    const precise = topicAffinity(a, "الرقية");
    const padded = topicAffinity(a, "الرقية وشيء آخر تماما ومواضيع كثيرة مختلفة");
    expect(precise).toBeGreaterThan(padded);
  });

  it("is neutral about a title it has never seen a word of", () => {
    expect(topicAffinity({}, "أي عنوان")).toBe(0);
  });
});
