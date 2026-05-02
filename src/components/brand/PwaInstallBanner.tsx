/**
 * 11B: Arabic PWA "Add to Home Screen" install prompt banner.
 * Listens for the browser's `beforeinstallprompt` event and shows a styled
 * RTL banner. Dismissed state is persisted in localStorage so it never
 * re-appears after the user dismisses or installs.
 */
import { useState, useEffect } from "react";

const DISMISSED_KEY = "noor_pwa_install_dismissed";

// Extend Window for the non-standard beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
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
      className="fixed bottom-20 inset-x-3 z-50 flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(10,12,20,.96)] px-4 py-3 shadow-2xl backdrop-blur-xl"
      role="banner"
      aria-label="دعوة لتثبيت التطبيق"
    >
      {/* App icon */}
      <img
        src="/icons/icon-72x72.png"
        alt="أثر"
        className="h-10 w-10 shrink-0 rounded-xl"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug">
          ثبّت أثر على شاشتك الرئيسية
        </p>
        <p className="text-xs text-white/55 mt-0.5">
          وصول أسرع بدون متصفح
        </p>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white active:scale-95 transition-transform"
      >
        تثبيت
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="إغلاق"
        className="shrink-0 rounded-xl p-1.5 text-white/40 hover:text-white/70 active:scale-95 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
