import { registerSW } from "virtual:pwa-register";
import toast from "react-hot-toast";

const isLocalHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

if (isLocalHost && "serviceWorker" in navigator) {
  void (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {
      // ignore local cleanup failures
    }
  })();
}

/**
 * Vite PWA auto-update hook.
 * In Android WebView (Capacitor) the SW may be less relevant, but it's great for PWA installs.
 */
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

if (!isLocalHost) {
  updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      // لا نعرض تنبيهًا هنا للحفاظ على واجهة نظيفة.
    },
    onNeedRefresh() {
      toast("يتم تطبيق تحديث جديد تلقائيًا…", { duration: 2500 });
      try {
        void updateSW?.(true);
      } catch {
        window.location.reload();
      }
    }
  });

  if (typeof window !== "undefined") {
    const periodicUpdateMs = 5 * 60 * 1000;
    window.setInterval(() => {
      try {
        void updateSW?.(false);
      } catch {
        // ignore transient update check errors
      }
    }, periodicUpdateMs);
  }
}
