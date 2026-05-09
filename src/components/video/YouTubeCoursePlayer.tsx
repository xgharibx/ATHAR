import * as React from "react";
import { ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, ExternalLink, Play, Share2, SkipBack, SkipForward } from "lucide-react";
import toast from "react-hot-toast";

import type {
  VideoLibraryChannel,
  VideoLibraryCourse,
  VideoLibraryProgress,
  VideoLibraryVideo,
} from "@/data/videoLibraryTypes";

// ── YouTube IFrame API ────────────────────────────────────────────────────────

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API loaded without Player"));
    };
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("Failed to load YouTube API"));
      document.head.appendChild(tag);
    }
    window.setTimeout(() => {
      if (window.YT?.Player) resolve(window.YT);
    }, 3000);
  });
  return youtubeApiPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function YouTubeCoursePlayer({
  video,
  channel,
  course,
  progress,
  bookmarked,
  onProgress,
  onComplete,
  onBookmark,
  onClose,
  onNext,
  onPrev,
}: {
  video: VideoLibraryVideo;
  channel?: VideoLibraryChannel;
  course?: VideoLibraryCourse;
  progress?: VideoLibraryProgress;
  bookmarked: boolean;
  onProgress: (seconds: number, duration: number, completed?: boolean) => void;
  onComplete: () => void;
  onBookmark: () => void;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(progress?.seconds ?? 0);
  const [duration, setDuration] = React.useState(progress?.duration || video.durationSeconds || 0);
  const [apiFailed, setApiFailed] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const [nextCountdown, setNextCountdown] = React.useState<number | null>(null);
  const countdownRef = React.useRef<number | null>(null);

  const accent = channel?.accent ?? "var(--accent)";

  const saveNow = React.useCallback(
    (completed = false) => {
      const player = playerRef.current;
      const seconds = player?.getCurrentTime?.() ?? current;
      const len = player?.getDuration?.() || duration || video.durationSeconds || 0;
      if (len > 0) {
        setCurrent(seconds);
        setDuration(len);
        onProgress(seconds, len, completed || seconds / len >= 0.92);
      }
    },
    [current, duration, onProgress, video.durationSeconds],
  );

  // Clear next-countdown on unmount
  React.useEffect(() => {
    return () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!video.youtubeId || !hostRef.current) return;
    let cancelled = false;
    setApiFailed(false);
    setEnded(false);
    setNextCountdown(null);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        playerRef.current?.destroy();
        playerRef.current = new YT.Player(hostRef.current, {
          videoId: video.youtubeId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              const len = playerRef.current?.getDuration?.() || video.durationSeconds || 0;
              setDuration(len);
              if ((progress?.seconds ?? 0) > 5 && len > 0 && (progress?.seconds ?? 0) < len - 8) {
                playerRef.current?.seekTo(progress!.seconds, true);
                setCurrent(progress!.seconds);
              }
            },
            onStateChange: (event: { data: number }) => {
              if (event.data === YT.PlayerState.PLAYING) {
                setPlaying(true);
                setEnded(false);
              }
              if (event.data === YT.PlayerState.PAUSED) {
                setPlaying(false);
                saveNow(false);
              }
              if (event.data === YT.PlayerState.ENDED) {
                setPlaying(false);
                saveNow(true);
                onComplete();
                setEnded(true);
                // Auto-next countdown if there's a next video
                if (onNext) {
                  let count = 5;
                  setNextCountdown(count);
                  countdownRef.current = window.setInterval(() => {
                    count -= 1;
                    if (count <= 0) {
                      if (countdownRef.current) window.clearInterval(countdownRef.current);
                      countdownRef.current = null;
                      setNextCountdown(null);
                      onNext();
                    } else {
                      setNextCountdown(count);
                    }
                  }, 1000);
                }
              }
            },
          },
        });
      })
      .catch(() => setApiFailed(true));

    return () => {
      cancelled = true;
      saveNow(false);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      countdownRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.youtubeId]);

  React.useEffect(() => {
    if (!playing) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = window.setInterval(() => saveNow(false), 5000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [playing, saveNow]);

  const percent = duration > 0 ? Math.min(100, Math.round((current / duration) * 100)) : (progress?.percent ?? 0);
  const isCompleted = progress?.completed || percent >= 92;

  const shareVideo = async () => {
    const text = `${video.title}\n${channel?.displayName ?? "مكتبة أثر"}\n${video.youtubeUrl}`;
    try {
      if (navigator.share) await navigator.share({ title: video.title, text, url: video.youtubeUrl });
      else await navigator.clipboard.writeText(text);
      toast.success("تم تجهيز رابط الدرس");
    } catch {
      toast.error("تعذرت المشاركة");
    }
  };

  return (
    <div dir="rtl">
      {/* ── Player shell ── */}
      <div
        className="rounded-3xl overflow-hidden border"
        style={{
          borderColor: `${accent}30`,
          background: "#000",
          boxShadow: `0 8px 40px ${accent}18`,
        }}
      >
        {/* Video area */}
        {video.youtubeId ? (
          <div className="relative bg-black aspect-video">
            <div ref={hostRef} className="absolute inset-0 w-full h-full" />
            {apiFailed && (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&modestbranding=1&playsinline=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
            {/* Auto-next overlay */}
            {ended && onNext && nextCountdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75">
                <div
                  className="rounded-3xl border p-6 text-center max-w-[260px]"
                  style={{ background: `${accent}15`, borderColor: `${accent}40` }}
                >
                  <SkipForward size={28} className="mx-auto mb-3" style={{ color: accent }} />
                  <div className="font-bold arabic-text mb-1">الدرس التالي</div>
                  <div className="text-xs opacity-60 mb-4">ينطلق خلال {nextCountdown} ثوانٍ</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (countdownRef.current) window.clearInterval(countdownRef.current);
                        countdownRef.current = null;
                        setNextCountdown(null);
                        onNext();
                      }}
                      className="flex-1 rounded-2xl py-2 text-sm font-bold press-effect"
                      style={{ background: accent, color: "#000" }}
                    >
                      الآن
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (countdownRef.current) window.clearInterval(countdownRef.current);
                        countdownRef.current = null;
                        setNextCountdown(null);
                      }}
                      className="flex-1 rounded-2xl py-2 text-sm font-bold bg-[var(--card)] press-effect"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No YouTube ID: placeholder */
          <div
            className="aspect-video flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
            style={{ background: `radial-gradient(ellipse at 30% 30%, ${accent}25 0%, #0a0a14 100%)` }}
          >
            <div className="dhikr-card-stars absolute inset-0 pointer-events-none" style={{ opacity: 0.4 }} />
            <div className="relative">
              <Play size={40} className="mx-auto mb-3 opacity-30" />
              <div className="font-bold arabic-text text-base">{video.title}</div>
              <div className="text-xs opacity-50 mt-2 leading-5">
                شغّل أداة المزامنة لإضافة الفيديوهات الفعلية من القناة.
              </div>
            </div>
          </div>
        )}

        {/* ── Info & Controls ── */}
        <div
          className="p-4"
          style={{ background: `linear-gradient(to bottom, #050508, #080a10)` }}
        >
          {/* Channel badge + close */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              {channel && (
                <div
                  className="h-5 px-2 rounded-lg text-[10px] font-semibold flex items-center shrink-0"
                  style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}40` }}
                >
                  {channel.displayName}
                </div>
              )}
              {course && (
                <div className="h-5 px-2 rounded-lg text-[10px] bg-[var(--card)] border border-[var(--stroke)] flex items-center shrink-0 truncate max-w-[130px]">
                  {course.title}
                </div>
              )}
              {isCompleted && (
                <div className="h-5 px-2 rounded-lg text-[10px] flex items-center gap-1 shrink-0"
                  style={{ background: "#10b98122", color: "#34d399", border: "1px solid #10b98140" }}>
                  <CheckCircle2 size={10} />
                  مكتمل
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-xl bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center shrink-0 press-effect hover:bg-[var(--card-2)] transition-colors"
            >
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Title */}
          <h2 className="font-bold text-base arabic-text leading-snug line-clamp-2 mb-3">
            {video.title}
          </h2>

          {/* Progress timeline */}
          <div className="mb-3" dir="ltr">
            <div className="relative h-2 rounded-full bg-[var(--card)] overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${percent}%`, background: accent }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] opacity-45 tabular-nums">
              <span>{formatTime(current)}</span>
              <span className="font-medium" style={{ color: accent }}>{percent}%</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBookmark}
              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold press-effect transition-all border"
              style={
                bookmarked
                  ? { background: `${accent}20`, borderColor: `${accent}50`, color: accent }
                  : { background: "var(--card)", borderColor: "var(--stroke)" }
              }
            >
              {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              <span>{bookmarked ? "محفوظ" : "حفظ"}</span>
            </button>

            <button
              type="button"
              onClick={() => { onComplete(); }}
              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold press-effect transition-all border"
              style={
                isCompleted
                  ? { background: "#10b98120", borderColor: "#10b98140", color: "#34d399" }
                  : { background: "var(--card)", borderColor: "var(--stroke)" }
              }
            >
              <CheckCircle2 size={14} />
              <span>{isCompleted ? "مكتمل" : "إكمال"}</span>
            </button>

            <button
              type="button"
              onClick={shareVideo}
              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[var(--card)] border border-[var(--stroke)] press-effect hover:bg-[var(--card-2)] transition-colors"
            >
              <Share2 size={14} />
              <span>مشاركة</span>
            </button>

            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[var(--card)] border border-[var(--stroke)] press-effect hover:bg-[var(--card-2)] transition-colors"
              >
                <SkipBack size={14} />
                <span>السابق</span>
              </button>
            )}
            {onNext ? (
              <button
                type="button"
                onClick={onNext}
                className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold press-effect transition-all"
                style={{ background: accent, color: "#000" }}
              >
                <SkipForward size={14} />
                <span>التالي</span>
              </button>
            ) : (
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[var(--card)] border border-[var(--stroke)] press-effect hover:bg-[var(--card-2)] transition-colors"
              >
                <ExternalLink size={13} />
                <span>يوتيوب</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
