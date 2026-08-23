/**
 * What plays next, and why.
 *
 * With 7,551 shorts across six channels and one channel holding 88% of them,
 * the ranking is what separates a feed from a playlist — and "never show me
 * that again" is the thing people notice first.
 */
import { describe, expect, it } from "vitest";
import { buildShortsFeed, posterFor, SHORT_MAX_SECONDS, type ShortsIndex } from "@/lib/shortsFeed";

const channels = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase(), accent: "#fff" }));

function idx(items: Array<[string, string, number, string?]>): ShortsIndex {
  return { channels, items: items.map(([i, c, d, p]) => ({ i, c, t: i, d, p })) };
}

/** n clips on channel c, ids c0..c(n-1). */
function many(c: string, n: number, dur = 30): Array<[string, string, number, string?]> {
  return Array.from({ length: n }, (_, k) => [`${c}${k}`, c, dur] as [string, string, number]);
}

describe("what qualifies", () => {
  it("keeps anything up to three minutes", () => {
    expect(buildShortsFeed(idx([["v1", "a", SHORT_MAX_SECONDS]]))).toHaveLength(1);
  });

  it("drops full lectures", () => {
    expect(buildShortsFeed(idx([["v1", "a", 5087]]))).toHaveLength(0);
  });

  it("drops anything with no known duration", () => {
    expect(buildShortsFeed(idx([["v1", "a", 0]]))).toHaveLength(0);
  });

  it("survives an empty or missing index", () => {
    expect(buildShortsFeed(null)).toEqual([]);
    expect(buildShortsFeed({ channels: [], items: [] })).toEqual([]);
  });
});

describe("never show it twice", () => {
  it("puts everything unwatched ahead of anything watched", () => {
    const feed = buildShortsFeed(idx([...many("a", 3)]), { seen: { a1: Date.now() }, limit: 3 });
    // a1 may still appear at the very end — an empty screen is worse than a
    // repeat — but never before the two clips that have not been seen.
    expect(feed.slice(0, 2).map((s) => s.id)).not.toContain("a1");
    expect(feed[2]!.id).toBe("a1");
  });

  it("shows nothing watched while unwatched clips remain", () => {
    const feed = buildShortsFeed(idx([...many("a", 10)]), { seen: { a0: 1, a1: 2, a2: 3 }, limit: 7 });
    const ids = feed.map((s) => s.id);
    expect(ids).toHaveLength(7);
    for (const watched of ["a0", "a1", "a2"]) expect(ids).not.toContain(watched);
  });

  it("recycles rather than dead-ending when everything has been watched", () => {
    // An empty screen is worse than a repeat.
    const seen = { a0: 300, a1: 100, a2: 200 };
    const feed = buildShortsFeed(idx([...many("a", 3)]), { seen });
    expect(feed).toHaveLength(3);
    // Least recently watched comes back first.
    expect(feed[0]!.id).toBe("a1");
  });
});

describe("no voice owns the feed", () => {
  it("never plays the same channel twice running while others have material", () => {
    const feed = buildShortsFeed(idx([...many("a", 200), ...many("b", 200), ...many("c", 200)]), { limit: 60 });
    for (let i = 1; i < feed.length; i += 1) {
      expect(feed[i]!.channelId).not.toBe(feed[i - 1]!.channelId);
    }
  });

  it("gives a channel holding 90% of the library well under 90% of the feed", () => {
    // Straight proportional weighting would make this one voice the feed;
    // sqrt weighting keeps the others genuinely present.
    const feed = buildShortsFeed(idx([...many("a", 900), ...many("b", 50), ...many("c", 50)]), { limit: 100 });
    const share = feed.filter((s) => s.channelId === "a").length / feed.length;
    expect(share).toBeLessThan(0.75);
    expect(share).toBeGreaterThan(0.3); // still the biggest, as it should be
  });

  it("keeps small channels represented", () => {
    const feed = buildShortsFeed(idx([...many("a", 900), ...many("b", 20), ...many("c", 20)]), { limit: 60 });
    expect(feed.some((s) => s.channelId === "b")).toBe(true);
    expect(feed.some((s) => s.channelId === "c")).toBe(true);
  });

  it("falls back gracefully when only one channel has anything", () => {
    const feed = buildShortsFeed(idx([...many("a", 5)]), { limit: 10 });
    expect(feed).toHaveLength(5);
  });
});

describe("stability", () => {
  it("is identical for a given seed, so scrolling never reshuffles", () => {
    const i = idx([...many("a", 30), ...many("b", 30)]);
    const one = buildShortsFeed(i, { seed: 7, limit: 40 }).map((s) => s.id);
    const two = buildShortsFeed(i, { seed: 7, limit: 40 }).map((s) => s.id);
    expect(one).toEqual(two);
  });

  it("differs across seeds, so a revisit is not the same sequence", () => {
    const i = idx([...many("a", 60), ...many("b", 60)]);
    const one = buildShortsFeed(i, { seed: 1, limit: 40 }).map((s) => s.id);
    const two = buildShortsFeed(i, { seed: 2, limit: 40 }).map((s) => s.id);
    expect(one).not.toEqual(two);
  });

  it("never returns more than the limit", () => {
    expect(buildShortsFeed(idx([...many("a", 500)]), { limit: 25 })).toHaveLength(25);
  });

  it("emits every id at most once", () => {
    const feed = buildShortsFeed(idx([...many("a", 40), ...many("b", 40)]), { limit: 80 });
    expect(new Set(feed.map((s) => s.id)).size).toBe(feed.length);
  });
});

describe("what the viewer likes", () => {
  it("surfaces a liked channel more often", () => {
    // The signal has to move how OFTEN the channel comes up. An earlier version
    // added a constant to every item in the channel, which shifts them all
    // equally and therefore changes nothing at all.
    // Needs three channels: with only two, the never-twice-running rule forces
    // strict alternation and no weight can change the split.
    const i = idx([...many("a", 100), ...many("b", 100), ...many("c", 100)]);
    const neutral = buildShortsFeed(i, { seed: 5, limit: 45 });
    const liked = buildShortsFeed(i, { seed: 5, limit: 45, liked: { b0: true } });
    const shareOfB = (f: typeof neutral) => f.filter((s) => s.channelId === "b").length;
    expect(shareOfB(liked)).toBeGreaterThan(shareOfB(neutral));
  });
});

describe("presentation", () => {
  it("carries the channel name so the card can credit it", () => {
    expect(buildShortsFeed(idx([["v1", "a", 30]]))[0]!.channelName).toBe("A");
  });

  it("always has a poster", () => {
    expect(posterFor(buildShortsFeed(idx([["v1", "a", 30]]))[0]!)).toContain("v1");
  });
});
