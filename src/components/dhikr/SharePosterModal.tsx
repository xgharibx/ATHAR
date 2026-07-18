import * as React from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SharePosterModalProps {
  text: string;
  sectionTitle?: string;
  count?: number;
  onClose: () => void;
}

export function SharePosterModal({ text, sectionTitle, count, onClose }: SharePosterModalProps) {
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const blobRef = React.useRef<Blob | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    renderDhikrPosterBlob({ text, sectionTitle, count })
      .then((blob) => {
        if (cancelled) { URL.revokeObjectURL(URL.createObjectURL(blob)); return; }
        blobRef.current = blob;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    const file = new File([blob], "athar-dhikr.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "أثر" }).catch(() => {});
    } else {
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "athar-dhikr.png";
    a.click();
    toast.success("تم تنزيل الصورة");
  };

  const handleCopyImage = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    try {
      // clipboardItem is widely supported but TS-strict complains
      await navigator.clipboard.write([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      toast.success("تم نسخ الصورة");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("لم يتم دعم النسخ كصورة");
    }
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="معاينة الصورة"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-md bg-[var(--card-2)] border border-[var(--stroke)] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* atmospheric star-field overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 dhikr-card-stars opacity-50"
        />
        {/* Decorative top accent */}
        <div aria-hidden="true" className="relative h-1.5 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-90" />
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-15 border border-accent-35">
              <Wand2 size={16} className="text-[var(--accent)]" aria-hidden="true" />
            </span>
            <div className="text-right">
              <div className="text-sm font-bold leading-tight">مشاركة كصورة</div>
              <div className="text-[10.5px] opacity-55 leading-tight">بوسترات فنية مميّزة لذكر الله</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--card)] border border-[var(--stroke)] hover:bg-[var(--card-2)] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview area with ornate frame */}
        <div className="relative mx-5 mb-4 rounded-3xl overflow-hidden border border-[var(--stroke)] bg-black/40 aspect-[4/5] flex items-center justify-center">
          {/* subtle inner glow ring */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-3xl border border-accent-25" />
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin" />
                <Sparkles size={18} className="absolute inset-0 m-auto text-[var(--accent)] opacity-70" />
              </div>
              <span className="text-sm font-medium">جارٍ تصميم البطاقة الفنية…</span>
              <span className="text-[11px] opacity-50">توليد إطار، طبقة نجوم، زخارف</span>
            </div>
          )}
          {status === "error" && (
            <div className="text-sm text-[var(--danger)] text-center px-4">
              تعذّر توليد الصورة. حاول مرة أخرى.
            </div>
          )}
          {status === "ready" && blobUrl && (
            <img
              src={blobUrl}
              alt="معاينة الصورة"
              className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-500"
              draggable={false}
            />
          )}
        </div>

        {/* Actions row — three buttons */}
        <div className="relative grid grid-cols-[2fr_1fr_auto] gap-2 px-5 pb-5">
          <Button
            variant="primary"
            className="gap-2"
            disabled={status !== "ready"}
            onClick={handleShare}
          >
            <Share2 size={16} />
            مشاركة الآن
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={status !== "ready"}
            onClick={handleDownload}
          >
            <Download size={15} />
            تنزيل
          </Button>
          <button
            type="button"
            aria-label="نسخ الصورة"
            disabled={status !== "ready"}
            onClick={handleCopyImage}
            className={cn(
              "shrink-0 px-3 rounded-xl border border-[var(--stroke)] bg-[var(--card)] text-[11px] font-semibold transition",
              copied ? "text-emerald-300" : "text-[var(--muted)] hover:bg-[var(--card-2)]"
            )}
          >
            {copied ? "✓ تم" : "نسخ"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
