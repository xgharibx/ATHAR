/**
 * FloatingAthar — a lightweight "ask Athar" button you can drop into any page.
 *
 * Two modes:
 *  - prop `prefill` + default → click navigates to /companion?ask=… (the
 *    deep-link flow on Companion.tsx handles the rest, including auto-send).
 *  - prop `modalMode` → opens an in-page CompanionModal with the prefill so
 *    the user gets an inline answer without leaving the current screen.
 *
 * Context: pass `context` to surface it as a chip in the modal so the AI
 * knows what page / verse / section the user is on. The actual content of
 * the user's question is `prefill`; the AI sees both via the modal.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { CompanionModal } from "@/components/companion/CompanionModal";

export type AtharContext = {
  /** Display title shown in the modal chip — e.g. "سورة البقرة: آية ٢٥٥". */
  title?: string;
  /** Short note the AI gets alongside the user's question — e.g. "صفحة ٤٢". */
  subtitle?: string;
  /** Optional emoji / icon for the chip. */
  icon?: string;
  /** Lowercase hint passed verbatim to the AI as part of the prompt. */
  hint?: string;
};

export function FloatingAthar(props: {
  prefill?: string;
  context?: AtharContext;
  modalMode?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const prefill = props.prefill ?? "";

  const onClick = () => {
    if (props.modalMode) { setOpen(true); return; }
    const qs = prefill ? `?ask=${encodeURIComponent(prefill)}` : "";
    navigate(`/companion${qs}`);
  };

  return (
    <>
      <button type="button"
        onClick={onClick}
        aria-label="اسأل أثر"
        title="اسأل أثر"
        className={[
          "group fixed z-30 grid h-14 w-14 place-items-center rounded-full",
          "bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-500 text-emerald-950",
          "shadow-[0_8px_30px_-4px_rgba(16,185,129,0.55)] ring-[3px] ring-emerald-300/40",
          "active:scale-95 transition-all duration-300",
          "end-4 bottom-[calc(var(--sab,env(safe-area-inset-bottom,0px))_+_5rem)]",
          "sm:end-5 sm:bottom-[calc(var(--mobile-nav-height,0px)_+_5rem)]",
          props.className ?? "",
        ].join(" ")}>
        {/* Pulsing halo */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/40 blur-md"
          style={{ animation: "athar-fab-halo 2.4s ease-in-out infinite" }}
        />
        {/* Sparkle ring */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-70"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(167,243,208,0.6) 60deg, transparent 120deg)",
            animation: "athar-fab-spin 6s linear infinite",
            mask: "radial-gradient(circle, transparent 60%, black 65%, transparent 100%)",
            WebkitMask: "radial-gradient(circle, transparent 60%, black 65%, transparent 100%)",
          }}
        />
        <Sparkles className="relative h-6 w-6 drop-shadow-sm" aria-hidden="true" />
        <style>{`@keyframes athar-fab-halo { 0%, 100% { opacity: 0.3; transform: scale(1) } 50% { opacity: 0.7; transform: scale(1.15) } } @keyframes athar-fab-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </button>
      {props.modalMode ? (
        <CompanionModal open={open} onClose={() => setOpen(false)} prefill={prefill} context={props.context} />
      ) : null}
    </>
  );
}