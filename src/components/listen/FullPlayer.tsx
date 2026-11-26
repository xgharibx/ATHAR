/**
 * The full player of «السماع».
 *
 * Its heart is the verses that follow the reciter: for recitations whose
 * timings are published, the ayah being recited lights up, and the text moves
 * on with the voice; a tap on any ayah takes the recitation there. For the
 * others (the night prayers, for instance) the surah is shown to read along.
 */
import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  CloudDownload,
  Gauge,
  Heart,
  ListMusic,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Rewind,
  FastForward,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Type,
  X,
} from "lucide-react";
import { arabicDigits, formatDuration, hueFor } from "@/lib/listen/catalog";
import {
  cycleRepeat,
  jumpTo,
  nextTrack,
  previousTrack,
  removeFromQueue,
  seekTo,
  setListenRate,
  setSleepTimer,
  skipBy,
  stopListen,
  toggleListen,
  toggleShuffle,
} from "@/lib/listen/player";
import { useListenStore } from "@/lib/listen/store";
import { canDownloadListening, downloadTracks } from "@/lib/listen/downloads";
import toast from "react-hot-toast";
import { closeFullPlayer } from "@/lib/listen/ui";
import { useListenPlayer } from "@/lib/listen/useListen";
import { ayahAt, loadAyahTimings, type AyahTiming } from "@/lib/listen/timing";
import { useQuranDB } from "@/data/useQuranDB";
import { AtharLogo } from "@/components/brand/AtharLogo";
import { shareText } from "@/lib/shareTargets";
// The player is drawn over «أفق»'s own garden at night: sky, moon and flowers.
import { LiveGardenLazy } from "@/components/ufuq/ufuqLazy";


const RATES = [0.75, 1, 1.25, 1.5];

function useAyahTimings(read: number | undefined, surah: number | undefined) {
  const key = read && surah ? `${read}:${surah}` : "";
  const [loaded, setLoaded] = React.useState<{ key: string; timings: AyahTiming[] | null }>({ key: "", timings: null });
  React.useEffect(() => {
    if (!read || !surah) return;
    let alive = true;
    void loadAyahTimings(read, surah).then((t) => {
      if (alive) setLoaded({ key: `${read}:${surah}`, timings: t });
    });
    return () => {
      alive = false;
    };
  }, [read, surah]);
  return loaded.key === key ? loaded.timings : null;
}

