import * as React from "react";
import Fuse from "fuse.js";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Clock,
  GraduationCap,
  Play,
  Search,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";

import { YouTubeCoursePlayer } from "@/components/video/YouTubeCoursePlayer";
import { useVideoLibraryDB } from "@/data/useVideoLibraryDB";
import type {
  VideoLibraryChannel,
  VideoLibraryCourse,
  VideoLibraryProgress,
  VideoLibraryVideo,
} from "@/data/videoLibraryTypes";
import { stripDiacritics } from "@/lib/arabic";
import { cn } from "@/lib/utils";
import { useNoorStore } from "@/store/noorStore";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}س ${m}د`;
  return `${Math.max(1, m)}د`;
}

function aggregateProgress(
  videos: VideoLibraryVideo[],
  progress: Record<string, VideoLibraryProgress>,
): { percent: number; done: number; total: number; totalSeconds: number } {
  if (videos.length === 0) return { percent: 0, done: 0, total: 0, totalSeconds: 0 };
  let done = 0;
  let psum = 0;
  let totalSeconds = 0;
  for (const v of videos) {
    const p = progress[v.id];
    if (p?.completed) done++;
    psum += p?.completed ? 100 : (p?.percent ?? 0);
    totalSeconds += v.durationSeconds || 0;
  }
  return { percent: Math.round(psum / videos.length), done, total: videos.length, totalSeconds };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function ProgressRing({
  percent,
  size = 52,
  strokeWidth = 4,
  color,
  children,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, percent / 100)) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      {children && <div className="relative z-10 text-center">{children}</div>}
    </div>
  );
}

function ThinBar({ percent, accent }: { percent: number; accent?: string }) {
  return (
    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: accent ?? "var(--accent)" }}
      />
    </div>
  );
}

// ── Sheikh Banner Card (2-col home grid) ─────────────────────────────────────

function SheikhBannerCard({
  channel,
  videos,
  courses,
  progress,
  onClick,
}: {
  channel: VideoLibraryChannel;
  videos: VideoLibraryVideo[];
  courses: VideoLibraryCourse[];
  progress: Record<string, VideoLibraryProgress>;
  onClick: () => void;
}) {
  const stats = aggregateProgress(videos, progress);
  const [avatarErr, setAvatarErr] = React.useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-right press-effect rounded-3xl overflow-hidden group"
      style={{ aspectRatio: "5/4" }}
    >
      {/* Gradient bg */}
      <div
        className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
        style={{
          background: `radial-gradient(ellipse at 25% 5%, ${channel.accent}55 0%, transparent 55%),
                       radial-gradient(ellipse at 82% 88%, ${channel.accent}22 0%, transparent 48%),
                       linear-gradient(160deg, #0d0d1a 0%, #070810 100%)`,
        }}
      />
      {/* Stars overlay */}
      <div className="dhikr-card-stars absolute inset-0 pointer-events-none" style={{ opacity: 0.45 }} />
      {/* Bottom glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20"
        style={{ background: `linear-gradient(to top, ${channel.accent}30, transparent)` }}
      />
      {/* Border ring */}
      <div className="absolute inset-0 rounded-3xl border" style={{ borderColor: `${channel.accent}35` }} />

      {/* Content */}
      <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-12 h-12 rounded-2xl border-2 shrink-0 overflow-hidden"
            style={{
              borderColor: `${channel.accent}80`,
              boxShadow: `0 0 14px ${channel.accent}55`,
            }}
          >
            {channel.avatarUrl && !avatarErr ? (
              <img
                src={channel.avatarUrl}
                alt={channel.displayName}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setAvatarErr(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[17px] font-extrabold"
                style={{ background: `${channel.accent}18`, color: channel.accent }}
              >
                {channel.displayName.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
            )}
          </div>
          <div
            className="rounded-xl px-2 py-0.5 text-[10px] font-semibold border"
            style={{ background: `${channel.accent}18`, borderColor: `${channel.accent}45`, color: channel.accent }}
          >
            {videos.length > 0
              ? `${videos.length} فيديو`
              : courses.length > 0
              ? `${courses.length} دورة`
              : "قريباً"}
          </div>
        </div>

        {/* Bottom */}
        <div>
          <h3
            className="font-extrabold arabic-text leading-tight mb-0.5"
            style={{ fontSize: "0.82rem", color: "white", letterSpacing: "0.01em", textShadow: "0 1px 16px rgba(0,0,0,0.95)" }}
          >
            {channel.displayName}
          </h3>
          <p className="text-[10px] opacity-50 line-clamp-1 mb-2 leading-4">{channel.description}</p>
          {stats.total > 0 ? (
            <>
              <ThinBar percent={stats.percent} accent={channel.accent} />
              <div className="flex items-center justify-between text-[10px] opacity-50 mt-1">
                <span>
                  {stats.done}/{stats.total}
                </span>
                <span>{stats.percent}%</span>
              </div>
            </>
          ) : (
            <div className="text-[10px] opacity-40 flex items-center gap-1" style={{ color: channel.accent }}>
              <Zap size={9} />
              <span>جاهز للمزامنة</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Course Card ───────────────────────────────────────────────────────────────

function CourseCard2({
  course,
  channel,
  videos,
  progress,
  onClick,
}: {
  course: VideoLibraryCourse;
  channel?: VideoLibraryChannel;
  videos: VideoLibraryVideo[];
  progress: Record<string, VideoLibraryProgress>;
  onClick: () => void;
}) {
  const stats = aggregateProgress(videos, progress);
  const accent = channel?.accent ?? "#fbbf24";

  // Best thumbnail: course thumbnail → first video thumbnail → null
  const firstVideoThumb = videos[0]?.thumbnail ?? null;
  const thumb = course.thumbnail || firstVideoThumb;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right press-effect rounded-3xl overflow-hidden relative group"
      style={{
        aspectRatio: "4/3",
        border: course.isGenerated
          ? `1.5px dashed ${accent}40`
          : `1.5px solid ${accent}35`,
        boxShadow: stats.percent > 0 ? `0 0 16px ${accent}30` : undefined,
      }}
    >
      {/* Thumbnail fill */}
      {thumb ? (
        <img
          src={thumb}
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: course.isGenerated
              ? `radial-gradient(ellipse at 60% 30%, ${accent}28 0%, #0d0d1a 70%)`
              : `radial-gradient(ellipse at 60% 30%, ${accent}40 0%, #0d0d1a 70%)`,
          }}
        />
      )}

      {/* Dark gradient overlay — stronger at bottom for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0,0,0,0.10) 0%,
            rgba(0,0,0,0.15) 40%,
            rgba(0,0,0,0.72) 70%,
            rgba(0,0,0,0.90) 100%
          )`,
        }}
      />

      {/* Type badge — top left: موضوع for generated, دورة for real playlists */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-bold"
          style={{
            background: course.isGenerated ? `rgba(255,255,255,0.18)` : `${accent}cc`,
            color: course.isGenerated ? "rgba(255,255,255,0.85)" : "#000",
            border: course.isGenerated ? `1px solid rgba(255,255,255,0.2)` : "none",
          }}
        >
          {course.isGenerated ? (
            <><BookOpen size={9} /><span>موضوع</span></>
          ) : (
            <><GraduationCap size={9} /><span>{videos.length} درس</span></>
          )}
        </div>
        {course.isGenerated && (
          <div
            className="px-1.5 py-0.5 rounded-xl text-[9px] font-semibold"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.55)" }}
          >
            {videos.length} فيديو
          </div>
        )}
      </div>

      {/* Progress ring — top left if started */}
      {stats.percent > 0 && (
        <div className="absolute top-2 right-2">
          <ProgressRing percent={stats.percent} color={accent} size={28} strokeWidth={2.5} />
        </div>
      )}

      {/* Content — pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <h3
          className="text-[12px] font-bold arabic-text leading-[1.35] line-clamp-2 text-white mb-1.5"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
        >
          {course.title}
        </h3>
        {stats.total > 0 && (
          <div className="space-y-1">
            <ThinBar percent={stats.percent} accent={accent} />
            <div className="flex items-center justify-between text-[9px] opacity-55">
              <span>{stats.done}/{stats.total}</span>
              <span>{formatDuration(stats.totalSeconds)}</span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Lesson Row (YouTube-style: wide thumbnail + title below) ─────────────────

function LessonRow({
  video,
  index,
  channel,
  progress,
  isActive,
  onClick,
}: {
  video: VideoLibraryVideo;
  index: number;
  channel?: VideoLibraryChannel;
  progress?: VideoLibraryProgress;
  isActive?: boolean;
  onClick: () => void;
}) {
  const accent = channel?.accent ?? "#fbbf24";
  const completed = progress?.completed;
  const pct = completed ? 100 : (progress?.percent ?? 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-right press-effect rounded-2xl overflow-hidden transition-all border",
        isActive ? "border-current" : "border-transparent",
      )}
      style={isActive ? { borderColor: `${accent}60`, boxShadow: `0 0 18px ${accent}30` } : undefined}
    >
      {/* ── Wide 16/9 thumbnail ── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `${accent}18` }}>
            <Play size={20} className="opacity-30" />
          </div>
        )}

        {/* Number badge — bottom-right corner */}
        <div
          className="absolute bottom-1.5 right-1.5 min-w-[20px] h-5 rounded-md px-1.5 flex items-center justify-center text-[10px] font-bold"
          style={{ background: "rgba(0,0,0,0.75)", color: completed ? accent : "white" }}
        >
          {completed ? <CheckCircle2 size={11} style={{ color: accent }} /> : index + 1}
        </div>

        {/* Duration badge — bottom-left */}
        {video.durationSeconds > 0 && (
          <div
            className="absolute bottom-1.5 left-1.5 px-1.5 h-5 rounded-md flex items-center text-[10px] font-semibold"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            {formatDuration(video.durationSeconds)}
          </div>
        )}

        {/* Playing indicator */}
        {isActive && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `${accent}22` }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: `${accent}dd`, boxShadow: `0 0 20px ${accent}80` }}
            >
              <Play size={14} fill="black" color="black" />
            </div>
          </div>
        )}

        {/* Progress bar at bottom of thumbnail */}
        {pct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: accent }} />
          </div>
        )}
      </div>

      {/* ── Title + meta below thumbnail ── */}
      <div
        className="p-2.5 pb-2"
        style={isActive ? { background: `${accent}10` } : { background: "rgba(255,255,255,0.03)" }}
      >
        <div
          className={cn("text-[12px] font-semibold arabic-text leading-[1.4] line-clamp-2", isActive ? "text-white" : "opacity-85")}
        >
          {video.title}
        </div>
        {isActive && (
          <div className="text-[10px] font-bold mt-0.5" style={{ color: accent }}>▶ يعرض الآن</div>
        )}
      </div>
    </button>
  );
}

