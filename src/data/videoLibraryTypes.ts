export type VideoLibrarySource = "seed" | "youtube-api";

export type VideoLibraryTopicId =
  | "aqeedah"
  | "anti-shubuhat"
  | "fiqh"
  | "quran"
  | "tafseer"
  | "hadith"
  | "seerah"
  | "daawah"
  | "youth"
  | "family"
  | "comparative-religion"
  | "atheism"
  | "biography"
  | "general";

export type VideoLibraryTopic = {
  id: VideoLibraryTopicId;
  title: string;
  icon: string;
  accent: string;
  description: string;
};

export type VideoLibraryChannel = {
  id: string;
  handle: string;
  title: string;
  displayName: string;
  youtubeUrl: string;
  description: string;
  avatar?: string;
  avatarUrl?: string;
  accent: string;
  order: number;
  youtubeChannelId?: string;
  syncedAt?: string;
};

export type VideoLibraryCourse = {
  id: string;
  channelId: string;
  title: string;
  description: string;
  playlistId?: string;
  topicIds: VideoLibraryTopicId[];
  videoIds: string[];
  thumbnail?: string;
  order: number;
  isGenerated?: boolean;
};

export type VideoLibraryVideo = {
  id: string;
  youtubeId?: string;
  channelId: string;
  courseIds: string[];
  topicIds: VideoLibraryTopicId[];
  title: string;
  description: string;
  durationSeconds: number;
  thumbnail?: string;
  publishedAt?: string;
  youtubeUrl: string;
  position?: number;
  viewCount?: number;
  embedAllowed?: boolean;
};

export type VideoLibraryDB = {
  version: 1;
  generatedAt: string;
  source: VideoLibrarySource;
  channels: VideoLibraryChannel[];
  topics: VideoLibraryTopic[];
  courses: VideoLibraryCourse[];
  videos: VideoLibraryVideo[];
};

export type VideoLibraryProgress = {
  seconds: number;
  duration: number;
  percent: number;
  completed: boolean;
  updatedAt: string;
};

export type VideoLibraryDerived = {
  db: VideoLibraryDB;
  channelById: Map<string, VideoLibraryChannel>;
  topicById: Map<string, VideoLibraryTopic>;
  courseById: Map<string, VideoLibraryCourse>;
  videoById: Map<string, VideoLibraryVideo>;
  videosByChannel: Map<string, VideoLibraryVideo[]>;
  coursesByChannel: Map<string, VideoLibraryCourse[]>;
  videosByCourse: Map<string, VideoLibraryVideo[]>;
};