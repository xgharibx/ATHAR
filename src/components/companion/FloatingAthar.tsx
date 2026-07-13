/**
 * FloatingAthar — a lightweight "ask Athar" button you can drop into any page.
 *
 * Two modes:
 *  - prop `prefill` → click navigates to /companion?ask=… (the deep-link flow
 *    on Companion.tsx handles the rest, including auto-send).
 *  - prop `modalMode` → opens an in-page CompanionModal with the prefill so
 *    the user gets an inline answer without leaving the current screen.
 *
 * Default: navigates. Mushaf/Dhikr/Quran can opt-in to modalMode by passing it.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { CompanionModal } from "@/components/companion/CompanionModal";

export function FloatingAthar(props: {
  prefill?: string;
  context?: { title?: string; subtitle?: string };
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
          "fixed z-30 grid h-12 w-12 place-items-center rounded-full",
          "bg-gradient-to-br from-emerald-400 to-emerald-600 text-emerald-950 shadow-xl",
          "shadow-emerald-500/30 ring-2 ring-emerald-300/50 active:scale-95 transition",
          "end-4",
          props.className ?? "bottom-24",
        ].join(" ")}
        style={{ bottom: props.className ? undefined : "calc(var(--mobile-nav-height) + 6rem)" }}>
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </button>
      {props.modalMode ? (
        <CompanionModal open={open} onClose={() => setOpen(false)} prefill={prefill} />
      ) : null}
    </>
  );
}