// ── Video Thumb Card (horizontal strip) ──────────────────────────────────────

function VideoThumbCard({
  video,
  channel,
  progress,
  bookmarked,
  onClick,
}: {
  video: VideoLibraryVideo;
  channel?: VideoLibraryChannel;
  progress?: VideoLibraryProgress;
  bookmarked: boolean;
  onClick: () => void;
}) {
  const accent = channel?.accent ?? "var(--accent)";
  const pct = progress?.completed ? 100 : (progress?.percent ?? 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 press-effect text-right rounded-2xl overflow-hidden border border-white/10"
      style={{ width: 190 }}
    >
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `radial-gradient(ellipse at 30% 30%, ${accent}35 0%, #0a0a14 100%)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full glass border border-white/25 flex items-center justify-center">
            <Play size={13} className="text-white" style={{ marginLeft: 2 }} />
          </div>
        </div>
        {bookmarked && (
          <div className="absolute top-1.5 left-1.5">
            <Bookmark size={11} className="fill-[var(--accent)] text-[var(--accent)]" />
          </div>
        )}
        {pct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: accent }} />
          </div>
        )}
        {/* Resume badge */}
        {pct > 0 && !progress?.completed && progress?.seconds != null && progress.seconds > 30 && (
          <div
            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
            style={{ background: `${accent}dd`, color: "#000" }}
          >
            من الدقيقة {Math.floor(progress.seconds / 60)}
          </div>
        )}
      </div>
      <div className="p-2 bg-white/3">
        <div className="text-xs font-semibold line-clamp-2 arabic-text leading-4 mb-1">{video.title}</div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] opacity-40">{formatDuration(video.durationSeconds)}</span>
          {progress?.completed && <CheckCircle2 size={10} style={{ color: accent }} />}
        </div>
      </div>
    </button>
  );
}

// ── Video List Row (full width) ───────────────────────────────────────────────

function VideoListRow({
  video,
  channel,
  progress,
  bookmarked,
  onClick,
}: {
  video: VideoLibraryVideo;
  channel?: VideoLibraryChannel;
  progress?: VideoLibraryProgress;
  bookmarked: boolean;
  onClick: () => void;
}) {
  const accent = channel?.accent ?? "#fbbf24";
  const pct = progress?.completed ? 100 : (progress?.percent ?? 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-right press-effect rounded-2xl overflow-hidden border border-transparent hover:border-white/10 transition-all"
    >
      {/* Wide 16/9 thumbnail */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `${accent}18` }}>
            <Play size={20} className="opacity-30" />
          </div>
        )}

        {/* Duration badge bottom-left */}
        {video.durationSeconds > 0 && (
          <div
            className="absolute bottom-1.5 left-1.5 px-1.5 h-5 rounded-md flex items-center text-[10px] font-semibold"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            {formatDuration(video.durationSeconds)}
          </div>
        )}

        {/* Completed badge bottom-right */}
        {progress?.completed && (
          <div
            className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <CheckCircle2 size={11} style={{ color: accent }} />
          </div>
        )}

        {/* Bookmark dot top-right */}
        {bookmarked && (
          <div className="absolute top-1.5 right-1.5">
            <Bookmark size={11} className="fill-[var(--accent)] text-[var(--accent)]" />
          </div>
        )}

        {/* Progress bar */}
        {pct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div className="h-full" style={{ width: `${pct}%`, background: accent }} />
          </div>
        )}
        {/* Resume badge */}
        {pct > 0 && !progress?.completed && progress?.seconds != null && progress.seconds > 30 && (
          <div
            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
            style={{ background: `${accent}dd`, color: "#000" }}
          >
            من الدقيقة {Math.floor(progress.seconds / 60)}
          </div>
        )}
      </div>

      {/* Title + channel below */}
      <div className="p-2 pt-1.5" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="text-[12px] font-semibold arabic-text leading-[1.4] line-clamp-2 opacity-90">
          {video.title}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: channel ? `${channel.accent}aa` : "rgba(255,255,255,0.35)" }}>{channel?.displayName}</div>
      </div>
    </button>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
type DBPayload = NonNullable<ReturnType<typeof useVideoLibraryDB>["data"]>;

function VideoHome({
  data,
  progress,
  bookmarks,
  lastVideoId,
  navigate,
}: {
  data: DBPayload;
  progress: Record<string, VideoLibraryProgress>;
  bookmarks: Record<string, boolean>;
  lastVideoId: string | null;
  navigate: (path: string) => void;
}) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [searchChannelFilter, setSearchChannelFilter] = React.useState<string | null>(null);
  const [showAllSearchVideos, setShowAllSearchVideos] = React.useState(false);
  const [showAllSearchCourses, setShowAllSearchCourses] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Reset filters + show-all when query changes
  React.useEffect(() => { setSearchChannelFilter(null); setShowAllSearchVideos(false); setShowAllSearchCourses(false); }, [q]);

  const fuse = React.useMemo(() => {
    const records = [
      ...data.db.videos.map((v) => ({ type: "video" as const, id: v.id, search: `${v.title} ${v.description}` })),
      ...data.db.courses.map((c) => ({ type: "course" as const, id: c.id, search: `${c.title} ${c.description}` })),
    ];
    return new Fuse(records, { keys: ["search"], threshold: 0.35 });
  }, [data]);

  const searchResults = React.useMemo(() => {
    if (!q.trim()) return null;
    const hits = fuse.search(stripDiacritics(q.trim()));
    const vids = new Set(hits.filter((h) => h.item.type === "video").map((h) => h.item.id));
    const cids = new Set(hits.filter((h) => h.item.type === "course").map((h) => h.item.id));
    const allMatchVideos = data.db.videos.filter((v) => vids.has(v.id));
    const filteredVideos = searchChannelFilter
      ? allMatchVideos.filter((v) => v.channelId === searchChannelFilter)
      : allMatchVideos;
    return {
      videos: showAllSearchVideos ? filteredVideos : filteredVideos.slice(0, 24),
      allVideoCount: filteredVideos.length,
      courses: data.db.courses.filter((c) => cids.has(c.id)).slice(0, showAllSearchCourses ? undefined : 10),
      allCourseCount: data.db.courses.filter((c) => cids.has(c.id)).length,
      channelChips: (() => {
        const map = new Map<string, { id: string; name: string; accent: string; count: number }>();
        for (const v of allMatchVideos) {
          const ch = data.channelById.get(v.channelId);
          if (!ch) continue;
          const ex = map.get(ch.id);
          if (ex) ex.count++;
          else map.set(ch.id, { id: ch.id, name: ch.displayName, accent: ch.accent, count: 1 });
        }
        return [...map.values()].sort((a, b) => b.count - a.count);
      })(),
    };
  }, [data, fuse, q, searchChannelFilter, showAllSearchVideos, showAllSearchCourses]);

  const continueVideo = lastVideoId ? data.videoById.get(lastVideoId) : undefined;
  const continueChannel = continueVideo ? data.channelById.get(continueVideo.channelId) : undefined;
  const continueProgress = continueVideo ? progress[continueVideo.id] : undefined;

  const newestVideos = React.useMemo(
    () =>
      data.db.videos
        .slice()
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
        .slice(0, 14),
    [data],
  );

  const bookmarkedVideos = React.useMemo(
    () => data.db.videos.filter((v) => bookmarks[v.id]).slice(0, 14),
    [data, bookmarks],
  );

  const inProgressCourses = React.useMemo(() =>
    data.db.courses.filter((c) => {
      const vids = data.videosByCourse.get(c.id) ?? [];
      if (vids.length === 0) return false;
      const st = aggregateProgress(vids, progress);
      return st.percent > 0 && st.percent < 100;
    }).slice(0, 20),
    [data, progress],
  );

  const completedCourses = React.useMemo(() =>
    data.db.courses.filter((c) => {
      const vids = data.videosByCourse.get(c.id) ?? [];
      if (vids.length === 0) return false;
      const st = aggregateProgress(vids, progress);
      return st.percent >= 100;
    }),
    [data, progress],
  );

  const overallStats = aggregateProgress(data.db.videos, progress);

  return (
    <div className="space-y-5 page-enter" dir="rtl">
      {/* ── Hero header ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 pb-6 border border-white/8"
        style={{
          background:
            "radial-gradient(ellipse at 15% 0%, var(--accent)30 0%, transparent 55%), radial-gradient(ellipse at 88% 90%, var(--accent-2)20 0%, transparent 50%), rgba(7,8,15,0.82)",
        }}
      >
        <div className="dhikr-page-stars absolute inset-0 pointer-events-none" style={{ opacity: 0.65 }} />
        <div className="relative">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-[var(--accent)] mb-1.5">
                <Star size={13} className="fill-[var(--accent)]" />
                <span className="text-[9px] font-bold tracking-widest uppercase opacity-55">مكتبة النور</span>
              </div>
              <h1
                className="text-[1.2rem] font-bold arabic-text leading-tight tracking-tight"
                style={{ textShadow: "0 0 40px var(--accent)" }}
              >
                الدورات الإسلامية
              </h1>
              <p className="text-[11px] opacity-40 mt-1 leading-5">تعلّم بتنظيم · تابع تقدمك · استكشف بلا تشتت</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setQ("");
              }}
              className={cn(
                "w-11 h-11 rounded-2xl glass border border-white/15 flex items-center justify-center shrink-0 press-effect transition-all",
                searchOpen && "bg-accent-20 border-accent-50",
              )}
            >
              {searchOpen ? <X size={17} /> : <Search size={17} />}
            </button>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <div className="relative mb-4">
              <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن شيخ، دورة، أو درس..."
                className="w-full rounded-2xl bg-white/8 border border-white/15 pr-9 pl-4 py-3 text-sm outline-none focus:border-accent-60 transition-colors"
                dir="rtl"
              />
            </div>
          )}

          {/* Stats */}
          {!searchOpen && (
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "مشايخ", value: data.db.channels.length },
                { label: "دورات", value: data.db.courses.length },
                { label: "فيديو", value: data.db.videos.length },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-1.5 rounded-2xl bg-white/8 border border-white/10 px-3 py-1.5"
                >
                  <span className="text-[10px] opacity-50">{s.label}</span>
                  <span className="text-[13px] font-bold">{s.value}</span>
                </div>
              ))}
              {overallStats.total > 0 && (
                <div
                  className="flex items-center gap-1.5 rounded-2xl border px-3 py-1.5"
                  style={{
                    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                  }}
                >
                  <span className="text-[10px] opacity-70" style={{ color: "var(--accent)" }}>
                    تقدمك
                  </span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--accent)" }}>
                    {overallStats.percent}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Search results ── */}
      {searchResults && q.trim() && (
        <div className="space-y-4">
          {/* Channel filter chips */}
          {searchResults.channelChips.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button type="button"
                onClick={() => setSearchChannelFilter(null)}
                className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
                  searchChannelFilter === null ? "text-black border-transparent bg-[var(--accent)]" : "bg-white/8 border-white/12 hover:bg-white/12")}
              >
                الكل ({searchResults.channelChips.reduce((a, c) => a + c.count, 0)})
              </button>
              {searchResults.channelChips.map((ch) => (
                <button type="button" key={ch.id}
                  onClick={() => setSearchChannelFilter(searchChannelFilter === ch.id ? null : ch.id)}
                  className={cn("shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
                    searchChannelFilter === ch.id ? "text-black border-transparent" : "bg-white/8 border-white/12 hover:bg-white/12")}
                  style={searchChannelFilter === ch.id ? { background: ch.accent } : { borderColor: `${ch.accent}40` }}>
                  {ch.name} ({ch.count})
                </button>
              ))}
            </div>
          )}
          {searchResults.courses.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold mb-2 opacity-60 tracking-wide">الدورات</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {searchResults.courses.map((c) => (
                  <CourseCard2
                    key={c.id}
                    course={c}
                    channel={data.channelById.get(c.channelId)}
                    videos={data.videosByCourse.get(c.id) ?? []}
                    progress={progress}
                    onClick={() => navigate(`/video-library/course/${c.id}`)}
                  />
                ))}
              </div>
              {!showAllSearchCourses && searchResults.allCourseCount > 10 && (
                <button
                  type="button"
                  onClick={() => setShowAllSearchCourses(true)}
                  className="w-full mt-3 py-2.5 rounded-2xl text-xs font-semibold border press-effect"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.05)" }}
                >
                  عرض كل الدورات ({searchResults.allCourseCount} دورة)
                </button>
              )}
            </section>
          )}
          {searchResults.videos.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold mb-2 opacity-60 tracking-wide">الفيديوهات</h2>
              <div className="space-y-2">
                {searchResults.videos.map((v) => (
                  <VideoListRow
                    key={v.id}
                    video={v}
                    channel={data.channelById.get(v.channelId)}
                    progress={progress[v.id]}
                    bookmarked={!!bookmarks[v.id]}
                    onClick={() => navigate(`/video-library/watch/${v.id}`)}
                  />
                ))}
              </div>
              {!showAllSearchVideos && searchResults.allVideoCount > 24 && (
                <button
                  type="button"
                  onClick={() => setShowAllSearchVideos(true)}
                  className="w-full mt-3 py-2.5 rounded-2xl text-xs font-semibold border press-effect"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.05)" }}
                >
                  عرض كل النتائج ({searchResults.allVideoCount} فيديو)
                </button>
              )}
            </section>
          )}
          {searchResults.videos.length === 0 && searchResults.courses.length === 0 && (
            <div className="glass rounded-3xl p-7 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <div className="font-semibold">لا نتائج لـ "{q}"</div>
              <div className="text-xs opacity-50 mt-1">جرّب كلمة مختلفة أو تفقد الإملاء</div>
            </div>
          )}
        </div>
      )}

      {/* ── Continue watching ── */}
      {continueVideo && !searchResults && (        <button
          type="button"
          onClick={() => navigate(`/video-library/watch/${continueVideo.id}`)}
          className="w-full press-effect text-right"
        >
          <div
            className="relative rounded-3xl overflow-hidden border"
            style={{ borderColor: `${continueChannel?.accent ?? "var(--accent)"}40` }}
          >
            <div className="relative" style={{ aspectRatio: "16/7" }}>
              {continueVideo.thumbnail ? (
                <img src={continueVideo.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: `radial-gradient(ellipse at 25% 20%, ${continueChannel?.accent ?? "var(--accent)"}45 0%, #0a0a14 100%)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
              <div className="dhikr-card-stars absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }} />
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
                  style={{
                    background: `${continueChannel?.accent ?? "var(--accent)"}28`,
                    borderColor: `${continueChannel?.accent ?? "var(--accent)"}75`,
                    boxShadow: `0 0 32px ${continueChannel?.accent ?? "var(--accent)"}35`,
                  }}
                >
                  <Play size={22} className="text-white" style={{ marginLeft: 3 }} />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div
                  className="text-[10px] font-semibold tracking-wide mb-1.5 flex items-center gap-1.5"
                  style={{ color: continueChannel?.accent ?? "var(--accent)" }}
                >
                  <Sparkles size={12} />
                  <span>أكمل من حيث توقفت</span>
                </div>
                <div
                  className="font-semibold text-[14px] arabic-text line-clamp-2 leading-snug"
                  style={{ textShadow: "0 1px 12px rgba(0,0,0,0.9)" }}
                >
                  {continueVideo.title}
                </div>
                <div className="text-xs opacity-50 mt-0.5">{continueChannel?.displayName}</div>
              </div>
            </div>
            {/* Progress strip */}
            <div className="h-1 bg-white/10">
              <div
                className="h-full transition-all"
                style={{
                  width: `${continueProgress?.completed ? 100 : (continueProgress?.percent ?? 0)}%`,
                  background: continueChannel?.accent ?? "var(--accent)",
                }}
              />
            </div>
          </div>
        </button>
      )}

      {/* ── Sheikh grid ── */}
      {!searchResults && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold arabic-text">المشايخ</h2>
            <span className="text-xs opacity-40">{data.db.channels.length} قناة</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {data.db.channels.map((ch) => (
              <SheikhBannerCard
                key={ch.id}
                channel={ch}
                videos={data.videosByChannel.get(ch.id) ?? []}
                courses={data.coursesByChannel.get(ch.id) ?? []}
                progress={progress}
                onClick={() => navigate(`/video-library/${ch.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── في تقدم ── */}
      {inProgressCourses.length > 0 && !searchResults && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold arabic-text flex items-center gap-1.5">
              <Zap size={14} style={{ color: "var(--accent)" }} />
              في تقدم
            </h2>
            <span className="text-xs opacity-40">{inProgressCourses.length} دورة</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-0.5 px-0.5">
            {inProgressCourses.map((c) => (
              <div key={c.id} style={{ width: 150, flexShrink: 0 }}>
                <CourseCard2
                  course={c}
                  channel={data.channelById.get(c.channelId)}
                  videos={data.videosByCourse.get(c.id) ?? []}
                  progress={progress}
                  onClick={() => navigate(`/video-library/course/${c.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── الموضوعات ── */}
      {data.db.topics.length > 0 && !searchResults && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold arabic-text">الموضوعات</h2>
            <span className="text-xs opacity-40">عبر كل المشايخ</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {data.db.topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => navigate(`/video-library/topic/${topic.id}`)}
                className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium border transition press-effect min-h-[36px]"
                style={{ background: `${topic.accent}15`, borderColor: `${topic.accent}35`, color: topic.accent }}
              >
                <span>{topic.icon}</span>
                <span>{topic.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Newest videos ── */}
      {newestVideos.length > 0 && !searchResults && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold arabic-text">أحدث الدروس</h2>
            <span className="text-xs opacity-40">{newestVideos.length} درس</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-0.5 px-0.5">
            {newestVideos.map((v) => (
              <VideoThumbCard
                key={v.id}
                video={v}
                channel={data.channelById.get(v.channelId)}
                progress={progress[v.id]}
                bookmarked={!!bookmarks[v.id]}
                onClick={() => navigate(`/video-library/watch/${v.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Bookmarked ── */}
      {bookmarkedVideos.length > 0 && !searchResults && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold arabic-text">المحفوظات</h2>
            <Bookmark size={14} className="fill-[var(--accent)] text-[var(--accent)]" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-0.5 px-0.5">
            {bookmarkedVideos.map((v) => (
              <VideoThumbCard
                key={v.id}
                video={v}
                channel={data.channelById.get(v.channelId)}
                progress={progress[v.id]}
                bookmarked
                onClick={() => navigate(`/video-library/watch/${v.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── مكتملة ── */}
      {completedCourses.length > 0 && !searchResults && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold arabic-text flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              مكتملة
            </h2>
            <span className="text-xs opacity-40">{completedCourses.length} دورة</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-0.5 px-0.5">
            {completedCourses.slice(0, 12).map((c) => (
              <div key={c.id} style={{ width: 150, flexShrink: 0 }}>
                <CourseCard2
                  course={c}
                  channel={data.channelById.get(c.channelId)}
                  videos={data.videosByCourse.get(c.id) ?? []}
                  progress={progress}
                  onClick={() => navigate(`/video-library/course/${c.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Sync CTA ── */}
      {data.db.source === "seed" && !searchResults && (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-400/8 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl mt-0.5">🔄</div>
            <div>
              <div className="font-bold text-sm text-amber-300">اربط القنوات بمحتوى حقيقي</div>
              <div className="text-xs opacity-60 mt-1 leading-5">
                شغّل{" "}
                <code className="text-[11px] bg-white/10 px-1 rounded">tools/scripts/sync-video-library.mjs</code> بعد
                ضبط <code className="text-[11px] bg-white/10 px-1 rounded">YOUTUBE_API_KEY</code> لجلب كل فيديوهات
                القنوات الست تلقائياً.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SHEIKH SCREEN ─────────────────────────────────────────────────────────────

function SheikhScreen({
  data,
  channelId,
  progress,
  bookmarks,
  navigate,
}: {
  data: DBPayload;
  channelId: string;
  progress: Record<string, VideoLibraryProgress>;
  bookmarks: Record<string, boolean>;
  navigate: (path: string) => void;
}) {
  const channel = data.channelById.get(channelId);
  const [topicFilter, setTopicFilter] = React.useState<string | null>(null);
  const [videoPage, setVideoPage] = React.useState(1);
  const [sortKey, setSortKey] = React.useState<"default" | "newest" | "oldest" | "duration-desc" | "duration-asc" | "alpha">("default");
  const PAGE_SIZE = 40;

  // Reset pagination when filter or sort changes
  React.useEffect(() => { setVideoPage(1); }, [topicFilter, channelId, sortKey]);

  if (!channel) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الشيخ غير موجود
      </div>
    );
  }

  const channelVideos = data.videosByChannel.get(channelId) ?? [];
  const channelCourses = data.coursesByChannel.get(channelId) ?? [];
  const stats = aggregateProgress(channelVideos, progress);
  const initials = channel.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  const [sheikhAvatarErr, setSheikhAvatarErr] = React.useState(false);

  const channelTopicIds = new Set(channelVideos.flatMap((v) => v.topicIds as string[]));
  const channelTopics = data.db.topics.filter((t) => channelTopicIds.has(t.id));
  const filteredVideos = topicFilter
    ? channelVideos.filter((v) => (v.topicIds as string[]).includes(topicFilter))
    : channelVideos;
  const visibleVideos = React.useMemo(() => {
    const arr = filteredVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredVideos, sortKey]);

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      {/* ── Hero ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 border"
        style={{
          borderColor: `${channel.accent}35`,
          background: `radial-gradient(ellipse at 20% 0%, ${channel.accent}42 0%, transparent 55%),
                       radial-gradient(ellipse at 90% 95%, ${channel.accent}18 0%, transparent 50%),
                       #08090f`,
        }}
      >
        <div className="dhikr-page-stars absolute inset-0 pointer-events-none" style={{ opacity: 0.55 }} />
        <div className="relative">
          <button
            type="button"
            onClick={() => navigate("/video-library")}
            className="flex items-center gap-1.5 text-xs opacity-50 hover:opacity-80 mb-3.5 transition-opacity press-effect"
          >
            <ArrowRight size={14} />
            <span>المكتبة</span>
          </button>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0"
              style={{
                borderColor: `${channel.accent}70`,
                boxShadow: `0 0 28px ${channel.accent}35`,
              }}
            >
              {channel.avatarUrl && !sheikhAvatarErr ? (
                <img
                  src={channel.avatarUrl}
                  alt={channel.displayName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setSheikhAvatarErr(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-2xl font-extrabold"
                  style={{
                    color: channel.accent,
                    background: `${channel.accent}18`,
                    textShadow: `0 0 20px ${channel.accent}`,
                  }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[1.05rem] font-bold arabic-text" style={{ textShadow: `0 0 28px ${channel.accent}55` }}>
                {channel.displayName}
              </h1>
              <p className="text-xs opacity-50 mt-1 line-clamp-2 leading-5">{channel.description}</p>
            </div>
            {stats.total > 0 && (
              <ProgressRing percent={stats.percent} size={54} strokeWidth={4} color={channel.accent}>
                <span className="text-[10px] font-bold" style={{ color: channel.accent }}>
                  {stats.percent}%
                </span>
              </ProgressRing>
            )}
          </div>
          {(channelVideos.length > 0 || channelCourses.length > 0) && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {channelVideos.length > 0 && (
                <div
                  className="rounded-2xl px-3 py-1.5 text-xs border"
                  style={{
                    background: `${channel.accent}12`,
                    borderColor: `${channel.accent}30`,
                    color: channel.accent,
                  }}
                >
                  {channelVideos.length} فيديو
                </div>
              )}
              {channelCourses.length > 0 && (
                <div className="rounded-2xl bg-white/7 border border-white/10 px-3 py-1.5 text-xs">
                  {channelCourses.length} دورة
                </div>
              )}
              {stats.done > 0 && (
                <div className="rounded-2xl bg-white/7 border border-white/10 px-3 py-1.5 text-xs flex items-center gap-1">
                  <CheckCircle2 size={11} className="opacity-60" />
                  <span>{stats.done} مكتمل</span>
                </div>
              )}
              {channelVideos.length > 0 && Math.floor(channelVideos.reduce((s, v) => s + (v.durationSeconds ?? 0), 0) / 3600) > 0 && (
                <div className="rounded-2xl bg-white/7 border border-white/10 px-3 py-1.5 text-xs flex items-center gap-1">
                  <Clock size={11} className="opacity-60" />
                  <span>{Math.floor(channelVideos.reduce((s, v) => s + (v.durationSeconds ?? 0), 0) / 3600)}+ ساعة</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Courses ── */}
      {channelCourses.length > 0 && (!topicFilter || channelCourses.some(c => (c.topicIds as string[]).includes(topicFilter))) && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold arabic-text">{topicFilter ? "الدورات المصنفة" : "الدورات"}</h2>
            <GraduationCap size={16} style={{ color: channel.accent }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(topicFilter ? channelCourses.filter(c => (c.topicIds as string[]).includes(topicFilter)) : channelCourses).map((c) => (
              <CourseCard2
                key={c.id}
                course={c}
                channel={channel}
                videos={data.videosByCourse.get(c.id) ?? []}
                progress={progress}
                onClick={() => navigate(`/video-library/course/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Topic filter ── */}
      {channelTopics.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setTopicFilter(null)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-2xl border text-xs transition-colors",
              !topicFilter ? "text-black border-transparent" : "bg-white/6 border-white/10",
            )}
            style={!topicFilter ? { background: channel.accent } : undefined}
          >
            الكل
          </button>
          {channelTopics.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTopicFilter(topicFilter === t.id ? null : t.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs transition-colors",
                topicFilter === t.id ? "text-black border-transparent" : "bg-white/6 border-white/10",
              )}
              style={topicFilter === t.id ? { background: t.accent } : undefined}
            >
              <span>{t.icon}</span>
              <span>{t.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Videos ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-semibold arabic-text">{topicFilter ? "الفيديوهات المصنفة" : "كل الفيديوهات"}</h2>
          <span className="text-xs opacity-40">{visibleVideos.length}</span>
        </div>
        {/* Sort chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
          {(["default", "newest", "oldest", "duration-desc", "duration-asc", "alpha"] as const).map((sk) => {
            const labels: Record<typeof sk, string> = { default: "افتراضي", newest: "الأحدث", oldest: "الأقدم", "duration-desc": "الأطول", "duration-asc": "الأقصر", alpha: "أ-ي" };
            return (
              <button key={sk} type="button" onClick={() => setSortKey(sk)}
                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",
                  sortKey === sk ? "text-black border-transparent" : "bg-white/6 border-white/10")}
                style={sortKey === sk ? { background: channel.accent } : undefined}>
                {labels[sk]}
              </button>
            );
          })}
        </div>
        {visibleVideos.length === 0 ? (
          <div className="glass rounded-3xl p-7 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-semibold text-sm">لا توجد فيديوهات بعد</div>
            <div className="text-xs opacity-50 mt-1 leading-5">شغّل أداة المزامنة لتحميل محتوى هذه القناة</div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleVideos.slice(0, videoPage * PAGE_SIZE).map((v) => (
              <VideoListRow
                key={v.id}
                video={v}
                channel={channel}
                progress={progress[v.id]}
                bookmarked={!!bookmarks[v.id]}
                onClick={() => navigate(`/video-library/watch/${v.id}`)}
              />
            ))}
            {videoPage * PAGE_SIZE < visibleVideos.length && (
              <button
                type="button"
                onClick={() => setVideoPage((p) => p + 1)}
                className="w-full py-3 rounded-2xl bg-white/6 border border-white/10 text-sm font-semibold press-effect"
                style={{ color: channel.accent }}
              >
                تحميل المزيد ({visibleVideos.length - videoPage * PAGE_SIZE} متبقٍ)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── COURSE SCREEN ─────────────────────────────────────────────────────────────

const COURSE_PAGE_SIZE = 40;

function CourseScreen({
  data,
  courseId,
  progress,
  bookmarks,
  navigate,
  activeVideoId,
}: {
  data: DBPayload;
  courseId: string;
  progress: Record<string, VideoLibraryProgress>;
  bookmarks: Record<string, boolean>;
  navigate: (path: string) => void;
  activeVideoId?: string;
}) {
  const [lessonPage, setLessonPage] = React.useState(1);
  const [sortKey, setSortKey] = React.useState<"default" | "newest" | "oldest" | "duration-desc" | "duration-asc" | "alpha">("default");
  const course = data.courseById.get(courseId);
  const channel = course ? data.channelById.get(course.channelId) : undefined;
  const courseVideos = course ? (data.videosByCourse.get(course.id) ?? []) : [];
  const stats = aggregateProgress(courseVideos, progress);
  const accent = channel?.accent ?? "var(--accent)";

  if (!course) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الدورة غير موجودة
      </div>
    );
  }

  const lastWatched = courseVideos.find((v) => { const p = progress[v.id]; return p && !p.completed && (p.seconds ?? 0) > 30; });
  const nextToDo = courseVideos.find((v) => !progress[v.id]?.completed);
  const continueTarget = lastWatched ?? nextToDo;

  const sortedLessons = React.useMemo(() => {
    const arr = courseVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  }, [courseVideos, sortKey]);

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      {/* ── Hero ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 border"
        style={{
          borderColor: `${accent}35`,
          background: `radial-gradient(ellipse at 18% 0%, ${accent}38 0%, transparent 52%), #08090f`,
        }}
      >
        <div className="dhikr-page-stars absolute inset-0 pointer-events-none" style={{ opacity: 0.52 }} />
        <div className="relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] opacity-50 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/video-library")}
              className="hover:opacity-80 transition-opacity press-effect"
            >
              المكتبة
            </button>
            {channel && (
              <>
                <ChevronLeft size={11} />
                <button
                  type="button"
                  onClick={() => navigate(`/video-library/${channel.id}`)}
                  className="hover:opacity-80 transition-opacity press-effect"
                >
                  {channel.displayName}
                </button>
                <ChevronLeft size={11} />
              </>
            )}
            <span className="line-clamp-1 opacity-75">{course.title}</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: accent }}>
                <GraduationCap size={12} />
                {channel?.displayName ?? "دورة إسلامية"}
              </div>
              <h1 className="text-[1.05rem] font-bold arabic-text leading-snug">{course.title}</h1>
              {course.description && <p className="text-xs opacity-50 mt-2 leading-5">{course.description}</p>}
            </div>
            <ProgressRing percent={stats.percent} size={60} strokeWidth={5} color={accent}>
              <div className="text-[11px] font-bold" style={{ color: accent }}>
                {stats.percent}%
              </div>
            </ProgressRing>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <div
              className="rounded-2xl px-3 py-1.5 text-xs border"
              style={{ background: `${accent}12`, borderColor: `${accent}30`, color: accent }}
            >
              {stats.done}/{stats.total} مكتمل
            </div>
            {stats.totalSeconds > 0 && (
              <div className="rounded-2xl bg-white/7 border border-white/10 px-3 py-1.5 text-xs flex items-center gap-1">
                <Clock size={10} />
                <span>{formatDuration(stats.totalSeconds)}</span>
              </div>
            )}
          </div>

          {continueTarget && (
            <button
              type="button"
              onClick={() => navigate(`/video-library/watch/${continueTarget.id}`)}
              className="mt-4 w-full rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 press-effect"
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 75%, #000) 100%)`,
                boxShadow: `0 4px 24px ${accent}35`,
                color: "#000",
              }}
            >
              <Play size={15} />
              <span>{lastWatched ? "أكمل الدرس" : "ابدأ الدورة"}</span>
            </button>
          )}
          {!continueTarget && courseVideos.length > 0 && (
            <button
              type="button"
              onClick={() => navigate(`/video-library/watch/${courseVideos[0].id}`)}
              className="mt-4 w-full rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 press-effect border"
              style={{ borderColor: `${accent}40`, color: accent, background: `${accent}12` }}
            >
              <CheckCircle2 size={15} />
              <span>شاهد مجدداً</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Lesson list ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-semibold arabic-text">قائمة الدروس</h2>
          <span className="text-xs opacity-40">{courseVideos.length} درس</span>
        </div>
        {/* Sort chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
          {(["default", "newest", "oldest", "duration-desc", "duration-asc", "alpha"] as const).map((sk) => {
            const labels: Record<typeof sk, string> = { default: "افتراضي", newest: "الأحدث", oldest: "الأقدم", "duration-desc": "الأطول", "duration-asc": "الأقصر", alpha: "أ-ي" };
            return (
              <button key={sk} type="button" onClick={() => { setSortKey(sk); setLessonPage(1); }}
                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",
                  sortKey === sk ? "text-black border-transparent" : "bg-white/6 border-white/10")}
                style={sortKey === sk ? { background: accent } : undefined}>
                {labels[sk]}
              </button>
            );
          })}
        </div>
        {courseVideos.length === 0 ? (
          <div className="glass rounded-3xl p-7 text-center">
            <div className="text-3xl mb-2">🎓</div>
            <div className="font-semibold text-sm">لا توجد دروس بعد</div>
            <div className="text-xs opacity-50 mt-1">شغّل أداة المزامنة لتحميل دروس هذه الدورة</div>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLessons.slice(0, lessonPage * COURSE_PAGE_SIZE).map((v, i) => (
              <LessonRow
                key={v.id}
                video={v}
                index={i}
                channel={channel}
                progress={progress[v.id]}
                isActive={v.id === activeVideoId}
                onClick={() => navigate(`/video-library/watch/${v.id}`)}
              />
            ))}
            {lessonPage * COURSE_PAGE_SIZE < sortedLessons.length && (
              <button
                type="button"
                onClick={() => setLessonPage((p) => p + 1)}
                className="w-full py-3 rounded-2xl bg-white/6 border border-white/10 text-sm font-semibold press-effect"
                style={{ color: accent }}
              >
                تحميل المزيد ({sortedLessons.length - lessonPage * COURSE_PAGE_SIZE} درس متبقٍ)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── WATCH SCREEN ──────────────────────────────────────────────────────────────

function WatchScreen({
  data,
  videoId,
  progress,
  bookmarks,
  navigate,
  setVideoProgress,
  markVideoComplete,
  toggleVideoBookmark,
  setVideoLastVideo,
}: {
  data: DBPayload;
  videoId: string;
  progress: Record<string, VideoLibraryProgress>;
  bookmarks: Record<string, boolean>;
  navigate: (path: string) => void;
  setVideoProgress: (id: string, p: { seconds: number; duration: number; completed?: boolean }) => void;
  markVideoComplete: (id: string, duration: number) => void;
  toggleVideoBookmark: (id: string) => void;
  setVideoLastVideo: (id: string | null) => void;
}) {
  const video = data.videoById.get(videoId);
  const channel = video ? data.channelById.get(video.channelId) : undefined;
  // Prefer a real (non-uploads, non-generated) course over uploads/generated buckets
  const courseId = video ? (() => {
    const preferred = video.courseIds.find(id => {
      const c = data.courseById.get(id);
      return c && !c.isUploads && !c.isGenerated;
    });
    return preferred ?? video.courseIds[0];
  })() : undefined;
  const course = courseId ? data.courseById.get(courseId) : undefined;
  const courseVideos = course ? (data.videosByCourse.get(course.id) ?? []) : [];
  const index = courseVideos.findIndex((v) => v.id === videoId);
  const nextVideo = index >= 0 ? courseVideos[index + 1] : undefined;
  const prevVideo = index > 0 ? courseVideos[index - 1] : undefined;
  const [playlistOpen, setPlaylistOpen] = React.useState(false);
  const [playlistPage, setPlaylistPage] = React.useState(1);
  const PLAYLIST_PAGE_SIZE = 40;
  const activeItemRef = React.useRef<HTMLDivElement | null>(null);
  // Scroll to active video when playlist opens
  React.useEffect(() => {
    if (playlistOpen && activeItemRef.current) {
      setTimeout(() => activeItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
    }
  }, [playlistOpen]);
  const related = React.useMemo(() => {
    const videoTopics = video ? ((video.topicIds as string[]) ?? []) : [];
    const courseVideoIds = new Set(courseVideos.map((v) => v.id));
    const topicRelated = videoTopics.length > 0
      ? data.db.videos.filter((v) =>
          v.id !== videoId &&
          !courseVideoIds.has(v.id) &&
          (v.topicIds as string[]).some((tid) => videoTopics.includes(tid))
        )
      : [];
    const topicRelatedIds = new Set(topicRelated.map((v) => v.id));
    const channelFill = (data.videosByChannel.get(video?.channelId ?? "") ?? [])
      .filter((v) => v.id !== videoId && !courseVideoIds.has(v.id) && !topicRelatedIds.has(v.id));
    return [...topicRelated, ...channelFill].slice(0, 12);
  }, [data, video, videoId, courseVideos]);

  if (!video) {
    return (
      <div className="page-enter space-y-3" dir="rtl">
        <button
          type="button"
          onClick={() => navigate("/video-library")}
          className="flex items-center gap-2 text-sm opacity-55 hover:opacity-80 transition-opacity press-effect"
        >
          <ArrowRight size={16} />
          <span>المكتبة</span>
        </button>
        <div className="glass rounded-3xl p-7 text-center">
          <div className="text-3xl mb-2">🎥</div>
          <div className="font-semibold">الفيديو غير موجود</div>
          <div className="text-xs opacity-50 mt-1">ربما تم حذفه من قاعدة البيانات</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 page-enter" dir="rtl">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-[11px] opacity-45 flex-wrap">
        <button
          type="button"
          onClick={() => navigate("/video-library")}
          className="hover:opacity-80 transition-opacity press-effect"
        >
          المكتبة
        </button>
        {channel && (
          <>
            <ChevronLeft size={10} />
            <button
              type="button"
              onClick={() => navigate(`/video-library/${channel.id}`)}
              className="hover:opacity-80 transition-opacity press-effect"
            >
              {channel.displayName}
            </button>
          </>
        )}
        {course && (
          <>
            <ChevronLeft size={10} />
            <button
              type="button"
              onClick={() => navigate(`/video-library/course/${course.id}`)}
              className="hover:opacity-80 transition-opacity press-effect max-w-[130px] truncate"
            >
              {course.title}
            </button>
          </>
        )}
      </div>

      {/* ── Player ── */}
      <YouTubeCoursePlayer
        video={video}
        channel={channel}
        course={course}
        progress={progress[video.id]}
        bookmarked={!!bookmarks[video.id]}
        onClose={() =>
          navigate(
            course
              ? `/video-library/course/${course.id}`
              : channel
              ? `/video-library/${channel.id}`
              : "/video-library",
          )
        }
        onBookmark={() => toggleVideoBookmark(video.id)}
        onComplete={() => markVideoComplete(video.id, video.durationSeconds)}
        onNext={nextVideo ? () => navigate(`/video-library/watch/${nextVideo.id}`) : undefined}
        onPrev={prevVideo ? () => navigate(`/video-library/watch/${prevVideo.id}`) : undefined}
        onProgress={(seconds, duration, completed) => {
          setVideoLastVideo(video.id);
          setVideoProgress(video.id, { seconds, duration, completed });
        }}
      />

      {/* ── Course playlist panel ── */}
      {course && courseVideos.length > 0 && (
        <div className="glass-strong rounded-3xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setPlaylistOpen(!playlistOpen)}
            className="w-full p-4 flex items-center justify-between gap-3 text-right press-effect"
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap size={16} style={{ color: channel?.accent }} />
              <div>
                <div className="text-[12px] font-semibold arabic-text">{course.title}</div>
                <div className="text-[11px] opacity-45 mt-0.5">
                  {index + 1} من {courseVideos.length} درس
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(
                      (courseVideos.filter((v) => progress[v.id]?.completed).length / courseVideos.length) * 100,
                    )}%`,
                    background: channel?.accent ?? "var(--accent)",
                  }}
                />
              </div>
              <ChevronLeft
                size={16}
                className="opacity-40 transition-transform duration-300"
                style={{ transform: playlistOpen ? "rotate(-90deg)" : "rotate(0deg)" }}
              />
            </div>
          </button>
          {playlistOpen && (
            <div className="px-3 pb-3 border-t border-white/8 pt-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {courseVideos.slice(0, playlistPage * PLAYLIST_PAGE_SIZE).map((v, i) => (
                <div key={v.id} ref={v.id === videoId ? activeItemRef : undefined}>
                  <LessonRow
                    video={v}
                    index={i}
                    channel={channel}
                    progress={progress[v.id]}
                    isActive={v.id === videoId}
                    onClick={() => navigate(`/video-library/watch/${v.id}`)}
                  />
                </div>
              ))}
              {playlistPage * PLAYLIST_PAGE_SIZE < courseVideos.length && (
                <button
                  type="button"
                  onClick={() => setPlaylistPage((p) => p + 1)}
                  className="w-full py-2.5 rounded-2xl bg-white/6 border border-white/10 text-xs font-semibold press-effect"
                  style={{ color: channel?.accent }}
                >
                  تحميل المزيد ({courseVideos.length - playlistPage * PLAYLIST_PAGE_SIZE} درس متبقٍ)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Related videos ── */}
      {related.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold arabic-text mb-3">فيديوهات ذات صلة</h2>
          <div className="space-y-2">
            {related.map((v) => (
              <VideoListRow
                key={v.id}
                video={v}
                channel={data.channelById.get(v.channelId)}
                progress={progress[v.id]}
                bookmarked={!!bookmarks[v.id]}
                onClick={() => navigate(`/video-library/watch/${v.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── TOPIC SCREEN (cross-channel browse) ─────────────────────────────────────

function TopicScreen({
  data,
  topicId,
  progress,
  bookmarks,
  navigate,
}: {
  data: DBPayload;
  topicId: string;
  progress: Record<string, VideoLibraryProgress>;
  bookmarks: Record<string, boolean>;
  navigate: (path: string) => void;
}) {
  const topic = data.topicById.get(topicId);
  const [channelFilter, setChannelFilter] = React.useState<string | null>(null);
  const [videoPage, setVideoPage] = React.useState(1);
  const [sortKey, setSortKey] = React.useState<"default" | "newest" | "oldest" | "duration-desc" | "duration-asc" | "alpha">("default");
  const PAGE_SIZE = 40;

  React.useEffect(() => { setVideoPage(1); }, [channelFilter, topicId, sortKey]);

  if (!topic) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الموضوع غير موجود
      </div>
    );
  }

  const topicVideos = data.db.videos.filter((v) => (v.topicIds as string[]).includes(topicId));
  const topicCourses = data.db.courses.filter((c) => (c.topicIds as string[]).includes(topicId) && !c.isGenerated);
  const channelIds = [...new Set(topicVideos.map((v) => v.channelId))];
  const channelChips = channelIds
    .map((id) => ({ id, channel: data.channelById.get(id)!, count: topicVideos.filter((v) => v.channelId === id).length }))
    .filter((c) => c.channel);

  const filteredVideos = channelFilter
    ? topicVideos.filter((v) => v.channelId === channelFilter)
    : topicVideos;

  const visibleVideos = React.useMemo(() => {
    const arr = filteredVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredVideos, sortKey]);

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      {/* ── Hero ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 border"
        style={{ borderColor: `${topic.accent}35`, background: `radial-gradient(ellipse at 18% 0%, ${topic.accent}42 0%, transparent 52%), #08090f` }}
      >
        <div className="dhikr-page-stars absolute inset-0 pointer-events-none" style={{ opacity: 0.52 }} />
        <div className="relative">
          <button
            type="button"
            onClick={() => navigate("/video-library")}
            className="flex items-center gap-1.5 text-xs opacity-50 hover:opacity-80 mb-3 transition-opacity press-effect"
          >
            <ArrowRight size={14} /><span>المكتبة</span>
          </button>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{topic.icon}</span>
            <div>
              <h1 className="text-[1.1rem] font-bold arabic-text">{topic.title}</h1>
              <p className="text-xs opacity-50 mt-1 leading-5">{topic.description}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="rounded-2xl px-3 py-1.5 text-xs border" style={{ background: `${topic.accent}12`, borderColor: `${topic.accent}30`, color: topic.accent }}>
              {topicVideos.length} فيديو
            </div>
            {topicCourses.length > 0 && (
              <div className="rounded-2xl bg-white/7 border border-white/10 px-3 py-1.5 text-xs flex items-center gap-1">
                <GraduationCap size={10} /><span>{topicCourses.length} دورة</span>
              </div>
            )}
            {channelIds.length > 0 && (
              <div className="rounded-2xl bg-white/7 border border-white/10 px-3 py-1.5 text-xs">
                {channelIds.length} مشايخ
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Courses for this topic ── */}
      {topicCourses.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold arabic-text mb-3">الدورات</h2>
          <div className="grid grid-cols-2 gap-3">
            {topicCourses.map((c) => (
              <CourseCard2
                key={c.id}
                course={c}
                channel={data.channelById.get(c.channelId)}
                videos={data.videosByCourse.get(c.id) ?? []}
                progress={progress}
                onClick={() => navigate(`/video-library/course/${c.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Channel filter chips ── */}
      {channelChips.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button type="button"
            onClick={() => setChannelFilter(null)}
            className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
              channelFilter === null ? "text-black border-transparent" : "bg-white/8 border-white/12 hover:bg-white/12")}
            style={channelFilter === null ? { background: topic.accent } : {}}
          >
            الكل ({topicVideos.length})
          </button>
          {channelChips.map(({ id, channel, count }) => (
            <button type="button" key={id}
              onClick={() => setChannelFilter(channelFilter === id ? null : id)}
              className={cn("shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
                channelFilter === id ? "text-black border-transparent" : "bg-white/8 border-white/12 hover:bg-white/12")}
              style={channelFilter === id ? { background: channel.accent } : { borderColor: `${channel.accent}40` }}
            >
              {channel.displayName} ({count})
            </button>
          ))}
        </div>
      )}

      {/* ── Videos ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-semibold arabic-text">الفيديوهات</h2>
          <span className="text-xs opacity-40">{visibleVideos.length}</span>
        </div>
        {/* Sort chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
          {(["default", "newest", "oldest", "duration-desc", "duration-asc", "alpha"] as const).map((sk) => {
            const labels: Record<typeof sk, string> = { default: "افتراضي", newest: "الأحدث", oldest: "الأقدم", "duration-desc": "الأطول", "duration-asc": "الأقصر", alpha: "أ-ي" };
            return (
              <button key={sk} type="button" onClick={() => setSortKey(sk)}
                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",
                  sortKey === sk ? "text-black border-transparent" : "bg-white/6 border-white/10")}
                style={sortKey === sk ? { background: topic.accent } : undefined}>
                {labels[sk]}
              </button>
            );
          })}
        </div>
        {topicVideos.length === 0 ? (
          <div className="glass rounded-3xl p-7 text-center">
            <div className="text-3xl mb-2">{topic.icon}</div>
            <div className="font-semibold text-sm">لا توجد فيديوهات بعد لهذا الموضوع</div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleVideos.slice(0, videoPage * PAGE_SIZE).map((v) => (
              <VideoListRow
                key={v.id}
                video={v}
                channel={data.channelById.get(v.channelId)}
                progress={progress[v.id]}
                bookmarked={!!bookmarks[v.id]}
                onClick={() => navigate(`/video-library/watch/${v.id}`)}
              />
            ))}
            {videoPage * PAGE_SIZE < visibleVideos.length && (
              <button
                type="button"
                onClick={() => setVideoPage((p) => p + 1)}
                className="w-full py-3 rounded-2xl bg-white/6 border border-white/10 text-sm font-semibold press-effect"
                style={{ color: topic.accent }}
              >
                تحميل المزيد ({visibleVideos.length - videoPage * PAGE_SIZE} متبقٍ)
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Other topics ── */}
      {data.db.topics.filter((t) => t.id !== topicId).length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold opacity-50 mb-2 tracking-wide">موضوعات أخرى</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {data.db.topics.filter((t) => t.id !== topicId).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/video-library/topic/${t.id}`)}
                className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition press-effect"
                style={{ background: `${t.accent}12`, borderColor: `${t.accent}30`, color: t.accent }}
              >
                <span>{t.icon}</span>
                <span>{t.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Main page export ──────────────────────────────────────────────────────────

export function VideoLibraryPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const params = useParams<{ channelId?: string; courseId?: string; videoId?: string; topicId?: string }>();
  const { data, isLoading, error } = useVideoLibraryDB();
  const progress = useNoorStore((s) => s.videoLibraryProgress);
  const bookmarks = useNoorStore((s) => s.videoLibraryBookmarks);
  const lastVideoId = useNoorStore((s) => s.videoLibraryLastVideoId);
  const setVideoProgress = useNoorStore((s) => s.setVideoProgress);
  const markVideoComplete = useNoorStore((s) => s.markVideoComplete);
  const toggleVideoBookmark = useNoorStore((s) => s.toggleVideoBookmark);
  const setVideoLastVideo = useNoorStore((s) => s.setVideoLastVideo);

  if (isLoading) {
    return (
      <div className="space-y-4 page-enter" dir="rtl">
        <div className="rounded-3xl glass-strong border border-white/10 p-5 space-y-3">
          <div className="skeleton h-7 w-48 rounded-2xl" />
          <div className="skeleton h-4 w-64 rounded-2xl" />
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton rounded-3xl" style={{ aspectRatio: "5/4" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-enter glass rounded-3xl border border-white/10 p-7 text-center" dir="rtl">
        <div className="text-3xl mb-3">⚠️</div>
        <div className="font-bold">تعذر تحميل مكتبة الفيديو</div>
        <div className="text-sm opacity-55 mt-2">تأكد من وجود ملف البيانات ثم أعد المحاولة.</div>
      </div>
    );
  }

  if (params.videoId) {
    return (
      <WatchScreen
        data={data}
        videoId={params.videoId}        progress={progress}
        bookmarks={bookmarks}
        navigate={navigate}
        setVideoProgress={setVideoProgress}
        markVideoComplete={markVideoComplete}
        toggleVideoBookmark={toggleVideoBookmark}
        setVideoLastVideo={setVideoLastVideo}
      />
    );
  }

  if (params.courseId) {
    return (
      <CourseScreen
        data={data}
        courseId={params.courseId}
        progress={progress}
        bookmarks={bookmarks}
        navigate={navigate}
        activeVideoId={undefined}
      />
    );
  }

  if (params.channelId) {
    return (
      <SheikhScreen
        data={data}
        channelId={params.channelId}
        progress={progress}
        bookmarks={bookmarks}
        navigate={navigate}
      />
    );
  }

  if (params.topicId) {
    return (
      <TopicScreen
        data={data}
        topicId={params.topicId}
        progress={progress}
        bookmarks={bookmarks}
        navigate={navigate}
      />
    );
  }

  return (
    <VideoHome
      data={data}
      progress={progress}
      bookmarks={bookmarks}
      lastVideoId={lastVideoId}
      navigate={navigate}
    />
  );
}
