import * as React from "react";
import { isQuranExtrasComplete, loadQuranExtras, type QuranExtras } from "@/data/quranExtras";

/** Load optional Quran extras on demand and retry missing bundles after reconnect. */
export function useQuranExtras(enabled: boolean): QuranExtras | null {
  const [extras, setExtras] = React.useState<QuranExtras | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    void loadQuranExtras().then((result) => {
      if (active) setExtras(result);
    }).catch(() => {});
    return () => { active = false; };
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled || isQuranExtrasComplete(extras)) return;
    let active = true;
    const retryWhenOnline = () => {
      void loadQuranExtras().then((result) => {
        if (active) setExtras(result);
      }).catch(() => {});
    };
    window.addEventListener("online", retryWhenOnline);
    return () => {
      active = false;
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [enabled, extras]);

  return extras;
}
