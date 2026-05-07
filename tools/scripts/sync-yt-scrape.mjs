/**
 * sync-yt-scrape.mjs
 * Fetches real YouTube channel data WITHOUT a YouTube API key.
 * Uses YouTube's internal ytInitialData JSON embedded in every channel page.
 *
 * Run:
 *   node tools/scripts/sync-yt-scrape.mjs
 *
 * What it does:
 *   1. Fetches @channel/videos page → gets recent uploads + channel meta
 *   2. Fetches @channel/playlists  → gets playlist (course) data
 *   3. Fetches each playlist page  → gets ordered video list
 *   4. Writes public/data/video-library.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../../public/data/video-library.json");

// ─── Config ─────────────────────────────────────────────────────────────────

const CHANNELS = [
  { id: "alaa-hamed",      handle: "@3laaHamed",          displayName: "علاء حامد",          accent: "#fbbf24", order: 1 },
  { id: "amgad-samir",     handle: "@amgad_samir",        displayName: "أمجد سمير",          accent: "#38bdf8", order: 2 },
  { id: "haitham-talaat",  handle: "@Dr.Haitham_Talaat",  displayName: "د. هيثم طلعت",       accent: "#a78bfa", order: 3 },
  { id: "anti-shubohat",   handle: "@AntiShubohat",       displayName: "مقاومة الشبهات",     accent: "#fb7185", order: 4 },
  { id: "anti-shubohat-2", handle: "@AntiShubohat.2",     displayName: "مقاومة الشبهات ٢",   accent: "#f97316", order: 5 },
  { id: "othman-alkamees", handle: "@othmanalkamees",     displayName: "عثمان الخميس",       accent: "#34d399", order: 6 },
];

const TOPICS = [
  { id: "aqeedah",             title: "العقيدة",       icon: "◇", accent: "#a78bfa", description: "الإيمان، التوحيد، وأصول الاعتقاد." },
  { id: "anti-shubuhat",       title: "الشبهات",       icon: "⚑", accent: "#fb7185", description: "الردود الفكرية والمنهجية على الشبهات." },
  { id: "fiqh",                title: "الفقه",         icon: "§", accent: "#34d399", description: "أحكام العبادات والمعاملات." },
  { id: "quran",               title: "القرآن",        icon: "▣", accent: "#fbbf24", description: "علوم القرآن والتلاوة والتدبر." },
  { id: "tafseer",             title: "التفسير",       icon: "☼", accent: "#f59e0b", description: "شرح الآيات والسور." },
  { id: "hadith",              title: "الحديث",        icon: "◈", accent: "#38bdf8", description: "شرح الأحاديث والسنن." },
  { id: "seerah",              title: "السيرة",        icon: "✦", accent: "#c084fc", description: "السيرة النبوية والتاريخ الإسلامي." },
  { id: "daawah",              title: "الدعوة",        icon: "↗", accent: "#60a5fa", description: "مهارات الدعوة والتربية." },
  { id: "youth",               title: "الشباب",        icon: "✧", accent: "#2dd4bf", description: "موضوعات الشباب والبناء النفسي." },
  { id: "family",              title: "الأسرة",        icon: "♡", accent: "#f472b6", description: "البيت والتربية والعلاقات." },
  { id: "comparative-religion",title: "مقارنة أديان",  icon: "⌁", accent: "#818cf8", description: "حوارات وردود ومقارنات منهجية." },
  { id: "atheism",             title: "الإلحاد",       icon: "?", accent: "#f87171", description: "نقد الإلحاد والمادية والشبهات المعاصرة." },
  { id: "biography",           title: "تراجم",         icon: "※", accent: "#eab308", description: "سير العلماء والدعاة والشخصيات." },
  { id: "general",             title: "عام",           icon: "•", accent: "#94a3b8", description: "مواد متنوعة تنتظر التصنيف الدقيق." },
];

const KEYWORDS = [
  ["anti-shubuhat",       ["شبهة", "شبهات", "الرد", "يرد", "ردود", "مناظرة", "رد على"]],
  ["atheism",             ["إلحاد", "ملحد", "الملاحدة", "داروين", "تطور", "مادية", "لا يؤمن"]],
  ["comparative-religion",["نصرانية", "مسيحية", "كتاب مقدس", "إنجيل", "يهود", "أديان", "مقارنة"]],
  ["aqeedah",             ["عقيدة", "توحيد", "إيمان", "أسماء وصفات", "قدر", "الصحابة", "أصول"]],
  ["fiqh",                ["فقه", "حكم", "أحكام", "صلاة", "صيام", "زكاة", "حج", "وضوء", "فتوى", "طهارة"]],
  ["tafseer",             ["تفسير", "تدبر", "سورة", "آية"]],
  ["quran",               ["قرآن", "تلاوة", "تجويد", "مصحف", "حفظ"]],
  ["hadith",              ["حديث", "صحيح", "البخاري", "مسلم", "السنة", "أربعون"]],
  ["seerah",              ["سيرة", "النبي", "الرسول", "غزوة", "صحابي", "المغازي"]],
  ["family",              ["زوج", "زوجة", "أبناء", "أسرة", "تربية", "الزواج"]],
  ["youth",               ["شباب", "مراهق", "جامعة", "عادة", "الشاب"]],
  ["daawah",              ["دعوة", "داعية", "نصيحة", "محاضرة", "خطبة"]],
  ["biography",           ["قصة", "ترجمة", "سيرة", "حياة", "تراجم"]],
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classify(text) {
  const lower = String(text).toLowerCase();
  const found = [];
  for (const [topic, words] of KEYWORDS) {
    if (words.some((w) => lower.includes(w))) found.push(topic);
  }
  return found.length ? [...new Set(found)] : ["general"];
}

function slug(value, suffix = "") {
  const base = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return suffix ? `${base}-${suffix}` : base || "item";
}

function iso8601ToSeconds(duration) {
  if (!duration) return 0;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

function bestThumb(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url) {
  await delay(800 + Math.random() * 400);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/**
 * Extract the giant ytInitialData JSON object from a YouTube HTML page.
 * YouTube embeds it as: var ytInitialData = {...};
 */
