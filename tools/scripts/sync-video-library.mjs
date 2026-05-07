import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../../public/data/video-library.json");
const API = "https://www.googleapis.com/youtube/v3";

const CHANNELS = [
  { id: "alaa-hamed", handle: "@3laaHamed", displayName: "علاء حامد", accent: "#fbbf24", order: 1 },
  { id: "amgad-samir", handle: "@amgad_samir", displayName: "أمجد سمير", accent: "#38bdf8", order: 2 },
  { id: "haitham-talaat", handle: "@Dr.Haitham_Talaat", displayName: "د. هيثم طلعت", accent: "#a78bfa", order: 3 },
  { id: "anti-shubohat", handle: "@AntiShubohat", displayName: "مقاومة الشبهات", accent: "#fb7185", order: 4 },
  { id: "anti-shubohat-2", handle: "@AntiShubohat.2", displayName: "مقاومة الشبهات ٢", accent: "#f97316", order: 5 },
  { id: "othman-alkamees", handle: "@othmanalkamees", displayName: "عثمان الخميس", accent: "#34d399", order: 6 },
];

const TOPICS = [
  { id: "aqeedah", title: "العقيدة", icon: "◇", accent: "#a78bfa", description: "الإيمان، التوحيد، وأصول الاعتقاد." },
  { id: "anti-shubuhat", title: "الشبهات", icon: "⚑", accent: "#fb7185", description: "الردود الفكرية والمنهجية على الشبهات." },
  { id: "fiqh", title: "الفقه", icon: "§", accent: "#34d399", description: "أحكام العبادات والمعاملات." },
  { id: "quran", title: "القرآن", icon: "▣", accent: "#fbbf24", description: "علوم القرآن والتلاوة والتدبر." },
  { id: "tafseer", title: "التفسير", icon: "☼", accent: "#f59e0b", description: "شرح الآيات والسور." },
  { id: "hadith", title: "الحديث", icon: "◈", accent: "#38bdf8", description: "شرح الأحاديث والسنن." },
  { id: "seerah", title: "السيرة", icon: "✦", accent: "#c084fc", description: "السيرة النبوية والتاريخ الإسلامي." },
  { id: "daawah", title: "الدعوة", icon: "↗", accent: "#60a5fa", description: "مهارات الدعوة والتربية." },
  { id: "youth", title: "الشباب", icon: "✧", accent: "#2dd4bf", description: "موضوعات الشباب والبناء النفسي." },
  { id: "family", title: "الأسرة", icon: "♡", accent: "#f472b6", description: "البيت والتربية والعلاقات." },
  { id: "comparative-religion", title: "مقارنة أديان", icon: "⌁", accent: "#818cf8", description: "حوارات وردود ومقارنات منهجية." },
  { id: "atheism", title: "الإلحاد", icon: "?", accent: "#f87171", description: "نقد الإلحاد والمادية والشبهات المعاصرة." },
  { id: "biography", title: "تراجم", icon: "※", accent: "#eab308", description: "سير العلماء والدعاة والشخصيات." },
  { id: "general", title: "عام", icon: "•", accent: "#94a3b8", description: "مواد متنوعة تنتظر التصنيف الدقيق." },
];

const KEYWORDS = [
  ["anti-shubuhat", ["شبهة", "شبهات", "الرد", "يرد", "ردود", "مناظرة"]],
  ["atheism", ["إلحاد", "ملحد", "الملاحدة", "داروين", "تطور", "مادية"]],
  ["comparative-religion", ["نصرانية", "مسيحية", "كتاب مقدس", "إنجيل", "يهود", "أديان"]],
  ["aqeedah", ["عقيدة", "توحيد", "إيمان", "أسماء وصفات", "قدر", "الصحابة"]],
  ["fiqh", ["فقه", "حكم", "أحكام", "صلاة", "صيام", "زكاة", "حج", "وضوء", "فتوى"]],
  ["tafseer", ["تفسير", "تدبر", "سورة", "آية", "القرآن"]],
  ["quran", ["قرآن", "تلاوة", "تجويد", "مصحف"]],
  ["hadith", ["حديث", "صحيح", "البخاري", "مسلم", "السنة"]],
  ["seerah", ["سيرة", "النبي", "الرسول", "غزوة", "صحابي"]],
  ["family", ["زوج", "زوجة", "أبناء", "أسرة", "تربية"]],
  ["youth", ["شباب", "مراهق", "جامعة", "عادة"]],
  ["daawah", ["دعوة", "داعية", "نصيحة", "محاضرة"]],
  ["biography", ["قصة", "ترجمة", "سيرة", "حياة"]],
];

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "course";
}

function parseDuration(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!match) return 0;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
}

