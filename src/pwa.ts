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
const UPDATE_APPLY_GUARD_KEY = "noor_pwa_update_apply_once";

if (!isLocalHost) {
  const applyUpdateSafely = () => {
    try {
      if (sessionStorage.getItem(UPDATE_APPLY_GUARD_KEY) === "1") return;
      sessionStorage.setItem(UPDATE_APPLY_GUARD_KEY, "1");
    } catch {
      // ignore session storage errors
    }

    try {
      void updateSW?.(true);
    } catch {
      window.location.reload();
    }
  };

  const checkForUpdate = () => {
    try {
      void updateSW?.(false);
    } catch {
      // ignore transient update check errors
    }
  };

  updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      // لا نعرض تنبيهًا هنا للحفاظ على واجهة نظيفة.
    },
    onNeedRefresh() {
      toast("يتم تطبيق تحديث جديد تلقائيًا…", { duration: 2500 });
      applyUpdateSafely();
    },
    onRegisteredSW() {
      try {
        sessionStorage.removeItem(UPDATE_APPLY_GUARD_KEY);
      } catch {
        // ignore session storage errors
      }
    }
  });

  if (typeof window !== "undefined") {
    const periodicUpdateMs = 5 * 60 * 1000;
    window.setInterval(checkForUpdate, periodicUpdateMs);

    window.addEventListener("online", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  }
}