function extractInitialData(html) {
  // Find the assignment
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start === -1) {
    const marker2 = "window[\"ytInitialData\"] = ";
    const s2 = html.indexOf(marker2);
    if (s2 === -1) return null;
    const json = extractJsonAt(html, s2 + marker2.length);
    try { return JSON.parse(json); } catch { return null; }
  }
  const json = extractJsonAt(html, start + marker.length);
  try { return JSON.parse(json); } catch { return null; }
}

function extractJsonAt(html, offset) {
  let depth = 0;
  let i = offset;
  let inString = false;
  let escaped = false;
  const len = html.length;
  while (i < len) {
    const ch = html[i];
    if (escaped) { escaped = false; i++; continue; }
    if (ch === "\\" && inString) { escaped = true; i++; continue; }
    if (ch === '"') { inString = !inString; }
    if (!inString) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return html.slice(offset, i + 1);
      }
    }
    i++;
  }
  return html.slice(offset);
}

function walkAll(obj, results = []) {
  if (Array.isArray(obj)) { for (const item of obj) walkAll(item, results); return results; }
  if (obj && typeof obj === "object") {
    results.push(obj);
    for (const val of Object.values(obj)) walkAll(val, results);
  }
  return results;
}

function findAll(obj, key) {
  const results = [];
  function recurse(o) {
    if (Array.isArray(o)) { o.forEach(recurse); return; }
    if (o && typeof o === "object") {
      if (key in o) results.push(o[key]);
      Object.values(o).forEach(recurse);
    }
  }
  recurse(obj);
  return results;
}

function extractText(renderer) {
  if (!renderer) return "";
  if (renderer.runs) return renderer.runs.map((r) => r.text || "").join("");
  if (renderer.simpleText) return renderer.simpleText;
  return "";
}

