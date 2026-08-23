/**
 * What makes a shorts feed, and in what order.
 *
 * The ordering is the difference between a feed that feels alive and a
 * playlist: six clips from one voice in a row is the fastest way to lose
 * someone.
 */
import { describe, expect, it } from "vitest";
import { buildShortsFeed, posterFor, SHORT_MAX_SECONDS } from "@/lib/shortsFeed";
import type { VideoLibraryChannel, VideoLibraryVideo } from "@/data/videoLibraryTypes";

const ch = (id: string): VideoLibraryChannel =>
  ({ id, handle: "@x", title: id, displayName: id, youtubeUrl: "", description: "", accent: "#fff", order: 1 }) as VideoLibraryChannel;

const vid = (id: string, channelId: string, durationSeconds: number): VideoLibraryVideo =>
  ({ id, youtubeId: id, channelId, title: id, description: "", durationSeconds, courseIds: [], topicIds: [] }) as unknown as VideoLibraryVideo;

const channels = [ch("a"), ch("b")];

describe("what counts as a short", () => {
  it("keeps anything up to three minutes", () => {
    const feed = buildShortsFeed([vid("v1", "a", SHORT_MAX_SECONDS)], channels, 1);
    expect(feed).toHaveLength(1);
  });

  it("drops full lectures", () => {
    expect(buildShortsFeed([vid("v1", "a", 5087)], channels, 1)).toHaveLength(0);
  });

  it("drops anything with no known duration", () => {
    expect(buildShortsFeed([vid("v1", "a", 0)], channels, 1)).toHaveLength(0);
  });
});

describe("ordering", () => {
  it("interleaves channels instead of grouping them", () => {
    const videos = [
      ...Array.from({ length: 5 }, (_, i) => vid(`a${i}`, "a", 30)),
      ...Array.from({ length: 5 }, (_, i) => vid(`b${i}`, "b", 30)),
    ];
    const feed = buildShortsFeed(videos, channels, 42);
    // No three consecutive clips from one channel.
    let run = 1;
    for (let i = 1; i < feed.length; i += 1) {
      run = feed[i]!.channelId === feed[i - 1]!.channelId ? run + 1 : 1;
      expect(run).toBeLessThan(3);
    }
  });

  it("includes every short exactly once", () => {
    const videos = [
      ...Array.from({ length: 4 }, (_, i) => vid(`a${i}`, "a", 30)),
      ...Array.from({ length: 7 }, (_, i) => vid(`b${i}`, "b", 30)),
    ];
    const feed = buildShortsFeed(videos, channels, 3);
    expect(feed).toHaveLength(11);
    expect(new Set(feed.map((s) => s.id)).size).toBe(11);
  });

  it("is stable for a given seed, so scrolling never reshuffles", () => {
    const videos = Array.from({ length: 8 }, (_, i) => vid(`a${i}`, "a", 30));
    const one = buildShortsFeed(videos, channels, 99).map((s) => s.id);
    const two = buildShortsFeed(videos, channels, 99).map((s) => s.id);
    expect(one).toEqual(two);
  });

  it("differs across seeds, so a revisit is not the identical sequence", () => {
    const videos = Array.from({ length: 20 }, (_, i) => vid(`a${i}`, "a", 30));
    const one = buildShortsFeed(videos, channels, 1).map((s) => s.id);
    const two = buildShortsFeed(videos, channels, 2).map((s) => s.id);
    expect(one).not.toEqual(two);
  });

  it("copes with a channel that has no shorts at all", () => {
    const feed = buildShortsFeed([vid("a0", "a", 30)], [...channels, ch("c")], 1);
    expect(feed).toHaveLength(1);
  });
});

describe("presentation", () => {
  it("carries the channel name so the card can credit it", () => {
    const feed = buildShortsFeed([vid("v1", "a", 30)], channels, 1);
    expect(feed[0]!.channelName).toBe("a");
  });

  it("always has a poster, even with no stored thumbnail", () => {
    const feed = buildShortsFeed([vid("v1", "a", 30)], channels, 1);
    expect(posterFor(feed[0]!)).toContain("v1");
  });
});
