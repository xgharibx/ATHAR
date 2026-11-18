/**
 * Choosing between the two designs (src/lib/design.ts). Each choice is drawn
 * as a small phone so the difference is seen, not described.
 */
import * as React from "react";
import toast from "react-hot-toast";
import { ArrowLeft, Check } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { DESIGN_MODES, UFUQ_LOOKS, type DesignMode, type UfuqLook } from "@/lib/design";
import { cn } from "@/lib/utils";
import { vibrate } from "@/lib/haptics";

function ClassicPreview() {
  return (
    <span className="design-mock design-mock-classic" aria-hidden="true">
      <span className="dm-bar" />
      <span className="dm-hero" />
      <span className="dm-row"><span /><span /><span /><span /></span>
      <span className="dm-card" />
      <span className="dm-nav"><span /><span /><span /><span /><span /><span /></span>
    </span>
  );
}

export function UfuqPreview() {
  return (
    <span className="design-mock design-mock-ufuq" aria-hidden="true">
      <span className="dm-title" />
      <span className="dm-sky"><span className="dm-orb" /></span>
      <span className="dm-list"><span /><span /><span /></span>
      <span className="dm-pill"><span /><span /><span /><span /><span /></span>
    </span>
  );
}

function useSetDesign() {
  const setPrefs = useNoorStore((s) => s.setPrefs);
  return React.useCallback((mode: DesignMode) => {
    setPrefs({ designMode: mode });
    vibrate(12);
    toast.success(mode === "ufuq" ? "أهلًا بك في «أُفُق»" : "عدتَ إلى التصميم الكلاسيكي", { duration: 1800 });
  }, [setPrefs]);
}

export function DesignPicker() {
  const design: DesignMode = useNoorStore((s) => s.prefs.designMode) ?? "classic";
  const setDesign = useSetDesign();
  return (
    <div className="design-picker" role="radiogroup" aria-label="تصميم التطبيق">
      {DESIGN_MODES.map((mode) => {
        const active = design === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && setDesign(mode.id)}
            className={cn("design-choice", active && "is-active")}
          >
            {mode.id === "ufuq" ? <UfuqPreview /> : <ClassicPreview />}
            <span className="design-choice-label">
              <span className="design-choice-check" aria-hidden="true">{active ? <Check size={12} strokeWidth={3} /> : null}</span>
              {mode.label}
              {mode.id === "ufuq" ? <span className="design-choice-new">جديد</span> : null}
            </span>
            <span className="design-choice-hint">{mode.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Shown at the top of Settings while the classic design is on. */
export function DesignInvite() {
  const setDesign = useSetDesign();
  return (
    <button type="button" className="design-invite" onClick={() => setDesign("ufuq")}>
      <UfuqPreview />
      <span className="flex-1 min-w-0">
        <span className="design-invite-title block">جرّب «أُفُق»، التصميم الجديد</span>
        <span className="design-invite-sub block">تصميم مختلف كليًّا لنفس أثر. تعود إلى الكلاسيكي متى شئت من «المظهر».</span>
      </span>
      <ArrowLeft size={16} className="shrink-0 opacity-50" aria-hidden="true" />
    </button>
  );
}

function GardenPreview({ night, bed = false }: { night: boolean; bed?: boolean }) {
  return (
    <span className={cn("design-mock design-mock-garden", night && "is-night", bed && "has-bed")} aria-hidden="true">
      {night ? <span className="dm-moon" /> : null}
      <span className="dm-palm" />
      <span className="dm-cypress" />
      <span className="dm-ground" />
      {bed ? <span className="dm-bed"><span /><span /><span /><span /><span /></span> : null}
    </span>
  );
}

/** Inside «أفق»: the living garden, or plain paper. */
export function UfuqLookPicker() {
  const look: UfuqLook = useNoorStore((s) => s.prefs.ufuqLook) ?? "garden";
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const night = typeof document !== "undefined" && document.documentElement.dataset.ufuqPalette === "night";
  return (
    <div className="ufuq-look-picker" role="radiogroup" aria-label="المشهد">
      {UFUQ_LOOKS.map((option) => {
        const active = look === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (active) return;
              setPrefs({ ufuqLook: option.id });
              vibrate(10);
            }}
            className={cn("design-choice", active && "is-active")}
          >
            {option.id === "plain" ? <UfuqPreview /> : <GardenPreview night={night} bed={option.id === "live"} />}
            <span className="design-choice-label">
              <span className="design-choice-check" aria-hidden="true">{active ? <Check size={12} strokeWidth={3} /> : null}</span>
              {option.label}
            </span>
            <span className="design-choice-hint">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
