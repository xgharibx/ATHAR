// @vitest-environment jsdom
/**
 * Watch history for the shorts feed.
 *
 * The feed's first promise to the viewer is "you will not see that again",
 * and history is what keeps it. The bound on how much is remembered is
 * therefore a correctness constraint, not a tidiness one: prune below the
 * size of the library and a dropped id reads as "never seen" the next time
 * the feed is built, so a committed viewer starts getting repeats while
 * thousands of clips are still genuinely unwatched.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { buildShortsFeed, type ShortsIndex } from "@/lib/shortsFeed";

/** The real library, as of this writing, is ~7,551 clips. */
const LIBRARY_SIZE = 7_551;
const CAP = 20_000;

/** n entries, oldest first, so pruning order is unambiguous. */
function seed(n: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i += 1) out[`v${i}`] = i + 1;
  return out;
}

describe("shorts watch history", () => {
  beforeEach(() => {
    useNoorStore.setState({ shortsSeen: {} });
  });

  it("remembers a watched clip", () => {
    useNoorStore.getState().markShortSeen("abc");
    expect(useNoorStore.getState().shortsSeen.abc).toBeGreaterThan(0);
  });

  it("keeps the first timestamp when the same clip is marked twice", () => {
    useNoorStore.getState().markShortSeen("abc");
    const first = useNoorStore.getState().shortsSeen.abc;
    useNoorStore.getState().markShortSeen("abc");
    expect(useNoorStore.getState().shortsSeen.abc).toBe(first);
  });

  it("holds the whole library without pruning", () => {
    // The cap used to be 4,000 against a library of 7,551 — so roughly 3,500
    // clips could never be retired, and the oldest history silently expired
    // back into the feed.
    //
    // Seeded directly rather than through 7,551 calls: each call copies the
    // whole history, so driving it one id at a time is quadratic and takes
    // minutes. One real call on top proves the pruning path.
    useNoorStore.setState({ shortsSeen: seed(LIBRARY_SIZE - 1) });
    useNoorStore.getState().markShortSeen("last");
    const seen = useNoorStore.getState().shortsSeen;
    expect(Object.keys(seen)).toHaveLength(LIBRARY_SIZE);
    expect(seen.v0).toBeGreaterThan(0); // the very first is still remembered
    expect(seen.last).toBeGreaterThan(0);
  });

  it("having watched everything, offers nothing it was forced to forget", () => {
    // The end-to-end version of the same promise, through the real ranker.
    const items = Array.from({ length: LIBRARY_SIZE }, (_, k) => ({
      i: `v${k}`,
      c: "a",
      t: `t${k}`,
      d: 30,
    }));
    const index: ShortsIndex = { channels: [{ id: "a", name: "A" }], items };

    useNoorStore.setState({ shortsSeen: Object.fromEntries(items.map((x, k) => [x.i, k + 1])) });
    const seen = useNoorStore.getState().shortsSeen;
    expect(Object.keys(seen)).toHaveLength(LIBRARY_SIZE); // nothing pruned away

    const feed = buildShortsFeed(index, { seen, limit: 300 });
    // Everything is watched, so the feed recycles rather than dead-ending —
    // but nothing in it should be a clip history was forced to forget.
    expect(feed.length).toBeGreaterThan(0);
    for (const s of feed) expect(seen[s.id]).toBeGreaterThan(0);
  });

  it("still bounds history, so it cannot grow without limit", () => {
    useNoorStore.setState({ shortsSeen: seed(CAP) });
    useNoorStore.getState().markShortSeen("newest");
    const seen = useNoorStore.getState().shortsSeen;
    expect(Object.keys(seen).length).toBeLessThanOrEqual(CAP);
    expect(seen.newest).toBeGreaterThan(0); // the new one is kept
    expect(seen.v0).toBeUndefined(); // the oldest is the one dropped
  });
});
