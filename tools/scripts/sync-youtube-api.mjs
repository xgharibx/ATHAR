/**
 * sync-youtube-api.mjs — refresh the video library from the OFFICIAL API.
 *
 * Replaces sync-all.mjs, which scraped YouTube's undocumented Innertube
 * endpoint. That stopped working (HTTP 400: the pinned clientVersion is years
 * stale) and, worse, wrote its empty result straight over 4,691 real videos.
 * The official Data API is documented, versioned, and does not change under us.
 *
 *   YT_API_KEY=... node tools/scripts/sync-youtube-api.mjs
 *
 * Quota: channels.list + playlistItems.list + videos.list are 1 unit per call,
 * 50 items per page. A full refresh of six channels costs a few hundred units
 * against a 10,000/day default — cheap enough to run whenever.
 *
 * Channels, courses and topics are preserved exactly. Only `videos` is rebuilt,
 * and existing course/topic assignments are carried across by video id so a
 * refresh never undoes the classification work already done.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../../public/data/video-library.json");
const API = "https://www.googleapis.com/youtube/v3";

const KEY = process.env.YT_API_KEY;
if (!KEY) {
  console.error("Set YT_API_KEY. The key must never be committed or bundled — it is a build-time input only.");
  process.exit(1);
}

/** Stop pulling a single channel after this many uploads. */
const MAX_PER_CHANNEL = Number(process.env.MAX_PER_CHANNEL ?? 3000);
/** A sync returning less than this share of what we hold is a failure, not news. */
const MIN_KEEP_RATIO = 0.9;

let quotaUnits = 0;

async function api(endpoint, params) {
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("key", KEY);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url);
    quotaUnits += 1;
    if (res.ok) return res.json();
    const body = await res.json().catch(() => ({}));
    const reason = body?.error?.errors?.[0]?.reason ?? "";
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new Error(`QUOTA EXHAUSTED after ~${quotaUnits} units — rerun tomorrow or use another key.`);
    }
    // Transient: back off and retry.
    if (res.status >= 500 || res.status === 429) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    throw new Error(`${endpoint} ${res.status}: ${body?.error?.message ?? "unknown"}`);
  }
  throw new Error(`${endpoint} failed after retries`);
}

/** ISO-8601 duration ("PT1M30S") → seconds. */
function isoDurationToSeconds(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

function bestThumb(thumbs) {
  return (
    thumbs?.maxres?.url ??
    thumbs?.standard?.url ??
    thumbs?.high?.url ??
    thumbs?.medium?.url ??
    thumbs?.default?.url ??
    ""
  );
}

async function uploadsPlaylistFor(channelId) {
  const j = await api("channels", { part: "contentDetails", id: channelId });
  return j.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

async function allVideoIds(playlistId) {
  const ids = [];
  let pageToken = "";
  do {
    const j = await api("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const it of j.items ?? []) {
      const id = it.contentDetails?.videoId;
      if (id) ids.push(id);
    }
    pageToken = j.nextPageToken ?? "";
  } while (pageToken && ids.length < MAX_PER_CHANNEL);
  return ids.slice(0, MAX_PER_CHANNEL);
}

async function hydrate(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await api("videos", {
      part: "snippet,contentDetails",
      id: ids.slice(i, i + 50).join(","),
      maxResults: 50,
    });
    out.push(...(j.items ?? []));
  }
  return out;
}

async function main() {
  const db = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  const channels = db.channels ?? [];
  console.log(`Refreshing ${channels.length} channels…\n`);

  // Keep the classification a previous run earned.
  const priorById = new Map((db.videos ?? []).map((v) => [v.id, v]));

  const videos = [];
  for (const ch of channels) {
    const ytId = ch.youtubeChannelId;
    if (!ytId) {
      console.warn(`  ⚠ ${ch.displayName}: no youtubeChannelId, skipped`);
      continue;
    }
    try {
      const uploads = await uploadsPlaylistFor(ytId);
      if (!uploads) {
        console.warn(`  ⚠ ${ch.displayName}: no uploads playlist`);
        continue;
      }
      const ids = await allVideoIds(uploads);
      const items = await hydrate(ids);

      let shorts = 0;
      for (const it of items) {
        const secs = isoDurationToSeconds(it.contentDetails?.duration);
        if (secs > 0 && secs <= 180) shorts += 1;
        const prior = priorById.get(it.id);
        videos.push({
          id: it.id,
          youtubeId: it.id,
          channelId: ch.id,
          courseIds: prior?.courseIds ?? [`${ch.id}-uploads`],
          topicIds: prior?.topicIds ?? [],
          title: it.snippet?.title ?? "",
          description: "",
          durationSeconds: secs,
          thumbnail: bestThumb(it.snippet?.thumbnails),
          publishedAt: it.snippet?.publishedAt ?? prior?.publishedAt,
          position: prior?.position,
        });
      }
      console.log(`  ✅ ${ch.displayName}: ${items.length} videos (${shorts} short)`);
    } catch (err) {
      console.error(`  ❌ ${ch.displayName}: ${err.message}`);
      if (String(err.message).includes("QUOTA")) throw err;
    }
  }

  const before = (db.videos ?? []).length;
  const after = videos.length;
  const shortsAfter = videos.filter((v) => v.durationSeconds > 0 && v.durationSeconds <= 180).length;

  console.log(`\n${after} videos (${shortsAfter} short) vs ${before} on disk · ~${quotaUnits} quota units`);

  // Same guard as sync-all: a shrunken result is a broken fetch, not news.
  if (after < before * MIN_KEEP_RATIO) {
    const rejected = OUT_FILE.replace(/\.json$/, ".rejected.json");
    fs.writeFileSync(rejected, JSON.stringify({ ...db, videos }, null, 2), "utf8");
    console.error("");
    console.error(`⛔  REFUSED to write: ${after} videos vs ${before} already on disk.`);
    console.error("    The existing file is untouched. Rejected result saved to:");
    console.error(`    ${rejected}`);
    process.exitCode = 1;
    return;
  }

  const output = {
    ...db,
    source: "youtube-api",
    videos,
    generatedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n✅  wrote ${OUT_FILE}`);
  console.log(`    +${after - before} videos, ${shortsAfter} shorts available to the feed\n`);
}

main().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exitCode = 1;
});
