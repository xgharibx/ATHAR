/**
 * sync-new-videos.mjs — add what is NEW to the video library, nothing else.
 *
 * The full syncs (sync-all, sync-youtube-api) re-walk every channel from the
 * start: tens of thousands of requests, and one that needs an API key. Most
 * weeks the only thing that changed is that each channel posted some new
 * videos, so this walks each channel's uploads newest-first and stops the
 * moment it reaches videos it already has.
 *
 *   node tools/scripts/sync-new-videos.mjs            # write
 *   node tools/scripts/sync-new-videos.mjs --dry-run  # report only
 *
 * No API key: it uses the same public Innertube endpoint as sync-all, plus each
 * channel's RSS feed for exact publish times. Existing records are never
 * modified or removed, so a failed run cannot damage the library. When it
 * finishes it rebuilds the slim shorts index (build-shorts-index.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, "../../public/data/video-library.json");
const DRY = process.argv.includes("--dry-run");
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 60); // 100 videos a page

const IT_BASE = "https://www.youtube.com/youtubei/v1";
const IT_CONTEXT = {
  client: { clientName: "WEB", clientVersion: "2.20240417.00.00", hl: "ar", gl: "SA", timeZone: "Asia/Riyadh" },
};
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Origin: "https://www.youtube.com",
  Referer: "https://www.youtube.com/",
  "Accept-Language": "ar,en-US;q=0.9",
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms + Math.random() * 150));

async function post(body, tries = 3) {
  for (let i = 1; i <= tries; i += 1) {
    try {
      const res = await fetch(`${IT_BASE}/browse?prettyPrint=false`, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
      if (res.status === 429) {
        await delay(i * 3000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries) throw e;
      await delay(i * 1500);
    }
  }
  return null;
}

function findAll(obj, key, out = []) {
  if (Array.isArray(obj)) {
    for (const x of obj) findAll(x, key, out);
  } else if (obj && typeof obj === "object") {
    if (key in obj) out.push(obj[key]);
    for (const v of Object.values(obj)) findAll(v, key, out);
  }
  return out;
}

const textOf = (n) => (!n ? "" : typeof n === "string" ? n : n.simpleText ?? (n.runs ?? []).map((r) => r.text ?? "").join(""));

function seconds(text) {
  const parts = String(text ?? "").trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function continuation(data) {
  for (const c of findAll(data, "continuationCommand")) if (typeof c?.token === "string" && c.token.length > 10) return c.token;
  return null;
}

/** Channel RSS: exact publish times for the latest ~15 uploads. */
async function rssTimes(channelId) {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!res.ok) return new Map();
    const xml = await res.text();
    const map = new Map();
    for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const id = (m[1].match(/<yt:videoId>(.*?)<\/yt:videoId>/) ?? [])[1];
      const at = (m[1].match(/<published>(.*?)<\/published>/) ?? [])[1];
      if (id && at) map.set(id, at.replace(/\.\d+/, "").replace("+00:00", "Z"));
    }
    return map;
  } catch {
    return new Map();
  }
}

/** "قبل 3 أسابيع" -> an ISO timestamp, good to the day. Used only when RSS lacks the video. */
function relativeToISO(text) {
  const n = parseInt(String(text ?? "").replace(/[^\d]/g, ""), 10) || 1;
  const d = new Date();
  const t = String(text ?? "");
  if (/دقيقة|دقائق|ساعة|ساعات|minute|hour/.test(t)) return d.toISOString().replace(/\.\d+/, "");
  if (/يوم|أيام|day/.test(t)) d.setUTCDate(d.getUTCDate() - n);
  else if (/أسبوع|أسابيع|week/.test(t)) d.setUTCDate(d.getUTCDate() - n * 7);
  else if (/شهر|أشهر|months?/.test(t)) d.setUTCMonth(d.getUTCMonth() - n);
  else if (/سنة|سنوات|year/.test(t)) d.setUTCFullYear(d.getUTCFullYear() - n);
  return d.toISOString().replace(/\.\d+/, "");
}

const TOPIC_WORDS = [
  ["anti-shubuhat", ["شبهة", "شبهات", "رد على", "ردود", "مناظرة", "نقد", "دحض", "تفنيد"]],
  ["atheism", ["إلحاد", "ملحد", "الملاحدة", "داروين", "مادية", "لا أدرية"]],
  ["comparative-religion", ["نصرانية", "مسيحية", "كتاب مقدس", "إنجيل", "يهود", "توراة", "أديان"]],
  ["aqeedah", ["عقيدة", "توحيد", "إيمان", "أسماء الله", "صفات الله", "القدر", "اعتقاد"]],
  ["fiqh", ["فقه", "حكم", "أحكام", "صلاة", "الصلاة", "صيام", "زكاة", "حج", "وضوء", "فتوى", "طهارة", "طلاق", "ربا"]],
  ["tafseer", ["تفسير", "تدبر", "سورة", "آية", "الآية"]],
  ["quran", ["قرآن", "القرآن", "تلاوة", "تجويد", "مصحف", "حفظ القرآن"]],
  ["hadith", ["حديث", "الحديث", "البخاري", "مسلم", "السنة", "الأربعين", "رياض الصالحين"]],
  ["seerah", ["سيرة", "الرسول", "غزوة", "صحابي", "المغازي", "الهجرة", "الخلفاء", "صحابة"]],
  ["tazkiyah", ["تزكية", "التوبة", "الزهد", "التقوى", "الإخلاص", "القلب", "الخشوع"]],
  ["family", ["زوج", "زوجة", "أبناء", "أسرة", "الزواج", "المرأة", "الأمومة"]],
  ["youth", ["شباب", "الشباب", "مراهق", "جامعة", "هوية"]],
  ["daawah", ["دعوة", "الدعوة", "داعية", "محاضرة", "خطبة", "نصيحة"]],
  ["biography", ["قصة", "ترجمة", "تراجم", "العلماء", "الإمام", "أعلام"]],
];

