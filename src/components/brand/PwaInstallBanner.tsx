/**
 * "Add to Home Screen" prompt — Android/desktop AND iOS.
 *
 * Two genuinely different flows, because Apple never implemented
 * `beforeinstallprompt`:
 *
 *  - Chromium (Android, desktop): the browser fires `beforeinstallprompt`, we
 *    stash it and can trigger a real install dialog from our own button.
 *  - iOS Safari: no such event and no programmatic install exists at all. The
 *    only path is the user tapping Share → "أضف إلى الشاشة الرئيسية". So on iOS
 *    this banner is *instructional* — it shows where to tap. Previously the
 *    component only listened for `beforeinstallprompt`, which meant iOS users
 *    saw nothing whatsoever and had no way to discover that installing was
 *    even possible.
 *
 * Never shown when the app is already installed (running standalone), and the
 * dismissal is remembered.
 */
import { useState, useEffect } from "react";

const DISMISSED_KEY = "noor_pwa_install_dismissed";
/** Delay before appearing, so it doesn't collide with first paint. */
const APPEAR_DELAY_MS = 3500;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True when launched from the home screen rather than a browser tab. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS exposes a non-standard flag; everything else uses the media query.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  const minimal = window.matchMedia?.("(display-mode: minimal-ui)")?.matches === true;
  return iosStandalone || mq || minimal;
}

/**
 * iOS detection that also catches iPadOS 13+, which reports itself as
 * "Macintosh" — the touch-point check is what separates a real iPad from a Mac.
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && typeof document !== "undefined" && navigator.maxTouchPoints > 1;
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    // Already installed → nothing to advertise.
    if (isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS will never fire the event above, so surface the manual instructions
    // on a timer instead.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS()) {
      timer = setTimeout(() => {
        setIos(true);
        setVisible(true);
      }, APPEAR_DELAY_MS);
    }

    // If the user installs while the banner is up, retire it immediately.
    const installed = () => {
      localStorage.setItem(DISMISSED_KEY, "1");
      setVisible(false);
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
    setPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-20 inset-x-3 z-[9995] flex items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--bg)]/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
      role="dialog"
      aria-label="تثبيت أثر على الشاشة الرئيسية"
    >
      <img
        src="/apple-touch-icon.png"
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-xl"
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-[var(--fg)]">
          ثبّت أثر على شاشتك الرئيسية
        </p>
        {ios ? (
          // No install API on iOS — tell the user exactly where to tap.
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-[var(--muted)]">
            <span>اضغط</span>
            <ShareGlyph />
            <span>في شريط المتصفح، ثم اختر «أضف إلى الشاشة الرئيسية»</span>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-[var(--muted)]">وصول أسرع بدون متصفح</p>
        )}
      </div>

      {/* iOS has no programmatic install, so there is deliberately no
          "install" button there — only the dismiss control. */}
      {!ios ? (
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-transform active:scale-95"
        >
          تثبيت
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="إغلاق"
        className="shrink-0 rounded-xl p-1.5 text-[var(--muted-2)] transition-transform hover:text-[var(--muted)] active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

/** Apple's Share glyph, inlined so the instruction is unmistakable. */
function ShareGlyph() {
  return (
    <svg
      className="inline-block h-4 w-4 shrink-0 align-text-bottom text-[var(--accent)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="زر المشاركة"
    >
      <path d="M12 16V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
