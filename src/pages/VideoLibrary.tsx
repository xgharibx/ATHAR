import * as React from "react";
import Fuse from "fuse.js";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
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
  const initials = channel.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

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
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-[17px] font-extrabold border-2 shrink-0"
            style={{
              borderColor: `${channel.accent}70`,
              color: channel.accent,
              background: `${channel.accent}18`,
              textShadow: `0 0 16px ${channel.accent}`,
            }}
          >
            {initials}
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
            style={{ fontSize: "0.88rem", color: "white", textShadow: "0 1px 16px rgba(0,0,0,0.95)" }}
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
  const accent = channel?.accent ?? "var(--accent)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right press-effect rounded-3xl overflow-hidden glass border relative"
      style={{ borderColor: `${accent}30` }}
    >
      <div className="h-1 w-full" style={{ background: accent }} />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium mb-1" style={{ color: accent }}>
              {channel?.displayName ?? "دورة"}
            </div>
            <h3 className="text-[13px] font-bold line-clamp-2 arabic-text leading-5">{course.title}</h3>
          </div>
          <GraduationCap size={16} className="shrink-0 mt-1" style={{ color: accent }} />
        </div>
        {stats.total > 0 ? (
          <>
            <ThinBar percent={stats.percent} accent={accent} />
            <div className="flex items-center justify-between text-[10px] opacity-50 mt-1.5">
              <span>
                {stats.done}/{stats.total} درس
              </span>
              <span>{formatDuration(stats.totalSeconds)}</span>
            </div>
          </>
        ) : (
          <div className="text-[10px] opacity-35 mt-1">بانتظار المزامنة</div>
        )}
      </div>
    </button>
  );
}

