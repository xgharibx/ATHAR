import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { arDigits } from "../data/arabic";

/** A bottom sheet. Its ✕, Escape or a tap outside closes it. */
export function Q2Sheet({ open, onClose, label, children }: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  const host = document.querySelector(".q2") ?? document.body;
  return createPortal(
    <>
      <div className="q2-sheet-back" onClick={onClose} aria-hidden="true" />
      <div className="q2-sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        <div className="q2-sheet-grip" aria-hidden="true" />
        <button type="button" className="q2-sheet-close q2-press" aria-label="إغلاق" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <div className="q2-sheet-body">{children}</div>
      </div>
    </>,
    host,
  );
}

export function Q2Loading({ label = "لحظات…" }: { label?: string }) {
  return (
    <div className="q2-empty" role="status" aria-live="polite">
      <div className="q2-spin" style={{ margin: "0 auto 10px" }} aria-hidden="true" />
      {label}
    </div>
  );
}

export function Q2Error({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <div className="q2-empty" role="alert">
      {label}
      {onRetry ? (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="q2-btn is-ghost q2-press" onClick={onRetry}>حاول مرة أخرى</button>
        </div>
      ) : null}
    </div>
  );
}

/** How something spreads across buckets (the 114 surahs, the 30 juz …): one bar each, right to left. */
export function Q2Strip({ counts, label, startLabel, endLabel, onPick }: {
  counts: number[];
  label: string;
  startLabel: string;
  endLabel: string;
  onPick?: (index: number) => void;
}) {
  const max = Math.max(1, ...counts);
  return (
    <figure style={{ margin: 0 }}>
      <div className="q2-strip" role="img" aria-label={label}>
        {counts.map((c, i) => (
          <i
            key={i}
            className={c ? "" : "is-zero"}
            style={{ height: c ? `${Math.max(8, (c / max) * 100)}%` : undefined }}
            onClick={onPick && c ? () => onPick(i) : undefined}
            title={arDigits(c)}
          />
        ))}
      </div>
      <figcaption className="q2-strip-legend">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  );
}