// ─── Channel scraping ────────────────────────────────────────────────────────

async function scrapeChannelMeta(handle) {
  console.log(`  ↳ Fetching channel page: youtube.com/${handle}`);
  const html = await fetchPage(`https://www.youtube.com/${handle}`);
  const data = extractInitialData(html);
  if (!data) { console.warn("    ⚠ Could not parse ytInitialData"); return null; }

  // Extract channel ID from canonical link or metadata
  let channelId = null;
  const canonical = html.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)"/);
  if (canonical) channelId = canonical[1];
  if (!channelId) {
    const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
    if (match) channelId = match[1];
  }

  // Extract subscriber count and avatar
  let avatar = null;
  let description = "";
  let title = handle;

  const avatars = findAll(data, "avatar");
  for (const av of avatars) {
    const thumbs = av?.thumbnails;
    if (thumbs?.length) {
      avatar = thumbs[thumbs.length - 1]?.url || thumbs[0]?.url;
      if (avatar) break;
    }
  }

  const descNodes = findAll(data, "description");
  for (const d of descNodes) {
    const t = extractText(d);
    if (t && t.length > 10) { description = t.slice(0, 300); break; }
  }

  const titleNodes = findAll(data, "title");
  for (const t of titleNodes) {
    const text = extractText(t);
    if (text && text.length > 1 && text.length < 80) { title = text; break; }
  }

  return { channelId, avatar: avatar || null, description, title };
}

/**
 * Scrape /videos tab to get recent uploads (up to ~30).
 */
async function scrapeChannelVideos(handle) {
  console.log(`  ↳ Scraping /videos for ${handle}`);
  const html = await fetchPage(`https://www.youtube.com/${handle}/videos`);
  const data = extractInitialData(html);
  if (!data) return [];

  const videos = [];
  const renderers = findAll(data, "videoRenderer");
  for (const v of renderers) {
    const videoId = v.videoId;
    if (!videoId) continue;

    const title = extractText(v.title);
    const durationText = v.lengthText?.simpleText || extractText(v.lengthText) || "";
    const description = extractText(v.descriptionSnippet) || "";
    const publishedText = v.publishedTimeText?.simpleText || "";

    // Parse duration from "H:MM:SS" or "M:SS" format
    let durationSeconds = 0;
    if (durationText) {
      const parts = durationText.split(":").map(Number);
      if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
    }

    // Best quality thumbnail
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumb = thumbs.find((t) => t.width >= 320) || thumbs[thumbs.length - 1];

    // Parse published date to ISO
    let publishedAt;
    if (publishedText) {
      const now = new Date();
      if (publishedText.includes("يوم") || publishedText.includes("day")) {
        const days = parseInt(publishedText) || 1;
        now.setDate(now.getDate() - days);
        publishedAt = now.toISOString().slice(0, 10);
      } else if (publishedText.includes("أسبوع") || publishedText.includes("week")) {
        const weeks = parseInt(publishedText) || 1;
        now.setDate(now.getDate() - weeks * 7);
        publishedAt = now.toISOString().slice(0, 10);
      } else if (publishedText.includes("شهر") || publishedText.includes("month")) {
        const months = parseInt(publishedText) || 1;
        now.setMonth(now.getMonth() - months);
        publishedAt = now.toISOString().slice(0, 10);
      } else if (publishedText.includes("سنة") || publishedText.includes("year")) {
        const years = parseInt(publishedText) || 1;
        now.setFullYear(now.getFullYear() - years);
        publishedAt = now.toISOString().slice(0, 10);
      }
    }

    videos.push({
      videoId,
      title,
      description,
      durationSeconds,
      thumbnail: thumb?.url || bestThumb(videoId),
      publishedAt: publishedAt || null,
    });
  }

  return videos;
}

/**
 * Scrape /playlists tab to get all playlists (courses).
 */
