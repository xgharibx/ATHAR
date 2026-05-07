import * as React from "react";
import { Bookmark, CheckCircle2, ExternalLink, Pause, Play, Share2, X } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import type { VideoLibraryChannel, VideoLibraryCourse, VideoLibraryProgress, VideoLibraryVideo } from "@/data/videoLibraryTypes";

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

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const intervalRef = React.useRef<number | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(progress?.seconds ?? 0);
  const [duration, setDuration] = React.useState(progress?.duration || video.durationSeconds || 0);
  const [apiFailed, setApiFailed] = React.useState(false);

  const saveNow = React.useCallback((completed = false) => {
    const player = playerRef.current;
    const seconds = player?.getCurrentTime?.() ?? current;
    const len = player?.getDuration?.() || duration || video.durationSeconds || 0;
    if (len > 0) {
      setCurrent(seconds);
      setDuration(len);
      onProgress(seconds, len, completed || seconds / len >= 0.92);
    }
  }, [current, duration, onProgress, video.durationSeconds]);

  React.useEffect(() => {
    if (!video.youtubeId || !hostRef.current) return;
    let cancelled = false;
    setApiFailed(false);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      playerRef.current?.destroy();
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: video.youtubeId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
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
            if (event.data === YT.PlayerState.PLAYING) setPlaying(true);
            if (event.data === YT.PlayerState.PAUSED) { setPlaying(false); saveNow(false); }
            if (event.data === YT.PlayerState.ENDED) { setPlaying(false); saveNow(true); onComplete(); }
          },
        },
      });
    }).catch(() => setApiFailed(true));

    return () => {
      cancelled = true;
      saveNow(false);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
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
    <div className="space-y-3" dir="rtl">
      <div className="glass-strong rounded-3xl overflow-hidden border border-white/10">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-xs opacity-50">{channel?.displayName ?? "مكتبة الفيديو"}</div>
            <h1 className="text-base font-bold line-clamp-2 arabic-text">{video.title}</h1>
          </div>
          <IconButton aria-label="إغلاق" onClick={onClose}><X size={17} /></IconButton>
        </div>

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
          </div>
        ) : (
          <div className="aspect-video bg-white/6 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-3xl mb-2">🎬</div>
            <div className="font-semibold">هذا الدرس ينتظر مزامنة يوتيوب</div>
            <div className="text-xs opacity-55 mt-1">شغّل أداة المزامنة لإضافة الفيديوهات الفعلية من القناة.</div>
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs opacity-60 tabular-nums">
            <span>{formatTime(current)} / {formatTime(duration)}</span>
            <span>{percent}%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {course && <Badge>{course.title}</Badge>}
            {progress?.completed && <Badge className="text-emerald-300 border-emerald-400/25 bg-emerald-400/10"><CheckCircle2 size={13} /> مكتمل</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo(); }} disabled={!video.youtubeId}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? "إيقاف مؤقت" : "تشغيل"}
            </Button>
            <Button onClick={onComplete}><CheckCircle2 size={15} /> تعليم كمكتمل</Button>
            <Button variant="secondary" onClick={onBookmark}><Bookmark size={15} className={bookmarked ? "fill-[var(--accent)] text-[var(--accent)]" : ""} /> حفظ</Button>
            <Button variant="secondary" onClick={shareVideo}><Share2 size={15} /> مشاركة</Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {onNext && <Button variant="secondary" onClick={onNext}>الدرس التالي</Button>}
            <a className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 bg-white/6 hover:bg-white/10 border border-white/10 transition text-sm" href={video.youtubeUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> فتح عند الحاجة
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}