async function yt(pathname, params, apiKey) {
  const url = new URL(`${API}/${pathname}`);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  url.searchParams.set("key", apiKey);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${pathname} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function listAll(pathname, params, apiKey) {
  const items = [];
  let pageToken = undefined;
  do {
    const json = await yt(pathname, { ...params, pageToken }, apiKey);
    items.push(...(json.items ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return items;
}

async function resolveChannel(config, apiKey) {
  const byHandle = await yt("channels", { part: "snippet,contentDetails,statistics", forHandle: config.handle }, apiKey);
  const item = byHandle.items?.[0];
  if (item) return item;
  const search = await yt("search", { part: "snippet", type: "channel", q: config.handle.replace(/^@/, ""), maxResults: 1 }, apiKey);
  const channelId = search.items?.[0]?.snippet?.channelId;
  if (!channelId) throw new Error(`Could not resolve ${config.handle}`);
  const byId = await yt("channels", { part: "snippet,contentDetails,statistics", id: channelId }, apiKey);
  return byId.items?.[0];
}

async function videoDetails(ids, apiKey) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const json = await yt("videos", { part: "snippet,contentDetails,statistics,status", id: batch.join(",") }, apiKey);
    out.push(...(json.items ?? []));
  }
  return out;
}

function classify(text) {
  const found = [];
  for (const [topic, words] of KEYWORDS) {
    if (words.some((word) => text.includes(word))) found.push(topic);
  }
  return found.length ? [...new Set(found)] : ["general"];
}

async function sync(apiKey) {
  const channels = [];
  const courses = [];
  const videos = new Map();
  const videoCourseMap = new Map();

  for (const config of CHANNELS) {
    console.log(`Resolving ${config.handle}`);
    const channel = await resolveChannel(config, apiKey);
    const uploadPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    const snippet = channel.snippet ?? {};
    channels.push({
      id: config.id,
      handle: config.handle,
      title: snippet.title ?? config.displayName,
      displayName: config.displayName,
      youtubeUrl: `https://www.youtube.com/${config.handle}`,
      description: snippet.description || `مكتبة ${config.displayName}`,
      avatar: snippet.thumbnails?.default?.url || snippet.thumbnails?.medium?.url,
      accent: config.accent,
      order: config.order,
      youtubeChannelId: channel.id,
      syncedAt: new Date().toISOString(),
    });

    const playlists = await listAll("playlists", { part: "snippet,contentDetails", channelId: channel.id, maxResults: 50 }, apiKey);
    let courseOrder = config.order * 1000;
    for (const playlist of playlists) {
      const playlistId = playlist.id;
      const items = await listAll("playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: 50 }, apiKey);
      const ids = [...new Set(items.map((item) => item.contentDetails?.videoId).filter(Boolean))];
      if (ids.length === 0) continue;
      const courseId = `${config.id}-${slug(playlist.snippet?.title)}-${playlistId}`;
      const topicIds = classify(`${playlist.snippet?.title ?? ""} ${playlist.snippet?.description ?? ""}`);
      courses.push({
        id: courseId,
        channelId: config.id,
        title: playlist.snippet?.title ?? "دورة بدون عنوان",
        description: playlist.snippet?.description ?? "",
        playlistId,
        topicIds,
        videoIds: ids.map((id) => `yt-${id}`),
        thumbnail: playlist.snippet?.thumbnails?.medium?.url || playlist.snippet?.thumbnails?.default?.url,
        order: courseOrder++,
      });
      for (const id of ids) {
        const key = `yt-${id}`;
        const arr = videoCourseMap.get(key) ?? [];
        arr.push(courseId);
        videoCourseMap.set(key, arr);
      }
    }

    if (uploadPlaylistId) {
      const uploads = await listAll("playlistItems", { part: "snippet,contentDetails", playlistId: uploadPlaylistId, maxResults: 50 }, apiKey);
      const ids = [...new Set(uploads.map((item) => item.contentDetails?.videoId).filter(Boolean))];
      const details = await videoDetails(ids, apiKey);
      for (const item of details) {
        const title = item.snippet?.title ?? "فيديو بدون عنوان";
        const description = item.snippet?.description ?? "";
        const topicIds = classify(`${title} ${description}`);
        const id = `yt-${item.id}`;
        videos.set(id, {
          id,
          youtubeId: item.id,
          channelId: config.id,
          courseIds: videoCourseMap.get(id) ?? [],
          topicIds,
          title,
          description,
          durationSeconds: parseDuration(item.contentDetails?.duration),
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          publishedAt: item.snippet?.publishedAt,
          youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
          viewCount: Number(item.statistics?.viewCount ?? 0),
          embedAllowed: item.status?.embeddable !== false,
        });
      }
    }
  }

  const allVideos = [...videos.values()];
  const byChannel = new Map();
  for (const video of allVideos) {
    if (video.courseIds.length) continue;
    const key = `${video.channelId}:${video.topicIds[0] ?? "general"}`;
    const arr = byChannel.get(key) ?? [];
    arr.push(video);
    byChannel.set(key, arr);
  }
  for (const [key, arr] of byChannel) {
    const [channelId, topicId] = key.split(":");
    const topic = TOPICS.find((t) => t.id === topicId) ?? TOPICS.find((t) => t.id === "general");
    const courseId = `${channelId}-topic-${topicId}`;
    courses.push({
      id: courseId,
      channelId,
      title: topic ? `${topic.title} - مواد مصنفة` : "مواد مصنفة",
      description: "مسار مولد تلقائياً للفيديوهات غير الموجودة داخل قائمة تشغيل.",
      topicIds: [topicId],
      videoIds: arr.map((v) => v.id),
      order: 900000 + courses.length,
      isGenerated: true,
    });
    for (const video of arr) video.courseIds.push(courseId);
  }

  const db = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "youtube-api",
    channels,
    topics: TOPICS,
    courses: courses.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    videos: allVideos.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(db), "utf8");
  console.log(`Saved ${OUT_FILE}`);
  console.log(`${db.channels.length} channels, ${db.courses.length} courses, ${db.videos.length} videos`);
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const dryRun = process.argv.includes("--dry-run");
  if (!apiKey) {
    console.log("YOUTUBE_API_KEY is not set.");
    console.log("Set it locally, then run: node tools/scripts/sync-video-library.mjs");
    console.log(`Configured channels: ${CHANNELS.map((c) => c.handle).join(", ")}`);
    process.exit(dryRun ? 0 : 1);
  }
  if (dryRun) {
    console.log(`YOUTUBE_API_KEY detected. ${CHANNELS.length} channels configured. Remove --dry-run to sync.`);
    return;
  }
  await sync(apiKey);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});