import * as React from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { appLockMethodLabel, appLockStatus, appLockSupported, confirmOwner, needsUnlockAfter, type AppLockStatus } from "@/lib/appLock";
import { useNoorStore } from "@/store/noorStore";

/**
 * The app lock screen (Settings › الأمان › قفل التطبيق).
 *
 *   - On launch the app stays covered until the phone confirms its owner.
 *   - While Athar is in the background it is covered, so the app switcher
 *     never shows what was on screen.
 *   - Back after a minute or more, it asks again; a quick trip to another app
 *     does not.
 *   - If the phone no longer has a passcode or biometrics, the lock steps
 *     aside rather than shutting its owner out.
 */
export function AppLockGate() {
  const enabled = useNoorStore((s) => s.prefs.biometricLock === true) && appLockSupported();
  const [locked, setLocked] = React.useState(enabled);
  const [covered, setCovered] = React.useState(false);
  const [status, setStatus] = React.useState<AppLockStatus | null>(null);
  const [prompting, setPrompting] = React.useState(false);
  const hiddenAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    void appLockStatus().then((next) => {
      if (!active) return;
      setStatus(next);
      // No way to confirm the owner any more: never trap them behind the lock.
      if (!next.available) setLocked(false);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  const unlock = React.useCallback(async () => {
    if (prompting) return;
    setPrompting(true);
    const ok = await confirmOwner("افتح أثر");
    setPrompting(false);
    if (ok) setLocked(false);
  }, [prompting]);

  // Ask as soon as the lock screen is showing and the app is in front.
  React.useEffect(() => {
    if (!enabled || !locked || covered || !status?.available || prompting) return;
    if (document.visibilityState !== "visible") return;
    // Let the lock screen paint before the system sheet slides up.
    const timer = window.setTimeout(() => void unlock(), 0);
    return () => window.clearTimeout(timer);
    // Ask once per showing of the lock screen; the button asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, locked, covered, status?.available]);

  React.useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        setCovered(true);
        return;
      }
      const away = hiddenAt.current == null ? 0 : Date.now() - hiddenAt.current;
      hiddenAt.current = null;
      if (needsUnlockAfter(away)) setLocked(true);
      setCovered(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled]);

  if (!enabled || (!locked && !covered)) return null;

  const method = appLockMethodLabel(status?.kind ?? "passcode");
  return (
    <div
      className="fixed inset-0 z-[2147483000] flex flex-col items-center justify-center gap-5 bg-(--bg) p-8 text-center"
      dir="rtl"
      role={locked ? "dialog" : undefined}
      aria-modal={locked ? true : undefined}
      aria-label={locked ? "أثر مقفل" : undefined}
      data-no-swipe
    >
      <div className="grid h-20 w-20 place-items-center rounded-3xl border border-(--stroke) bg-(--card)">
        <Lock size={34} aria-hidden="true" className="text-(--accent)" />
      </div>
      {locked && !covered && (
        <>
          <div className="stack-y-1">
            <div className="text-xl font-bold">أثر مقفل</div>
            <div className="text-sm opacity-70">افتحه باستخدام {method}</div>
          </div>
          <Button onClick={() => void unlock()} disabled={prompting}>
            فتح أثر
          </Button>
        </>
      )}
    </div>
  );
}
