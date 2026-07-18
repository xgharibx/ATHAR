/**
 * ShareAyahModal — composer for sharing a Quran ayah as a styled image.
 *
 * Live-preview loop: render to a hidden small canvas (540×675), debounced
 * to 250ms; full-res output only when the user clicks Share / Download.
 *
 * Backdrop: glass + dhikr-card-stars atmosphere; respects modal chrome
 * already established by SharePosterModal.
 */
import * as React from "react";
import { createPortal } from "react-dom";
import {
  Share2, Download, X, Sparkles, Wand2, ImageDown, Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  renderAyahPosterBlob,
  AYAH_BACKGROUND_OPTIONS,
  AYAH_FONT_OPTIONS,
  AYAH_COLOR_OPTIONS,
  AYAH_REFERENCE_OPTIONS,
  type AyahPosterConfig,
  type AyahBackground,
  type AyahFont,
  type ColorTheme,
  type ReferenceStyle,
} from "@/lib/ayahPoster";

interface ShareAyahModalProps {
  open: boolean;
  onClose: () => void;
  text: string;
  ayahNumber?: number;
  surahName?: string;
  surahNumber?: number;
  translation?: string;
  transliteration?: string;
  footerUrl?: string;
}

/* ─── Sub-controls ───────────────────────────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider opacity-55 mb-2">
      {children}
    </div>
  );
}

function ChipButton<T extends string>({
  active, onClick, label,
}: {
  active: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 transition",
        active
          ? "border-[var(--accent)]/70 bg-[var(--accent)]/12 text-[var(--accent)] shadow-[0_0_18px_-4px_var(--accent)]"
          : "border-[var(--stroke)] bg-[var(--card)]/55 hover:bg-[var(--card-2)] text-[var(--muted)]",
      )}
    >
      <span className="text-[12.5px] font-bold leading-tight">{label}</span>
    </button>
  );
}

function ColorSwatch({
  id, active, onClick, ar,
}: { id: ColorTheme; active: boolean; onClick: () => void; ar: string }) {
  const swatches: Record<ColorTheme, string> = {
    gold:     "linear-gradient(135deg, #d8a657, #caa065)",
    silver:   "linear-gradient(135deg, #c8d0dc, #a8b2c4)",
    emerald:  "linear-gradient(135deg, #5fa37e, #3d8b66)",
    sapphire: "linear-gradient(135deg, #5a86c0, #3f6aaa)",
    rose:     "linear-gradient(135deg, #d68c8a, #b66f6c)",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={ar}
      className={cn(
        "relative h-12 rounded-xl transition overflow-hidden",
        active ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]" : "ring-1 ring-[var(--stroke)] hover:ring-[var(--accent)]/60",
      )}
      style={{ backgroundImage: swatches[id] }}
    >
      {active && (
        <span className="absolute inset-0 grid place-items-center text-white text-lg font-black drop-shadow">✓</span>
      )}
    </button>
  );
}

/* ─── Background preview swatches (programmatic mini-thumbnails) ────── */

function BgThumb({ id, active, onClick, label }: {
  id: AyahBackground; active: boolean; onClick: () => void; label: string;
}) {
  // simple programmatic mini-thumbnail per background family
  const grad: Record<AyahBackground, string> = {
    celestial:    "radial-gradient(circle at 50% 30%, #d8a657 0%, transparent 50%), linear-gradient(180deg, #08090c 0%, #0a0a0e 100%)",
    geometric:    "repeating-radial-gradient(circle at 50% 50%, #d8a657 0px, transparent 1px, transparent 18px), linear-gradient(180deg, #08090c 0%, #0c0a08 100%)",
    mihrab:       "linear-gradient(180deg, #08090c 0%, #1a1410 100%)",
    calligraphic: "linear-gradient(135deg, rgba(216,166,87,0.20), rgba(202,160,101,0.05) 70%), linear-gradient(180deg, #0e0c08 0%, #181410 100%)",
    minimal:      "linear-gradient(180deg, #08090c 0%, #181410 100%)",
    nebula:       "radial-gradient(circle at 30% 30%, #5a86c0, transparent 45%), radial-gradient(circle at 75% 70%, #d68c8a, transparent 45%), linear-gradient(180deg, #0b0a14 0%, #14101a 100%)",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative h-20 rounded-2xl overflow-hidden transition",
        active ? "ring-2 ring-[var(--accent)] shadow-[0_0_24px_-4px_var(--accent)]" : "ring-1 ring-[var(--stroke)] hover:ring-[var(--accent)]/55",
      )}
      style={{ backgroundImage: grad[id] }}
    >
      <span className="absolute inset-x-0 bottom-1 text-center text-[9.5px] font-semibold text-white/85 leading-none">
        {label}
      </span>
    </button>
  );
}

