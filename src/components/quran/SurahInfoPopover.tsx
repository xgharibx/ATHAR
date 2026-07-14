/**
 * SurahInfoPopover — popover anchored to the (i) button the user tapped.
 *
 * Behaviour:
 *  - Positions itself above/below the trigger, snapped to its left/right edge.
 *  - Auto-flips when it would overflow the viewport top or bottom.
 *  - Closes on outside click, Escape, or close button.
 *  - Renders into a portal at body level so it always sits above page content.
 */
import * as React from "react";
import { createPortal } from "react-dom";
import { X as XIcon, BookOpen, Sparkles, Share2, Copy, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toArabicNumeral, getSurahJuz, SURAH_REVELATION } from "@/lib/quranMeta";
import {
  getEnglishText, getSurahInfo, getTafsirForAyah, sajdaInSurah,
  globalAyahNumber, type QuranExtras,
} from "@/data/quranExtras";

type SurahLite = { id: number; name: string; englishName?: string; ayahs: string[] };

const POPOVER_WIDTH = 340;

export function SurahInfoPopover(props: {
  open: boolean;
  /** Rect of the trigger button. */
  anchorRect: DOMRect | null;
  surah: SurahLite | null;
  extras: QuranExtras | null;
  onClose: () => void;
}) {
  const { open, anchorRect, surah, onClose, extras } = props;
  const [pos, setPos] = React.useState<{ top: number; left: number; placement: "above" | "below" } | null>(null);
  const popRef = React.useRef<HTMLDivElement | null>(null);

  // Compute position
  React.useEffect(() => {
    if (!open || !anchorRect) { setPos(null); return; }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const wantLeft = Math.min(
      Math.max(anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2, margin),
      vw - POPOVER_WIDTH - margin,
    );
    // Decide above vs below
    const spaceAbove = anchorRect.top - margin;
    const spaceBelow = vh - anchorRect.bottom - margin;
    const minPopoverH = 220;
    let placement: "above" | "below";
    let top: number;
    if (spaceAbove >= minPopoverH || spaceAbove >= spaceBelow) {
      placement = "above";
      // Render with a measured height once mounted; for the initial paint we
      // place the popover just above the trigger with a sensible max-height.
      const estimatedH = Math.min(spaceAbove, 440);
      top = anchorRect.top - estimatedH - 8;
    } else {
      placement = "below";
      const estimatedH = Math.min(spaceBelow, 440);
      top = anchorRect.bottom + 8;
    }
    setPos({ top: Math.max(margin, top), left: wantLeft, placement });
  }, [open, anchorRect]);

  // Re-measure once mounted so the popover hugs the actual content height
  React.useEffect(() => {
    if (!open || !popRef.current || !anchorRect) return;
    const el = popRef.current;
    const h = el.getBoundingClientRect().height;
    const vh = window.innerHeight;
    if (pos?.placement === "above") {
      const idealTop = anchorRect.top - h - 8;
      if (idealTop >= 8) {
        setPos((p) => (p ? { ...p, top: idealTop } : p));
      } else {
        // Flip to below
        setPos((p) => (p ? { ...p, placement: "below", top: Math.min(anchorRect.bottom + 8, vh - h - 8) } : p));
      }
    } else if (pos?.placement === "below") {
      const idealTop = anchorRect.bottom + 8;
      const maxTop = vh - h - 8;
      if (idealTop + h > vh - 8) {
        setPos((p) => (p ? { ...p, top: Math.max(8, maxTop) } : p));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.placement]);

  // Outside click + Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popRef.current && popRef.current.contains(target)) return;
      // Also ignore clicks on the (i) button (which is the trigger)
      const trigger = document.querySelector('[data-surah-info-trigger="true"]');
      if (trigger && trigger.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    // Use timeout so the click that opened us doesn't immediately close us
    const t = setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  if (!open || !surah || !pos) return null;

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      aria-modal="false"
      dir="rtl"
      className="fixed z-[60] animate-athar-popover-in"
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${POPOVER_WIDTH}px`,
        maxHeight: "min(80vh, 540px)",
      }}
    >
      <Card className="overflow-hidden border-2 border-accent-35 shadow-[0_16px_50px_-8px_rgba(0,0,0,0.55)]">
        <PopoverContent surah={surah} extras={extras} onClose={onClose} placement={pos.placement} anchorRect={anchorRect} />
      </Card>
      <style>{`
        @keyframes athar-popover-in {
          from { opacity: 0; transform: translateY(${pos.placement === "above" ? "6px" : "-6px"}) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function PopoverContent(props: {
  surah: SurahLite;
  extras: QuranExtras | null;
  onClose: () => void;
  placement: "above" | "below";
  anchorRect: DOMRect | null;
}) {
  const { surah, extras, onClose, placement, anchorRect } = props;
  const info = getSurahInfo(surah.id);
  const isMedinan = SURAH_REVELATION[surah.id] === "medinan";
  const juzStart = getSurahJuz(surah.id);
  const sajdas = sajdaInSurah(surah.id);
  const firstAyahText = surah.ayahs[0] ?? "";
  const firstEnglish = getEnglishText(extras, globalAyahNumber(surah.id, 1));
  const tafsir = getTafsirForAyah(extras, surah.id, 1);

  const copyAyah = () => {
    try {
      void navigator.clipboard.writeText(`${firstAyahText}\n\n— ${surah.name} ﴿${toArabicNumeral(1)}﴾`);
      toast.success("نُسخت الآية");
    } catch { /* ignore */ }
  };

  // Small arrow position
  const arrowLeft = anchorRect
    ? Math.max(16, Math.min(POPOVER_WIDTH - 24, anchorRect.left + anchorRect.width / 2 - (posLeft(anchorRect, POPOVER_WIDTH))))
    : POPOVER_WIDTH / 2;
  void posLeft;

  return (
    <div className="relative">
      {/* Arrow */}
      <div
        aria-hidden="true"
        className={[
          "absolute h-3 w-3 rotate-45 border-accent-35",
          placement === "above" ? "-bottom-1.5 border-b-2 border-r-2" : "-top-1.5 border-t-2 border-l-2",
        ].join(" ")}
        style={{
          left: `${arrowLeft}px`,
          transform: "translateX(-50%) rotate(45deg)",
          background: "var(--card)",
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--stroke)] px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="surah-num-badge shrink-0" style={{ width: 36, height: 36 }}>
            {toArabicNumeral(surah.id)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold leading-tight">{surah.name}</div>
            {surah.englishName ? <div className="truncate text-[10.5px] text-[var(--muted-2)]">{surah.englishName}</div> : null}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق"
          className="grid h-8 w-8 place-items-center rounded-xl border border-[var(--stroke)] bg-[var(--bg)] transition hover:bg-[var(--card-2)]">
          <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2.5">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1">
          <Badge className={`surah-type-${isMedinan ? "madani" : "maki"}`}>
            {isMedinan ? "مدنية" : "مكية"}
          </Badge>
          <Badge>{surah.ayahs.length.toLocaleString("ar-EG")} آية</Badge>
          <Badge>جزء {toArabicNumeral(juzStart)}</Badge>
          {info ? <Badge>{info.rukus.toLocaleString("ar-EG")} {info.rukus === 1 ? "ركوع" : "أروقة"}</Badge> : null}
          {sajdas.length > 0 ? (
            <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/40">
              <MapPin className="ms-1 h-3 w-3" aria-hidden="true" />
              سجدة
            </Badge>
          ) : null}
        </div>

        {/* Topic + context */}
        {info ? (
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--card-2)] p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              المحور — {info.topic}
            </div>
            <p className="text-[12px] leading-6 text-[var(--fg)]">{info.context}</p>
          </div>
        ) : null}

        {/* Sajda chips */}
        {sajdas.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {sajdas.map((s) => (
              <Link key={s.ayahIndex} to={`/mushaf?surah=${s.surahId}&ayah=${s.ayahIndex}`} onClick={onClose}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-500/20 active:scale-95">
                آية {toArabicNumeral(s.ayahIndex)}
              </Link>
            ))}
          </div>
        ) : null}

        {/* First ayah */}
        {firstAyahText ? (
          <div className="rounded-xl border border-[var(--stroke)] bg-[var(--bg)] p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted-2)] mb-1">
              <span>الآية الأولى ﴿١﴾</span>
              <button type="button" onClick={copyAyah}
                className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--fg)] transition" aria-label="نسخ الآية">
                <Copy className="h-3 w-3" aria-hidden="true" /> نسخ
              </button>
            </div>
            <p className="arabic-text text-[15px] leading-7 text-[var(--fg)]" dir="rtl">{firstAyahText}</p>
            {firstEnglish ? (
              <p className="mt-1.5 border-t border-[var(--stroke)]/40 pt-1.5 text-[11.5px] leading-5 text-[var(--muted)] italic" lang="en">
                {firstEnglish}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Tafsir peek */}
        {tafsir ? (
          <div className="rounded-xl border border-sky-400/30 bg-sky-500/5 p-2.5">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-200">
              <span>📖</span><span>تفسير الميسر</span>
            </div>
            <p className="text-[12px] leading-6 text-[var(--fg)]">{tafsir}</p>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <Link to={`/mushaf?surah=${surah.id}`} onClick={onClose}
            className="flex items-center justify-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/20 active:scale-95">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            افتح
          </Link>
          <Link to={`/companion?ask=${encodeURIComponent(`حدّثني عن سورة «${surah.name}» — موضوعها، وقصتها، وفضلها، وكيف أعيشها اليوم.`)}`} onClick={onClose}
            className="flex items-center justify-center gap-1 rounded-lg border border-accent-35 bg-accent-15 px-2 py-1.5 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-accent-15/80 active:scale-95">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            اسأل أثر
          </Link>
          <button type="button" onClick={async () => {
            try {
              const text = `سورة ${surah.name} (${surah.ayahs.length} آية)`;
              if (navigator.share) await navigator.share({ title: `سورة ${surah.name}`, text });
              else { await navigator.clipboard.writeText(text); toast.success("نُسخت معلومة السورة"); }
            } catch { /* ignore */ }
          }}
            className="flex items-center justify-center gap-1 rounded-lg border border-[var(--stroke)] bg-[var(--card)] px-2 py-1.5 text-[11px] font-semibold text-[var(--fg)] transition hover:bg-[var(--card-2)] active:scale-95">
            <Share2 className="h-3 w-3" aria-hidden="true" />
            مشاركة
          </button>
        </div>
      </div>
    </div>
  );
}

function posLeft(anchorRect: DOMRect, popW: number): number {
  return Math.min(
    Math.max(anchorRect.left + anchorRect.width / 2 - popW / 2, 8),
    window.innerWidth - popW - 8,
  );
}