function classify(title, known) {
  const scores = [];
  for (const [topic, words] of TOPIC_WORDS) {
    if (!known.has(topic) || !words.length) continue;
    let s = 0;
    for (const w of words) if (title.includes(w)) s += w.length > 5 ? 3 : 1;
    if (s > 0) scores.push([topic, s]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  return scores.length ? scores.slice(0, 3).map(([t]) => t) : ["general"];
}

/**
 * Pull videos out of a browse response. YouTube moved playlists from
 * playlistVideoRenderer to lockupViewModel; both are read so either shape works.
 */
function extractVideos(data) {
  const out = [];
  for (const r of findAll(data, "playlistVideoRenderer")) {
    out.push({
      id: r.videoId,
      title: textOf(r.title),
      durationSeconds: seconds(r.lengthText?.simpleText ?? textOf(r.lengthText)) || Number(r.lengthSeconds) || 0,
      rel: textOf(r.videoInfo).split("•").pop()?.trim() ?? "",
    });
  }
  for (const l of findAll(data, "lockupViewModel")) {
    if (l?.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO" || !l.contentId) continue;
    const badges = findAll(l.contentImage, "thumbnailBadgeViewModel");
    const time = badges.map((b) => b?.text).find((t) => typeof t === "string" && /^\d+(:\d{2}){1,2}$/.test(t));
    const parts = findAll(l.metadata, "metadataParts").flat().map((p) => p?.text?.content).filter((t) => typeof t === "string");
    out.push({
      id: l.contentId,
      title: l.metadata?.lockupMetadataViewModel?.title?.content ?? "",
      durationSeconds: seconds(time),
      rel: parts.find((t) => /قبل|ago|منذ/.test(t)) ?? "",
    });
  }
  return out;
}

async function newForChannel(ch, knownIds) {
  const uploads = `VL${"UU" + ch.youtubeChannelId.slice(2)}`;
  const found = [];
  let data = await post({ context: IT_CONTEXT, browseId: uploads });
  for (let page = 0; page < MAX_PAGES && data; page += 1) {
    let fresh = 0;
    for (const v of extractVideos(data)) {
      if (!v.id || knownIds.has(v.id)) continue;
      fresh += 1;
      found.push(v);
    }
    // Uploads come newest-first, so a page with nothing new means everything
    // after it is already in the library.
    if (fresh === 0) break;
    const token = continuation(data);
    if (!token) break;
    await delay(400);
    data = await post({ context: IT_CONTEXT, continuation: token });
  }
  return found;
}

const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
const knownIds = new Set((db.videos ?? []).map((v) => v.youtubeId ?? v.id));
const topicIds = new Set((db.topics ?? []).map((t) => t.id));
const before = db.videos.length;
let added = 0;
let shorts = 0;
const report = [];

for (const ch of db.channels) {
  if (!ch.youtubeChannelId) continue;
  process.stdout.write(`${ch.displayName ?? ch.id}: `);
  let fresh = [];
  try {
    fresh = await newForChannel(ch, knownIds);
  } catch (e) {
    console.log(`FAILED (${e.message}) — left unchanged`);
    continue;
  }
  const times = fresh.length ? await rssTimes(ch.youtubeChannelId) : new Map();
  const course = db.courses.find((c) => c.id === `${ch.id}-uploads`);
  let n = 0;
  for (const v of fresh) {
    if (!v.title || v.durationSeconds <= 0) continue; // live, premiere, or removed
    const rec = {
      id: v.id,
      youtubeId: v.id,
      channelId: ch.id,
      courseIds: [`${ch.id}-uploads`],
      topicIds: classify(v.title, topicIds),
      title: v.title,
      description: "",
      durationSeconds: v.durationSeconds,
      thumbnail: `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
      publishedAt: times.get(v.id) ?? relativeToISO(v.rel),
    };
    db.videos.push(rec);
    knownIds.add(v.id);
    course?.videoIds.unshift(v.id);
    n += 1;
    if (v.durationSeconds <= 180) shorts += 1;
  }
  added += n;
  report.push([ch.id, n]);
  console.log(`${n} new`);
  await delay(600);
}

console.log(`\n+${added} videos (${shorts} are shorts) — library ${before} -> ${db.videos.length}`);
if (DRY) {
  console.log("dry run: nothing written");
  process.exit(0);
}
if (added === 0) {
  console.log("nothing new: files untouched");
  process.exit(0);
}

db.syncedAt = new Date().toISOString();
db.generatedAt = db.syncedAt;
const tmp = `${DB_FILE}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(db), "utf8");
fs.renameSync(tmp, DB_FILE);
const r = spawnSync(process.execPath, [path.resolve(__dirname, "build-shorts-index.mjs")], { stdio: "inherit" });
process.exit(r.status ?? 0);
