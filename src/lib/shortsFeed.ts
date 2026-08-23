/**
 * What plays next, and why.
 *
 * Pure and data-only, so the ranking can be reasoned about and tested without
 * mounting a player.
 *
 * Three rules, in order of how much they matter:
 *
 * 1. **Never replay what has been watched** while anything unwatched remains.
 *    A feed that reopens on the same clip is a feed nobody reopens twice.
 * 2. **Never run one voice back to back.** With 7,551 shorts across six
 *    channels, one channel holds 88% of them — a naive shuffle is that channel
 *    almost exclusively, and a plain round-robin is fair for forty cards and
 *    then becomes a six-thousand-long tail of the same speaker.
 * 3. **Lean towards what is new and what the viewer already likes**, without
 *    ever becoming predictable.
 */

/** A "short" is under three minutes — YouTube's own current ceiling. The API
 *  exposes no shorts flag and no aspect ratio, so duration is the only signal. */
export const SHORT_MAX_SECONDS = 180;

/** Compact wire format from shorts.json — six fields, not the whole library. */
export type ShortsIndex = {
  channels: Array<{ id: string; name: string; avatar?: string; accent?: string }>;
  items: Array<{ i: string; c: string; t: string; d: number; p?: string }>;
};

export type Short = {
  id: string;
  youtubeId: string;
  title: string;
  channelId: string;
  channelName: string;
  channelAvatar?: string;
  accent?: string;
  durationSeconds: number;
  publishedAt?: string;
};

export type RankInput = {
  /** videoId → epoch ms when it was watched. */
  seen?: Record<string, number>;
  /** videoId → true, the likes that already sync with the account. */
  liked?: Record<string, boolean>;
  seed?: number;
  /** Cap the built feed; the UI never needs thousands of slots at once. */
  limit?: number;
};

function hash(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(h ^ str.charCodeAt(i), 2654435761) >>> 0);
  }
  return h / 0xffffffff;
}

const DAY_MS = 86_400_000;

/**
 * Freshness, decaying over roughly a season.
 *
 * Undated videos score mid — never pushed to the bottom for a missing field.
 */
function recencyScore(publishedAt: string | undefined, now: number): number {
  if (!publishedAt) return 0.5;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return 0.5;
  const ageDays = Math.max(0, (now - t) / DAY_MS);
  return 1 / (1 + ageDays / 90);
}

export function buildShortsFeed(index: ShortsIndex | null, opts: RankInput = {}): Short[] {
  if (!index?.items?.length) return [];
  const { seen = {}, liked = {}, seed = 1, limit = 400 } = opts;
  const now = Date.now();

  const channelById = new Map(index.channels.map((c) => [c.id, c]));

  // Channels the viewer has actually liked from — a real signal, and the only
  // personalisation available without tracking anything invasive.
  const likedChannels = new Set<string>();
  for (const [id, on] of Object.entries(liked)) {
    if (!on) continue;
    const item = index.items.find((x) => x.i === id);
    if (item) likedChannels.add(item.c);
  }

  const toShort = (x: ShortsIndex["items"][number]): Short => {
    const ch = channelById.get(x.c);
    return {
      id: x.i,
      youtubeId: x.i,
      title: x.t,
      channelId: x.c,
      channelName: ch?.name ?? "",
      channelAvatar: ch?.avatar,
      accent: ch?.accent,
      durationSeconds: x.d,
      publishedAt: x.p,
    };
  };

  const unseen: typeof index.items = [];
  const watched: typeof index.items = [];
  for (const x of index.items) {
    if (x.d <= 0 || x.d > SHORT_MAX_SECONDS) continue;
    (seen[x.i] ? watched : unseen).push(x);
  }

  // Score, then bucket by channel. The jitter is hashed from the id and the
  // seed rather than Math.random, so a given seed always yields the same feed —
  // re-ranking mid-scroll would teleport the viewer.
  const byChannel = new Map<string, Array<{ x: (typeof index.items)[number]; s: number }>>();
  for (const x of unseen) {
    // Per-ITEM only. A per-channel constant would shift every item in that
    // channel by the same amount and change nothing at all — the liked signal
    // belongs on the channel's weight below, where it actually alters how often
    // the channel comes up.
    const score = recencyScore(x.p, now) * 1.0 + hash(x.i, seed) * 0.8;
    const list = byChannel.get(x.c) ?? [];
    list.push({ x, s: score });
    byChannel.set(x.c, list);
  }
  for (const list of byChannel.values()) list.sort((a, b) => b.s - a.s);

  /**
   * Weighted round-robin, weight = sqrt(size).
   *
   * Straight round-robin exhausts the small channels and leaves a vast tail of
   * the largest. Weighting by size directly gives that channel 88% of the feed.
   * The square root sits between the two: bigger libraries appear more often,
   * with diminishing returns, so no voice ever owns the feed and none vanishes.
   */
  const queues = [...byChannel.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, list]) => ({
      id,
      list,
      // Liked channels come up more often — the one piece of personalisation
      // available without tracking anything the viewer did not volunteer.
      weight: Math.sqrt(list.length) * (likedChannels.has(id) ? 1.6 : 1),
      credit: 0,
      at: 0,
    }));

  const out: Short[] = [];
  const cap = Math.min(limit, unseen.length);
  let lastChannel = "";

  while (out.length < cap) {
    let pick: (typeof queues)[number] | null = null;
    let best = -Infinity;
    for (const q of queues) {
      if (q.at >= q.list.length) continue;
      // Never twice running while any other channel still has something.
      if (q.id === lastChannel && queues.some((o) => o.id !== q.id && o.at < o.list.length)) continue;
      const credit = q.credit + q.weight;
      if (credit > best) {
        best = credit;
        pick = q;
      }
    }
    if (!pick) break;

    for (const q of queues) q.credit += q.weight;
    pick.credit -= queues.reduce((sum, q) => sum + q.weight, 0);

    out.push(toShort(pick.list[pick.at]!.x));
    pick.at += 1;
    lastChannel = pick.id;
  }

  // Last resort only: every unwatched clip is already in the feed and there is
  // still room. Bring back the least recently watched rather than dead-end on
  // an empty screen — but never mix repeats in while new material remains.
  if (out.length >= unseen.length && out.length < limit && watched.length) {
    const recycled = watched
      .slice()
      .sort((a, b) => (seen[a.i] ?? 0) - (seen[b.i] ?? 0))
      .slice(0, limit - out.length)
      .map(toShort);
    out.push(...recycled);
  }

  return out;
}

/** Thumbnail at the size YouTube serves reliably for every video. */
export function posterFor(short: Short): string {
  return `https://i.ytimg.com/vi/${short.youtubeId}/hqdefault.jpg`;
}
