/**
 * sync-othman-alkamees.mjs
 *
 * Full deep-sync for عثمان الخميس channel:
 *   1. Fetch ALL uploads (no cap — paginate until empty)
 *   2. Scrape /playlists page — find new/empty playlists
 *   3. Fetch every playlist video with full pagination
 *   4. Re-classify all videos with Othman-specific enhanced keywords
 *   5. Rebuild generated topic-bucket courses
 *   6. Write back to video-library.json
 *
 * Run: node tools/scripts/sync-othman-alkamees.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../../public/data/video-library.json");

const CHANNEL = {
  id: "othman-alkamees",
  channelId: "UCWjCSGhmSGu0VLf2mPFS0Kg",
  displayName: "عثمان الخميس",
  handle: "@othmanalkamees",
  accent: "#34d399",
  playlistsUrl: "https://www.youtube.com/@othmanalkamees/playlists",
};

// Uploads playlist: UC → UU
const UPLOADS_PLAYLIST_ID = "UU" + CHANNEL.channelId.slice(2);

// ─── Innertube ────────────────────────────────────────────────────────────────

const IT_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const IT_BASE = "https://www.youtube.com/youtubei/v1";
const IT_CTX = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240417.00.00",
    hl: "ar",
    gl: "SA",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    timeZone: "Asia/Riyadh",
  },
};
const IT_HDRS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "X-YouTube-Client-Name": "1",
  "X-YouTube-Client-Version": "2.20240417.00.00",
  Origin: "https://www.youtube.com",
  Referer: "https://www.youtube.com/",
  "Accept-Language": "ar,en-US;q=0.9",
};
const HTML_HDRS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ar,en-US;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 400));
}

async function itPost(endpoint, body, retries = 4) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(`${IT_BASE}/${endpoint}?prettyPrint=false&key=${IT_KEY}`, {
        method: "POST",
        headers: IT_HDRS,
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        console.warn(`    ⏳ Rate limited — waiting ${i * 6}s…`);
        await delay(i * 6000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return await res.json();
    } catch (e) {
      if (i === retries) throw e;
      await delay(i * 2500);
    }
  }
}

async function itBrowse(browseId) {
  return itPost("browse", { context: IT_CTX, browseId });
}

async function itContinue(token) {
  return itPost("browse", { context: IT_CTX, continuation: token });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findAll(obj, key, out = []) {
  if (Array.isArray(obj)) { obj.forEach((i) => findAll(i, key, out)); return out; }
  if (obj && typeof obj === "object") {
    if (key in obj) out.push(obj[key]);
    for (const v of Object.values(obj)) findAll(v, key, out);
  }
  return out;
}

function extractText(n) {
  if (!n) return "";
  if (typeof n === "string") return n;
  if (n.runs) return n.runs.map((r) => r.text || "").join("");
  if (n.simpleText) return n.simpleText;
  if (n.content) return String(n.content);
  return "";
}

function parseDuration(text) {
  if (!text) return 0;
  const s = String(text).trim();
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function bestThumb(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function findToken(data) {
  for (const cmd of findAll(data, "continuationCommand")) {
    if (typeof cmd?.token === "string" && cmd.token.length > 10) return cmd.token;
  }
  for (const n of findAll(data, "nextContinuationData")) {
    if (n?.continuation) return n.continuation;
  }
  return null;
}

function extractJsonAt(html, offset) {
  let depth = 0, i = offset, inStr = false, esc = false;
  while (i < html.length) {
    const ch = html[i];
    if (esc) { esc = false; i++; continue; }
    if (ch === "\\" && inStr) { esc = true; i++; continue; }
    if (ch === '"') inStr = !inStr;
    if (!inStr) {
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return html.slice(offset, i + 1); }
    }
    i++;
  }
  return html.slice(offset);
}

function extractVideos(data) {
  const videos = [];
  const seen = new Set();

  function parseR(r, pos) {
    const videoId = r.videoId;
    if (!videoId || seen.has(videoId)) return;
    seen.add(videoId);
    const title = extractText(r.title);
    if (!title) return;
    const durText = r.lengthText?.simpleText || extractText(r.lengthText) || "";
    const durationSeconds =
      typeof r.lengthSeconds === "number" ? r.lengthSeconds
      : typeof r.lengthSeconds === "string" ? parseInt(r.lengthSeconds, 10) || parseDuration(durText)
      : parseDuration(String(durText));
    const thumbs = r.thumbnail?.thumbnails || r.thumbnails?.[0]?.thumbnails || [];
    const thumb = thumbs.find((t) => t.width >= 320) || thumbs.slice(-1)[0] || null;
    const posRaw = r.index?.simpleText ?? r.index?.runs?.[0]?.text;
    const position = posRaw != null ? parseInt(posRaw, 10) - 1 || 0 : pos;
    videos.push({ videoId, title, durationSeconds: durationSeconds || 0, thumbnail: thumb?.url || bestThumb(videoId), position });
  }

  for (const r of findAll(data, "playlistVideoRenderer")) parseR(r, videos.length);
  if (videos.length > 0) return videos;
  for (const r of findAll(data, "playlistPanelVideoRenderer")) parseR(r, videos.length);
  if (videos.length > 0) return videos;
  for (const ri of findAll(data, "richItemRenderer")) {
    const vr = ri.content?.videoRenderer || ri.content?.reelItemRenderer;
    if (vr?.videoId) parseR(vr, videos.length);
  }
  if (videos.length > 0) return videos;
  for (const r of findAll(data, "videoRenderer")) parseR(r, videos.length);
  return videos;
}

async function fetchAllPlaylistVideos(playlistId, label = "") {
  const all = [];
  const seen = new Set();
  console.log(`  ↳ Fetching [${playlistId}] "${label}" (unlimited)…`);

  let data;
  try { data = await itBrowse("VL" + playlistId); }
  catch (e) { console.warn(`    ⚠ Browse failed: ${e.message}`); }

  if (data) {
    for (const v of extractVideos(data)) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
    let token = findToken(data);
    let pages = 0;
    while (token && pages < 200) {
      await delay(650);
      let cont;
      try { cont = await itContinue(token); } catch (e) { console.warn(`    ⚠ page ${pages}: ${e.message}`); break; }
      const more = extractVideos(cont);
      if (more.length === 0) break;
      for (const v of more) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
      token = findToken(cont);
      pages++;
      if (pages % 5 === 0) console.log(`    … page ${pages}, ${all.length} videos so far`);
    }
  }

  // HTML fallback
  if (all.length === 0) {
    console.log(`    ↳ Innertube got 0 — trying HTML…`);
    try {
      const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, { headers: HTML_HDRS });
      const html = await res.text();
      const marker = "var ytInitialData = ";
      const start = html.indexOf(marker);
      if (start !== -1) {
        const pd = JSON.parse(extractJsonAt(html, start + marker.length));
        for (const v of extractVideos(pd)) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
        let tok = findToken(pd);
        let pg = 0;
        while (tok && pg < 100) {
          await delay(900);
          let c2; try { c2 = await itContinue(tok); } catch { break; }
          const m2 = extractVideos(c2);
          if (m2.length === 0) break;
          for (const v of m2) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
          tok = findToken(c2); pg++;
        }
      }
    } catch (e) { console.warn(`    ⚠ HTML fallback: ${e.message}`); }
  }

  console.log(`    ✓ ${all.length} videos`);
  return all;
}

async function scrapePlaylistsPage(url) {
  console.log(`  ↳ Scraping: ${url}`);
  const res = await fetch(url, { headers: HTML_HDRS });
  const html = await res.text();
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start === -1) { console.warn("  ⚠ No ytInitialData"); return []; }
  let data;
  try { data = JSON.parse(extractJsonAt(html, start + marker.length)); }
  catch (e) { console.warn(`  ⚠ JSON parse: ${e.message}`); return []; }

  const results = [];
  const seen = new Set();

  function push(pid, title, videoCount, thumb) {
    if (!pid || seen.has(pid)) return;
    if (pid === "LL" || pid === "WL" || pid.startsWith("UU")) return;
    seen.add(pid);
    results.push({ playlistId: pid, title: title || "قائمة", videoCount: videoCount || 1, thumbnail: thumb || null });
  }

  for (const lv of findAll(data, "lockupViewModel")) {
    let pid = lv.entityId || lv.contentId;
    if (!pid) { const pids = findAll(lv, "playlistId").filter(p => typeof p === "string" && p.length > 3); pid = pids[0]; }
    if (!pid) continue;
    if (pid.startsWith("VL")) pid = pid.slice(2);
    const title = extractText(lv.metadata?.lockupMetadataViewModel?.title || lv.title);
    const countTexts = findAll(lv, "text").map(String).filter(t => /^\d+$/.test(t.trim()));
    const videoCount = countTexts.length > 0 ? parseInt(countTexts[0]) : 1;
    const thumbs = findAll(lv, "thumbnails").flat().filter(t => t?.url);
    push(pid, title, videoCount, thumbs.slice(-1)[0]?.url || null);
  }

  for (const p of findAll(data, "gridPlaylistRenderer")) {
    if (!p.playlistId) continue;
    const countText = p.videoCountText?.runs?.[0]?.text || p.videoCountShortText?.simpleText || "";
    push(p.playlistId, extractText(p.title), parseInt(countText.replace(/[^0-9]/g, "")) || 1, p.thumbnail?.thumbnails?.slice(-1)[0]?.url || null);
  }

  for (const ri of findAll(data, "richItemRenderer")) {
    const pr = ri.content?.playlistRenderer || ri.content?.gridPlaylistRenderer;
    if (!pr?.playlistId) continue;
    const countText = pr.videoCountText?.simpleText || "";
    push(pr.playlistId, extractText(pr.title), parseInt(countText.replace(/[^0-9]/g, "")) || 1, null);
  }

  for (const p of findAll(data, "playlistRenderer")) {
    if (!p.playlistId) continue;
    const countText = p.videoCountText?.simpleText || "";
    push(p.playlistId, extractText(p.title), parseInt(countText.replace(/[^0-9]/g, "")) || 1, null);
  }

  console.log(`  ✓ Found ${results.length} playlists`);
  return results;
}

// ─── Othman Al-Khamees specific classification ───────────────────────────────
//
// Priority order matters — first match wins for primary topic.
// He specialises in: hadith sciences, fiqh, aqeedah (Salafi/Athari),
// Sahaba biographies, refutation of Shia/Rafida/innovators, tafseer.

const KEYWORD_MAP = [
  // Refutations / anti-innovation — very specific to this channel
  ["anti-innovation", [
    "رافضة","شيعة","الشيعة","صفوي","الصفوية","متشيع",
    "أهل البيت والأصحاب","الصحابة والأصحاب",
    "ناصبي","خوارج","معتزلة","أشاعرة","صوفي","صوفية",
    "بدعة","بدع","ابتداع","محدثات",
    "رد على","الرد على","نقد","دحض","تفنيد","مناظرة",
    "شبهة","شبهات","إشكال","اعتراض",
    "الغلو","القبور","التبرك","الاستغاثة",
    "الإباضية","الخوارج الجدد",
  ]],

  // Aqeedah
  ["aqeedah", [
    "عقيدة","توحيد","الأسماء والصفات","صفات الله","أسماء الله",
    "إيمان","الإيمان","القدر","القضاء","اعتقاد","أصول الإيمان",
    "الأسماء الحسنى","التوحيد","الصفات","تجسيم","تأويل",
    "أهل السنة","السنة والجماعة","الفرقة الناجية",
    "الولاء والبراء","التكفير","الإرجاء",
    "قواعد في التوحيد",
  ]],

  // Fiqh — very strong topic for him (Bukhari sharh, daleeel al-talib etc.)
  ["fiqh", [
    "فقه","أحكام","حكم","حلال","حرام","فتوى","فتاوى",
    "صلاة","وضوء","طهارة","صيام","صوم","زكاة","حج","عمرة",
    "نكاح","طلاق","خلع","عدة","مهر",
    "بيع","شراء","ربا","معاملات","إجارة","وقف","هبة",
    "دليل الطالب","منهج السالكين","عمدة الطالب",
    "كتاب الصلاة","كتاب الصيام","كتاب الزكاة","كتاب الحج",
    "كتاب البيوع","كتاب النكاح","كتاب الطلاق",
    "كتاب العتق","كتاب الوصايا","كتاب اللقطة","كتاب الرهن",
    "كتاب الوكالة","أسئلة تهم كل صائم","فقه الحج",
    "صفة الوضوء","صفة وضوء",
  ]],

  // Hadith sciences — second signature topic
  ["hadith", [
    "حديث","السنة","مصطلح الحديث","علوم الحديث",
    "البخاري","صحيح البخاري","مسلم","صحيح مسلم",
    "سنن","الأربعين","شرح حديث","درجة الحديث",
    "رواة","سند","متن","إسناد","جرح","تعديل",
    "ضعيف","موضوع","حسن","صحيح","تصحيح","تضعيف",
    "ابن عثيمين","مختصر صحيح البخاري",
    "مجالس سماع","سماع","رواية",
  ]],

  // Tafseer
  ["tafseer", [
    "تفسير","تفسير سورة","شرح سورة",
    "سورة النحل","سورة الفاتحة","سورة المائدة","سورة البينة",
    "سورة القدر","سورة الشرح","سورة التين","سورة الفيل",
    "سورة العلق","سورة البلد","سورة الشمس","سورة الليل",
    "تدبر","تأمل","آيات","مفاتح الطلب",
  ]],

  // Quran
  ["quran", [
    "قرآن","القرآن","تلاوة","تجويد","حفظ","علوم القرآن",
    "مصحف","تحفيظ","ختمة","وقف","ابتداء",
  ]],

  // Seerah (Prophet's biography)
  ["seerah", [
    "سيرة النبي","سيرة المصطفى","سيرة الرسول","السيرة النبوية",
    "غزوة","بدر","أحد","الخندق","الفتح","تبوك","حنين",
    "المغازي","الهجرة","ولادة النبي","وفاة النبي",
    "المعراج","الإسراء",
  ]],

  // Biographies (Sahaba, scholars) — requires specific proper nouns, NOT generic "الشيخ"/"الإمام"
  ["biography", [
    "الصديقة أم المؤمنين","أم المؤمنين عائشة","أبو بكر الصديق",
    "عمر بن الخطاب","عثمان بن عفان","علي بن أبي طالب",
    "دورة آل البيت والأصحاب",
    "ترجمة","تراجم","سيرة الصحابي",
    "ابن تيمية","ابن القيم","ابن كثير","ابن حجر","الألباني",
    "ابن عثيمين","الفوزان","ابن باز",
    "قصص الأنبياء","الأنبياء والمرسلين","نبي الله","رسول الله إبراهيم",
    "قصة موسى","قصة عيسى","قصة إبراهيم",
  ]],

  // Tazkiyah
  ["tazkiyah", [
    "تزكية","تربية روحية","التوبة","الإخلاص","التقوى",
    "الزهد","الورع","الخشوع","القلب","أمراض القلوب",
    "الغيبة","النميمة","الحسد","الكبر","الرياء",
  ]],

  // Family
  ["family", [
    "الأسرة","زوج","زوجة","تربية الأبناء","تربية الأولاد",
    "المرأة","حقوق الزوجة","العلاقة الزوجية","تربية",
    "النشأة","الأبناء","الأمومة","الأبوة",
  ]],

  // Daawah / lectures
  ["daawah", [
    "دعوة","الدعوة إلى الله","خطبة","خطب الجمعة","محاضرة",
    "درس","حلقة","لقاء","مجلس","نصيحة","موعظة",
  ]],
];

// Determine topics for a video given its title (and optionally playlist title)
function classify(title, playlistTitle = "") {
  const text = (title + " " + playlistTitle).toLowerCase();
  const scores = {};
  for (const [topic, words] of KEYWORD_MAP) {
    let score = 0;
    for (const w of words) {
      if (text.includes(w)) score += w.length > 6 ? 4 : w.length > 3 ? 2 : 1;
    }
    if (score > 0) scores[topic] = score;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return ["general"];
  // Return top 3 topics max, but always include if strong match
  return sorted.slice(0, 3).map(([t]) => t);
}

// ─── Topic-bucket virtual courses ────────────────────────────────────────────

const TOPIC_COURSES = [
  { suffix: "topic-anti-innovation", topicId: "anti-innovation", title: "الردود والعقيدة — عثمان الخميس", order: 1010 },
  { suffix: "topic-aqeedah",         topicId: "aqeedah",         title: "العقيدة — عثمان الخميس",           order: 1020 },
  { suffix: "topic-fiqh",            topicId: "fiqh",            title: "الفقه — عثمان الخميس",             order: 1030 },
  { suffix: "topic-hadith",          topicId: "hadith",          title: "الحديث — عثمان الخميس",            order: 1040 },
  { suffix: "topic-tafseer",         topicId: "tafseer",         title: "التفسير — عثمان الخميس",           order: 1050 },
  { suffix: "topic-quran",           topicId: "quran",           title: "القرآن — عثمان الخميس",            order: 1060 },
  { suffix: "topic-seerah",          topicId: "seerah",          title: "السيرة النبوية — عثمان الخميس",    order: 1070 },
  { suffix: "topic-biography",       topicId: "biography",       title: "تراجم — عثمان الخميس",             order: 1080 },
  { suffix: "topic-tazkiyah",        topicId: "tazkiyah",        title: "التزكية — عثمان الخميس",           order: 1090 },
  { suffix: "topic-family",          topicId: "family",          title: "الأسرة — عثمان الخميس",            order: 1100 },
  { suffix: "topic-daawah",          topicId: "daawah",          title: "الدعوة — عثمان الخميس",            order: 1110 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀  Deep sync: عثمان الخميس — full pull (no cap)\n");

  const db = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  const videosMap = new Map(db.videos.map((v) => [v.id, v]));
  const coursesMap = new Map(db.courses.map((c) => [c.id, c]));

  const chId = CHANNEL.id;
  const existingChannelCourses = db.courses.filter((c) => c.channelId === chId && !c.isGenerated);
  let orderCounter = (existingChannelCourses.length + 1) * 100 + 2000;

  // ── Step 1: Full uploads pull ─────────────────────────────────────────────
  console.log("📥 Step 1: Fetching ALL uploads…");
  const uploadsVideos = await fetchAllPlaylistVideos(UPLOADS_PLAYLIST_ID, "آخر فيديوهات عثمان الخميس");

  let newFromUploads = 0;
  for (let i = 0; i < uploadsVideos.length; i++) {
    const v = uploadsVideos[i];
    const uploadsId = `${chId}-uploads`;
    if (!videosMap.has(v.videoId)) {
      videosMap.set(v.videoId, {
        id: v.videoId, youtubeId: v.videoId, channelId: chId,
        courseIds: [uploadsId], topicIds: classify(v.title),
        title: v.title, description: "", durationSeconds: v.durationSeconds,
        thumbnail: v.thumbnail, publishedAt: null,
        youtubeUrl: `https://youtu.be/${v.videoId}`, position: i,
      });
      newFromUploads++;
    } else {
      const ex = videosMap.get(v.videoId);
      if (!ex.courseIds.includes(uploadsId)) ex.courseIds.push(uploadsId);
      if (!ex.durationSeconds && v.durationSeconds) ex.durationSeconds = v.durationSeconds;
      if (v.thumbnail && (!ex.thumbnail || ex.thumbnail.includes("mqdefault"))) ex.thumbnail = v.thumbnail;
    }
  }

  const uploadsVideoIds = uploadsVideos.map((v) => v.videoId);
  const uploadsId = `${chId}-uploads`;
  const uploadsCourse = coursesMap.get(uploadsId);
  if (uploadsCourse) {
    uploadsCourse.videoIds = uploadsVideoIds;
    uploadsCourse.thumbnail = videosMap.get(uploadsVideoIds[0])?.thumbnail || uploadsCourse.thumbnail;
    const idx = db.courses.findIndex((c) => c.id === uploadsId);
    if (idx !== -1) db.courses[idx] = uploadsCourse;
  } else {
    const newUploads = {
      id: uploadsId, channelId: chId,
      title: "آخر فيديوهات عثمان الخميس",
      description: `أحدث ${uploadsVideoIds.length} فيديو من قناة عثمان الخميس`,
      topicIds: ["general"], videoIds: uploadsVideoIds,
      thumbnail: videosMap.get(uploadsVideoIds[0])?.thumbnail || null,
      order: 100, isGenerated: false, isUploads: true,
    };
    db.courses.push(newUploads);
    coursesMap.set(uploadsId, newUploads);
  }
  console.log(`  ✓ Uploads: ${uploadsVideos.length} total (${newFromUploads} new)\n`);

  // ── Step 2: Scrape playlists page ─────────────────────────────────────────
  console.log("📋 Step 2: Scraping playlists page…");
  let allPlaylists = [];
  try { allPlaylists = await scrapePlaylistsPage(CHANNEL.playlistsUrl); }
  catch (e) { console.warn(`  ⚠ Scrape failed: ${e.message}`); }

  // Check which playlists are new or under-populated
  const toFetch = [];
  for (const pl of allPlaylists) {
    const courseId = `${chId}-${pl.playlistId}`;
    const existing = coursesMap.get(courseId);
    if (!existing) {
      console.log(`  + NEW:   [${pl.playlistId}] "${pl.title.slice(0, 55)}" (${pl.videoCount} vids)`);
      toFetch.push({ ...pl, courseId, isNew: true });
    } else {
      const currentCount = existing.videoIds?.length || 0;
      const expectedCount = pl.videoCount;
      // Re-fetch if we have <70% of expected videos
      if (currentCount < Math.max(2, expectedCount * 0.7)) {
        console.log(`  ↺ GROW: "${pl.title.slice(0, 45)}" (have ${currentCount}, expect ~${expectedCount})`);
        toFetch.push({ ...pl, courseId, isNew: false });
      }
    }
  }
  console.log(`  → ${toFetch.length} playlists to fetch/grow\n`);

  // ── Step 3: Fetch missing/under-populated playlists ───────────────────────
  if (toFetch.length > 0) {
    console.log("📥 Step 3: Fetching playlist videos…");
    for (const pl of toFetch) {
      await delay(900);
      const videos = await fetchAllPlaylistVideos(pl.playlistId, pl.title);
      if (videos.length === 0) { console.log(`    ✗ "${pl.title.slice(0, 50)}" — 0 videos`); continue; }

      const topicIds = classify(pl.title);
      const videoIds = [];

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!videosMap.has(v.videoId)) {
          videosMap.set(v.videoId, {
            id: v.videoId, youtubeId: v.videoId, channelId: chId,
            courseIds: [pl.courseId], topicIds: classify(v.title, pl.title),
            title: v.title, description: "", durationSeconds: v.durationSeconds,
            thumbnail: v.thumbnail, publishedAt: null,
            youtubeUrl: `https://youtu.be/${v.videoId}`, position: i,
          });
        } else {
          const ex = videosMap.get(v.videoId);
          if (!ex.courseIds.includes(pl.courseId)) ex.courseIds.push(pl.courseId);
          if (!ex.durationSeconds && v.durationSeconds) ex.durationSeconds = v.durationSeconds;
          if (v.thumbnail && (!ex.thumbnail || ex.thumbnail.includes("mqdefault"))) ex.thumbnail = v.thumbnail;
          // Improve classification using playlist context
          const improved = classify(ex.title, pl.title);
          if (improved[0] !== "general") ex.topicIds = improved;
        }
        videoIds.push(v.videoId);
      }

      const course = {
        id: pl.courseId, channelId: chId, title: pl.title,
        description: `${videoIds.length} درس • قناة ${CHANNEL.displayName}`,
        playlistId: pl.playlistId, topicIds, videoIds,
        thumbnail: pl.thumbnail || videosMap.get(videoIds[0])?.thumbnail || null,
        order: orderCounter++, isGenerated: false,
      };

      if (coursesMap.has(pl.courseId)) {
        const idx = db.courses.findIndex((c) => c.id === pl.courseId);
        if (idx !== -1) db.courses[idx] = course;
      } else {
        db.courses.push(course);
      }
      coursesMap.set(pl.courseId, course);
      console.log(`    ✓ "${pl.title.slice(0, 55)}" — ${videoIds.length} videos`);
    }
  }

  // ── Step 4: Re-classify ALL channel videos ────────────────────────────────
  console.log("\n🏷  Step 4: Re-classifying all videos with playlist context…");
  // Build video → playlist titles map for better context
  const videoPlTitles = new Map();
  for (const c of db.courses) {
    if (c.channelId !== chId || c.isGenerated || c.isUploads) continue;
    for (const vid of (c.videoIds || [])) {
      if (!videoPlTitles.has(vid)) videoPlTitles.set(vid, []);
      videoPlTitles.get(vid).push(c.title);
    }
  }
  // Also from videosMap courseIds
  for (const v of videosMap.values()) {
    if (v.channelId !== chId) continue;
    for (const cid of (v.courseIds || [])) {
      const c = coursesMap.get(cid);
      if (c && !c.isGenerated && !c.isUploads) {
        if (!videoPlTitles.has(v.id)) videoPlTitles.set(v.id, []);
        videoPlTitles.get(v.id).push(c.title);
      }
    }
  }

  let reclassified = 0;
  for (const v of videosMap.values()) {
    if (v.channelId !== chId) continue;
    const plContext = (videoPlTitles.get(v.id) || []).join(" ");
    const newTopics = classify(v.title, plContext);
    if (JSON.stringify(newTopics) !== JSON.stringify(v.topicIds)) { v.topicIds = newTopics; reclassified++; }
  }
  console.log(`  ✓ Reclassified ${reclassified} videos`);

  // ── Step 5: Rebuild topic-bucket virtual courses ──────────────────────────
  console.log("\n📁 Step 5: Rebuilding topic buckets…");
  const chVideos = Array.from(videosMap.values()).filter((v) => v.channelId === chId);

  for (const tc of TOPIC_COURSES) {
    const courseId = `${chId}-${tc.suffix}`;
    const matchingVideos = chVideos.filter((v) => v.topicIds.includes(tc.topicId));
    for (const v of matchingVideos) { if (!v.courseIds.includes(courseId)) v.courseIds.push(courseId); }
    const videoIds = matchingVideos.map((v) => v.id);

    const course = {
      id: courseId, channelId: chId, title: tc.title,
      description: `${videoIds.length} فيديو مصنف ضمن موضوع ${tc.title.split(" — ")[0]}`,
      topicIds: [tc.topicId], videoIds,
      thumbnail: videosMap.get(videoIds[0])?.thumbnail || null,
      order: tc.order, isGenerated: true,
    };

    if (coursesMap.has(courseId)) {
      const idx = db.courses.findIndex((c) => c.id === courseId);
      if (idx !== -1) db.courses[idx] = course;
    } else {
      db.courses.push(course);
    }
    coursesMap.set(courseId, course);
    console.log(`  ✓ ${tc.title}: ${videoIds.length} videos`);
  }

  // ── Step 6: Remove stale old topic buckets that no longer have a slot ─────
  // (e.g. old "السيرة" bucket that was replaced by "سيرة" + "biography")
  const validBucketIds = new Set(TOPIC_COURSES.map(tc => `${chId}-${tc.suffix}`));
  const staleGeneratedIds = db.courses
    .filter(c => c.channelId === chId && c.isGenerated && !validBucketIds.has(c.id))
    .map(c => c.id);
  if (staleGeneratedIds.length > 0) {
    console.log(`\n🗑  Removing ${staleGeneratedIds.length} stale generated courses: ${staleGeneratedIds.join(", ")}`);
    db.courses = db.courses.filter(c => !staleGeneratedIds.includes(c.id));
    for (const v of videosMap.values()) {
      if (v.channelId === chId) {
        v.courseIds = (v.courseIds || []).filter(cid => !staleGeneratedIds.includes(cid));
      }
    }
  }

  // ── Step 7: Write back ────────────────────────────────────────────────────
  db.videos = Array.from(videosMap.values());

  const chVidsFinal = db.videos.filter((v) => v.channelId === chId);
  const chCoursesFinal = db.courses.filter((c) => c.channelId === chId);
  const chRealCoursesFinal = chCoursesFinal.filter((c) => !c.isGenerated);

  console.log("\n📊 النتائج النهائية لعثمان الخميس:");
  console.log(`   فيديوهات فريدة: ${chVidsFinal.length}`);
  console.log(`   دورات حقيقية:   ${chRealCoursesFinal.length}`);
  console.log(`   مجموع الدورات:  ${chCoursesFinal.length}`);
  console.log(`   بدون صورة:     ${chVidsFinal.filter((v) => !v.thumbnail).length}`);
  console.log(`   بدون مدة:      ${chVidsFinal.filter((v) => !v.durationSeconds).length}`);

  const topicSummary = TOPIC_COURSES.map(tc => {
    const c = db.courses.find(c => c.id === `${chId}-${tc.suffix}`);
    return `${tc.title.split(" — ")[0]}: ${c?.videoIds?.length || 0}`;
  }).join(" | ");
  console.log(`\n   التصنيف: ${topicSummary}`);

  console.log(`\n   إجمالي كل القنوات:`);
  console.log(`   فيديو: ${db.videos.length} | دورات: ${db.courses.length}`);

  db.syncedAt = new Date().toISOString();
  const chObj = db.channels.find((c) => c.id === chId);
  if (chObj) chObj.syncedAt = new Date().toISOString();

  fs.writeFileSync(OUT_FILE, JSON.stringify(db, null, 2), "utf8");
  console.log(`\n✅  كُتب: ${OUT_FILE}`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
