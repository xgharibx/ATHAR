/**
 * Modal — generic centered/sheet overlay for the Athar app.
 * Renders a backdrop + a sized panel. Closes on backdrop click or Escape.
 */
import * as React from "react";
import { X as XIcon } from "lucide-react";

export function Modal(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional className applied to the panel */
  className?: string;
  /** Maximum height class (default: max-h-[85vh]) */
  maxHeightClass?: string;
}) {
  React.useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [props.open, props]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4" dir="rtl">
      <div
        aria-hidden="true"
        onClick={props.onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--stroke)] bg-[var(--bg)] shadow-[0_24px_70px_-12px_rgba(0,0,0,0.45)]",
          props.maxHeightClass ?? "max-h-[85vh]",
          props.className ?? "",
        ].join(" ")}
      >
        {props.children}
      </div>
    </div>
  );
}

export const ModalCloseButton = (props: { onClose: () => void; label?: string }) => (
  <button type="button" onClick={props.onClose} aria-label={props.label ?? "إغلاق"}
    className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--stroke)] bg-[var(--card)] transition hover:bg-[var(--card-2)]">
    <XIcon className="h-4 w-4" aria-hidden="true" />
  </button>
);