// ── Lesson Row (numbered, ordered) ───────────────────────────────────────────

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
  const accent = channel?.accent ?? "var(--accent)";
  const completed = progress?.completed;
  const pct = completed ? 100 : (progress?.percent ?? 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-right rounded-2xl p-2.5 press-effect flex gap-3 transition-colors border",
        isActive ? "glass-strong" : "bg-white/4 hover:bg-white/6 border-transparent",
      )}
      style={isActive ? { borderColor: `${accent}45` } : undefined}
    >
      {/* Number / checkmark */}
      <div
        className="w-7 h-7 rounded-xl shrink-0 flex items-center justify-center border"
        style={{
          background: completed ? `${accent}25` : isActive ? `${accent}15` : "rgba(255,255,255,0.05)",
          borderColor: completed ? `${accent}60` : isActive ? `${accent}40` : "rgba(255,255,255,0.1)",
        }}
      >
        {completed ? (
          <CheckCircle2 size={13} style={{ color: accent }} />
        ) : (
          <span className="text-[11px] font-bold opacity-65">{index + 1}</span>
        )}
      </div>
      {/* Thumbnail */}
      <div className="w-16 h-10 rounded-xl bg-black/30 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Play size={12} className="opacity-35" />
        )}
      </div>
      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className={cn("text-[13px] font-semibold line-clamp-2 arabic-text leading-4", isActive && "text-white")}>
          {video.title}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Clock size={9} className="opacity-35 shrink-0" />
          <span className="text-[10px] opacity-40">{formatDuration(video.durationSeconds)}</span>
          {isActive && (
            <span className="text-[10px] font-semibold" style={{ color: accent }}>
              ▶ يعرض الآن
            </span>
          )}
        </div>
        {pct > 0 && <ThinBar percent={pct} accent={accent} />}
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
  const accent = channel?.accent ?? "var(--accent)";
  const pct = progress?.completed ? 100 : (progress?.percent ?? 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-right rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 press-effect p-2.5 flex gap-3 transition-colors"
    >
      <div className="w-24 h-[52px] rounded-xl bg-black/30 border border-white/10 overflow-hidden shrink-0 relative flex items-center justify-center">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at center, ${accent}25 0%, transparent 70%)` }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-black/50 border border-white/20 flex items-center justify-center">
            <Play size={10} className="text-white" style={{ marginLeft: 1 }} />
          </div>
        </div>
        {pct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div className="h-full" style={{ width: `${pct}%`, background: accent }} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <div className="text-[13px] font-semibold line-clamp-2 arabic-text flex-1 leading-4">{video.title}</div>
          {bookmarked && <Bookmark size={11} className="fill-[var(--accent)] text-[var(--accent)] shrink-0 mt-0.5" />}
        </div>
        <div className="text-[10px] opacity-40 mt-0.5">{channel?.displayName}</div>
        <div className="flex items-center gap-2 mt-1">
          <Clock size={9} className="opacity-35 shrink-0" />
          <span className="text-[10px] opacity-40">{formatDuration(video.durationSeconds)}</span>
          {progress?.completed && (
            <span className="text-[10px] flex items-center gap-0.5" style={{ color: accent }}>
              <CheckCircle2 size={9} /> مكتمل
            </span>
          )}
        </div>
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

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
    return {
      videos: data.db.videos.filter((v) => vids.has(v.id)).slice(0, 24),
      courses: data.db.courses.filter((c) => cids.has(c.id)).slice(0, 10),
    };
  }, [data, fuse, q]);

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
                <span className="text-[11px] font-semibold tracking-wider opacity-80">مكتبة النور</span>
              </div>
              <h1
                className="text-[1.6rem] font-extrabold arabic-text leading-tight"
                style={{ textShadow: "0 0 40px var(--accent)" }}
              >
                الدورات الإسلامية
              </h1>
              <p className="text-xs opacity-45 mt-1 leading-5">تعلّم بتنظيم · تابع تقدمك · استكشف بلا تشتت</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setQ("");
              }}
              className={cn(
                "w-11 h-11 rounded-2xl glass border border-white/15 flex items-center justify-center shrink-0 press-effect transition-all",
                searchOpen && "bg-[var(--accent)]/20 border-[var(--accent)]/50",
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
                className="w-full rounded-2xl bg-white/8 border border-white/15 pr-9 pl-4 py-3 text-sm outline-none focus:border-[var(--accent)]/60 transition-colors"
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
                  <span className="text-sm font-bold">{s.value}</span>
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
                  <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
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
          {searchResults.courses.length > 0 && (
            <section>
              <h2 className="font-bold text-sm mb-2.5 opacity-70">الدورات</h2>
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
            </section>
          )}
          {searchResults.videos.length > 0 && (
            <section>
              <h2 className="font-bold text-sm mb-2.5 opacity-70">الفيديوهات</h2>
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
      {continueVideo && !searchResults && (
        <button
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
                <img src={continueVideo.thumbnail} alt="" className="w-full h-full object-cover" />
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
                  className="text-xs font-semibold mb-1.5 flex items-center gap-1.5"
                  style={{ color: continueChannel?.accent ?? "var(--accent)" }}
                >
                  <Sparkles size={12} />
                  <span>أكمل من حيث توقفت</span>
                </div>
                <div
                  className="font-bold text-base arabic-text line-clamp-2 leading-snug"
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
            <h2 className="font-bold arabic-text">المشايخ</h2>
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

      {/* ── Newest videos ── */}
      {newestVideos.length > 0 && !searchResults && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold arabic-text">أحدث الدروس</h2>
            <span className="text-xs opacity-40">{data.db.videos.length}</span>
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
            <h2 className="font-bold arabic-text">المحفوظات</h2>
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

  const channelTopicIds = new Set(channelVideos.flatMap((v) => v.topicIds as string[]));
  const channelTopics = data.db.topics.filter((t) => channelTopicIds.has(t.id));
  const visibleVideos = topicFilter
    ? channelVideos.filter((v) => (v.topicIds as string[]).includes(topicFilter))
    : channelVideos;

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
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold border-2 shrink-0"
              style={{
                borderColor: `${channel.accent}70`,
                color: channel.accent,
                background: `${channel.accent}18`,
                textShadow: `0 0 20px ${channel.accent}`,
                boxShadow: `0 0 28px ${channel.accent}25`,
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold arabic-text" style={{ textShadow: `0 0 28px ${channel.accent}55` }}>
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
            </div>
          )}
        </div>
      </div>

      {/* ── Courses ── */}
      {channelCourses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold arabic-text">الدورات</h2>
            <GraduationCap size={16} style={{ color: channel.accent }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {channelCourses.map((c) => (
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold arabic-text">{topicFilter ? "الفيديوهات المصنفة" : "كل الفيديوهات"}</h2>
          <span className="text-xs opacity-40">{visibleVideos.length}</span>
        </div>
        {visibleVideos.length === 0 ? (
          <div className="glass rounded-3xl p-7 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-semibold text-sm">لا توجد فيديوهات بعد</div>
            <div className="text-xs opacity-50 mt-1 leading-5">شغّل أداة المزامنة لتحميل محتوى هذه القناة</div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleVideos.map((v) => (
              <VideoListRow
                key={v.id}
                video={v}
                channel={channel}
                progress={progress[v.id]}
                bookmarked={!!bookmarks[v.id]}
                onClick={() => navigate(`/video-library/watch/${v.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── COURSE SCREEN ─────────────────────────────────────────────────────────────

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

  const lastWatched = courseVideos.find((v) => progress[v.id] && !progress[v.id].completed);
  const nextToDo = courseVideos.find((v) => !progress[v.id]?.completed);
  const continueTarget = lastWatched ?? nextToDo;

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
              <h1 className="text-xl font-extrabold arabic-text leading-snug">{course.title}</h1>
              {course.description && <p className="text-xs opacity-50 mt-2 leading-5">{course.description}</p>}
            </div>
            <ProgressRing percent={stats.percent} size={60} strokeWidth={5} color={accent}>
              <div className="text-sm font-extrabold" style={{ color: accent }}>
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
        </div>
      </div>

      {/* ── Lesson list ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold arabic-text">قائمة الدروس</h2>
          <span className="text-xs opacity-40">{courseVideos.length} درس</span>
        </div>
        {courseVideos.length === 0 ? (
          <div className="glass rounded-3xl p-7 text-center">
            <div className="text-3xl mb-2">🎓</div>
            <div className="font-semibold text-sm">لا توجد دروس بعد</div>
            <div className="text-xs opacity-50 mt-1">شغّل أداة المزامنة لتحميل دروس هذه الدورة</div>
          </div>
        ) : (
          <div className="space-y-2">
            {courseVideos.map((v, i) => (
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
  const courseId = video?.courseIds[0];
  const course = courseId ? data.courseById.get(courseId) : undefined;
  const courseVideos = course ? (data.videosByCourse.get(course.id) ?? []) : [];
  const index = courseVideos.findIndex((v) => v.id === videoId);
  const nextVideo = index >= 0 ? courseVideos[index + 1] : undefined;
  const [playlistOpen, setPlaylistOpen] = React.useState(false);
  const related = (data.videosByChannel.get(video?.channelId ?? "") ?? [])
    .filter((v) => v.id !== videoId)
    .slice(0, 8);

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
                <div className="text-sm font-bold arabic-text">{course.title}</div>
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
            <div className="px-3 pb-3 space-y-1.5 border-t border-white/8 pt-3">
              {courseVideos.map((v, i) => (
                <LessonRow
                  key={v.id}
                  video={v}
                  index={i}
                  channel={channel}
                  progress={progress[v.id]}
                  isActive={v.id === videoId}
                  onClick={() => navigate(`/video-library/watch/${v.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Related videos ── */}
      {related.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold arabic-text text-sm">فيديوهات أخرى</h2>
            <span className="text-xs" style={{ color: channel?.accent, opacity: 0.7 }}>
              {channel?.displayName}
            </span>
          </div>
          <div className="space-y-2">
            {related.map((v) => (
              <VideoListRow
                key={v.id}
                video={v}
                channel={channel}
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

// ── Main page export ──────────────────────────────────────────────────────────

export function VideoLibraryPage() {
  const navigate = useNavigate();
  const params = useParams<{ channelId?: string; courseId?: string; videoId?: string }>();
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
        videoId={params.videoId}
        progress={progress}
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
