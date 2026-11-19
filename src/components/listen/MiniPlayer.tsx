/**
 * The small bar of «السماع» that follows you around the app while a surah,
 * a night prayer or a tawsheeh plays. A tap opens the full player.
 */
import * as React from "react";
import { Loader2, Pause, Play, SkipBack, X } from "lucide-react";
import "@/styles/listen.css";
import { nextTrack, stopListen, toggleListen } from "@/lib/listen/player";
import { openFullPlayer, useFullPlayerOpen } from "@/lib/listen/ui";
import { useListenPlayer } from "@/lib/listen/useListen";
import { ReciterMark } from "@/components/listen/ReciterMark";
import { cn } from "@/lib/utils";

const FullPlayer = React.lazy(() => import("@/components/listen/FullPlayer"));

export function ListenMiniPlayer({ variant = "classic" }: { variant?: "classic" | "ufuq" }) {
  const p = useListenPlayer();
  const fullOpen = useFullPlayerOpen();
  const track = p.current;
  const visible = Boolean(track) && p.status !== "idle";

  React.useEffect(() => {
    if (variant !== "classic") return;
    document.body.classList.toggle("listen-mini-open", visible);
    return () => document.body.classList.remove("listen-mini-open");
  }, [visible, variant]);

  const duration = p.durationMs || (track?.durationS ?? 0) * 1000;
  const progress = duration ? Math.min(100, (p.positionMs / duration) * 100) : 0;
  const playing = p.status === "playing" || p.status === "loading";

  return (
    <>
      {visible && track ? (
        <div className={cn("ls-mini", variant === "ufuq" && "is-ufuq")} role="region" aria-label="يُتلى الآن">
          <button type="button" className="flex items-center gap-2.5 flex-1 min-w-0" onClick={openFullPlayer} aria-label={`فتح المشغّل: ${track.title}`}>
            <ReciterMark name={track.artist} withName={false} />
            <span className="ls-mini-text">
              <b>{track.title}</b>
              <span>{p.error ?? track.artist}</span>
            </span>
          </button>
          <button type="button" className="ls-icon-btn" aria-label={playing ? "إيقاف مؤقت" : "تشغيل"} onClick={toggleListen}>
            {p.status === "loading" ? (
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            ) : playing ? (
              <Pause size={20} fill="currentColor" aria-hidden="true" />
            ) : (
              <Play size={20} fill="currentColor" aria-hidden="true" style={{ transform: "scaleX(-1)" }} />
            )}
          </button>
          {p.index < p.queue.length - 1 ? (
            <button type="button" className="ls-icon-btn" aria-label="التالي" onClick={nextTrack}>
              <SkipBack size={19} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="ls-icon-btn" aria-label="إغلاق المشغّل" onClick={stopListen}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
          <span className="ls-mini-bar" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </span>
        </div>
      ) : null}
      {fullOpen ? (
        <React.Suspense fallback={null}>
          <FullPlayer />
        </React.Suspense>
      ) : null}
    </>
  );
}
