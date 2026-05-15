import * as React from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X } from "lucide-react";
import toast from "react-hot-toast";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import { Button } from "@/components/ui/Button";

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

  // Generate poster on mount
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
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

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

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
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
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-sm bg-[var(--card-2)] border border-[var(--stroke)] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="text-base font-bold">مشاركة كصورة</span>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--card)] border border-[var(--stroke)] hover:bg-[var(--card-2)] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview area */}
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-[var(--stroke)] bg-[var(--card)] aspect-[4/5] flex items-center justify-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              <span className="text-sm">جارٍ التوليد…</span>
            </div>
          )}
          {status === "error" && (
            <div className="text-sm text-[var(--danger)] text-center px-4">
              تعذّر توليد الصورة
            </div>
          )}
          {status === "ready" && blobUrl && (
            <img
              src={blobUrl}
              alt="معاينة الصورة"
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <Button
            variant="primary"
            className="flex-1 gap-2"
            disabled={status !== "ready"}
            onClick={handleShare}
          >
            <Share2 size={16} />
            مشاركة
          </Button>
          <Button
            variant="secondary"
            className="flex-1 gap-2"
            disabled={status !== "ready"}
            onClick={handleDownload}
          >
            <Download size={16} />
            تنزيل
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
