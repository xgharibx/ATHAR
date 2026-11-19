/**
 * The one place an image is made to share: an ayah, a dhikr, a hadith or a
 * reflection, in Athar's premium design (src/lib/premiumPoster.ts).
 *
 * A live preview at the top; under it the palette, the size (post, story,
 * square), the script, the translation and the text size; and the actions
 * (share, save to the phone, copy). The last palette, size and script are
 * remembered on this device, so the next share starts where this one ended.
 */
import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, Loader2, Share2, X } from "lucide-react";
import toast from "react-hot-toast";
import { FocusManagedDialog } from "@/components/ui/FocusManagedDialog";
import { cn } from "@/lib/utils";
import {
  POSTER_FORMATS,
  POSTER_SCRIPTS,
  POSTER_THEMES,
  posterSize,
  renderPremiumPoster,
  type PosterContent,
  type PosterFormat,
  type PosterScript,
  type PosterThemeId,
} from "@/lib/premiumPoster";
import { saveImageBlob, saveResultMessage, shareImageBlob } from "@/lib/shareTargets";
import "@/styles/premiumShare.css";

export type PremiumShareComposerProps = {
  open: boolean;
  onClose: () => void;
  content: PosterContent;
  /** The sheet's title, e.g. «سورة الرعد · آية ٢٨». */
  title: string;
  filename: string;
  /** Sent with the image where the share target takes text as well. */
  shareText?: string;
  /** Whether the translation starts shown (default: shown when there is one). */
  initialShowTranslation?: boolean;
};

type SavedStyle = { theme: PosterThemeId; format: PosterFormat; script?: Partial<Record<PosterContent["kind"], PosterScript>> };

const STYLE_KEY = "athar_share_style_v1";

function readSavedStyle(): SavedStyle {
  try {
    const raw = JSON.parse(localStorage.getItem(STYLE_KEY) ?? "null") as Partial<SavedStyle> | null;
    const theme = POSTER_THEMES.some((t) => t.id === raw?.theme) ? raw!.theme! : "midnight";
    const format = POSTER_FORMATS.some((f) => f.id === raw?.format) ? raw!.format! : "portrait";
    return { theme, format, script: raw?.script ?? {} };
  } catch {
    return { theme: "midnight", format: "portrait", script: {} };
  }
}

function writeSavedStyle(style: SavedStyle) {
  try {
    localStorage.setItem(STYLE_KEY, JSON.stringify(style));
  } catch {
    // Private mode: the choice just is not remembered.
  }
}

/** Scripts worth offering: the Quran in its own script; prose reads best in Naskh. */
function scriptsFor(kind: PosterContent["kind"]): PosterScript[] {
  if (kind === "ayah") return ["uthmani", "amiri", "naskh"];
  if (kind === "dhikr") return ["amiri", "uthmani", "naskh"];
  return [];
}