/* ─── Live preview canvas ─────────────────────────────────────────────── */
/** Off-screen offscreen canvas at 540×675 (1/2 the export size) so
 *  re-renders feel instant. We replace the preview on every config
 *  change with a 250ms debounce. */

function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void, ms: number,
): (...args: A) => void {
  const fnRef = React.useRef(fn);
  React.useEffect(() => { fnRef.current = fn; }, [fn]);
  const timerRef = React.useRef<number | null>(null);
  return React.useCallback((...args: A) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => fnRef.current(...args), ms);
  }, [ms]);
}

/* ─── Main modal ──────────────────────────────────────────────────────── */

export function ShareAyahModal(props: ShareAyahModalProps) {
  // Local state — defaults that lean "Ayah-beautiful"
  const [background, setBackground] = React.useState<AyahBackground>("celestial");
  const [font, setFont] = React.useState<AyahFont>("amiri");
  const [colorTheme, setColorTheme] = React.useState<ColorTheme>("gold");
  const [referenceStyle, setReferenceStyle] = React.useState<ReferenceStyle>("surahAyah");
  const [textScale, setTextScale] = React.useState(1);
  const [showTranslation, setShowTranslation] = React.useState(!!props.translation);
  const [showTransliteration, setShowTransliteration] = React.useState(!!props.transliteration);
  const [tab, setTab] = React.useState<"bg" | "style" | "ref">("bg");

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const blobUrlRef = React.useRef<string | null>(null);
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "rendering" | "ready" | "error">("idle");
  const [copied, setCopied] = React.useState(false);

  const config: AyahPosterConfig = React.useMemo(() => ({
    text: props.text,
    ayahNumber: props.ayahNumber,
    surahName: props.surahName,
    surahNumber: props.surahNumber,
    translation: props.translation,
    transliteration: props.transliteration,
    footerUrl: props.footerUrl,
    background,
    font,
    colorTheme,
    referenceStyle,
    textScale,
    showTranslation,
    showTransliteration,
  }), [
    props.text, props.ayahNumber, props.surahName, props.surahNumber,
    props.translation, props.transliteration, props.footerUrl,
    background, font, colorTheme, referenceStyle, textScale,
    showTranslation, showTransliteration,
  ]);

  // Render a low-res preview to the on-screen canvas
  const renderPreview = React.useCallback(async () => {
    if (!props.open) return;
    setStatus("rendering");
    try {
      // Render full-res (1080×1350), then draw to a small canvas for speed
      const blob = await renderAyahPosterBlob(config);
      const fullUrl = URL.createObjectURL(blob);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = fullUrl;
      setBlobUrl(fullUrl);

      // Render the same blob into the small preview at 540×675
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        setStatus("ready");
      };
      img.src = fullUrl;
    } catch (err) {
      console.error("[share-ayah] preview render failed", err);
      setStatus("error");
    }
  }, [props.open, config]);

  const debouncedRender = useDebouncedCallback(renderPreview, 250);

  React.useEffect(() => {
    if (props.open) debouncedRender();
  }, [props.open, config, debouncedRender]);

  // Cleanup
  React.useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  // ─── Sharing actions ───────────────────────────────────────────────
  const handleShare = async () => {
    try {
      const blob = await renderAyahPosterBlob(config);
      const filename = props.surahName
        ? `athar-${props.surahNumber ?? ""}-${props.ayahNumber ?? ""}.png`
        : "athar-ayah.png";
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${props.surahName ?? "Quran"} ${props.ayahNumber ?? ""}` }).catch(() => {});
      } else { handleDownload(); }
    } catch { toast.error("تعذّر توليد الصورة"); }
  };

  const handleDownload = async () => {
    try {
      const blob = await renderAyahPosterBlob(config);
      const filename = props.surahName
        ? `athar-${props.surahNumber ?? ""}-${props.ayahNumber ?? ""}.png`
        : "athar-ayah.png";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("تم تنزيل الصورة");
    } catch { toast.error("تعذّر تنزيل الصورة"); }
  };

  const handleCopyImage = async () => {
    try {
      const blob = await renderAyahPosterBlob(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await navigator.clipboard.write([
        new (window as any).ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      toast.success("تم نسخ الصورة");
      setTimeout(() => setCopied(false), 2200);
    } catch { toast.error("لم يتم دعم النسخ كصورة"); }
  };

  // ─── Backdrop + key handling ───────────────────────────────────────
  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) props.onClose();
  };
  React.useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="مشاركة الآية"
      className="fixed inset-0 z-[9999] grid place-items-end sm:place-items-center p-2 sm:p-6 bg-black/78 backdrop-blur-md"
      onClick={onBackdrop}
    >
      <div className="relative w-full max-w-5xl bg-[var(--card-2)] border border-[var(--stroke)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* decorative top accent */}
        <div aria-hidden="true" className="relative h-1.5 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-90" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 dhikr-card-stars opacity-40" />

        {/* header */}
        <div className="relative flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-15 border border-accent-35 shrink-0">
              <Wand2 size={16} className="text-[var(--accent)]" aria-hidden="true" />
            </span>
            <div className="text-right min-w-0">
              <div className="text-sm font-bold leading-tight truncate">
                {props.surahName ? `${props.surahName} · آية ${props.ayahNumber ?? ""}` : "مشاركة الآية"}
              </div>
              <div className="text-[10.5px] opacity-55 leading-tight">شارك آية بأسلوب فني مختار</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={props.onClose}
            className="w-9 h-9 rounded-xl grid place-items-center bg-[var(--card)] border border-[var(--stroke)] hover:bg-[var(--card-2)] transition shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* main content: 2-column composer */}
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT — Live preview */}
          <div className="relative flex flex-col items-center justify-center gap-2 bg-black/40 border-l border-[var(--stroke)] p-4 overflow-hidden shrink-0 basis-[42%]">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border border-[var(--stroke)] shadow-[0_8px_36px_-12px_rgba(0,0,0,0.65)]",
                "w-full max-w-[320px] aspect-[4/5]",
              )}
            >
              <canvas
                ref={canvasRef}
                width={540}
                height={675}
                className="w-full h-full block"
                aria-label="معاينة الصورة"
              />
              {status === "rendering" && (
                <div className="absolute inset-0 grid place-items-center bg-black/35">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin" />
                      <Sparkles size={14} className="absolute inset-0 m-auto text-[var(--accent)] opacity-70" />
                    </div>
                    <span className="text-[10.5px] opacity-70">جارٍ التحديث…</span>
                  </div>
                </div>
              )}
              {status === "error" && (
                <div className="absolute inset-0 grid place-items-center text-[var(--danger)] text-sm">
                  تعذّر التوليد
                </div>
              )}
            </div>
            <div className="text-[10px] opacity-50">1080 × 1350 · معاينة فورية</div>
          </div>

          {/* RIGHT — Tabs + controls */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--stroke)] p-3">
              {([
                { id: "bg",   label: "الخلفية", icon: ImageDown },
                { id: "style", label: "الخط واللون", icon: Sparkles },
                { id: "ref",   label: "المرجع", icon: Wand2 },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition border",
                    tab === t.id
                      ? "bg-[var(--accent)]/12 border-[var(--accent)]/60 text-[var(--accent)]"
                      : "bg-[var(--card)]/60 border-[var(--stroke)] text-[var(--muted)] hover:bg-[var(--card-2)]",
                  )}
                >
                  <t.icon size={12} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {tab === "bg" && (
                <div>
                  <Label>اختر الخلفية</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {AYAH_BACKGROUND_OPTIONS.map((opt) => (
                      <BgThumb
                        key={opt.id}
                        id={opt.id}
                        active={background === opt.id}
                        onClick={() => setBackground(opt.id)}
                        label={opt.ar}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[11.5px] opacity-55 leading-5">
                    الكلاسيكي يبدأ من «خطي» أو «محراب»، والمعاصر من «سماوي» أو «سديمي».
                  </p>
                </div>
              )}

              {tab === "style" && (
                <div>
                  <Label>الخط</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {AYAH_FONT_OPTIONS.map((opt) => (
                      <ChipButton
                        key={opt.id}
                        active={font === opt.id}
                        onClick={() => setFont(opt.id)}
                        label={opt.ar}
                      />
                    ))}
                  </div>

                  <div className="mt-5">
                    <Label>اللون</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {AYAH_COLOR_OPTIONS.map((opt) => (
                        <ColorSwatch
                          key={opt.id}
                          id={opt.id}
                          ar={opt.ar}
                          active={colorTheme === opt.id}
                          onClick={() => setColorTheme(opt.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <Label>حجم الخط <span className="opacity-50">×{textScale.toFixed(2)}</span></Label>
                    <input
                      type="range"
                      min={0.7}
                      max={1.4}
                      step={0.05}
                      value={textScale}
                      onChange={(e) => setTextScale(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                      aria-label="حجم الخط"
                    />
                  </div>

                  <div className="mt-5 space-y-2">
                    {props.translation && (
                      <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showTranslation}
                          onChange={(e) => setShowTranslation(e.target.checked)}
                          className="accent-[var(--accent)]"
                        />
                        إظهار الترجمة
                      </label>
                    )}
                    {props.transliteration && (
                      <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showTransliteration}
                          onChange={(e) => setShowTransliteration(e.target.checked)}
                          className="accent-[var(--accent)]"
                        />
                        إظهار النطق بالحروف اللاتينية
                      </label>
                    )}
                  </div>
                </div>
              )}

              {tab === "ref" && (
                <div>
                  <Label>نمط المرجع</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {AYAH_REFERENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setReferenceStyle(opt.id)}
                        aria-pressed={referenceStyle === opt.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-3 py-2.5 transition text-right",
                          referenceStyle === opt.id
                            ? "bg-[var(--accent)]/10 border-[var(--accent)]/65 text-[var(--accent)]"
                            : "bg-[var(--card)]/60 border-[var(--stroke)] text-[var(--muted)] hover:bg-[var(--card-2)]",
                        )}
                      >
                        <span className="text-[12.5px] font-semibold">{opt.label}</span>
                        <span className="text-[10.5px] opacity-65">{opt.ar}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11.5px] opacity-55 leading-5">
                    «السورة والآية» هو الأكثر شيوعًا لوسائل التواصل.
                  </p>
                </div>
              )}
            </div>

            {/* footer actions */}
            <div className="border-t border-[var(--stroke)] p-3 grid grid-cols-[1fr_auto] gap-2">
              <Button onClick={handleShare} variant="primary" className="gap-2 w-full">
                <Share2 size={16} />
                مشاركة الآن
              </Button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={!blobUrl}
                  className={cn(
                    "px-3 h-10 rounded-xl border text-[12px] font-semibold transition shrink-0",
                    copied
                      ? "border-emerald-400/40 bg-emerald-400/12 text-emerald-300"
                      : "border-[var(--stroke)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-2)]",
                  )}
                >
                  {copied ? "✓ تم" : <><Copy size={13} className="inline me-1" />نسخ</>}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!blobUrl}
                  className="px-3 h-10 rounded-xl border border-[var(--stroke)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-2)] text-[12px] font-semibold transition shrink-0"
                  aria-label="تنزيل"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
