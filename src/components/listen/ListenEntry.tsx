/**
 * The way into «السماع» from the Quran page and the home of «أفق»: the
 * section in one line, or the track you can resume.
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Headphones } from "lucide-react";
import "@/styles/listen.css";
import { playTracks } from "@/lib/listen/player";
import { resumable, useListenStore } from "@/lib/listen/store";
import { ReciterMark } from "@/components/listen/ReciterMark";

const FACES = ["عبدالباسط عبدالصمد", "محمد صديق المنشاوي", "مشاري العفاسي"];

export function ListenEntry() {
  const navigate = useNavigate();
  const last = useListenStore((s) => resumable(s.history)[0]);
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="ls-entry ls-press" onClick={() => navigate("/listen")}>
        <span className="ls-entry-marks" aria-hidden="true">
          {FACES.map((n) => (
            <ReciterMark key={n} name={n} />
          ))}
        </span>
        <span className="ls-entry-text flex-1 min-w-0">
          <b className="inline-flex items-center gap-1.5">
            <Headphones size={16} className="text-(--accent)" aria-hidden="true" /> السماع
          </b>
          <span>القرآن كاملًا بأصوات قرّاء العالم · التسجيلات الذهبية · قيام الحرمين · التواشيح</span>
        </span>
        <ChevronLeft size={18} className="opacity-50 shrink-0" aria-hidden="true" />
      </button>
      {last ? (
        <button type="button" className="ls-chip ls-press self-start" onClick={() => playTracks([last.track], 0, { resume: true })}>
          <Headphones size={13} aria-hidden="true" /> أكمل: {last.track.title} · {last.track.artist}
        </button>
      ) : null}
    </div>
  );
}
