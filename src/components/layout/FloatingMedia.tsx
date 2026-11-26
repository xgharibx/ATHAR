/**
 * The floating «السماع» button of the classic design (in place of the old
 * floating radio). It sits where the radio sat, on the Quran's pages, and
 * opens a small panel: the recitation to resume, the four ways into the
 * section (whole surahs, the golden recordings, the night prayers of the two
 * Harams, the tawasheeh), and the live radio among them. While the radio is
 * on, the button shows it from every page, with the means to stop it.
 */
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Headphones, Loader2, Moon, Music, Play, Radio, Sparkles, Square, X } from "lucide-react";
import "@/styles/listen.css";
import { cn } from "@/lib/utils";
import { getRadioState, playRadio, stopRadio, subscribeRadio } from "@/lib/radioPlayer";
import { playTracks } from "@/lib/listen/player";
import { resumable, useListenStore } from "@/lib/listen/store";
import { useListenNowPlaying } from "@/lib/listen/useListen";
import { ReciterMark } from "@/components/listen/ReciterMark";

function useRadioState() {
  const [state, setState] = React.useState(getRadioState);
  React.useEffect(() => subscribeRadio(() => setState(getRadioState())), []);
  return state;
}

const WAYS = [
  { to: "/listen", title: "سور كاملة", sub: "بأصوات قرّاء العالم", icon: BookOpen },
  { to: "/listen/golden", title: "التسجيلات الذهبية", sub: "المصاحف المجوّدة", icon: Sparkles },
  { to: "/listen/qiyam", title: "قيام الليل", sub: "من الحرمين", icon: Moon },
  { to: "/listen/tawasheeh", title: "التواشيح", sub: "والابتهالات", icon: Music },
] as const;

const SPOT: React.CSSProperties = {
  bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",
  left: "16px",
};

export function FloatingMedia({ drawerOpen }: { drawerOpen?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const radio = useRadioState();
  const listen = useListenNowPlaying();
  const last = useListenStore((s) => resumable(s.history)[0]);
  const location = useLocation();
  const navigate = useNavigate();
  const fabRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const wasOpen = React.useRef(false);

  const trapFocus = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0]!;
    const lastEl = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Back to the button when the panel closes (only after it was open).
  React.useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current && !drawerOpen) fabRef.current?.focus();
  }, [open, drawerOpen]);
  React.useEffect(() => {
    if (drawerOpen) setOpen(false);
  }, [drawerOpen]);

  if (drawerOpen) return null;
  const onQuran = location.pathname.startsWith("/quran") || location.pathname.startsWith("/mushaf");
  // A recitation playing has its own bar (the mini player); the button then steps aside.
  const listening = listen.status !== "idle" && Boolean(listen.current);
  if (!radio.playing && (!onQuran || listening)) return null;

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  if (!open) {
    return (
      <button
        type="button"
        ref={fabRef}
        className={cn("fab xl:hidden", radio.playing && "ring-2 ring-ok-60")}
        style={SPOT}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={radio.playing ? "السماع: راديو القرآن يُبث الآن" : "السماع"}
      >
        {radio.loading ? (
          <Loader2 size={22} aria-hidden="true" className="animate-spin" />
        ) : radio.playing ? (
          <span className="fm-eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <Headphones size={22} aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed z-9990 xl:hidden"
      style={SPOT}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <div aria-hidden="true" className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[-1]" onClick={() => setOpen(false)} />
      <div
        className="w-[300px] max-w-[calc(100vw-32px)] glass-strong rounded-3xl p-4 border border-(--stroke) page-enter"
        style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}
        ref={panelRef}
        onKeyDown={trapFocus}
        role="dialog"
        aria-modal="true"
        aria-label="السماع"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Headphones size={17} aria-hidden="true" style={{ color: "var(--accent)" }} />
            <div className="text-[15px] font-bold">السماع</div>
          </div>
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full bg-(--card) border border-(--stroke) grid place-items-center"
            aria-label="إغلاق"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {radio.playing ? (
          <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-2.5 border" style={{ background: "color-mix(in srgb, var(--ok) 12%, transparent)", borderColor: "color-mix(in srgb, var(--ok) 40%, transparent)" }}>
            <Radio size={18} aria-hidden="true" style={{ color: "var(--ok)" }} />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold">راديو القرآن</span>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ok)" }}>
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-(--ok) animate-pulse inline-block" /> بث مباشر
              </span>
            </span>
            <button type="button" onClick={() => stopRadio()} className="w-9 h-9 rounded-full grid place-items-center bg-(--card) border border-(--stroke)" aria-label="إيقاف البث">
              <Square size={13} fill="currentColor" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {last ? (
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 mb-2.5 text-right bg-accent-15 border border-accent-50 press-effect"
            onClick={() => {
              setOpen(false);
              playTracks([last.track], 0, { resume: true });
            }}
            aria-label={`أكمل الاستماع: ${last.track.title}، ${last.track.artist}`}
          >
            <ReciterMark name={last.track.artist} withName={false} />
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-(--accent)">أكمل الاستماع</span>
              <span className="block text-[13px] font-semibold truncate">{last.track.title}</span>
              <span className="block text-[11px] text-(--muted) truncate">{last.track.artist}</span>
            </span>
            <Play size={18} fill="currentColor" className="text-(--accent) shrink-0" aria-hidden="true" />
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {WAYS.map((w) => (
            <button key={w.to} type="button" className="fm-tile press-effect" onClick={() => go(w.to)}>
              <w.icon size={18} aria-hidden="true" />
              <b>{w.title}</b>
              <span>{w.sub}</span>
            </button>
          ))}
        </div>

        {!radio.playing ? (
          <button
            type="button"
            className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] bg-(--card) border border-(--stroke) press-effect"
            onClick={() => playRadio(radio.stationIdx)}
          >
            <Radio size={15} aria-hidden="true" /> راديو القرآن، بث مباشر
          </button>
        ) : null}
      </div>
    </div>
  );
}