async function scrapeChannelPlaylists(handle) {
  console.log(`  ↳ Scraping /playlists for ${handle}`);
  const html = await fetchPage(`https://www.youtube.com/${handle}/playlists`);
  const data = extractInitialData(html);
  if (!data) return [];

  const playlists = [];
  const renderers = findAll(data, "gridPlaylistRenderer");
  for (const p of renderers) {
    const playlistId = p.playlistId;
    if (!playlistId || playlistId === "VLLL") continue;

    const title = extractText(p.title);
    const countText = p.videoCountText?.runs?.[0]?.text || p.videoCountShortText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 0;

    const thumbs = p.thumbnail?.thumbnails || p.thumbnails?.[0]?.thumbnails || [];
    const thumb = thumbs.find((t) => t.width >= 320) || thumbs[thumbs.length - 1];

    if (videoCount === 0 && !title) continue;

    playlists.push({
      playlistId,
      title,
      videoCount,
      thumbnail: thumb?.url || null,
    });
  }

  return playlists;
}

/**
 * Scrape a playlist page to get its video list (up to first page, ~100 videos).
 */
async function scrapePlaylistVideos(playlistId) {
  await delay(500);
  console.log(`    ↳ Playlist ${playlistId}`);
  const html = await fetchPage(`https://www.youtube.com/playlist?list=${playlistId}`);
  const data = extractInitialData(html);
  if (!data) return [];

  const videos = [];
  const renderers = findAll(data, "playlistVideoRenderer");
  for (const v of renderers) {
    const videoId = v.videoId;
    if (!videoId) continue;

    const title = extractText(v.title);
    const durationText = v.lengthText?.simpleText || extractText(v.lengthText) || "";
    let durationSeconds = 0;
    if (durationText) {
      const parts = durationText.split(":").map(Number);
      if (parts.length === 3) durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) durationSeconds = parts[0] * 60 + parts[1];
    }
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumb = thumbs.find((t) => t.width >= 320) || thumbs[thumbs.length - 1];

    const position = typeof v.index?.simpleText === "string"
      ? parseInt(v.index.simpleText) - 1
      : videos.length;

    videos.push({ videoId, title, durationSeconds, thumbnail: thumb?.url || bestThumb(videoId), position });
  }
  return videos;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄  نور — مزامنة مكتبة الفيديو (بدون API key)\n");

  const channelsOut = [];
  const coursesOut = [];
  const videosMap = new Map(); // videoId → VideoLibraryVideo

  for (const config of CHANNELS) {
    console.log(`\n▶  ${config.displayName} (${config.handle})`);

    // 1. Channel meta
    let meta = null;
    try { meta = await scrapeChannelMeta(config.handle); } catch (e) { console.warn(`  ⚠ meta: ${e.message}`); }

    channelsOut.push({
      id: config.id,
      handle: config.handle,
      title: meta?.title || config.displayName,
      displayName: config.displayName,
      youtubeUrl: `https://www.youtube.com/${config.handle}`,
      description: meta?.description || `مكتبة ${config.displayName}`,
      avatar: meta?.avatar || null,
      accent: config.accent,
      order: config.order,
      youtubeChannelId: meta?.channelId || null,
      syncedAt: new Date().toISOString(),
    });

    // 2. Recent videos (from /videos tab) → create "uploads" course
    let recentVideos = [];
    try { recentVideos = await scrapeChannelVideos(config.handle); } catch (e) { console.warn(`  ⚠ /videos: ${e.message}`); }

    const uploadsVideoIds = [];
    for (const v of recentVideos) {
      if (!videosMap.has(v.videoId)) {
        const topicIds = classify(`${v.title} ${v.description}`);
        videosMap.set(v.videoId, {
          id: v.videoId,
          youtubeId: v.videoId,
          channelId: config.id,
          courseIds: [],
          topicIds,
          title: v.title || "بدون عنوان",
          description: v.description || "",
          durationSeconds: v.durationSeconds,
          thumbnail: v.thumbnail,
          publishedAt: v.publishedAt || null,
          youtubeUrl: `https://youtu.be/${v.videoId}`,
          position: uploadsVideoIds.length,
        });
      }
      uploadsVideoIds.push(v.videoId);
    }

    if (uploadsVideoIds.length > 0) {
      const uploadsId = `${config.id}-uploads`;
      // Tag each video with this course
      for (const vid of uploadsVideoIds) {
        const vObj = videosMap.get(vid);
        if (vObj && !vObj.courseIds.includes(uploadsId)) vObj.courseIds.push(uploadsId);
      }
      coursesOut.push({
        id: uploadsId,
        channelId: config.id,
        title: `آخر فيديوهات ${config.displayName}`,
        description: `أحدث الفيديوهات من قناة ${config.displayName}`,
        topicIds: ["general"],
        videoIds: uploadsVideoIds,
        thumbnail: videosMap.get(uploadsVideoIds[0])?.thumbnail || null,
        order: config.order * 100,
        isGenerated: false,
        isUploads: true,
      });
    }

    // 3. Playlists (courses)
    let playlists = [];
    try { playlists = await scrapeChannelPlaylists(config.handle); } catch (e) { console.warn(`  ⚠ /playlists: ${e.message}`); }

    let playlistOrder = config.order * 100 + 1;
    for (const pl of playlists.slice(0, 20)) { // max 20 playlists per channel
      if (pl.videoCount === 0) continue;

      let plVideos = [];
      try { plVideos = await scrapePlaylistVideos(pl.playlistId); } catch (e) { console.warn(`    ⚠ playlist ${pl.playlistId}: ${e.message}`); continue; }

      if (plVideos.length === 0) continue;

      const courseId = `${config.id}-${pl.playlistId}`;
      const topicIds = classify(pl.title);
      const videoIds = [];

      for (let i = 0; i < plVideos.length; i++) {
        const v = plVideos[i];
        if (!videosMap.has(v.videoId)) {
          videosMap.set(v.videoId, {
            id: v.videoId,
            youtubeId: v.videoId,
            channelId: config.id,
            courseIds: [courseId],
            topicIds: classify(v.title),
            title: v.title || "بدون عنوان",
            description: "",
            durationSeconds: v.durationSeconds,
            thumbnail: v.thumbnail,
            publishedAt: null,
            youtubeUrl: `https://youtu.be/${v.videoId}`,
            position: i,
          });
        } else {
          const existing = videosMap.get(v.videoId);
          if (!existing.courseIds.includes(courseId)) existing.courseIds.push(courseId);
        }
        videoIds.push(v.videoId);
      }

      coursesOut.push({
        id: courseId,
        channelId: config.id,
        title: pl.title || `قائمة ${courseId}`,
        description: `${pl.videoCount} فيديو • قناة ${config.displayName}`,
        playlistId: pl.playlistId,
        topicIds,
        videoIds,
        thumbnail: pl.thumbnail || videosMap.get(videoIds[0])?.thumbnail || null,
        order: playlistOrder++,
        isGenerated: false,
      });

      console.log(`    ✓ "${pl.title}" — ${videoIds.length} videos`);
    }

    console.log(`  ✅ ${config.displayName}: ${recentVideos.length} recent, ${playlists.length} playlists`);
  }

  // ── Ensure all video courseIds are correct ──────────────────────────────
  for (const course of coursesOut) {
    for (const videoId of course.videoIds) {
      const v = videosMap.get(videoId);
      if (v && !v.courseIds.includes(course.id)) v.courseIds.push(course.id);
    }
  }

  // ── Write output ────────────────────────────────────────────────────────
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "youtube-api",
    channels: channelsOut,
    topics: TOPICS,
    courses: coursesOut,
    videos: [...videosMap.values()],
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf8");

  const totalVideos = videosMap.size;
  const totalCourses = coursesOut.length;
  console.log(`\n✅  كتابة ${OUT_FILE}`);
  console.log(`   ${totalVideos} فيديو • ${totalCourses} دورة/قائمة\n`);
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
