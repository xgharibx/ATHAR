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


const KEY = process.env.YT_API_KEY;
if (!KEY) {
  console.error("Set YT_API_KEY. The key must never be committed or bundled — it is a build-time input only.");
  process.exit(1);
}

/** Stop pulling a single channel after this many uploads. */
const MAX_PER_CHANNEL = Number(process.env.MAX_PER_CHANNEL ?? 3000);
/** Playlists to pull per channel. */
const MAX_PLAYLISTS = Number(process.env.MAX_PLAYLISTS ?? 200);
/** A playlist below this is a stray, not a course. */
const MIN_PLAYLIST_VIDEOS = 3;
/** A topic needs this many of a channel's videos to earn a virtual course. */
const MIN_VIDEOS_FOR_VIRTUAL = 8;
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

/** Every playlist a channel publishes — these are the real dawrat. */
async function playlistsFor(channelId) {
  const out = [];
  let pageToken = "";
  do {
    const j = await api("playlists", {
      part: "snippet,contentDetails",
      channelId,
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const p of j.items ?? []) {
      out.push({
        playlistId: p.id,
        title: p.snippet?.title ?? "",
        description: p.snippet?.description ?? "",
        count: p.contentDetails?.itemCount ?? 0,
      });
    }
    pageToken = j.nextPageToken ?? "";
  } while (pageToken && out.length < MAX_PLAYLISTS);
  return out.slice(0, MAX_PLAYLISTS);
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
  const courses = [];

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

      // ── every upload ──
      const ids = await allVideoIds(uploads);
      const items = await hydrate(ids);

      // ── the channel's playlists: these are the real dawrat ──
      const playlists = await playlistsFor(ytId);
      const memberOf = new Map(); // videoId → [courseId]
      let courseCount = 0;

      for (const pl of playlists) {
        if (pl.count < MIN_PLAYLIST_VIDEOS) continue;
        const plIds = await allVideoIds(pl.playlistId);
        if (plIds.length < MIN_PLAYLIST_VIDEOS) continue;
        const courseId = `${ch.id}-${pl.playlistId}`;
        courses.push({
          id: courseId,
          channelId: ch.id,
          title: pl.title,
          description: pl.description?.slice(0, 400) ?? "",
          topicIds: classify(`${pl.title} ${pl.description ?? ""}`),
          videoIds: plIds,
        });
        courseCount += 1;
        plIds.forEach((vid, i) => {
          const list = memberOf.get(vid) ?? [];
          list.push({ courseId, position: i });
          memberOf.set(vid, list);
        });
      }

      // ── videos, classified and placed ──
      const channelVideos = [];
      let shorts = 0;
      for (const it of items) {
        const secs = isoDurationToSeconds(it.contentDetails?.duration);
        if (secs > 0 && secs <= 180) shorts += 1;
        const title = it.snippet?.title ?? "";
        const memberships = memberOf.get(it.id) ?? [];
        const v = {
          id: it.id,
          youtubeId: it.id,
          channelId: ch.id,
          courseIds: [`${ch.id}-uploads`, ...memberships.map((m) => m.courseId)],
          topicIds: classify(title),
          title,
          description: "",
          durationSeconds: secs,
          thumbnail: bestThumb(it.snippet?.thumbnails),
          publishedAt: it.snippet?.publishedAt,
          position: memberships[0]?.position,
        };
        channelVideos.push(v);
        videos.push(v);
      }

      // ── the uploads course ──
      courses.push({
        id: `${ch.id}-uploads`,
        channelId: ch.id,
        title: `آخر فيديوهات ${ch.displayName}`,
        description: `أحدث فيديوهات قناة ${ch.displayName}`,
        topicIds: ["general"],
        videoIds: channelVideos.map((v) => v.id),
      });

      // ── virtual courses, one per topic that has enough material ──
      const byTopic = new Map();
      for (const v of channelVideos) {
        for (const t of v.topicIds) {
          if (t === "general") continue;
          const list = byTopic.get(t) ?? [];
          list.push(v.id);
          byTopic.set(t, list);
        }
      }
      let virtual = 0;
      for (const [topicId, vidIds] of byTopic) {
        if (vidIds.length < MIN_VIDEOS_FOR_VIRTUAL) continue;
        const topic = TOPICS.find((t) => t.id === topicId);
        const courseId = `${ch.id}-topic-${topicId}`;
        courses.push({
          id: courseId,
          channelId: ch.id,
          title: `${topic?.title ?? topicId} — ${ch.displayName}`,
          description: topic?.description ?? "",
          topicIds: [topicId],
          videoIds: vidIds,
        });
        virtual += 1;
        for (const vid of vidIds) {
          const v = channelVideos.find((x) => x.id === vid);
          if (v && !v.courseIds.includes(courseId)) v.courseIds.push(courseId);
        }
      }

      console.log(
        `  ✅ ${ch.displayName}: ${items.length} videos (${shorts} short) · ${courseCount} دورة · ${virtual} موضوعية`,
      );
    } catch (err) {
      console.error(`  ❌ ${ch.displayName}: ${err.message}`);
      if (String(err.message).includes("QUOTA")) throw err;
    }
  }

  // ── Drop courses we cannot actually play ──
  //
  // A playlist can reference videos beyond the per-channel cap, or clips from
  // another channel entirely. Those courses would render as an empty dawra —
  // worse than not listing them. Trim each course to the videos we hold, then
  // drop whatever is left too thin to be a course.
  const haveIds = new Set(videos.map((v) => v.id));
  const keptCourses = [];
  let pruned = 0;
  for (const c of courses) {
    const resolvable = c.videoIds.filter((id) => haveIds.has(id));
    if (c.id.endsWith("-uploads") || resolvable.length >= MIN_PLAYLIST_VIDEOS) {
      keptCourses.push({ ...c, videoIds: resolvable });
    } else {
      pruned += 1;
    }
  }
  if (pruned) console.log(`
  pruned ${pruned} course(s) with too few playable videos`);

  // A video must not advertise membership of a course that no longer exists.
  const keptCourseIds = new Set(keptCourses.map((c) => c.id));
  for (const v of videos) {
    v.courseIds = v.courseIds.filter((id) => keptCourseIds.has(id));
  }
  courses.length = 0;
  courses.push(...keptCourses);

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
    topics: TOPICS,
    courses,
    videos,
    generatedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };
  // Compact: pretty-printing puts every one of ~12,000 video ids on its own
  // line and costs megabytes the client has to download.
  fs.writeFileSync(OUT_FILE, JSON.stringify(output), "utf8");
  console.log(`\n✅  wrote ${OUT_FILE}`);
  console.log(`    +${after - before} videos, ${shortsAfter} shorts available to the feed\n`);
}

main().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exitCode = 1;
});
