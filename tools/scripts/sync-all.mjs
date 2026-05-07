/**
 * sync-all.mjs ─ ULTIMATE YouTube Library Sync
 *
 * Gets ALL videos from ALL channels using the YouTube Innertube API.
 * No YouTube API key required.
 *
 * Strategy:
 *   1. Uploads playlist (UU prefix) → ALL uploaded videos with full pagination
 *   2. Playlists tab                → ALL organized playlists (dawras/courses)
 *   3. Playlist items               → ALL videos per playlist with pagination
 *   4. Smart topic classification   → Arabic keyword weights
 *   5. Virtual topic courses        → Auto-generated if ≥8 videos per topic
 *
 * Run:
 *   node tools/scripts/sync-all.mjs
 *
 * Options (env vars):
 *   MAX_UPLOADS=300          max uploads per channel (default 400)
 *   MAX_PLAYLISTS=20         max playlists per channel (default 25)
 *   MAX_PL_VIDEOS=200        max videos per playlist (default 200)
 *   CHANNEL=alaa-hamed       only sync one channel (debug)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE   = path.resolve(__dirname, "../../public/data/video-library.json");

const MAX_UPLOADS    = Number(process.env.MAX_UPLOADS   ?? 400);
const MAX_PLAYLISTS  = Number(process.env.MAX_PLAYLISTS ?? 25);
const MAX_PL_VIDEOS  = Number(process.env.MAX_PL_VIDEOS ?? 200);
const ONLY_CHANNEL   = process.env.CHANNEL ?? null;

// ─── Channel manifest ─────────────────────────────────────────────────────────

const CHANNELS = [
  {
    id: "alaa-hamed",
    channelId: "UCwLgnvgp32d8bHtQljXqWeQ",
    handle: "@3laaHamed",
    displayName: "علاء حامد",
    accent: "#fbbf24",
    order: 1,
    youtubeUrl: "https://www.youtube.com/@3laaHamed",
    description: "دروس ودورات شرعية وتربوية ومسلك تزكية منظم.",
  },
  {
    id: "amgad-samir",
    channelId: "UC_FFy2YxiElNMba-t-6VwTA",
    handle: "@amgad_samir",
    displayName: "أمجد سمير",
    accent: "#38bdf8",
    order: 2,
    youtubeUrl: "https://www.youtube.com/@amgad_samir",
    description: "مواد دعوية وتعليمية وردود فكرية معاصرة.",
  },
  {
    id: "haitham-talaat",
    channelId: "UCLj8UFOcdFrvlh24Lw7jrgA",
    handle: "@Dr.Haitham_Talaat",
    displayName: "د. هيثم طلعت",
    accent: "#a78bfa",
    order: 3,
    youtubeUrl: "https://www.youtube.com/@Dr.Haitham_Talaat",
    description: "ردود على الشبهات ومواد عقدية وفكرية.",
  },
  {
    id: "anti-shubohat",
    channelId: "UCw0b2Jm2GbVryD38zvMu7eQ",
    handle: "@AntiShubohat",
    displayName: "مقاومة الشبهات",
    accent: "#fb7185",
    order: 4,
    youtubeUrl: "https://www.youtube.com/@AntiShubohat",
    description: "متخصص في معالجة الشبهات والفكر والإلحاد.",
  },
  {
    id: "anti-shubohat-2",
    channelId: "UCCJajbXPVwdRHOo2JSB36Ww",
    handle: "@AntiShubohat.2",
    displayName: "مقاومة الشبهات ٢",
    accent: "#f97316",
    order: 5,
    youtubeUrl: "https://www.youtube.com/@AntiShubohat.2",
    description: "القناة الثانية للردود والمقاطع المختارة.",
  },
  {
    id: "othman-alkamees",
    channelId: "UCWjCSGhmSGu0VLf2mPFS0Kg",
    handle: "@othmanalkamees",
    displayName: "عثمان الخميس",
    accent: "#34d399",
    order: 6,
    youtubeUrl: "https://www.youtube.com/@othmanalkamees",
    description: "دروس فقهية وعقدية ومحاضرات علمية.",
  },
];

// ─── Topic taxonomy ───────────────────────────────────────────────────────────

const TOPICS = [
  { id: "aqeedah",              title: "العقيدة",       icon: "◇", accent: "#a78bfa", description: "الإيمان، التوحيد، وأصول الاعتقاد." },
  { id: "anti-shubuhat",        title: "الشبهات",       icon: "⚑", accent: "#fb7185", description: "الردود الفكرية والمنهجية على الشبهات." },
  { id: "fiqh",                 title: "الفقه",         icon: "§", accent: "#34d399", description: "أحكام العبادات والمعاملات." },
  { id: "quran",                title: "القرآن",        icon: "▣", accent: "#fbbf24", description: "علوم القرآن والتلاوة والتدبر." },
  { id: "tafseer",              title: "التفسير",       icon: "☼", accent: "#f59e0b", description: "شرح الآيات والسور." },
  { id: "hadith",               title: "الحديث",        icon: "◈", accent: "#38bdf8", description: "شرح الأحاديث والسنن." },
  { id: "seerah",               title: "السيرة",        icon: "✦", accent: "#c084fc", description: "السيرة النبوية والتاريخ الإسلامي." },
  { id: "daawah",               title: "الدعوة",        icon: "↗", accent: "#60a5fa", description: "مهارات الدعوة والتربية." },
  { id: "tazkiyah",             title: "التزكية",       icon: "✧", accent: "#2dd4bf", description: "تزكية النفس والسلوك الروحي." },
  { id: "youth",                title: "الشباب",        icon: "★", accent: "#a3e635", description: "موضوعات الشباب والبناء النفسي." },
  { id: "family",               title: "الأسرة",        icon: "♡", accent: "#f472b6", description: "البيت والتربية والعلاقات." },
  { id: "comparative-religion", title: "مقارنة أديان",  icon: "⌁", accent: "#818cf8", description: "حوارات وردود ومقارنات منهجية." },
  { id: "atheism",              title: "الإلحاد",       icon: "?", accent: "#f87171", description: "نقد الإلحاد والمادية والشبهات المعاصرة." },
  { id: "biography",            title: "تراجم",         icon: "※", accent: "#eab308", description: "سير العلماء والدعاة والشخصيات." },
  { id: "general",              title: "عام",           icon: "•", accent: "#94a3b8", description: "مواد متنوعة." },
];

// ─── Keyword classifier (returns topic IDs) ───────────────────────────────────

const KEYWORD_MAP = [
  ["anti-shubuhat",       ["شبهة", "شبهات", "رد على", "يرد على", "ردود", "مناظرة", "نقد", "دحض", "إشكال", "تفنيد", "فرية", "افتراء", "مغالطة"]],
  ["atheism",             ["إلحاد", "ملحد", "الملاحدة", "داروين", "تطور", "نشوء", "مادية", "لا أدرية", "اللادين", "الإلحاد", "جيمس", "ريتشارد دوكنز", "لا يؤمن"]],
  ["comparative-religion",["نصرانية", "مسيحية", "كتاب مقدس", "إنجيل", "إنجيله", "يهود", "توراة", "أديان", "مقارنة الأديان", "أديان العالم", "الكنيسة", "بولس"]],
  ["aqeedah",             ["عقيدة", "توحيد", "إيمان", "أسماء الله", "صفات الله", "القدر", "الصحابة", "الصفات", "التوحيد", "أصول", "كلام", "اعتقاد", "الإيمان"]],
  ["fiqh",                ["فقه", "حكم", "أحكام", "صلاة", "الصلاة", "صيام", "زكاة", "حج", "وضوء", "فتوى", "طهارة", "مسألة", "مسائل", "عبادة", "معاملات", "نكاح", "طلاق", "بيع", "ربا"]],
  ["tafseer",             ["تفسير", "تدبر", "سورة", "آية", "الآية", "تأمل", "تأملات", "شرح سورة", "معنى", "تفسير القرآن", "التفسير", "تدبر القرآن"]],
  ["quran",               ["قرآن", "القرآن", "تلاوة", "تجويد", "مصحف", "حفظ القرآن", "قرآني", "قراءة", "قراءات", "علوم القرآن", "أحكام التجويد"]],
  ["hadith",              ["حديث", "الحديث", "صحيح", "البخاري", "مسلم", "السنة", "أربعون", "الأربعين", "رياض الصالحين", "شرح حديث", "مصطلح الحديث", "سنن"]],
  ["seerah",              ["سيرة", "النبي ﷺ", "الرسول", "غزوة", "صحابي", "المغازي", "الهجرة", "بدر", "أحد", "الخندق", "الخلفاء", "عمر", "أبو بكر", "علي", "عثمان", "صحابة"]],
  ["tazkiyah",            ["تزكية", "زكاة النفس", "روحي", "التوبة", "الزهد", "الورع", "التقوى", "الإخلاص", "المراقبة", "قلبك", "القلب", "النفس", "الخشوع", "سوبر مسلم", "خريطة التزكية", "نقاء"]],
  ["family",              ["زوج", "زوجة", "أبناء", "أسرة", "تربية الأولاد", "الزواج", "البيت", "المرأة", "الأمومة", "الأبوة", "علاقة", "الطفل", "الأم"]],
  ["youth",               ["شباب", "الشباب", "مراهق", "جامعة", "عادة", "هوية", "الشاب", "التحديات", "الضياع", "فتاة", "فتيان", "أزمة"]],
  ["daawah",              ["دعوة", "الدعوة", "داعية", "محاضرة", "خطبة", "نصيحة", "التبليغ", "أسلم", "الإسلام", "مسلم جديد"]],
  ["biography",           ["قصة", "ترجمة", "سيرة العالم", "حياة", "تراجم", "العلماء", "الإمام", "الشيخ", "أعلام"]],
];

function classify(text) {
  const lower = String(text || "").toLowerCase();
  const scores = {};
  for (const [topic, words] of KEYWORD_MAP) {
    let score = 0;
    for (const w of words) {
      if (lower.includes(w)) score += w.length > 5 ? 3 : 1;
    }
    if (score > 0) scores[topic] = score;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return ["general"];
  // Return up to 3 top topics
  return sorted.slice(0, 3).map(([t]) => t);
}

// ─── Innertube helpers ────────────────────────────────────────────────────────

const IT_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const IT_BASE = "https://www.youtube.com/youtubei/v1";
const IT_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240417.00.00",
    hl: "ar",
    gl: "SA",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    timeZone: "Asia/Riyadh",
  },
};
const IT_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "X-YouTube-Client-Name": "1",
  "X-YouTube-Client-Version": "2.20240417.00.00",
  Origin: "https://www.youtube.com",
  Referer: "https://www.youtube.com/",
  "Accept-Language": "ar,en-US;q=0.9",
};

async function itBrowse(browseId, params, maxRetries = 3) {
  const body = { context: IT_CONTEXT, browseId };
  if (params) body.params = params;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${IT_BASE}/browse?prettyPrint=false`, {
        method: "POST",
        headers: IT_HEADERS,
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        const wait = attempt * 3000;
        console.warn(`    ⚠ Rate limited. Waiting ${wait / 1000}s...`);
        await delay(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await delay(attempt * 1500);
    }
  }
}

async function itContinue(token, maxRetries = 3) {
  const body = { context: IT_CONTEXT, continuation: token };
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${IT_BASE}/browse?prettyPrint=false`, {
        method: "POST",
        headers: IT_HEADERS,
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        const wait = attempt * 3000;
        console.warn(`    ⚠ Rate limited. Waiting ${wait / 1000}s...`);
        await delay(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === maxRetries) throw e;
      await delay(attempt * 1500);
    }
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 200));
}

// Deep recursive search for a key
function findAll(obj, key, results = []) {
  if (Array.isArray(obj)) { obj.forEach((i) => findAll(i, key, results)); return results; }
  if (obj && typeof obj === "object") {
    if (key in obj) results.push(obj[key]);
    for (const v of Object.values(obj)) findAll(v, key, results);
  }
  return results;
}

function extractText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.runs) return node.runs.map((r) => r.text || "").join("");
  if (node.simpleText) return node.simpleText;
  if (node.content) return String(node.content);
  return "";
}

function parseDurationText(text) {
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

function findContinuationToken(data) {
  // Look for any continuationCommand with a token
  const cmds = findAll(data, "continuationCommand");
  for (const cmd of cmds) {
    if (typeof cmd?.token === "string" && cmd.token.length > 10) return cmd.token;
  }
  // Fallback: look for nextContinuationData
  const ncd = findAll(data, "nextContinuationData");
  for (const n of ncd) {
    if (n?.continuation) return n.continuation;
  }
  return null;
}

// ─── Video extraction from various renderer types ─────────────────────────────

function parseVideoFromRenderer(r, position = 0) {
  const videoId = r.videoId;
  if (!videoId) return null;
  const title = extractText(r.title);
  if (!title) return null;

  const durationText =
    r.lengthText?.simpleText ||
    extractText(r.lengthText) ||
    r.lengthSeconds ||
    "";
  const durationSeconds =
    typeof r.lengthSeconds === "number"
      ? r.lengthSeconds
      : typeof r.lengthSeconds === "string"
      ? parseInt(r.lengthSeconds, 10) || parseDurationText(durationText)
      : parseDurationText(String(durationText));

  const thumbs =
    r.thumbnail?.thumbnails ||
    r.thumbnails?.[0]?.thumbnails ||
    [];
  const thumb =
    thumbs.find((t) => t.width >= 320) ||
    thumbs[thumbs.length - 1] ||
    null;

  // Published date
  let publishedAt = null;
  const pubRaw = r.publishedTimeText?.simpleText || "";
  if (pubRaw) {
    const now = new Date();
    const d = parseInt(pubRaw) || 1;
    if (pubRaw.includes("يوم") || pubRaw.includes("day")) { now.setDate(now.getDate() - d); publishedAt = now.toISOString().slice(0, 10); }
    else if (pubRaw.includes("أسبوع") || pubRaw.includes("week")) { now.setDate(now.getDate() - d * 7); publishedAt = now.toISOString().slice(0, 10); }
    else if (pubRaw.includes("شهر") || pubRaw.includes("month")) { now.setMonth(now.getMonth() - d); publishedAt = now.toISOString().slice(0, 10); }
    else if (pubRaw.includes("سنة") || pubRaw.includes("year")) { now.setFullYear(now.getFullYear() - d); publishedAt = now.toISOString().slice(0, 10); }
    else if (/\d{4}/.test(pubRaw)) { publishedAt = pubRaw; }
  }

  // Index in playlist (1-based in YouTube, convert to 0-based)
  const posRaw = r.index?.simpleText ?? r.index?.runs?.[0]?.text;
  const pos = posRaw != null ? (parseInt(posRaw, 10) - 1 || 0) : position;

  const viewCountText = r.viewCountText?.simpleText || extractText(r.viewCountText) || "";
  const viewCount = parseInt(viewCountText.replace(/[^0-9]/g, "")) || undefined;

  return {
    videoId,
    title,
    durationSeconds: durationSeconds || 0,
    thumbnail: thumb?.url || bestThumb(videoId),
    publishedAt,
    position: pos,
    viewCount,
  };
}

function extractAllVideoRenderers(data) {
  const videos = [];
  const seen = new Set();

  function push(v) {
    if (v && !seen.has(v.videoId)) { seen.add(v.videoId); videos.push(v); }
  }

  // playlistVideoRenderer (in playlist browsing)
  for (const r of findAll(data, "playlistVideoRenderer")) push(parseVideoFromRenderer(r, videos.length));
  if (videos.length > 0) return videos;

  // playlistPanelVideoRenderer (in playlist panel)
  for (const r of findAll(data, "playlistPanelVideoRenderer")) push(parseVideoFromRenderer(r, videos.length));
  if (videos.length > 0) return videos;

  // richItemRenderer wrapping videoRenderer (channel videos tab)
  for (const ri of findAll(data, "richItemRenderer")) {
    const vr = ri.content?.videoRenderer || ri.content?.reelItemRenderer;
    if (vr?.videoId) push(parseVideoFromRenderer(vr, videos.length));
  }
  if (videos.length > 0) return videos;

  // plain videoRenderer
  for (const r of findAll(data, "videoRenderer")) push(parseVideoFromRenderer(r, videos.length));

  return videos;
}

// ─── Playlist extraction ──────────────────────────────────────────────────────

function extractAllPlaylistRenderers(data) {
  const playlists = [];
  const seen = new Set();

  function push(p) {
    if (p && p.playlistId && !seen.has(p.playlistId)) {
      seen.add(p.playlistId);
      playlists.push(p);
    }
  }

  // lockupViewModel (new YouTube UI)
  for (const lv of findAll(data, "lockupViewModel")) {
    let playlistId = lv.entityId || lv.contentId;
    if (!playlistId) {
      const pids = findAll(lv, "playlistId").filter((p) => typeof p === "string" && p.length > 3);
      playlistId = pids[0];
    }
    if (!playlistId || typeof playlistId !== "string") continue;

    // Unwrap "VL" prefix if present
    if (playlistId.startsWith("VL")) playlistId = playlistId.slice(2);
    if (playlistId === "LL" || playlistId === "WL") continue;

    const titleNode = lv.metadata?.lockupMetadataViewModel?.title || lv.title;
    const title = extractText(titleNode);

    const countTexts = findAll(lv, "text").map(String).filter((t) => /^\d+$/.test(t.trim()));
    const videoCount = countTexts.length > 0 ? parseInt(countTexts[0]) : 1;

    const thumbs = findAll(lv, "thumbnails").flat().filter((t) => t?.url);
    const thumb = thumbs.slice(-1)[0]?.url || null;

    if (title) push({ playlistId, title, videoCount, thumbnail: thumb });
  }

  if (playlists.length > 0) return playlists;

  // gridPlaylistRenderer (older YouTube UI)
  for (const p of findAll(data, "gridPlaylistRenderer")) {
    const playlistId = p.playlistId;
    if (!playlistId || playlistId === "LL") continue;
    const title = extractText(p.title);
    const countText = p.videoCountText?.runs?.[0]?.text || p.videoCountShortText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    const thumbs = p.thumbnail?.thumbnails || [];
    const thumb = thumbs.slice(-1)[0]?.url || null;
    if (title) push({ playlistId, title, videoCount, thumbnail: thumb });
  }

  if (playlists.length > 0) return playlists;

  // playlistRenderer (in search or shelf)
  for (const p of findAll(data, "playlistRenderer")) {
    const playlistId = p.playlistId;
    if (!playlistId) continue;
    const title = extractText(p.title);
    const countText = p.videoCountText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    if (title) push({ playlistId, title, videoCount, thumbnail: null });
  }

  // richItemRenderer → playlistRenderer
  for (const ri of findAll(data, "richItemRenderer")) {
    const pr = ri.content?.playlistRenderer || ri.content?.gridPlaylistRenderer;
    if (!pr?.playlistId) continue;
    const title = extractText(pr.title);
    const countText = pr.videoCountText?.simpleText || pr.videoCountShortText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    if (title) push({ playlistId: pr.playlistId, title, videoCount, thumbnail: null });
  }

  return playlists;
}

// ─── Paginated fetchers ───────────────────────────────────────────────────────

async function fetchAllPlaylistItems(playlistId, maxItems = MAX_PL_VIDEOS, label = "") {
  const all = [];
  const seen = new Set();

  console.log(`    ↳ Playlist ${label || playlistId} (max ${maxItems})`);

  let data;
  try {
    data = await itBrowse("VL" + playlistId);
  } catch (e) {
    console.warn(`    ⚠ ${playlistId}: ${e.message}`);
    return all;
  }

  const batch = extractAllVideoRenderers(data);
  for (const v of batch) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }

  let token = findContinuationToken(data);
  while (token && all.length < maxItems) {
    await delay(900);
    let cont;
    try { cont = await itContinue(token); } catch (e) { break; }
    const more = extractAllVideoRenderers(cont);
    if (more.length === 0) break;
    for (const v of more) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
    token = findContinuationToken(cont);
  }

  return all;
}

async function fetchAllUploads(channelId, maxVideos = MAX_UPLOADS, displayName = "") {
  // Uploads playlist ID: replace UC prefix with UU
  const uploadsId = "UU" + channelId.slice(2);
  console.log(`  ↳ Uploads playlist ${uploadsId} (max ${maxVideos})`);
  return fetchAllPlaylistItems(uploadsId, maxVideos, `uploads — ${displayName}`);
}

async function fetchAllPlaylists(channelId, displayName = "") {
  const playlists = [];
  const seen = new Set();
  // Params for playlists tab
  const PARAMS_PLAYLISTS = "EglwbGF5bGlzdHMYAA==";

  console.log(`  ↳ Playlists tab for ${displayName}`);

  let data;
  try { data = await itBrowse(channelId, PARAMS_PLAYLISTS); }
  catch (e) { console.warn(`  ⚠ playlists tab: ${e.message}`); return playlists; }

  const batch = extractAllPlaylistRenderers(data);
  for (const p of batch) { if (!seen.has(p.playlistId)) { seen.add(p.playlistId); playlists.push(p); } }

  // Paginate playlists tab
  let token = findContinuationToken(data);
  let pages = 0;
  while (token && pages < 5) {
    await delay(800);
    let cont;
    try { cont = await itContinue(token); } catch { break; }
    const more = extractAllPlaylistRenderers(cont);
    if (more.length === 0) break;
    for (const p of more) { if (!seen.has(p.playlistId)) { seen.add(p.playlistId); playlists.push(p); } }
    token = findContinuationToken(cont);
    pages++;
  }

  // If Innertube playlists tab failed, try scraping the HTML page
  if (playlists.length === 0) {
    console.log(`  ↳ Falling back to HTML scrape for playlists...`);
    try {
      const res = await fetch(`https://www.youtube.com/${CHANNELS.find(c => c.channelId === channelId)?.handle || channelId}/playlists`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "ar,en-US;q=0.9",
        },
      });
      const html = await res.text();
      const marker = "var ytInitialData = ";
      const start = html.indexOf(marker);
      if (start !== -1) {
        const jsonStr = extractJsonAt(html, start + marker.length);
        try {
          const pageData = JSON.parse(jsonStr);
          const htmlPlaylists = extractAllPlaylistRenderers(pageData);
          for (const p of htmlPlaylists) { if (!seen.has(p.playlistId)) { seen.add(p.playlistId); playlists.push(p); } }
        } catch {}
      }
    } catch (e) { console.warn(`  ⚠ HTML scrape: ${e.message}`); }
  }

  return playlists;
}

function extractJsonAt(html, offset) {
  let depth = 0, i = offset, inString = false, escaped = false;
  while (i < html.length) {
    const ch = html[i];
    if (escaped) { escaped = false; i++; continue; }
    if (ch === "\\" && inString) { escaped = true; i++; continue; }
    if (ch === '"') inString = !inString;
    if (!inString) {
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return html.slice(offset, i + 1); }
    }
    i++;
  }
  return html.slice(offset);
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncChannel(config, videosMap, coursesOut) {
  const { id, channelId, displayName } = config;
  console.log(`\n▶  ${displayName} (${channelId})`);

  const targetChannels = ONLY_CHANNEL ? [ONLY_CHANNEL] : null;
  if (targetChannels && !targetChannels.includes(id)) {
    console.log(`  ⏭ Skipped (CHANNEL filter)`);
    return;
  }

  let totalNew = 0;

  // ── 1. Uploads (ALL videos) ─────────────────────────────────────────────────
  const uploadVideos = await fetchAllUploads(channelId, MAX_UPLOADS, displayName);
  const uploadsId = `${id}-uploads`;
  const uploadsVideoIds = [];

  for (let i = 0; i < uploadVideos.length; i++) {
    const v = uploadVideos[i];
    if (!videosMap.has(v.videoId)) {
      const topicIds = classify(`${v.title}`);
      videosMap.set(v.videoId, {
        id: v.videoId,
        youtubeId: v.videoId,
        channelId: id,
        courseIds: [uploadsId],
        topicIds,
        title: v.title,
        description: "",
        durationSeconds: v.durationSeconds,
        thumbnail: v.thumbnail,
        publishedAt: v.publishedAt,
        youtubeUrl: `https://youtu.be/${v.videoId}`,
        position: i,
        viewCount: v.viewCount,
      });
      totalNew++;
    } else {
      const existing = videosMap.get(v.videoId);
      if (!existing.courseIds.includes(uploadsId)) existing.courseIds.push(uploadsId);
    }
    uploadsVideoIds.push(v.videoId);
  }

  if (uploadsVideoIds.length > 0) {
    // Remove old uploads course if exists
    const oldIdx = coursesOut.findIndex((c) => c.id === uploadsId);
    if (oldIdx !== -1) coursesOut.splice(oldIdx, 1);

    coursesOut.push({
      id: uploadsId,
      channelId: id,
      title: `آخر فيديوهات ${displayName}`,
      description: `أحدث ${uploadsVideoIds.length} فيديو من قناة ${displayName}`,
      topicIds: ["general"],
      videoIds: uploadsVideoIds,
      thumbnail: videosMap.get(uploadsVideoIds[0])?.thumbnail || null,
      order: config.order * 100,
      isGenerated: false,
      isUploads: true,
    });
  }

  console.log(`  ✓ Uploads: ${uploadsVideoIds.length} videos (${totalNew} new)`);

  // ── 2. Playlists (organized courses) ───────────────────────────────────────
  await delay(1000);
  const playlists = await fetchAllPlaylists(channelId, displayName);
  console.log(`  Found ${playlists.length} playlists`);

  let plOrder = config.order * 100 + 1;
  let playlistsAdded = 0;

  for (const pl of playlists.slice(0, MAX_PLAYLISTS)) {
    if (!pl.playlistId || pl.playlistId === "LL" || pl.playlistId === "WL") continue;
    const courseId = `${id}-${pl.playlistId}`;

    // Remove old version of this course if exists (re-sync)
    const oldIdx = coursesOut.findIndex((c) => c.id === courseId);
    if (oldIdx !== -1) coursesOut.splice(oldIdx, 1);

    await delay(700);
    const plVideos = await fetchAllPlaylistItems(pl.playlistId, MAX_PL_VIDEOS, pl.title);
    if (plVideos.length === 0) continue;

    const topicIds = classify(pl.title);
    const videoIds = [];

    for (let i = 0; i < plVideos.length; i++) {
      const v = plVideos[i];
      if (!videosMap.has(v.videoId)) {
        videosMap.set(v.videoId, {
          id: v.videoId,
          youtubeId: v.videoId,
          channelId: id,
          courseIds: [courseId],
          topicIds: classify(v.title),
          title: v.title,
          description: "",
          durationSeconds: v.durationSeconds,
          thumbnail: v.thumbnail,
          publishedAt: v.publishedAt,
          youtubeUrl: `https://youtu.be/${v.videoId}`,
          position: i,
        });
        totalNew++;
      } else {
        const existing = videosMap.get(v.videoId);
        if (!existing.courseIds.includes(courseId)) existing.courseIds.push(courseId);
        // Update position if this playlist is a proper ordered course
        if (v.durationSeconds > 0 && existing.durationSeconds === 0) existing.durationSeconds = v.durationSeconds;
      }
      videoIds.push(v.videoId);
    }

    if (videoIds.length > 0) {
      const totalSecs = videoIds.reduce((sum, vid) => sum + (videosMap.get(vid)?.durationSeconds || 0), 0);
      coursesOut.push({
        id: courseId,
        channelId: id,
        title: pl.title,
        description: `${videoIds.length} درس • ${formatDuration(totalSecs)} • قناة ${displayName}`,
        playlistId: pl.playlistId,
        topicIds,
        videoIds,
        thumbnail: pl.thumbnail || videosMap.get(videoIds[0])?.thumbnail || null,
        order: plOrder++,
        isGenerated: false,
      });
      playlistsAdded++;
      console.log(`    ✓ "${pl.title.slice(0, 50)}" — ${videoIds.length} videos`);
    }
  }

  console.log(`  ✅ ${displayName}: ${uploadsVideoIds.length} uploads + ${playlistsAdded} playlists`);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 10) return `${h} ساعة`;
  if (h > 0) return `${h}س ${m}د`;
  return `${m} دقيقة`;
}

// ─── Virtual topic courses ────────────────────────────────────────────────────

function createVirtualTopicCourses(channels, videosMap, coursesOut) {
  const MIN_VIDEOS_FOR_VIRTUAL = 8;

  for (const ch of channels) {
    const channelVideos = [...videosMap.values()].filter((v) => v.channelId === ch.id);
    const byTopic = {};
    for (const v of channelVideos) {
      for (const t of v.topicIds) {
        if (t === "general") continue;
        if (!byTopic[t]) byTopic[t] = [];
        byTopic[t].push(v.id);
      }
    }
    for (const [topicId, videoIds] of Object.entries(byTopic)) {
      if (videoIds.length < MIN_VIDEOS_FOR_VIRTUAL) continue;
      const topic = TOPICS.find((t) => t.id === topicId);
      if (!topic) continue;
      const courseId = `${ch.id}-topic-${topicId}`;
      // Don't overwrite existing playlist-based courses for this topic
      if (coursesOut.some((c) => c.id === courseId)) continue;
      coursesOut.push({
        id: courseId,
        channelId: ch.id,
        title: `${topic.title} — ${ch.displayName}`,
        description: `${videoIds.length} فيديو في موضوع ${topic.title} من قناة ${ch.displayName}`,
        topicIds: [topicId],
        videoIds: videoIds.slice(0, 200),
        thumbnail: videosMap.get(videoIds[0])?.thumbnail || null,
        order: ch.order * 100 + 50 + TOPICS.findIndex((t) => t.id === topicId),
        isGenerated: true,
        isVirtual: true,
      });
    }
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌙  نور — مزامنة شاملة لمكتبة الفيديو\n");
  console.log(`   MAX_UPLOADS=${MAX_UPLOADS} MAX_PLAYLISTS=${MAX_PLAYLISTS} MAX_PL_VIDEOS=${MAX_PL_VIDEOS}\n`);

  const videosMap = new Map();
  const coursesOut = [];

  // Build channel output
  const channelsOut = CHANNELS.map((c) => ({
    id: c.id,
    handle: c.handle,
    title: c.displayName,
    displayName: c.displayName,
    youtubeUrl: c.youtubeUrl,
    description: c.description,
    accent: c.accent,
    order: c.order,
    youtubeChannelId: c.channelId,
    syncedAt: new Date().toISOString(),
  }));

  for (const ch of CHANNELS) {
    try {
      await syncChannel(ch, videosMap, coursesOut);
    } catch (e) {
      console.error(`  ❌ ${ch.displayName}: ${e.message}`);
    }
    await delay(1200);
  }

  // Create virtual topic courses
  console.log("\n📚 Generating virtual topic courses...");
  createVirtualTopicCourses(CHANNELS, videosMap, coursesOut);

  // Ensure all video courseIds reference their courses
  for (const course of coursesOut) {
    for (const vid of course.videoIds) {
      const v = videosMap.get(vid);
      if (v && !v.courseIds.includes(course.id)) v.courseIds.push(course.id);
    }
  }

  // Sort courses: by order
  coursesOut.sort((a, b) => a.order - b.order);

  const allVideos = [...videosMap.values()];

  // Summary
  const perChannel = {};
  for (const v of allVideos) {
    perChannel[v.channelId] = (perChannel[v.channelId] || 0) + 1;
  }

  console.log("\n📊 النتائج:");
  for (const ch of CHANNELS) {
    const vCount = perChannel[ch.id] || 0;
    const cCount = coursesOut.filter((c) => c.channelId === ch.id).length;
    console.log(`   ${ch.displayName}: ${vCount} فيديو • ${cCount} دورة`);
  }
  console.log(`\n   🎯 الإجمالي: ${allVideos.length} فيديو • ${coursesOut.length} دورة`);

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "youtube-api",
    channels: channelsOut,
    topics: TOPICS,
    courses: coursesOut,
    videos: allVideos,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n✅  كُتب: ${OUT_FILE}\n`);
}

main().catch((e) => { console.error("❌ Fatal:", e); process.exit(1); });
