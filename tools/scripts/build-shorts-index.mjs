/**
 * Derive a slim shorts index from the full video library.
 *
 * The library is 6.4 MB and 11,953 records. The shorts feed needs six fields
 * from a third of them, and making it parse the whole library before it can
 * show one video is the difference between opening instantly and not. This
 * emits only what the feed reads.
 *
 * Run standalone, or automatically at the end of sync-youtube-api.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../../public/data/video-library.json");
const OUT = path.resolve(__dirname, "../../public/data/shorts.json");

const SHORT_MAX_SECONDS = 180;

const db = JSON.parse(fs.readFileSync(SRC, "utf8"));

const channels = (db.channels ?? []).map((c) => ({
  id: c.id,
  name: c.displayName ?? c.title ?? c.id,
  avatar: c.avatarUrl ?? c.avatar ?? "",
  accent: c.accent ?? "",
}));

const items = [];
for (const v of db.videos ?? []) {
  const secs = v.durationSeconds ?? 0;
  if (secs <= 0 || secs > SHORT_MAX_SECONDS) continue;
  items.push({
    i: v.youtubeId ?? v.id,   // id doubles as the YouTube id
    c: v.channelId,
    t: v.title ?? "",
    d: secs,
    p: v.publishedAt ?? "",
  });
}

// Newest first, so the ranker can reward recency without re-sorting 7,000 rows.
items.sort((a, b) => (b.p ?? "").localeCompare(a.p ?? ""));

fs.writeFileSync(OUT, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), channels, items }), "utf8");

const mb = (fs.statSync(OUT).size / 1048576).toFixed(2);
const srcMb = (fs.statSync(SRC).size / 1048576).toFixed(2);
console.log(`shorts.json: ${items.length} shorts · ${mb} MB (library is ${srcMb} MB)`);
