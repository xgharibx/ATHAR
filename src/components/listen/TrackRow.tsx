import * as React from "react";
import { Check, CloudDownload, MoreVertical, Pause, Play } from "lucide-react";
import { arabicDigits, formatDuration, type ListenTrack } from "@/lib/listen/catalog";
import { toggleListen } from "@/lib/listen/player";
import { useListenStore } from "@/lib/listen/store";
import { useListenNowPlaying } from "@/lib/listen/useListen";
import { TrackActions } from "@/components/listen/TrackActions";

/**
 * One track in a list: its number, title and length, a mark when you have
 * heard it to the end, a bar when you stopped part-way, and its actions.
 */
export function TrackRow({ track, n, onPlay, meta }: { track: ListenTrack; n: number; onPlay: () => void; meta?: React.ReactNode }) {
  const now = useListenNowPlaying();
  const isCurrent = now.current?.id === track.id;
  const playing = isCurrent && (now.status === "playing" || now.status === "loading");
  const saved = useListenStore((s) => s.history.find((h) => h.track.id === track.id));
  const heard = useListenStore((s) => (track.surah ? (s.heard[String(track.surah)] ?? 0) > 0 && track.kind !== "tawsheeh" : false));
  const downloaded = useListenStore((s) => Boolean(s.downloads[track.id]));
  const [actions, setActions] = React.useState(false);
  const resumePct = saved && saved.durationMs && saved.positionMs > 20_000 ? Math.min(100, (saved.positionMs / saved.durationMs) * 100) : 0;

  return (
    <div className={`ls-row ${isCurrent ? "is-current" : ""}`}>
      <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-right" onClick={() => (isCurrent ? toggleListen() : onPlay())}>
        <span className="ls-row-num" aria-hidden="true">
          {isCurrent ? playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ transform: "scaleX(-1)" }} /> : arabicDigits(n)}
        </span>
        <span className="ls-row-main">
          <span className="ls-row-title block">{track.title}</span>
          <span className="ls-row-meta">
            {meta}
            {track.durationS ? <span>{formatDuration(track.durationS)}</span> : null}
            {downloaded ? (
              <span className="inline-flex items-center gap-0.5 text-(--accent)">
                <CloudDownload size={12} aria-hidden="true" /> على الهاتف
              </span>
            ) : null}
            {heard ? (
              <span className="inline-flex items-center gap-0.5 text-(--accent)">
                <Check size={12} aria-hidden="true" /> سمعتها
              </span>
            ) : null}
          </span>
          {resumePct > 0 && resumePct < 97 ? (
            <span className="ls-row-progress block" aria-label={`توقّفت عند ${Math.round(resumePct)}٪`}>
              <i style={{ width: `${resumePct}%` }} />
            </span>
          ) : null}
        </span>
      </button>
      <button type="button" className="ls-icon-btn" aria-label={`خيارات ${track.title}`} onClick={() => setActions(true)}>
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {actions ? <TrackActions track={track} onClose={() => setActions(false)} /> : null}
    </div>
  );
}
