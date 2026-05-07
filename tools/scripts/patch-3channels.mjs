/**
 * patch-3channels.mjs
 *
 * Targeted deep-sync for 3 channels using the exact playlist URLs provided:
 *   https://www.youtube.com/@3laaHamed/playlists
 *   https://www.youtube.com/@amgad_samir/playlists
 *   https://www.youtube.com/@othmanalkamees/playlists
 *
 * Strategy:
 *   1. Scrape each /playlists page (HTML ytInitialData) to collect ALL playlist IDs
 *      including continuation-paged ones
 *   2. Compare with existing JSON — find playlists that:
 *        a) are completely NEW (not in our data at all)
 *        b) exist but have 0 or very few videos (< 2)
 *   3. For each such playlist, fetch its videos via Innertube with multiple fallbacks
 *   4. Merge into existing video-library.json and write back
 *
 * Run: node tools/scripts/patch-3channels.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE  = path.resolve(__dirname, "../../public/data/video-library.json");

const TARGETS = [
  {
    id: "alaa-hamed",
    channelId: "UCwLgnvgp32d8bHtQljXqWeQ",
    displayName: "علاء حامد",
    playlistsUrl: "https://www.youtube.com/@3laaHamed/playlists",
    videosUrl:    "https://www.youtube.com/@3laaHamed/videos",
    accent: "#fbbf24",
  },
  {
    id: "amgad-samir",
    channelId: "UC_FFy2YxiElNMba-t-6VwTA",
    displayName: "أمجد سمير",
    playlistsUrl: "https://www.youtube.com/@amgad_samir/playlists",
    videosUrl:    "https://www.youtube.com/@amgad_samir/videos",
    accent: "#38bdf8",
  },
  {
    id: "othman-alkamees",
    channelId: "UCWjCSGhmSGu0VLf2mPFS0Kg",
    displayName: "عثمان الخميس",
    playlistsUrl: "https://www.youtube.com/@othmanalkamees/playlists",
    videosUrl:    "https://www.youtube.com/@othmanalkamees/videos",
    accent: "#34d399",
  },
];

const MAX_PL_VIDEOS = Number(process.env.MAX_PL_VIDEOS ?? 300);

// ─── Innertube ────────────────────────────────────────────────────────────────

const IT_KEY  = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const IT_BASE = "https://www.youtube.com/youtubei/v1";
const IT_CTX  = {
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
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function delay(ms) { return new Promise(r => setTimeout(r, ms + Math.random() * 300)); }

async function itPost(endpoint, body, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(`${IT_BASE}/${endpoint}?prettyPrint=false`, {
        method: "POST",
        headers: IT_HDRS,
        body: JSON.stringify(body),
      });
      if (res.status === 429) { await delay(i * 4000); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries) throw e;
      await delay(i * 2000);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findAll(obj, key, out = []) {
  if (Array.isArray(obj)) { obj.forEach(i => findAll(i, key, out)); return out; }
  if (obj && typeof obj === "object") {
    if (key in obj) out.push(obj[key]);
    for (const v of Object.values(obj)) findAll(v, key, out);
  }
  return out;
}

function extractText(n) {
  if (!n) return "";
  if (typeof n === "string") return n;
  if (n.runs) return n.runs.map(r => r.text || "").join("");
  if (n.simpleText) return n.simpleText;
  if (n.content) return String(n.content);
  return "";
}

function parseDuration(text) {
  if (!text) return 0;
  const s = String(text).trim();
  const parts = s.split(":").map(p => parseInt(p, 10));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function bestThumb(videoId) { return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`; }

function findToken(data) {
  for (const cmd of findAll(data, "continuationCommand")) {
    if (typeof cmd?.token === "string" && cmd.token.length > 10) return cmd.token;
  }
  for (const n of findAll(data, "nextContinuationData")) {
    if (n?.continuation) return n.continuation;
  }
  return null;
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

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

// ─── Scrape /playlists page ────────────────────────────────────────────────────

async function scrapePlaylistsPage(url, displayName) {
  console.log(`  ↳ Scraping: ${url}`);
  const res = await fetch(url, { headers: HTML_HDRS });
  const html = await res.text();

  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start === -1) { console.warn(`  ⚠ No ytInitialData on ${url}`); return []; }

  let data;
  try { data = JSON.parse(extractJsonAt(html, start + marker.length)); }
  catch (e) { console.warn(`  ⚠ JSON parse error: ${e.message}`); return []; }

  return extractPlaylistsFromData(data, displayName);
}

function extractPlaylistsFromData(data, displayName = "") {
  const results = [];
  const seen = new Set();

  function push(pid, title, videoCount, thumb) {
    if (!pid || seen.has(pid)) return;
    if (pid === "LL" || pid === "WL") return;
    if (pid.startsWith("UU")) return; // uploads playlist
    seen.add(pid);
    results.push({ playlistId: pid, title: title || `قائمة ${displayName}`, videoCount: videoCount || 1, thumbnail: thumb || null });
  }

  // New YouTube UI: lockupViewModel
  for (const lv of findAll(data, "lockupViewModel")) {
    let pid = lv.entityId || lv.contentId;
    if (!pid) {
      const pids = findAll(lv, "playlistId").filter(p => typeof p === "string" && p.length > 3);
      pid = pids[0];
    }
    if (!pid) continue;
    if (pid.startsWith("VL")) pid = pid.slice(2);
    const title = extractText(lv.metadata?.lockupMetadataViewModel?.title || lv.title);
    const countTexts = findAll(lv, "text").map(String).filter(t => /^\d+$/.test(t.trim()));
    const videoCount = countTexts.length > 0 ? parseInt(countTexts[0]) : 1;
    const thumbs = findAll(lv, "thumbnails").flat().filter(t => t?.url);
    const thumb = thumbs.slice(-1)[0]?.url || null;
    push(pid, title, videoCount, thumb);
  }

  // Old YouTube UI: gridPlaylistRenderer
  for (const p of findAll(data, "gridPlaylistRenderer")) {
    const pid = p.playlistId;
    if (!pid) continue;
    const title = extractText(p.title);
    const countText = p.videoCountText?.runs?.[0]?.text || p.videoCountShortText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    const thumbs = p.thumbnail?.thumbnails || [];
    const thumb = thumbs.slice(-1)[0]?.url || null;
    push(pid, title, videoCount, thumb);
  }

  // richItemRenderer wrapping playlist
  for (const ri of findAll(data, "richItemRenderer")) {
    const pr = ri.content?.playlistRenderer || ri.content?.gridPlaylistRenderer;
    if (!pr?.playlistId) continue;
    const title = extractText(pr.title);
    const countText = pr.videoCountText?.simpleText || pr.videoCountShortText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    push(pr.playlistId, title, videoCount, null);
  }

  // Direct playlistRenderer
  for (const p of findAll(data, "playlistRenderer")) {
    if (!p.playlistId) continue;
    const title = extractText(p.title);
    const countText = p.videoCountText?.simpleText || "";
    const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 1;
    push(p.playlistId, title, videoCount, null);
  }

  return results;
}

// ─── Paginated playlist items ─────────────────────────────────────────────────

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
    const durationSeconds = typeof r.lengthSeconds === "number" ? r.lengthSeconds
      : typeof r.lengthSeconds === "string" ? (parseInt(r.lengthSeconds, 10) || parseDuration(durText))
      : parseDuration(String(durText));
    const thumbs = r.thumbnail?.thumbnails || r.thumbnails?.[0]?.thumbnails || [];
    const thumb = thumbs.find(t => t.width >= 320) || thumbs.slice(-1)[0] || null;
    const posRaw = r.index?.simpleText ?? r.index?.runs?.[0]?.text;
    const position = posRaw != null ? (parseInt(posRaw, 10) - 1 || 0) : pos;
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

async function fetchPlaylistVideos(playlistId, maxItems = MAX_PL_VIDEOS, label = "") {
  const all = [];
  const seen = new Set();
  console.log(`    ↳ Fetching playlist [${playlistId}] "${label}" (max ${maxItems})`);

  let data;
  try { data = await itBrowse("VL" + playlistId); }
  catch (e) {
    console.warn(`    ⚠ Browse failed: ${e.message}`);
    return all;
  }

  const batch = extractVideos(data);
  for (const v of batch) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }

  let token = findToken(data);
  let pages = 0;
  while (token && all.length < maxItems && pages < 20) {
    await delay(900);
    let cont;
    try { cont = await itContinue(token); } catch (e) { break; }
    const more = extractVideos(cont);
    if (more.length === 0) break;
    for (const v of more) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
    token = findToken(cont);
    pages++;
  }

  // Fallback: try fetching the public YouTube playlist page HTML
  if (all.length === 0) {
    console.log(`    ↳ Innertube got 0 — trying HTML playlist page...`);
    try {
      const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, { headers: HTML_HDRS });
      const html = await res.text();
      const marker = "var ytInitialData = ";
      const start = html.indexOf(marker);
      if (start !== -1) {
        const pageData = JSON.parse(extractJsonAt(html, start + marker.length));
        const htmlVideos = extractVideos(pageData);
        for (const v of htmlVideos) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
        if (all.length > 0) {
          // Try to paginate via continuation in the HTML page data
          let htmlToken = findToken(pageData);
          let htmlPages = 0;
          while (htmlToken && all.length < maxItems && htmlPages < 10) {
            await delay(900);
            let cont2;
            try { cont2 = await itContinue(htmlToken); } catch { break; }
            const more2 = extractVideos(cont2);
            if (more2.length === 0) break;
            for (const v of more2) { if (!seen.has(v.videoId)) { seen.add(v.videoId); all.push(v); } }
            htmlToken = findToken(cont2);
            htmlPages++;
          }
        }
      }
    } catch (e) {
      console.warn(`    ⚠ HTML playlist fallback failed: ${e.message}`);
    }
  }

  return all;
}

// ─── Keyword classifier ───────────────────────────────────────────────────────

const KEYWORD_MAP = [
  ["anti-shubuhat",       ["شبهة","شبهات","رد على","ردود","مناظرة","نقد","دحض","إشكال","تفنيد","فرية","افتراء"]],
  ["atheism",             ["إلحاد","ملحد","الملاحدة","داروين","تطور","مادية","لا أدرية"]],
  ["comparative-religion",["نصرانية","مسيحية","كتاب مقدس","إنجيل","يهود","توراة","أديان","مقارنة الأديان","الكنيسة"]],
  ["aqeedah",             ["عقيدة","توحيد","إيمان","أسماء الله","صفات الله","القدر","الصفات","أصول","اعتقاد"]],
  ["fiqh",                ["فقه","حكم","أحكام","صلاة","صيام","زكاة","حج","وضوء","فتوى","طهارة","مسألة","عبادة","معاملات","نكاح","طلاق","بيع","ربا"]],
  ["tafseer",             ["تفسير","تدبر","سورة","آية","تأمل","تأملات","شرح سورة","تفسير القرآن","التفسير"]],
  ["quran",               ["قرآن","القرآن","تلاوة","تجويد","مصحف","حفظ القرآن","علوم القرآن","أحكام التجويد"]],
  ["hadith",              ["حديث","الحديث","صحيح","البخاري","مسلم","السنة","الأربعين","رياض الصالحين","شرح حديث","مصطلح الحديث","سنن"]],
  ["seerah",              ["سيرة","النبي ﷺ","الرسول","غزوة","صحابي","المغازي","الهجرة","الصحابة","الخلفاء"]],
  ["tazkiyah",            ["تزكية","روحي","التوبة","الزهد","الورع","التقوى","الإخلاص","القلب","الخشوع","سوبر مسلم","خريطة التزكية"]],
  ["family",              ["زوج","زوجة","أبناء","أسرة","تربية الأولاد","الزواج","البيت","المرأة","الأمومة"]],
  ["youth",               ["شباب","الشباب","مراهق","جامعة","عادة","هوية"]],
  ["daawah",              ["دعوة","الدعوة","داعية","محاضرة","خطبة","نصيحة","أسلم","الإسلام"]],
  ["biography",           ["قصة","ترجمة","سيرة العالم","حياة","تراجم","العلماء","الإمام","الشيخ","أعلام"]],
];

function classify(text) {
  const lower = String(text || "").toLowerCase();
  const scores = {};
  for (const [topic, words] of KEYWORD_MAP) {
    let score = 0;
    for (const w of words) { if (lower.includes(w)) score += w.length > 5 ? 3 : 1; }
    if (score > 0) scores[topic] = score;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return ["general"];
  return sorted.slice(0, 3).map(([t]) => t);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧  Patching 3 channels — deep playlist sync\n");

  // Load existing DB
  const db = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
  const videosMap = new Map(db.videos.map(v => [v.id, v]));
  const coursesMap = new Map(db.courses.map(c => [c.id, c]));

  for (const target of TARGETS) {
    console.log(`\n▶  ${target.displayName} (@${target.playlistsUrl.split("/@")[1].split("/")[0]})`);

    // ── Step 1: Get full playlist list from HTML page ─────────────────────────
    let allPlaylists = [];
    try {
      allPlaylists = await scrapePlaylistsPage(target.playlistsUrl, target.displayName);
      console.log(`  Found ${allPlaylists.length} playlists on page`);
    } catch (e) {
      console.warn(`  ⚠ Scrape failed: ${e.message}`);
    }

    // ── Step 2: Find what we're missing or under-populated ────────────────────
    const toFetch = [];

    for (const pl of allPlaylists) {
      const courseId = `${target.id}-${pl.playlistId}`;
      const existing = coursesMap.get(courseId);

      if (!existing) {
        console.log(`  + NEW: [${pl.playlistId}] "${pl.title.slice(0, 55)}" (${pl.videoCount} vids)`);
        toFetch.push({ ...pl, courseId, isNew: true });
      } else if (existing.videoIds.length < 2) {
        console.log(`  ↺ RETRY (${existing.videoIds.length} vids): [${pl.playlistId}] "${pl.title.slice(0, 50)}"`);
        toFetch.push({ ...pl, courseId, isNew: false });
      } else {
        // Already have it — skip
      }
    }

    console.log(`  → ${toFetch.length} playlists to fetch/retry`);

    if (toFetch.length === 0) {
      console.log(`  ✅ ${target.displayName}: already fully synced`);
      continue;
    }

    // ── Step 3: Fetch each missing/empty playlist ──────────────────────────────
    let added = 0;
    let channelOrder = (db.courses.filter(c => c.channelId === target.id).length + 1) * 100;

    for (const pl of toFetch) {
      await delay(800);
      const videos = await fetchPlaylistVideos(pl.playlistId, MAX_PL_VIDEOS, pl.title);

      if (videos.length === 0) {
        console.log(`    ✗ "${pl.title.slice(0, 50)}" — still 0 videos, skipping`);
        continue;
      }

      const topicIds = classify(pl.title);
      const videoIds = [];

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (!videosMap.has(v.videoId)) {
          const vid = {
            id: v.videoId,
            youtubeId: v.videoId,
            channelId: target.id,
            courseIds: [pl.courseId],
            topicIds: classify(v.title),
            title: v.title,
            description: "",
            durationSeconds: v.durationSeconds,
            thumbnail: v.thumbnail,
            publishedAt: null,
            youtubeUrl: `https://youtu.be/${v.videoId}`,
            position: i,
          };
          videosMap.set(v.videoId, vid);
        } else {
          const ex = videosMap.get(v.videoId);
          if (!ex.courseIds.includes(pl.courseId)) ex.courseIds.push(pl.courseId);
          if (!ex.durationSeconds && v.durationSeconds) ex.durationSeconds = v.durationSeconds;
          if (!ex.thumbnail || ex.thumbnail.includes("mqdefault")) ex.thumbnail = v.thumbnail;
        }
        videoIds.push(v.videoId);
      }

      // Build total duration
      const totalSecs = videoIds.reduce((s, vid) => s + (videosMap.get(vid)?.durationSeconds || 0), 0);

      const course = {
        id: pl.courseId,
        channelId: target.id,
        title: pl.title,
        description: `${videoIds.length} درس • قناة ${target.displayName}`,
        playlistId: pl.playlistId,
        topicIds,
        videoIds,
        thumbnail: pl.thumbnail || videosMap.get(videoIds[0])?.thumbnail || null,
        order: channelOrder++,
        isGenerated: false,
      };

      // Replace or add
      if (coursesMap.has(pl.courseId)) {
        // Update existing (was empty before)
        const idx = db.courses.findIndex(c => c.id === pl.courseId);
        if (idx !== -1) db.courses[idx] = course;
      } else {
        db.courses.push(course);
      }
      coursesMap.set(pl.courseId, course);

      console.log(`    ✓ "${pl.title.slice(0, 55)}" — ${videoIds.length} videos`);
      added++;
    }

    console.log(`  ✅ ${target.displayName}: ${added} playlists synced/fixed`);
  }

  // ── Rebuild videos array from map ──────────────────────────────────────────
  db.videos = Array.from(videosMap.values());

  // ── Stats ──────────────────────────────────────────────────────────────────
  console.log("\n📊 النتائج:");
  for (const t of TARGETS) {
    const vids = db.videos.filter(v => v.channelId === t.id).length;
    const courses = db.courses.filter(c => c.channelId === t.id && !c.isUploads && !c.isVirtual).length;
    console.log(`   ${t.displayName}: ${vids} فيديو • ${courses} قائمة/دورة`);
  }
  const total = db.videos.length;
  const totalCourses = db.courses.length;
  console.log(`\n   🎯 الإجمالي: ${total} فيديو • ${totalCourses} دورة`);

  // ── Write ──────────────────────────────────────────────────────────────────
  fs.writeFileSync(OUT_FILE, JSON.stringify(db, null, 2), "utf8");
  console.log(`\n✅ كُتب: ${OUT_FILE}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
