/**
 * sync-alaa-hamed.mjs
 *
 * Full deep-sync for علاء حامد channel:
 *   1. Fetch ALL uploads (no cap — paginate until empty)
 *   2. Scrape /playlists page — find new/empty playlists
 *   3. Fetch every playlist video with full pagination
 *   4. Re-classify all videos with enhanced keywords
 *   5. Rebuild generated topic-bucket courses
 *   6. Write back to video-library.json
 *
 * Run: node tools/scripts/sync-alaa-hamed.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../../public/data/video-library.json");

const CHANNEL = {
  id: "alaa-hamed",
  channelId: "UCwLgnvgp32d8bHtQljXqWeQ",
  displayName: "علاء حامد",
  handle: "@3laaHamed",
  accent: "#fbbf24",
  playlistsUrl: "https://www.youtube.com/@3laaHamed/playlists",
  videosUrl: "https://www.youtube.com/@3laaHamed/videos",
};

// Uploads playlist ID = replace UC → UU
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
        console.warn(`    ⏳ Rate limited — waiting ${i * 5}s…`);
        await delay(i * 5000);
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

async function itBrowse(browseId, params) {
  const body = { context: IT_CTX, browseId };
  if (params) body.params = params;
  return itPost("browse", body);
}

async function itContinue(token) {
  return itPost("browse", { context: IT_CTX, continuation: token });
}

// ─── Deep traversal helpers ───────────────────────────────────────────────────

function findAll(obj, key, out = []) {
  if (Array.isArray(obj)) {
    obj.forEach((i) => findAll(i, key, out));
    return out;
  }
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
  let depth = 0,
    i = offset,
    inStr = false,
    esc = false;
  while (i < html.length) {
    const ch = html[i];
    if (esc) {
      esc = false;
      i++;
      continue;
    }
    if (ch === "\\" && inStr) {
      esc = true;
      i++;
      continue;
    }
    if (ch === '"') inStr = !inStr;
    if (!inStr) {
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

// ─── Extract videos from any YouTube response ─────────────────────────────────

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
      typeof r.lengthSeconds === "number"
        ? r.lengthSeconds
        : typeof r.lengthSeconds === "string"
        ? parseInt(r.lengthSeconds, 10) || parseDuration(durText)
        : parseDuration(String(durText));
    const thumbs = r.thumbnail?.thumbnails || r.thumbnails?.[0]?.thumbnails || [];
    const thumb = thumbs.find((t) => t.width >= 320) || thumbs.slice(-1)[0] || null;
    const posRaw = r.index?.simpleText ?? r.index?.runs?.[0]?.text;
    const position = posRaw != null ? parseInt(posRaw, 10) - 1 || 0 : pos;
    videos.push({
      videoId,
      title,
      durationSeconds: durationSeconds || 0,
      thumbnail: thumb?.url || bestThumb(videoId),
      position,
    });
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

// ─── Paginated playlist fetch (no cap) ───────────────────────────────────────

async function fetchAllPlaylistVideos(playlistId, label = "") {
  const all = [];
  const seen = new Set();
  console.log(`  ↳ Fetching playlist [${playlistId}] "${label}" (unlimited pages)…`);

  let data;
  try {
    data = await itBrowse("VL" + playlistId);
  } catch (e) {
    console.warn(`    ⚠ Browse failed: ${e.message} — trying HTML fallback`);
  }

  if (data) {
    const batch = extractVideos(data);
    for (const v of batch) {
      if (!seen.has(v.videoId)) {
        seen.add(v.videoId);
        all.push(v);
      }
    }
    let token = findToken(data);
    let pages = 0;
    while (token && pages < 100) {
      await delay(700);
      let cont;
      try {
        cont = await itContinue(token);
      } catch (e) {
        console.warn(`    ⚠ Continuation failed at page ${pages}: ${e.message}`);
        break;
      }
      const more = extractVideos(cont);
      if (more.length === 0) break;
      for (const v of more) {
        if (!seen.has(v.videoId)) {
          seen.add(v.videoId);
          all.push(v);
        }
      }
      token = findToken(cont);
      pages++;
      if (pages % 5 === 0) console.log(`    … page ${pages}, ${all.length} videos so far`);
    }
  }

  // HTML fallback if Innertube returned nothing
  if (all.length === 0) {
    console.log(`    ↳ Innertube got 0 — trying HTML page…`);
    try {
      const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, { headers: HTML_HDRS });
      const html = await res.text();
      const marker = "var ytInitialData = ";
      const start = html.indexOf(marker);
      if (start !== -1) {
        const pageData = JSON.parse(extractJsonAt(html, start + marker.length));
        const htmlVids = extractVideos(pageData);
        for (const v of htmlVids) {
          if (!seen.has(v.videoId)) {
            seen.add(v.videoId);
            all.push(v);
          }
        }
        let htmlToken = findToken(pageData);
        let htmlPages = 0;
        while (htmlToken && htmlPages < 50) {
          await delay(800);
          let cont2;
          try {
            cont2 = await itContinue(htmlToken);
          } catch {
            break;
          }
          const more2 = extractVideos(cont2);
          if (more2.length === 0) break;
          for (const v of more2) {
            if (!seen.has(v.videoId)) {
              seen.add(v.videoId);
              all.push(v);
            }
          }
          htmlToken = findToken(cont2);
          htmlPages++;
        }
      }
    } catch (e) {
      console.warn(`    ⚠ HTML fallback failed: ${e.message}`);
    }
  }

  console.log(`    ✓ Got ${all.length} videos from [${playlistId}]`);
  return all;
}

// ─── Scrape /playlists page ───────────────────────────────────────────────────

async function scrapePlaylistsPage(url) {
  console.log(`  ↳ Scraping playlists page: ${url}`);
  const res = await fetch(url, { headers: HTML_HDRS });
  const html = await res.text();
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start === -1) {
    console.warn("  ⚠ No ytInitialData found");
    return [];
  }
  let data;
  try {
    data = JSON.parse(extractJsonAt(html, start + marker.length));
  } catch (e) {
    console.warn(`  ⚠ JSON parse error: ${e.message}`);
    return [];
  }

  const results = [];
  const seen = new Set();

  function push(pid, title, videoCount, thumb) {
    if (!pid || seen.has(pid)) return;
    if (pid === "LL" || pid === "WL") return;
    if (pid.startsWith("UU")) return; // uploads playlist
    seen.add(pid);
    results.push({ playlistId: pid, title: title || "قائمة", videoCount: videoCount || 1, thumbnail: thumb || null });
  }

  // lockupViewModel (new YouTube UI)
  for (const lv of findAll(data, "lockupViewModel")) {
    let pid = lv.entityId || lv.contentId;
    if (!pid) {
      const pids = findAll(lv, "playlistId").filter((p) => typeof p === "string" && p.length > 3);
      pid = pids[0];
    }
    if (!pid) continue;
    if (pid.startsWith("VL")) pid = pid.slice(2);
    const title = extractText(lv.metadata?.lockupMetadataViewModel?.title || lv.title);
    const countTexts = findAll(lv, "text").map(String).filter((t) => /^\d+$/.test(t.trim()));
    const videoCount = countTexts.length > 0 ? parseInt(countTexts[0]) : 1;
    const thumbs = findAll(lv, "thumbnails").flat().filter((t) => t?.url);
    const thumb = thumbs.slice(-1)[0]?.url || null;
    push(pid, title, videoCount, thumb);
  }

  // gridPlaylistRenderer (old UI)
  for (const p of findAll(data, "gridPlaylistRenderer")) {
    const pid = p.playlistId;
    if (!pid) continue;
    const title = extractText(p.title);
    const countText = p.videoCountText?.runs?.[0]?.text || p.videoCountShortText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    const thumbs = p.thumbnail?.thumbnails || [];
    push(pid, title, videoCount, thumbs.slice(-1)[0]?.url || null);
  }

  // richItemRenderer containing playlist
  for (const ri of findAll(data, "richItemRenderer")) {
    const pr = ri.content?.playlistRenderer || ri.content?.gridPlaylistRenderer;
    if (!pr?.playlistId) continue;
    const title = extractText(pr.title);
    const countText = pr.videoCountText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    push(pr.playlistId, title, videoCount, null);
  }

  // Direct playlistRenderer
  for (const p of findAll(data, "playlistRenderer")) {
    if (!p.playlistId) continue;
    const title = extractText(p.title);
    const countText = p.videoCountText?.simpleText || "";
    push(p.playlistId, title, videoCount || 1, null);
  }

  console.log(`  ✓ Found ${results.length} playlists on page`);
  return results;
}

// ─── Classification ───────────────────────────────────────────────────────────

const KEYWORD_MAP = [
  ["anti-shubuhat",        ["شبهة","شبهات","رد على","ردود","مناظرة","نقد","دحض","إشكال","تفنيد","فرية","افتراء"]],
  ["atheism",              ["إلحاد","ملحد","الملاحدة","داروين","تطور","مادية","لا أدرية"]],
  ["comparative-religion", ["نصرانية","مسيحية","كتاب مقدس","إنجيل","يهود","توراة","أديان","مقارنة الأديان"]],
  ["aqeedah",              ["عقيدة","توحيد","إيمان","أسماء الله","صفات الله","القدر","الصفات","أصول","اعتقاد"]],
  ["fiqh",                 ["فقه","حكم","أحكام","صلاة","صيام","زكاة","حج","وضوء","فتوى","طهارة","مسألة","عبادة","معاملات","نكاح","طلاق","بيع","ربا"]],
  ["tafseer",              ["تفسير","تدبر","سورة","آية","تأمل","تأملات","شرح سورة","التفسير"]],
  ["quran",                ["قرآن","القرآن","تلاوة","تجويد","مصحف","حفظ القرآن","علوم القرآن","أحكام التجويد"]],
  ["hadith",               ["حديث","الحديث","صحيح","البخاري","مسلم","السنة","الأربعين","رياض الصالحين","شرح حديث","مصطلح الحديث","سنن"]],
  ["seerah",               ["سيرة","النبي","الرسول","غزوة","صحابي","المغازي","الهجرة","الصحابة","الخلفاء"]],
  ["tazkiyah",             ["تزكية","روحي","التوبة","الزهد","الورع","التقوى","الإخلاص","القلب","الخشوع","سوبر مسلم","خريطة التزكية","العيادة","مدرسة قد سمع"]],
  ["family",               ["زوج","زوجة","أبناء","أسرة","تربية الأولاد","الزواج","البيت","المرأة","الأمومة","العفاف"]],
  ["youth",                ["شباب","الشباب","مراهق","جامعة","عادة","هوية"]],
  ["daawah",               ["دعوة","الدعوة","داعية","محاضرة","خطبة","نصيحة","أسلم","الإسلام","الدعاء"]],
  ["biography",            ["قصة","ترجمة","سيرة العالم","حياة","تراجم","العلماء","الإمام","الشيخ","أعلام","أنبياء","صحابة"]],
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
  return sorted.slice(0, 3).map(([t]) => t);
}

// ─── Topic-bucket virtual courses ────────────────────────────────────────────

const TOPIC_COURSES = [
  { suffix: "topic-aqeedah",   topicId: "aqeedah",    title: "العقيدة — علاء حامد",    order: 1010 },
  { suffix: "topic-fiqh",      topicId: "fiqh",       title: "الفقه — علاء حامد",      order: 1020 },
  { suffix: "topic-quran",     topicId: "quran",      title: "القرآن — علاء حامد",      order: 1030 },
  { suffix: "topic-tafseer",   topicId: "tafseer",    title: "التفسير — علاء حامد",     order: 1040 },
  { suffix: "topic-hadith",    topicId: "hadith",     title: "الحديث — علاء حامد",      order: 1050 },
  { suffix: "topic-seerah",    topicId: "seerah",     title: "السيرة — علاء حامد",      order: 1060 },
  { suffix: "topic-daawah",    topicId: "daawah",     title: "الدعوة — علاء حامد",      order: 1070 },
  { suffix: "topic-tazkiyah",  topicId: "tazkiyah",   title: "التزكية — علاء حامد",     order: 1080 },
  { suffix: "topic-youth",     topicId: "youth",      title: "الشباب — علاء حامد",      order: 1090 },
  { suffix: "topic-family",    topicId: "family",     title: "الأسرة — علاء حامد",      order: 1100 },
  { suffix: "topic-biography", topicId: "biography",  title: "تراجم — علاء حامد",       order: 1110 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀  Deep sync: علاء حامد — full pull\n");

  const db = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  const videosMap = new Map(db.videos.map((v) => [v.id, v]));
  const coursesMap = new Map(db.courses.map((c) => [c.id, c]));

  const chId = CHANNEL.id;
  let orderCounter = (db.courses.filter((c) => c.channelId === chId && !c.isGenerated).length + 1) * 100;

  // ── Step 1: Full uploads pull ─────────────────────────────────────────────
  console.log("📥 Step 1: Fetching ALL uploads…");
  const uploadsVideos = await fetchAllPlaylistVideos(UPLOADS_PLAYLIST_ID, "آخر فيديوهات علاء حامد");

  let newFromUploads = 0;
  for (let i = 0; i < uploadsVideos.length; i++) {
    const v = uploadsVideos[i];
    if (!videosMap.has(v.videoId)) {
      videosMap.set(v.videoId, {
        id: v.videoId,
        youtubeId: v.videoId,
        channelId: chId,
        courseIds: ["alaa-hamed-uploads"],
        topicIds: classify(v.title),
        title: v.title,
        description: "",
        durationSeconds: v.durationSeconds,
        thumbnail: v.thumbnail,
        publishedAt: null,
        youtubeUrl: `https://youtu.be/${v.videoId}`,
        position: i,
      });
      newFromUploads++;
    } else {
      const ex = videosMap.get(v.videoId);
      if (!ex.courseIds.includes("alaa-hamed-uploads")) ex.courseIds.push("alaa-hamed-uploads");
      if (!ex.durationSeconds && v.durationSeconds) ex.durationSeconds = v.durationSeconds;
      if (v.thumbnail && (!ex.thumbnail || ex.thumbnail.includes("mqdefault"))) ex.thumbnail = v.thumbnail;
    }
  }

  // Update uploads course
  const uploadsVideoIds = uploadsVideos.map((v) => v.videoId);
  const uploadsCourse = coursesMap.get("alaa-hamed-uploads");
  if (uploadsCourse) {
    uploadsCourse.videoIds = uploadsVideoIds;
    uploadsCourse.thumbnail = videosMap.get(uploadsVideoIds[0])?.thumbnail || uploadsCourse.thumbnail;
    const idx = db.courses.findIndex((c) => c.id === "alaa-hamed-uploads");
    if (idx !== -1) db.courses[idx] = uploadsCourse;
  } else {
    const newUploads = {
      id: "alaa-hamed-uploads",
      channelId: chId,
      title: "آخر فيديوهات علاء حامد",
      description: `أحدث ${uploadsVideoIds.length} فيديو من قناة علاء حامد`,
      topicIds: ["general"],
      videoIds: uploadsVideoIds,
      thumbnail: videosMap.get(uploadsVideoIds[0])?.thumbnail || null,
      order: 100,
      isGenerated: false,
      isUploads: true,
    };
    db.courses.push(newUploads);
    coursesMap.set("alaa-hamed-uploads", newUploads);
  }

  console.log(`  ✓ Uploads: ${uploadsVideos.length} total (${newFromUploads} new)\n`);

  // ── Step 2: Scrape playlists page ─────────────────────────────────────────
  console.log("📋 Step 2: Scraping playlists page…");
  let allPlaylists = [];
  try {
    allPlaylists = await scrapePlaylistsPage(CHANNEL.playlistsUrl);
  } catch (e) {
    console.warn(`  ⚠ Playlist scrape failed: ${e.message}`);
  }

  const toFetch = [];
  for (const pl of allPlaylists) {
    const courseId = `${chId}-${pl.playlistId}`;
    const existing = coursesMap.get(courseId);
    if (!existing) {
      console.log(`  + NEW playlist: [${pl.playlistId}] "${pl.title.slice(0, 55)}" (${pl.videoCount} vids)`);
      toFetch.push({ ...pl, courseId, isNew: true });
    } else if (existing.videoIds.length < 2) {
      console.log(`  ↺ RETRY (${existing.videoIds.length} vids): "${pl.title.slice(0, 50)}"`);
      toFetch.push({ ...pl, courseId, isNew: false });
    }
  }
  console.log(`  → ${toFetch.length} playlists to fetch/retry\n`);

  // ── Step 3: Fetch each missing/under-populated playlist ───────────────────
  if (toFetch.length > 0) {
    console.log("📥 Step 3: Fetching playlist videos…");
    for (const pl of toFetch) {
      await delay(800);
      const videos = await fetchAllPlaylistVideos(pl.playlistId, pl.title);
      if (videos.length === 0) {
        console.log(`    ✗ "${pl.title.slice(0, 50)}" — still 0 videos, skipping`);
        continue;
      }

      const topicIds = classify(pl.title);
      const videoIds = [];

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!videosMap.has(v.videoId)) {
          videosMap.set(v.videoId, {
            id: v.videoId,
            youtubeId: v.videoId,
            channelId: chId,
            courseIds: [pl.courseId],
            topicIds: classify(v.title),
            title: v.title,
            description: "",
            durationSeconds: v.durationSeconds,
            thumbnail: v.thumbnail,
            publishedAt: null,
            youtubeUrl: `https://youtu.be/${v.videoId}`,
            position: i,
          });
        } else {
          const ex = videosMap.get(v.videoId);
          if (!ex.courseIds.includes(pl.courseId)) ex.courseIds.push(pl.courseId);
          if (!ex.durationSeconds && v.durationSeconds) ex.durationSeconds = v.durationSeconds;
          if (v.thumbnail && (!ex.thumbnail || ex.thumbnail.includes("mqdefault"))) ex.thumbnail = v.thumbnail;
        }
        videoIds.push(v.videoId);
      }

      const course = {
        id: pl.courseId,
        channelId: chId,
        title: pl.title,
        description: `${videoIds.length} درس • قناة ${CHANNEL.displayName}`,
        playlistId: pl.playlistId,
        topicIds,
        videoIds,
        thumbnail: pl.thumbnail || videosMap.get(videoIds[0])?.thumbnail || null,
        order: orderCounter++,
        isGenerated: false,
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

  // ── Step 4: Re-classify ALL Alaa Hamed videos ─────────────────────────────
  console.log("\n🏷  Step 4: Re-classifying all videos…");
  let reclassified = 0;
  for (const v of videosMap.values()) {
    if (v.channelId !== chId) continue;
    const newTopics = classify(v.title);
    const changed = JSON.stringify(newTopics) !== JSON.stringify(v.topicIds);
    if (changed) {
      v.topicIds = newTopics;
      reclassified++;
    }
  }
  console.log(`  ✓ Reclassified ${reclassified} videos`);

  // ── Step 5: Rebuild topic-bucket virtual courses ──────────────────────────
  console.log("\n📁 Step 5: Rebuilding topic buckets…");
  const chVideos = Array.from(videosMap.values()).filter((v) => v.channelId === chId);

  for (const tc of TOPIC_COURSES) {
    const courseId = `${chId}-${tc.suffix}`;
    const matchingVideos = chVideos.filter((v) => v.topicIds.includes(tc.topicId));

    // Add this courseId to each matching video's courseIds
    for (const v of matchingVideos) {
      if (!v.courseIds.includes(courseId)) v.courseIds.push(courseId);
    }

    const videoIds = matchingVideos.map((v) => v.id);

    const course = {
      id: courseId,
      channelId: chId,
      title: tc.title,
      description: `${videoIds.length} فيديو مصنف ضمن موضوع ${tc.title.split(" — ")[0]}`,
      topicIds: [tc.topicId],
      videoIds,
      thumbnail: videosMap.get(videoIds[0])?.thumbnail || null,
      order: tc.order,
      isGenerated: true,
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

  // ── Step 6: Write back ────────────────────────────────────────────────────
  db.videos = Array.from(videosMap.values());

  const chVidsFinal = db.videos.filter((v) => v.channelId === chId);
  const chCoursesFinal = db.courses.filter((c) => c.channelId === chId);

  console.log("\n📊 النتائج النهائية لعلاء حامد:");
  console.log(`   فيديوهات فريدة: ${chVidsFinal.length}`);
  console.log(`   دورات/قوائم:   ${chCoursesFinal.length}`);
  console.log(`   بدون صورة:     ${chVidsFinal.filter((v) => !v.thumbnail).length}`);
  console.log(`   بدون مدة:      ${chVidsFinal.filter((v) => !v.durationSeconds).length}`);
  console.log(`\n   إجمالي كل القنوات:`);
  console.log(`   فيديو: ${db.videos.length} | دورات: ${db.courses.length}`);

  db.syncedAt = new Date().toISOString();
  const chObj = db.channels.find((c) => c.id === chId);
  if (chObj) chObj.syncedAt = new Date().toISOString();

  fs.writeFileSync(OUT_FILE, JSON.stringify(db, null, 2), "utf8");
  console.log(`\n✅  كُتب: ${OUT_FILE}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
