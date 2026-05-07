import { useQuery } from "@tanstack/react-query";

import { publicDataUrl } from "@/data/publicAssetUrl";
import type {
  VideoLibraryCourse,
  VideoLibraryDB,
  VideoLibraryDerived,
  VideoLibraryVideo,
} from "@/data/videoLibraryTypes";

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function pushMap<T>(map: Map<string, T[]>, key: string, value: T) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function deriveVideoLibrary(db: VideoLibraryDB): VideoLibraryDerived {
  const channels = [...(db.channels ?? [])].sort((a, b) => a.order - b.order || a.displayName.localeCompare(b.displayName));
  const courses = [...(db.courses ?? [])].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const videos = [...(db.videos ?? [])].sort((a, b) => {
    if (a.channelId !== b.channelId) return a.channelId.localeCompare(b.channelId);
    const pa = a.position ?? 999999;
    const pb = b.position ?? 999999;
    if (pa !== pb) return pa - pb;
    return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  });

  const normalized: VideoLibraryDB = { ...db, channels, courses, videos };
  const videoById = mapById(videos);
  const courseById = mapById(courses);
  const channelById = mapById(channels);
  const topicById = mapById(db.topics ?? []);
  const videosByChannel = new Map<string, VideoLibraryVideo[]>();
  const coursesByChannel = new Map<string, VideoLibraryCourse[]>();
  const videosByCourse = new Map<string, VideoLibraryVideo[]>();

  for (const course of courses) pushMap(coursesByChannel, course.channelId, course);
  for (const video of videos) {
    pushMap(videosByChannel, video.channelId, video);
    for (const courseId of video.courseIds) pushMap(videosByCourse, courseId, video);
  }

  for (const course of courses) {
    if (!videosByCourse.has(course.id) && course.videoIds.length) {
      videosByCourse.set(course.id, course.videoIds.map((id) => videoById.get(id)).filter(Boolean) as VideoLibraryVideo[]);
    }
  }

  return { db: normalized, channelById, topicById, courseById, videoById, videosByChannel, coursesByChannel, videosByCourse };
}

async function loadVideoLibraryDB(): Promise<VideoLibraryDerived> {
  const res = await fetch(publicDataUrl("data/video-library.json"));
  if (!res.ok) throw new Error(`Failed to load video-library.json (${res.status})`);
  const db = await res.json() as VideoLibraryDB;
  return deriveVideoLibrary(db);
}

export function useVideoLibraryDB() {
  return useQuery({
    queryKey: ["video-library-db"],
    queryFn: loadVideoLibraryDB,
    staleTime: 1000 * 60 * 60 * 6,
  });
}