export function PremiumShareComposer({ open, onClose, content, title, filename, shareText, initialShowTranslation }: PremiumShareComposerProps) {
  const [saved] = React.useState(readSavedStyle);
  const [theme, setTheme] = React.useState<PosterThemeId>(saved.theme);
  const [format, setFormat] = React.useState<PosterFormat>(saved.format);
  const scripts = scriptsFor(content.kind);
  const [script, setScript] = React.useState<PosterScript | undefined>(
    saved.script?.[content.kind] && scripts.includes(saved.script[content.kind]!) ? saved.script[content.kind] : scripts[0],
  );
  const hasTranslation = Boolean(content.translation?.trim());
  const [showTranslation, setShowTranslation] = React.useState(hasTranslation && initialShowTranslation !== false);
  const [textScale, setTextScale] = React.useState(1);

  const [preview, setPreview] = React.useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = React.useState<"render" | "share" | "save" | "copy" | null>("render");
  const [failed, setFailed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const renderToken = React.useRef(0);
  const previewUrl = React.useRef<string | null>(null);

  const style = React.useMemo(
    () => ({ theme, format, script, showTranslation, textScale }),
    [theme, format, script, showTranslation, textScale],
  );

  React.useEffect(() => {
    if (!open) return;
    writeSavedStyle({ theme, format, script: { ...(saved.script ?? {}), ...(script ? { [content.kind]: script } : {}) } });
  }, [open, theme, format, script, content.kind, saved.script]);

  React.useEffect(() => {
    if (!open) return;
    const token = ++renderToken.current;
    const timer = window.setTimeout(() => {
      setBusy("render");
      setFailed(false);
      renderPremiumPoster(content, style)
        .then((blob) => {
          if (token !== renderToken.current) return;
          const url = URL.createObjectURL(blob);
          if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
          previewUrl.current = url;
          setPreview({ url, blob });
          setBusy(null);
        })
        .catch(() => {
          if (token !== renderToken.current) return;
          setFailed(true);
          setBusy(null);
        });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, content, style]);

  React.useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  }, []);

  if (!open) return null;

  const ready = preview && busy !== "render";
  const { width, height } = posterSize(format);

  const share = async () => {
    if (!preview) return;
    setBusy("share");
    try {
      const result = await shareImageBlob(preview.blob, { filename, text: shareText, title });
      if (result === "downloaded") toast.success("تم تنزيل الصورة");
      else if (result === "failed") toast.error("تعذّرت المشاركة");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!preview) return;
    setBusy("save");
    try {
      const outcome = saveResultMessage(await saveImageBlob(preview.blob, { filename, text: shareText }));
      if (outcome.ok) toast.success(outcome.text);
      else toast.error(outcome.text);
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!preview) return;
    setBusy("copy");
    try {
      const Item = (window as unknown as { ClipboardItem?: new (items: Record<string, Blob>) => ClipboardItem }).ClipboardItem;
      if (!Item || !navigator.clipboard?.write) throw new Error("unsupported");
      await navigator.clipboard.write([new Item({ "image/png": preview.blob })]);
      setCopied(true);
      toast.success("تم نسخ الصورة");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("نسخ الصور غير مدعوم هنا، استخدم المشاركة أو الحفظ");
    } finally {
      setBusy(null);
    }
  };

  return createPortal(
    <div className="premium-share-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <FocusManagedDialog className="premium-share-sheet" aria-label={`مشاركة كصورة، ${title}`} dir="rtl" onClose={onClose}>
        <div className="premium-share-handle" aria-hidden="true" />
        <header className="premium-share-header">
          <div className="min-w-0">
            <div className="premium-share-kicker">مشاركة كصورة</div>
            <div className="premium-share-title">{title}</div>
          </div>
          <button type="button" className="premium-share-close" onClick={onClose} aria-label="إغلاق">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="premium-share-stage">
          <div className="premium-share-preview" style={{ aspectRatio: `${width} / ${height}` }}>
            {preview && <img src={preview.url} alt="معاينة الصورة" className={cn(busy === "render" && "opacity-60")} />}
            {busy === "render" && (
              <div className="premium-share-loading" aria-live="polite">
                <Loader2 size={22} className="animate-spin" aria-hidden="true" />
              </div>
            )}
            {failed && <div className="premium-share-loading">تعذّر إنشاء الصورة</div>}
          </div>
        </div>

        <div className="premium-share-controls">
          <section aria-label="اللون">
            <div className="premium-share-label">اللون</div>
            <div className="premium-share-swatches" role="radiogroup" aria-label="اللون">
              {POSTER_THEMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.id}
                  aria-label={option.ar}
                  onClick={() => setTheme(option.id)}
                  className={cn("premium-share-swatch", theme === option.id && "is-active")}
                >
                  <span className="premium-share-swatch-dot" style={{ background: option.swatch, borderColor: option.accent }}>
                    {theme === option.id && <Check size={14} style={{ color: option.accent }} aria-hidden="true" />}
                  </span>
                  <span className="premium-share-swatch-name">{option.ar}</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="المقاس" className="premium-share-row">
            <div className="premium-share-label">المقاس</div>
            <div className="premium-share-segment" role="radiogroup" aria-label="المقاس">
              {POSTER_FORMATS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={format === option.id}
                  onClick={() => setFormat(option.id)}
                  className={cn(format === option.id && "is-active")}
                >
                  <span className={`premium-share-shape is-${option.id}`} aria-hidden="true" />
                  {option.ar}
                </button>
              ))}
            </div>
          </section>

          {scripts.length > 0 && (
            <section aria-label="الخط" className="premium-share-row">
              <div className="premium-share-label">الخط</div>
              <div className="premium-share-segment" role="radiogroup" aria-label="الخط">
                {scripts.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={script === id}
                    onClick={() => setScript(id)}
                    className={cn(script === id && "is-active")}
                  >
                    {POSTER_SCRIPTS.find((s) => s.id === id)?.ar}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="premium-share-row" aria-label="حجم النص">
            <div className="premium-share-label">حجم النص</div>
            <input
              type="range"
              min={0.8}
              max={1.25}
              step={0.05}
              value={textScale}
              onChange={(event) => setTextScale(Number(event.target.value))}
              className="premium-share-range"
              aria-label="حجم النص"
            />
          </section>

          {hasTranslation && (
            <label className="premium-share-toggle">
              <span>إظهار الترجمة</span>
              <input type="checkbox" checked={showTranslation} onChange={(event) => setShowTranslation(event.target.checked)} />
              <span className="premium-share-switch" aria-hidden="true" />
            </label>
          )}
        </div>

        <footer className="premium-share-actions">
          <button type="button" className="premium-share-primary" onClick={share} disabled={!ready || busy !== null}>
            {busy === "share" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
            مشاركة
          </button>
          <button type="button" className="premium-share-secondary" onClick={save} disabled={!ready || busy !== null} aria-label="حفظ في الصور">
            <Download size={18} aria-hidden="true" />
            <span>حفظ</span>
          </button>
          <button type="button" className="premium-share-secondary" onClick={copy} disabled={!ready || busy !== null} aria-label="نسخ الصورة">
            {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            <span>{copied ? "نُسخت" : "نسخ"}</span>
          </button>
        </footer>
      </FocusManagedDialog>
    </div>,
    document.body,
  );
}
