import * as React from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = React.useState(() => !navigator.onLine);
  const [justBack, setJustBack] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      setJustBack(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustBack(false), 2800);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const visible = offline || justBack;
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className={[
        "fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 px-4 py-2",
        "text-xs font-medium transition-all duration-300",
        offline
          ? "bg-red-900/90 text-red-100 border-b border-red-800/40"
          : "bg-green-900/90 text-green-100 border-b border-green-800/40",
      ].join(" ")}
      style={{ paddingTop: `calc(0.5rem + env(safe-area-inset-top, 0px))` }}
    >
      {offline ? (
        <>
          <WifiOff size={13} aria-hidden="true" />
          <span>لا يوجد اتصال بالإنترنت — التطبيق يعمل بوضع التصفح دون اتصال</span>
        </>
      ) : (
        <>
          <Wifi size={13} aria-hidden="true" />
          <span>عاد الاتصال بالإنترنت ✓</span>
        </>
      )}
    </div>
  );
}
