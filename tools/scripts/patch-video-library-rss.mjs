/**
 * patch-video-library-rss.mjs
 * Phase 2: Fill missing channels using RSS feed + Innertube playlists API.
 * Run AFTER sync-yt-scrape.mjs (or standalone to do everything from scratch).
 *
 *   node tools/scripts/patch-video-library-rss.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, "../../public/data/video-library.json");

const KEYWORDS = [
  ["anti-shubuhat",       ["شبهة", "شبهات", "الرد", "يرد", "ردود", "مناظرة", "رد على"]],
  ["atheism",             ["إلحاد", "ملحد", "الملاحدة", "داروين", "تطور", "مادية"]],
  ["comparative-religion",["نصرانية", "مسيحية", "كتاب مقدس", "إنجيل", "يهود", "أديان", "مقارنة"]],
  ["aqeedah",             ["عقيدة", "توحيد", "إيمان", "أسماء وصفات", "قدر", "الصحابة"]],
  ["fiqh",                ["فقه", "حكم", "أحكام", "صلاة", "صيام", "زكاة", "حج", "وضوء", "فتوى"]],
  ["tafseer",             ["تفسير", "تدبر", "سورة", "آية"]],
  ["quran",               ["قرآن", "تلاوة", "تجويد", "مصحف", "حفظ"]],
  ["hadith",              ["حديث", "صحيح", "البخاري", "مسلم", "السنة"]],
  ["seerah",              ["سيرة", "النبي", "الرسول", "غزوة", "صحابي"]],
  ["family",              ["زوج", "زوجة", "أبناء", "أسرة", "تربية", "الزواج"]],
  ["youth",               ["شباب", "مراهق", "جامعة", "عادة"]],
  ["daawah",              ["دعوة", "داعية", "نصيحة", "محاضرة", "خطبة"]],
  ["biography",           ["قصة", "ترجمة", "سيرة", "حياة"]],
];

function classify(text) {
  const lower = String(text).toLowerCase();
  const found = [];
  for (const [topic, words] of KEYWORDS) {
    if (words.some((w) => lower.includes(w))) found.push(topic);
  }
  return found.length ? [...new Set(found)] : ["general"];
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── RSS feed parser ─────────────────────────────────────────────────────────

async function fetchRSS(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS ${channelId}: HTTP ${res.status}`);
  const xml = await res.text();

  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  return entries.map(m => {
    const block = m[1];
    const videoId = (block.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1] || "";
    const title   = (block.match(/<title>(.*?)<\/title>/) || [])[1] || "";
    const published = (block.match(/<published>(.*?)<\/published>/) || [])[1] || "";
    // Unescape XML entities
    const cleanTitle = title.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
    return { videoId, title: cleanTitle, publishedAt: published.slice(0,10) };
  }).filter(e => e.videoId);
}

// ─── Innertube playlists ─────────────────────────────────────────────────────

const INNERTUBE_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240417.00.00",
    hl: "ar",
    gl: "SA",
  }
};

async function innertubeBrowse(browseId, params) {
  const body = { context: INNERTUBE_CONTEXT, browseId };
  if (params) body.params = params;
  const res = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-YouTube-Client-Name": "1",
      "X-YouTube-Client-Version": "2.20240417.00.00",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.warn(`    innertube browse ${browseId}: HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

function findAll(obj, key, results = []) {
  if (Array.isArray(obj)) { obj.forEach(i => findAll(i, key, results)); return results; }
  if (obj && typeof obj === "object") {
    if (key in obj) results.push(obj[key]);
    Object.values(obj).forEach(v => findAll(v, key, results));
  }
  return results;
}

function extractText(renderer) {
  if (!renderer) return "";
  if (renderer.runs) return renderer.runs.map(r => r.text || "").join("");
  if (renderer.simpleText) return renderer.simpleText;
  return "";
}

async function fetchPlaylists(youtubeChannelId) {
  // params = base64-encoded proto for "playlists" tab
  // The proto field 2 = 10 (browse tab), EglwbGF5bGlzdHMYAA== was legacy
  // Try with just the channel id and get the playlists tab
  const PARAMS_PLAYLISTS = "EglwbGF5bGlzdHMYAA==";
  const data = await innertubeBrowse(youtubeChannelId, PARAMS_PLAYLISTS);
  if (!data) return [];

  const playlists = [];

  // Look for lockupViewModel (new YouTube)
  const lockups = findAll(data, "lockupViewModel");
  for (const lv of lockups) {
    // contentId might be a playlistId directly
    let playlistId = lv.contentId;
    if (!playlistId) {
      const pids = findAll(lv, "playlistId").filter(p => typeof p === "string" && p.length > 5);
      playlistId = pids[0];
    }
    if (!playlistId || typeof playlistId !== "string") continue;
    // Accept PL-prefixed AND any alphanumeric playlist ID
    if (playlistId.length < 5) continue;

    const titleRaw = lv.metadata?.lockupMetadataViewModel?.title
      || lv.title;
    const title = extractText(titleRaw)
      || findAll(lv, "title")[0]?.content
      || findAll(lv, "title")[0]?.runs?.[0]?.text
      || "";

    // Don't filter by videoCount — try fetching regardless
    const countText = findAll(lv, "text").find(t => /\d/.test(String(t))) || "";
    const videoCount = parseInt(String(countText).replace(/[^0-9]/g, "")) || 1;

    const thumbs = findAll(lv, "thumbnails").flat().filter(t => t?.url);
    const thumb = thumbs.slice(-1)[0]?.url || null;
    if (title) playlists.push({ playlistId, title, videoCount, thumbnail: thumb });
  }

  // Also look for gridPlaylistRenderer (old YouTube)
  if (playlists.length === 0) {
    const gprs = findAll(data, "gridPlaylistRenderer");
    for (const p of gprs) {
      const playlistId = p.playlistId;
      if (!playlistId) continue;
      const title = extractText(p.title);
      const countText = p.videoCountText?.runs?.[0]?.text || "";
      const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 0;
      const thumbs = p.thumbnail?.thumbnails || [];
      const thumb = thumbs.slice(-1)[0]?.url || null;
      playlists.push({ playlistId, title, videoCount, thumbnail: thumb });
    }
  }

  // Also look for playlistRenderer
  if (playlists.length === 0) {
    const prs = findAll(data, "playlistRenderer");
    for (const p of prs) {
      const playlistId = p.playlistId;
      if (!playlistId) continue;
      const title = extractText(p.title);
      const countText = p.videoCountText?.simpleText || "";
      const videoCount = parseInt(countText.replace(/[^0-9]/g, "")) || 0;
      playlists.push({ playlistId, title, videoCount, thumbnail: null });
    }
  }

  return playlists;
}

function parseDurationText(text) {
  if (!text) return 0;
  const parts = text.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

async function fetchPlaylistItems(playlistId) {
  // Try browse with VL prefix
  const data = await innertubeBrowse(`VL${playlistId}`);
  if (!data) return [];

  const videos = [];

  // Try playlistVideoRenderer (standard)
  const pvrs = findAll(data, "playlistVideoRenderer");
  for (const v of pvrs) {
    const videoId = v.videoId;
    if (!videoId) continue;
    const title = extractText(v.title);
    const durationText = v.lengthText?.simpleText || extractText(v.lengthText) || "";
    const durationSeconds = parseDurationText(durationText);
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumb = thumbs.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const position = typeof v.index?.simpleText === "string" ? parseInt(v.index.simpleText) - 1 : videos.length;
    videos.push({ videoId, title, durationSeconds, thumbnail: thumb, position });
  }

  if (videos.length > 0) return videos;

  // Fallback: playlistPanelVideoRenderer
  const ppvrs = findAll(data, "playlistPanelVideoRenderer");
  for (const v of ppvrs) {
    const videoId = v.videoId;
    if (!videoId) continue;
    const title = extractText(v.title);
    const durationText = v.lengthText?.simpleText || extractText(v.lengthText) || "";
    const durationSeconds = parseDurationText(durationText);
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumb = thumbs.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    videos.push({ videoId, title, durationSeconds, thumbnail: thumb, position: videos.length });
  }

  if (videos.length > 0) return videos;

  // Fallback: richItemRenderer → videoRenderer
  const richItems = findAll(data, "richItemRenderer");
  for (const ri of richItems) {
    const vr = ri.content?.videoRenderer || ri.content?.reelItemRenderer;
    if (!vr?.videoId) continue;
    const title = extractText(vr.title);
    const durationText = vr.lengthText?.simpleText || extractText(vr.lengthText) || "";
    const durationSeconds = parseDurationText(durationText);
    const thumbs = vr.thumbnail?.thumbnails || [];
    const thumb = thumbs.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
    videos.push({ videoId: vr.videoId, title, durationSeconds, thumbnail: thumb, position: videos.length });
  }

  return videos;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const videosById = new Map(db.videos.map(v => [v.id, v]));
  const coursesById = new Map(db.courses.map(c => [c.id, c]));

  for (const channel of db.channels) {
    console.log(`\n▶ ${channel.displayName} (${channel.id})`);
    const existingVideos = db.videos.filter(v => v.channelId === channel.id).length;
    const hasUploads = db.courses.some(c => c.id === `${channel.id}-uploads`);

    // ── 1. Fill missing videos via RSS ──────────────────────────────────────
    if (existingVideos === 0 && channel.youtubeChannelId) {
      console.log(`  ↳ Fetching RSS (channel has 0 videos)...`);
      try {
        const rssVideos = await fetchRSS(channel.youtubeChannelId);
        const uploadsId = `${channel.id}-uploads`;
        const uploadsVideoIds = [];

        for (const v of rssVideos) {
          if (!videosById.has(v.videoId)) {
            const topicIds = classify(v.title);
            const video = {
              id: v.videoId,
              youtubeId: v.videoId,
              channelId: channel.id,
              courseIds: [uploadsId],
              topicIds,
              title: v.title || "بدون عنوان",
              description: "",
              durationSeconds: 0,
              thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              publishedAt: v.publishedAt || null,
              youtubeUrl: `https://youtu.be/${v.videoId}`,
              position: uploadsVideoIds.length,
            };
            videosById.set(v.videoId, video);
            db.videos.push(video);
          }
          uploadsVideoIds.push(v.videoId);
        }

        if (uploadsVideoIds.length > 0 && !hasUploads) {
          const course = {
            id: uploadsId,
            channelId: channel.id,
            title: `آخر فيديوهات ${channel.displayName}`,
            description: `أحدث الفيديوهات من قناة ${channel.displayName}`,
            topicIds: classify(channel.displayName),
            videoIds: uploadsVideoIds,
            thumbnail: `https://i.ytimg.com/vi/${uploadsVideoIds[0]}/hqdefault.jpg`,
            order: channel.order * 100,
            isGenerated: false,
            isUploads: true,
          };
          coursesById.set(uploadsId, course);
          db.courses.push(course);
        }
        console.log(`  ✓ RSS: ${uploadsVideoIds.length} videos added`);
      } catch (e) {
        console.warn(`  ⚠ RSS failed: ${e.message}`);
      }
    }

    // ── 2. Fetch playlists via Innertube ────────────────────────────────────
    const existingPlaylists = db.courses.filter(c =>
      c.channelId === channel.id && c.id !== `${channel.id}-uploads`
    ).length;

    if (existingPlaylists === 0 && channel.youtubeChannelId) {
      console.log(`  ↳ Fetching playlists via Innertube...`);
      await delay(600);

      try {
        const playlists = await fetchPlaylists(channel.youtubeChannelId);
        console.log(`  Found ${playlists.length} playlists`);

        let plOrder = channel.order * 100 + 1;
        for (const pl of playlists.slice(0, 15)) {
          if (!pl.playlistId) continue;
          const courseId = `${channel.id}-${pl.playlistId}`;
          if (coursesById.has(courseId)) continue;
          if (!pl.playlistId) continue;

          await delay(500);
          let items = [];
          try { items = await fetchPlaylistItems(pl.playlistId); } catch (e) {
            console.warn(`    ⚠ ${pl.playlistId}: ${e.message}`);
            continue;
          }
          if (items.length === 0) continue;

          const topicIds = classify(pl.title);
          const videoIds = [];

          for (let i = 0; i < items.length; i++) {
            const v = items[i];
            if (!videosById.has(v.videoId)) {
              const vObj = {
                id: v.videoId,
                youtubeId: v.videoId,
                channelId: channel.id,
                courseIds: [courseId],
                topicIds: classify(v.title),
                title: v.title || "بدون عنوان",
                description: "",
                durationSeconds: v.durationSeconds,
                thumbnail: v.thumbnail,
                publishedAt: null,
                youtubeUrl: `https://youtu.be/${v.videoId}`,
                position: i,
              };
              videosById.set(v.videoId, vObj);
              db.videos.push(vObj);
            } else {
              const existing = videosById.get(v.videoId);
              if (!existing.courseIds.includes(courseId)) existing.courseIds.push(courseId);
            }
            videoIds.push(v.videoId);
          }

          if (videoIds.length > 0) {
            const course = {
              id: courseId,
              channelId: channel.id,
              title: pl.title,
              description: `${items.length} درس • قناة ${channel.displayName}`,
              playlistId: pl.playlistId,
              topicIds,
              videoIds,
              thumbnail: pl.thumbnail || `https://i.ytimg.com/vi/${videoIds[0]}/hqdefault.jpg`,
              order: plOrder++,
              isGenerated: false,
            };
            coursesById.set(courseId, course);
            db.courses.push(course);
            console.log(`    ✓ "${pl.title}" — ${videoIds.length} videos`);
          }
        }
      } catch (e) {
        console.warn(`  ⚠ Playlists failed: ${e.message}`);
      }
    }
  }

  // Rebuild videos from Map (they were mutated in-place)
  db.videos = [...videosById.values()];
  db.courses = [...coursesById.values()];
  db.generatedAt = new Date().toISOString();

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  console.log(`\n✅ Done: ${db.videos.length} videos • ${db.courses.length} courses`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
