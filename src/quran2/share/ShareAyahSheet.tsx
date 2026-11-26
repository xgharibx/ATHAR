/**
 * «القرآن الكريم» — share an ayah as an image, in either design: «مشكاة», this
 * section's own (share/mishkatPoster.ts), or «أثر», the app's poster with its
 * five palettes (components/share/PremiumShareComposer).
 */
import * as React from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Q2Sheet } from "../components/ui";
import { arDigits } from "../data/arabic";
import { saveImageBlob, saveResultMessage, shareImageBlob } from "@/lib/shareTargets";
import { MISHKAT_FORMATS, MISHKAT_PALETTES, renderMishkatPoster, type MishkatFormat, type MishkatPalette } from "./mishkatPoster";

const PremiumShareComposer = React.lazy(() => import("@/components/share/PremiumShareComposer").then((m) => ({ default: m.PremiumShareComposer })));

type Design = "mishkat" | "athar";

export function ShareAyahSheet({ open, onClose, s, a, text, surahName: given }: {
  open: boolean;
  onClose: () => void;
  s: number;
  a: number;
  text: string;
  surahName: string;
}) {
  // The bare name («الكهف»), whether given with «سورة» or without.
  const surahName = given.replace(/^سورة\s+/, "");
  const [design, setDesign] = React.useState<Design>("mishkat");
  const [palette, setPalette] = React.useState<MishkatPalette>("night");
  const [format, setFormat] = React.useState<MishkatFormat>("portrait");
  const [preview, setPreview] = React.useState<{ key: string; url: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const blob = React.useRef<Blob | null>(null);
  const key = `${s}:${a}:${palette}:${format}`;

  React.useEffect(() => {
    if (!open || design !== "mishkat") return;
    let alive = true;
    void renderMishkatPoster({ text, surahName, ayah: a }, palette, format).then((b) => {
      if (!alive) return;
      blob.current = b;
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { key, url: URL.createObjectURL(b) };
      });
    });
    return () => {
      alive = false;
    };
  }, [open, design, text, surahName, a, palette, format, key]);
  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const filename = `athar-${s}-${a}.png`;
  const caption = `﴿${text}﴾ [${surahName}: ${arDigits(a)}]`;

  if (open && design === "athar") {
    return (
      <React.Suspense fallback={null}>
        <PremiumShareComposer
          open
          onClose={() => {
            setDesign("mishkat");
            onClose();
          }}
          content={{ kind: "ayah", text, heading: `سورة ${surahName}`, reference: `${surahName}، ${arDigits(s)}:${arDigits(a)}`, ayahNumber: a }}
          title={`سورة ${surahName}، الآية ${arDigits(a)}`}
          filename={filename}
          shareText={caption}
        />
      </React.Suspense>
    );
  }

  const ready = preview?.key === key;
  const act = async (how: "share" | "save") => {
    if (!blob.current) return;
    setBusy(true);
    if (how === "share") {
      const r = await shareImageBlob(blob.current, { filename, text: caption });
      if (r === "failed") toast.error("تعذّرت المشاركة");
    } else {
      const r = saveResultMessage(await saveImageBlob(blob.current, { filename, text: caption }));
      if (r.ok) toast.success(r.text);
      else toast.error(r.text);
    }
    setBusy(false);
  };

  return (
    <Q2Sheet open={open} onClose={onClose} label="شارك الآية صورة">
      <div className="q2-chips" role="tablist" aria-label="التصميم">
        {([["mishkat", "مشكاة"], ["athar", "أثر"]] as Array<[Design, string]>).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={design === id} className={`q2-chip q2-press${design === id ? " is-on" : ""}`} onClick={() => setDesign(id)}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", placeItems: "center", marginTop: 12, minHeight: 280 }}>
        {ready ? (
          <img src={preview!.url} alt={`صورة الآية ${arDigits(a)} من سورة ${surahName}`} style={{ maxHeight: "44dvh", maxWidth: "100%", borderRadius: 16, boxShadow: "0 12px 30px -16px rgba(0,0,0,0.6)" }} />
        ) : (
          <Loader2 size={26} className="animate-spin" aria-hidden="true" />
        )}
      </div>
      <div className="q2-chips" style={{ marginTop: 12 }} aria-label="اللون">
        {MISHKAT_PALETTES.map((p) => (
          <button key={p.id} type="button" aria-pressed={palette === p.id} className={`q2-chip q2-press${palette === p.id ? " is-on" : ""}`} onClick={() => setPalette(p.id)}>
            <i style={{ width: 14, height: 14, borderRadius: 99, background: p.swatch, border: "1px solid var(--q2-line)" }} aria-hidden="true" /> {p.label}
          </button>
        ))}
        {MISHKAT_FORMATS.map((f) => (
          <button key={f.id} type="button" aria-pressed={format === f.id} className={`q2-chip q2-press${format === f.id ? " is-on" : ""}`} onClick={() => setFormat(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
        <button type="button" className="q2-btn q2-press" disabled={!ready || busy} onClick={() => void act("share")}>
          <Share2 size={16} aria-hidden="true" /> شارك
        </button>
        <button type="button" className="q2-btn is-ghost q2-press" disabled={!ready || busy} onClick={() => void act("save")}>
          <Download size={16} aria-hidden="true" /> احفظ
        </button>
      </div>
    </Q2Sheet>
  );
}
