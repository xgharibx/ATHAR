/**
 * One tap between the two designs, from the top of every main page.
 *
 * The pill names where it takes you («أفق» from the classic design,
 * «كلاسيكي» from «أفق»), and its handle carries a small flower that grows
 * and opens, softly, until the switch has been used once — so people notice
 * it without being nagged. The new design then spreads out from the switch
 * in a circle (the browser's View Transitions), or fades in where those are
 * not supported.
 */
import * as React from "react";
import { flushSync } from "react-dom";
import "@/styles/designSwitch.css";
import { useNoorStore } from "@/store/noorStore";
import type { DesignMode } from "@/lib/design";
import { vibrate } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const SEEN_KEY = "athar_design_switch_seen";

function hasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function prefersReducedMotion(): boolean {
  return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

/** The flower on the handle: a stem rises, two leaves open, then the petals. */
function Flower({ growing }: { growing: boolean }) {
  return (
    <svg className={cn("ds-flower", growing && "is-growing")} viewBox="0 0 24 24" aria-hidden="true">
      <path className="ds-stem" d="M12 21 C12 17 11.4 14.5 12 11.5" />
      <path className="ds-leaf ds-leaf-a" d="M12 17.2 C9.6 16.9 8.4 15.4 8.2 13.9 C10 14 11.4 15.1 12 17.2Z" />
      <path className="ds-leaf ds-leaf-b" d="M12 15.4 C14.3 15.1 15.5 13.7 15.8 12.3 C14 12.3 12.6 13.4 12 15.4Z" />
      <g className="ds-bloom">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} className="ds-petal" cx="12" cy="7.4" rx="1.9" ry="2.9" transform={`rotate(${a} 12 9.6)`} />
        ))}
        <circle className="ds-heart" cx="12" cy="9.6" r="1.6" />
      </g>
    </svg>
  );
}

export function DesignSwitch({ className }: { className?: string }) {
  const design: DesignMode = useNoorStore((s) => s.prefs.designMode) ?? "classic";
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const [seen, setSeen] = React.useState(hasSeen);
  const ref = React.useRef<HTMLButtonElement>(null);
  const lastClassic = useNoorStore((s) => s.prefs.lastClassicDesign) ?? "classic";
  const ufuq = design === "ufuq";
  // Back from «أفق» to whichever classic design was in use.
  const target: DesignMode = ufuq ? lastClassic : "ufuq";

  const change = () => {
    vibrate(14);
    if (!seen) {
      setSeen(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Not remembered; the hint shows again next time, which is harmless.
      }
    }
    const apply = () => setPrefs(ufuq ? { designMode: target } : { designMode: target, lastClassicDesign: design === "classic-new" ? "classic-new" : "classic" });
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    const root = document.documentElement;
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      root.style.setProperty("--ds-x", `${rect.left + rect.width / 2}px`);
      root.style.setProperty("--ds-y", `${rect.top + rect.height / 2}px`);
    }
    if (prefersReducedMotion()) {
      apply();
      return;
    }
    if (doc.startViewTransition) {
      root.classList.add("ds-transition");
      const transition = doc.startViewTransition(() => {
        flushSync(apply);
      });
      void transition.finished.finally(() => root.classList.remove("ds-transition"));
      return;
    }
    // No View Transitions: a soft veil fades the change in.
    root.classList.add("ds-fade");
    window.setTimeout(() => {
      apply();
      window.setTimeout(() => root.classList.remove("ds-fade"), 60);
    }, 180);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={ufuq}
      aria-label={ufuq ? "التصميم الآن «أفق». اضغط للعودة إلى التصميم الكلاسيكي" : "التصميم الآن الكلاسيكي. اضغط لتجربة تصميم «أفق»"}
      title={ufuq ? "العودة إلى التصميم الكلاسيكي" : "جرّب تصميم «أفق»"}
      className={cn("ds-switch", ufuq && "is-ufuq", !seen && "is-new", className)}
      onClick={change}
    >
      <span className="ds-label" aria-hidden="true">
        {ufuq ? "كلاسيكي" : "أفق"}
      </span>
      <span className="ds-knob" aria-hidden="true">
        <Flower growing={!seen} />
      </span>
    </button>
  );
}
