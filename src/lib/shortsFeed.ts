/**
 * Which videos make a shorts feed, and in what order.
 *
 * Pure and data-only so the ordering can be reasoned about (and tested)
 * without mounting a player.
 */
import type { VideoLibraryChannel, VideoLibraryVideo } from "@/data/videoLibraryTypes";

/**
 * A "short" is under three minutes.
 *
 * YouTube's API exposes no shorts flag and no aspect ratio, so duration is the
 * only signal available. Three minutes is YouTube's own current shorts ceiling;
 * anything longer is a lecture and would break the swipe rhythm.
 */
export const SHORT_MAX_SECONDS = 180;

export type Short = {
  id: string;
  youtubeId: string;
  title: string;
  channelId: string;
  channelName: string;
  channelAvatar?: string;
  accent?: string;
  durationSeconds: number;
  thumbnail?: string;
};

function seededShuffle<T>(items: T[], seed: number): T[] {
  // Deterministic per seed, so the order is stable within a session and a
  // reload does not drop the viewer back into the identical sequence.
  const out = items.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Interleave by channel so the feed never plays six clips from one voice in a
 * row. Round-robin across channels, each channel internally shuffled — the
 * single biggest difference between a feed that feels alive and a playlist.
 */
export function buildShortsFeed(
  videos: VideoLibraryVideo[],
  channels: VideoLibraryChannel[],
  seed = Date.now(),
): Short[] {
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const byChannel = new Map<string, Short[]>();
  for (const v of videos) {
    const secs = v.durationSeconds ?? 0;
    if (secs <= 0 || secs > SHORT_MAX_SECONDS) continue;
    const yt = v.youtubeId ?? v.id;
    if (!yt) continue;
    const ch = channelById.get(v.channelId);
    const short: Short = {
      id: v.id,
      youtubeId: yt,
      title: v.title ?? "",
      channelId: v.channelId,
      channelName: ch?.displayName ?? ch?.title ?? "",
      channelAvatar: ch?.avatarUrl ?? ch?.avatar,
      accent: ch?.accent,
      durationSeconds: secs,
      thumbnail: v.thumbnail,
    };
    const list = byChannel.get(v.channelId) ?? [];
    list.push(short);
    byChannel.set(v.channelId, list);
  }

  const queues = [...byChannel.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, list], i) => seededShuffle(list, seed + i * 7919));

  const out: Short[] = [];
  for (let i = 0; queues.some((q) => i < q.length); i += 1) {
    for (const q of queues) {
      const item = q[i];
      if (item) out.push(item);
    }
  }
  return out;
}

/** Thumbnail at the largest size YouTube reliably serves for every video. */
export function posterFor(short: Short): string {
  return short.thumbnail || `https://i.ytimg.com/vi/${short.youtubeId}/hqdefault.jpg`;
}
