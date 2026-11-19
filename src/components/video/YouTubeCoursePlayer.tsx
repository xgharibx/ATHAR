import * as React from "react";
import { ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, ExternalLink, Play, Share2, SkipBack, SkipForward } from "lucide-react";
import toast from "react-hot-toast";

import { shareOrCopy } from "@/lib/shareTargets";
import { YT_STATE, embedSrc, newYouTubePlayer, type YTPlayer } from "@/lib/youtubePlayer";
import { arNum, westernToArabicDigits } from "@/lib/formatNumber";
import type {
  VideoLibraryChannel,
  VideoLibraryCourse,
  VideoLibraryProgress,
  VideoLibraryVideo,
} from "@/data/videoLibraryTypes";

// ── YouTube player ────────────────────────────────────────────────────────────
// Created through the shared factory: YouTube's own player in a browser, the
// athark.org player page in the apps (YouTube refuses the apps' own pages).

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const clock = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  // In Arabic digits, and kept left-to-right so «١:٢٧:٠٤» reads as a time.
  return `\u2066${westernToArabicDigits(clock)}\u2069`;
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

    newYouTubePlayer(hostRef.current, video.youtubeId, { rel: 0, modestbranding: 1, playsinline: 1 }, {
            onReady: ({ target }) => {
              if (cancelled) return;
              playerRef.current = target;
              const len = target.getDuration() || video.durationSeconds || 0;
              setDuration(len);
              if ((progress?.seconds ?? 0) > 5 && len > 0 && (progress?.seconds ?? 0) < len - 8) {
                playerRef.current?.seekTo(progress!.seconds, true);
                setCurrent(progress!.seconds);
              }
            },
            onStateChange: (event: { data: number }) => {
              if (event.data === YT_STATE.PLAYING) {
                setPlaying(true);
                setEnded(false);
              }
              if (event.data === YT_STATE.PAUSED) {
                setPlaying(false);
                saveNow(false);
              }
              if (event.data === YT_STATE.ENDED) {
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
    })
      .then((player) => {
        if (cancelled) player.destroy();
        else playerRef.current = player;
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
      await shareOrCopy(text, { title: video.title, copiedMessage: "تم نسخ رابط الدرس" });
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
                src={embedSrc(video.youtubeId, { rel: 0, modestbranding: 1, playsinline: 1 })}
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
                  <SkipForward size={28} aria-hidden="true" className="mx-auto mb-3" style={{ color: accent }} />
                  <div className="font-bold arabic-text mb-1">الدرس التالي</div>
                  <div className="text-xs opacity-60 mb-4">ينطلق خلال {arNum(nextCountdown)} ثوانٍ</div>
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
                      style={{ background: accent, color: "var(--on-accent)" }}
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
                      className="flex-1 rounded-2xl py-2 text-sm font-bold bg-(--card) press-effect"
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
              <Play size={40} aria-hidden="true" className="mx-auto mb-3 opacity-30" />
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
                <div className="h-5 px-2 rounded-lg text-[10px] bg-(--card) border border-(--stroke) flex items-center shrink-0 truncate max-w-[130px]">
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
              aria-label="إغلاق مشغل الفيديو"
              className="w-7 h-7 rounded-xl bg-(--card) border border-(--stroke) flex items-center justify-center shrink-0 press-effect hover:bg-(--card-2) transition-colors"
            >
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          {/* Title */}
          <h2 className="font-bold text-base arabic-text leading-snug line-clamp-2 mb-3">
            {video.title}
          </h2>

          {/* Progress timeline */}
          <div className="mb-3" dir="ltr">
            <div
              className="relative h-2 rounded-full bg-(--card) overflow-hidden mb-1.5"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`تقدم الفيديو: ${percent}% (${formatTime(current)} من ${formatTime(duration)})`}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${percent}%`, background: accent }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] opacity-45 tabular-nums">
              <span>{formatTime(current)}</span>
              <span className="font-medium" style={{ color: accent }}>{arNum(percent)}٪</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBookmark}
              aria-label={bookmarked ? "إلغاء حفظ الفيديو" : "حفظ الفيديو"}
              aria-pressed={bookmarked}
              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold press-effect transition-all border"
              style={
                bookmarked
                  ? { background: `${accent}20`, borderColor: `${accent}50`, color: accent }
                  : { background: "var(--card)", borderColor: "var(--stroke)" }
              }
            >
              {bookmarked ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
              <span>{bookmarked ? "محفوظ" : "حفظ"}</span>
            </button>

            <button
              type="button"
              onClick={() => { onComplete(); }}
              aria-pressed={isCompleted}
              aria-label={isCompleted ? "إلغاء إكمال الفيديو" : "تمييز الفيديو كمكتمل"}
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
              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold bg-(--card) border border-(--stroke) press-effect hover:bg-(--card-2) transition-colors"
            >
              <Share2 size={14} />
              <span>مشاركة</span>
            </button>

            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold bg-(--card) border border-(--stroke) press-effect hover:bg-(--card-2) transition-colors"
              >
                <SkipBack size={14} aria-hidden="true" />
                <span>السابق</span>
              </button>
            )}
            {onNext ? (
              <button
                type="button"
                onClick={onNext}
                className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold press-effect transition-all"
                style={{ background: accent, color: "var(--on-accent)" }}
              >
                <SkipForward size={14} aria-hidden="true" />
                <span>التالي</span>
              </button>
            ) : (
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold bg-(--card) border border-(--stroke) press-effect hover:bg-(--card-2) transition-colors"
              >
                <ExternalLink size={13} aria-hidden="true" />
                <span>يوتيوب</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