function Verses({ surah, timings, positionMs, canSeek }: { surah: number; timings: AyahTiming[] | null; positionMs: number; canSeek: boolean }) {
  const { data } = useQuranDB();
  const ayahs = data?.find((s) => s.id === surah)?.ayahs ?? [];
  const now = timings ? ayahAt(timings, positionMs) : 0;
  const boxRef = React.useRef<HTMLDivElement>(null);
  const touchedAt = React.useRef(0);

  React.useEffect(() => {
    if (!now || Date.now() - touchedAt.current < 4000) return;
    const el = boxRef.current?.querySelector<HTMLElement>(`[data-ayah="${now}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [now]);

  if (!ayahs.length) return <div className="ls-lyrics" ref={boxRef} />;
  return (
    <div
      className="ls-lyrics"
      ref={boxRef}
      onTouchStart={() => (touchedAt.current = Date.now())}
      onWheel={() => (touchedAt.current = Date.now())}
      aria-label="آيات السورة"
    >
      {ayahs.map((text, i) => {
        const n = i + 1;
        const t = timings?.find((x) => x.ayah === n);
        return (
          <button
            key={n}
            type="button"
            data-ayah={n}
            className={`ls-ayah ${now === n ? "is-now" : ""}`}
            style={!timings ? { opacity: 0.9 } : undefined}
            onClick={() => {
              if (t && canSeek) {
                touchedAt.current = 0;
                seekTo(t.start + 30);
              }
            }}
            aria-label={`الآية ${arabicDigits(n)}`}
          >
            {text}
            <span className="ls-ayah-n">﴿{arabicDigits(n)}﴾</span>
          </button>
        );
      })}
    </div>
  );
}

function SleepSheet({ onClose }: { onClose: () => void }) {
  const p = useListenPlayer();
  const pick = (v: number | "track" | 0) => {
    setSleepTimer(v);
    onClose();
  };
  return createPortal(
    <div className="ls-sheet" onClick={onClose} role="presentation">
      <div className="ls-sheet-body" role="dialog" aria-modal="true" aria-label="مؤقّت النوم" onClick={(e) => e.stopPropagation()}>
        <div className="ls-sheet-title">نَم على صوت القرآن</div>
        {[15, 30, 45, 60, 90].map((m) => (
          <button key={m} type="button" className={`ls-option ${p.sleep.mode === "time" && p.sleep.minutes === m ? "is-on" : ""}`} onClick={() => pick(m)}>
            <Moon size={18} aria-hidden="true" /> بعد {arabicDigits(m)} دقيقة
          </button>
        ))}
        <button type="button" className={`ls-option ${p.sleep.mode === "track" ? "is-on" : ""}`} onClick={() => pick("track")}>
          <Moon size={18} aria-hidden="true" /> عند انتهاء المقطع الحالي
        </button>
        {p.sleep.mode !== "off" ? (
          <button type="button" className="ls-option" onClick={() => pick(0)}>
            <X size={18} aria-hidden="true" /> إلغاء المؤقّت
          </button>
        ) : null}
        <p className="ls-credit mt-3">يخفت الصوت تدريجيًا في الثواني الأخيرة، ثم يتوقف.</p>
      </div>
    </div>,
    document.body,
  );
}

function QueueSheet({ onClose }: { onClose: () => void }) {
  const p = useListenPlayer();
  return createPortal(
    <div className="ls-sheet" onClick={onClose} role="presentation">
      <div className="ls-sheet-body" role="dialog" aria-modal="true" aria-label="قائمة التشغيل" onClick={(e) => e.stopPropagation()}>
        <div className="ls-sheet-title">قائمة التشغيل، {arabicDigits(p.queue.length)}</div>
        <div className="ls-list">
          {p.queue.map((t, i) => (
            <div key={`${t.id}-${i}`} className={`ls-row ${i === p.index ? "is-current" : ""}`}>
              <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-right" onClick={() => jumpTo(i)}>
                <span className="ls-row-num">{arabicDigits(i + 1)}</span>
                <span className="ls-row-main">
                  <span className="ls-row-title block">{t.title}</span>
                  <span className="ls-row-meta">{t.artist}</span>
                </span>
              </button>
              {i !== p.index ? (
                <button type="button" className="ls-icon-btn" aria-label={`إزالة ${t.title}`} onClick={() => removeFromQueue(i)}>
                  <X size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function FullPlayer() {
  const navigate = useNavigate();
  const p = useListenPlayer();
  const track = p.current;
  const favorite = useListenStore((s) => Boolean(track && s.favorites[track.id]));
  const toggleFavorite = useListenStore((s) => s.toggleFavorite);
  const timings = useAyahTimings(track?.timing, track?.surah);
  // With timings, the verses are the main view: that is the point of this player.
  const [chosenView, setView] = React.useState<"auto" | "art" | "verses">("auto");
  const view = chosenView === "auto" ? (timings ? "verses" : "art") : chosenView;
  const [sheet, setSheet] = React.useState<"sleep" | "queue" | null>(null);
  const [scrub, setScrub] = React.useState<number | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sheet) closeFullPlayer();
      if (e.key === " " && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        toggleListen();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  React.useEffect(() => {
    if (!track) closeFullPlayer();
  }, [track]);

  if (!track) return null;
  const playing = p.status === "playing" || p.status === "loading";
  const duration = p.durationMs || (track.durationS ?? 0) * 1000;
  const position = scrub ?? p.positionMs;
  const hasVerses = Boolean(track.surah);
  const rateIndex = RATES.indexOf(p.rate);

  return createPortal(
    <div
      className="ls-full has-garden"
      role="dialog"
      aria-modal="true"
      aria-label={`يُتلى الآن: ${track.title}`}
      style={{ ["--h" as string]: hueFor(track.artist), ["--ls-anim" as string]: playing ? "running" : "paused" }}
    >
      <div className="ls-full-garden" aria-hidden="true">
        <React.Suspense fallback={null}>
          <LiveGardenLazy forcedMode="night" stage />
        </React.Suspense>
      </div>
      <div className="ls-full-top">
        <button type="button" className="ls-icon-btn" aria-label="تصغير المشغّل" onClick={closeFullPlayer}>
          <ChevronDown size={26} aria-hidden="true" />
        </button>
        <div className="ls-full-kicker">
          <AtharLogo className="ls-full-print" />
          {track.album}
          {p.queue.length > 1 ? <div>{arabicDigits(p.index + 1)} من {arabicDigits(p.queue.length)}</div> : null}
        </div>
        <div className="flex items-center">
          {hasVerses ? (
            <button
              type="button"
              className={`ls-icon-btn ${view === "verses" ? "is-on" : ""}`}
              aria-pressed={view === "verses"}
              aria-label={view === "verses" ? "إخفاء الآيات" : "عرض الآيات مع التلاوة"}
              onClick={() => setView(view === "verses" ? "art" : "verses")}
            >
              <Type size={21} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="ls-icon-btn"
            aria-label="إيقاف التلاوة وإغلاق المشغّل"
            onClick={() => {
              stopListen();
              closeFullPlayer();
            }}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="ls-full-stage">
        {view === "verses" && track.surah ? (
          <Verses surah={track.surah} timings={timings} positionMs={p.positionMs} canSeek={p.canSeek} />
        ) : (
          <div className="ls-full-art" aria-hidden="true" />
        )}
        {view === "verses" && track.surah && !timings ? (
          <p className="text-[11.5px] opacity-60 text-center">تتبُّع الآيات مع الصوت متاح لتلاوات كثير من القرّاء؛ هنا تقرأ السورة مع التلاوة.</p>
        ) : null}
      </div>

      <div className="ls-full-meta">
        <div>
          <h2>{track.title}</h2>
          <p>{track.artist}</p>
        </div>
        <button
          type="button"
          className={`ls-icon-btn ${favorite ? "is-on" : ""}`}
          aria-pressed={favorite}
          aria-label={favorite ? "إزالة من المفضّلة" : "إضافة إلى المفضّلة"}
          onClick={() => toggleFavorite(track)}
        >
          <Heart size={22} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>

      <div className="ls-seek mt-3" dir="ltr">
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(duration / 1000))}
          step={1}
          value={Math.min(Math.round(position / 1000), Math.max(1, Math.round(duration / 1000)))}
          disabled={!p.canSeek || !duration}
          aria-label="موضع التلاوة"
          aria-valuetext={`${formatDuration(position / 1000)} من ${formatDuration(duration / 1000)}`}
          onChange={(e) => setScrub(Number(e.target.value) * 1000)}
          onPointerUp={() => {
            if (scrub !== null) seekTo(scrub);
            setScrub(null);
          }}
          onKeyUp={() => {
            if (scrub !== null) seekTo(scrub);
            setScrub(null);
          }}
        />
        <div className="ls-seek-times">
          <span>{formatDuration(position / 1000)}</span>
          {p.status === "loading" ? <span>جارٍ التحميل…</span> : p.error ? <span>{p.error}</span> : null}
          <span>{duration ? `-${formatDuration(Math.max(0, duration - position) / 1000)}` : "--:--"}</span>
        </div>
      </div>

      {/* Media controls read left to right in every language, as on every player: earlier on the left, later on the right. */}
      <div className="ls-controls" dir="ltr">
        <button type="button" className={`ls-icon-btn ${p.shuffle ? "is-on" : ""}`} aria-pressed={p.shuffle} aria-label="ترتيب عشوائي" onClick={toggleShuffle}>
          <Shuffle size={20} aria-hidden="true" />
        </button>
        <button type="button" className="ls-icon-btn" aria-label="رجوع ١٥ ثانية" disabled={!p.canSeek} onClick={() => skipBy(-15)}>
          <Rewind size={20} aria-hidden="true" />
        </button>
        <button type="button" className="ls-icon-btn" aria-label="السابق" onClick={previousTrack}>
          <SkipBack size={26} aria-hidden="true" />
        </button>
        <button type="button" className="ls-big" aria-label={playing ? "إيقاف مؤقت" : "تشغيل"} onClick={toggleListen}>
          {playing ? <Pause size={30} fill="currentColor" aria-hidden="true" /> : <Play size={30} fill="currentColor" aria-hidden="true" />}
        </button>
        <button type="button" className="ls-icon-btn" aria-label="التالي" onClick={nextTrack}>
          <SkipForward size={26} aria-hidden="true" />
        </button>
        <button type="button" className="ls-icon-btn" aria-label="تقديم ١٥ ثانية" disabled={!p.canSeek} onClick={() => skipBy(15)}>
          <FastForward size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`ls-icon-btn ${p.repeat !== "off" ? "is-on" : ""}`}
          aria-label={p.repeat === "one" ? "تكرار المقطع" : p.repeat === "all" ? "تكرار القائمة" : "بلا تكرار"}
          onClick={cycleRepeat}
        >
          {p.repeat === "one" ? <Repeat1 size={20} aria-hidden="true" /> : <Repeat size={20} aria-hidden="true" />}
        </button>
      </div>

      <div className="ls-extras">
        <button type="button" onClick={() => setListenRate(RATES[(rateIndex + 1) % RATES.length] ?? 1)} className={p.rate !== 1 ? "is-on" : ""} aria-label={`السرعة ${p.rate}`}>
          <Gauge size={19} aria-hidden="true" />
          <span>{p.rate === 1 ? "السرعة" : `${arabicDigits(p.rate)}×`}</span>
        </button>
        <button type="button" onClick={() => setSheet("sleep")} className={p.sleep.mode !== "off" ? "is-on" : ""}>
          <Moon size={19} aria-hidden="true" />
          <span>{p.sleep.mode === "time" ? `بعد ${arabicDigits(p.sleep.minutes)} د` : p.sleep.mode === "track" ? "آخر المقطع" : "مؤقّت النوم"}</span>
        </button>
        <button type="button" onClick={() => setSheet("queue")}>
          <ListMusic size={19} aria-hidden="true" />
          <span>التالي</span>
        </button>
        {track.surah ? (
          <button
            type="button"
            onClick={() => {
              closeFullPlayer();
              navigate(`/quran/read/${track.surah}?a=${timings ? Math.max(1, ayahAt(timings, p.positionMs)) : 1}`);
            }}
          >
            <BookOpen size={19} aria-hidden="true" />
            <span>المصحف</span>
          </button>
        ) : null}
        {canDownloadListening() ? (
          <DownloadExtra track={track} />
        ) : null}
        <button type="button" onClick={() => void shareText(`أستمع إلى ${track.title} بصوت ${track.artist}`, "السماع")}>
          <Share2 size={19} aria-hidden="true" />
          <span>مشاركة</span>
        </button>
      </div>

      {sheet === "sleep" ? <SleepSheet onClose={() => setSheet(null)} /> : null}
      {sheet === "queue" ? <QueueSheet onClose={() => setSheet(null)} /> : null}
    </div>,
    document.body,
  );
}

/** «تنزيل» for what is playing: saved on the phone, in the background. */
function DownloadExtra({ track }: { track: import("@/lib/listen/catalog").ListenTrack }) {
  const saved = useListenStore((s) => Boolean(s.downloads[track.id]));
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      className={saved ? "is-on" : ""}
      disabled={saved || busy}
      onClick={() => {
        setBusy(true);
        void downloadTracks([track], { title: track.title })
          .then((r) => {
            if (r && r.saved >= r.total) toast.success("حُفظت للاستماع دون إنترنت", { duration: 1800 });
            else if (r) toast.error("تعذّر التنزيل، أعد المحاولة عند توفر الاتصال");
          })
          .finally(() => setBusy(false));
      }}
    >
      <CloudDownload size={19} aria-hidden="true" />
      <span>{saved ? "على الهاتف" : busy ? "جارٍ التنزيل…" : "تنزيل"}</span>
    </button>
  );
}
