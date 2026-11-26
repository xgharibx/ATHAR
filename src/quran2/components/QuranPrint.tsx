/**
 * Athar's mark (the fingerprint with «أثر» across it) in the Quran's own bars,
 * as in the app's header: a tap goes home.
 */
import { NavLink } from "react-router-dom";
import { AtharLogo } from "@/components/brand/AtharLogo";

export function QuranPrint() {
  return (
    <NavLink to="/" className="q2-print" aria-label="أثر — الرئيسية">
      <AtharLogo className="q2-print-mark" label="أثر" />
    </NavLink>
  );
}
