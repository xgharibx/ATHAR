/**
 * «السماع» on the classic home: a card that draws the eye — the section's
 * name, a sound that seems to move — and one
 * round button that starts listening at once (the recitation you stopped, or
 * the section itself). While something plays, it shows what, and opens the
 * player.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pause, Play } from "lucide-react";
import "@/styles/listen.css";
import { playTracks, toggleListen } from "@/lib/listen/player";
import { resumable, useListenStore } from "@/lib/listen/store";
import { openFullPlayer } from "@/lib/listen/ui";
import { useListenNowPlaying } from "@/lib/listen/useListen";
import { ListenEmblem } from "@/components/listen/ListenEmblem";

function Waves({ live }: { live: boolean }) {
  return (
    <span className={`ls-spot-waves${live ? " is-live" : ""}`} aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <i key={i} style={{ animationDelay: `${(i % 4) * 140 + Math.floor(i / 4) * 70}ms` }} />
      ))}
    </span>
  );
}

export function ListenSpotlight({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const p = useListenNowPlaying();
  const last = useListenStore((s) => resumable(s.history)[0]);
  const track = p.status !== "idle" ? p.current : null;
  const playing = p.status === "playing" || p.status === "loading";

  if (track) {
    return (
      <div className={`ls-spot is-now ${className}`}>
        <button type="button" className="ls-spot-main ls-press" onClick={openFullPlayer} aria-label={`فتح المشغّل: ${track.title}`}>
          <ListenEmblem playing={playing} size={46} />
          <span className="ls-spot-text">
            <small>يُتلى الآن</small>
            <b>{track.title}</b>
            <span>{track.artist}</span>
          </span>
          <Waves live={playing} />
        </button>
        <button type="button" className="ls-spot-go" onClick={toggleListen} aria-label={playing ? "إيقاف مؤقت" : "تشغيل"}>
          {p.status === "loading" ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : playing ? <Pause size={22} fill="currentColor" aria-hidden="true" /> : <Play size={22} fill="currentColor" aria-hidden="true" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`ls-spot ${className}`}>
      <button type="button" className="ls-spot-main ls-press" onClick={() => navigate("/listen")} aria-label="السماع: القرآن كاملًا بأصوات كبار القرّاء">
        <ListenEmblem size={46} />
        <span className="ls-spot-text">
          <b>السماع</b>
          <span>{last ? `أكمل: ${last.track.title}، ${last.track.artist}` : "القرآن كاملًا بأصوات كبار القرّاء، والتسجيلات الذهبية، وقيام الحرمين"}</span>
        </span>
        <Waves live={false} />
      </button>
      <button
        type="button"
        className="ls-spot-go"
        onClick={() => (last ? playTracks([last.track], 0, { resume: true }) : navigate("/listen"))}
        aria-label={last ? `أكمل الاستماع: ${last.track.title}` : "ابدأ السماع"}
      >
        <Play size={22} fill="currentColor" aria-hidden="true" />
      </button>
    </div>
  );
}
