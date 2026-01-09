import { registerSW } from "virtual:pwa-register";
import toast from "react-hot-toast";

/**
 * Vite PWA auto-update hook.
 * In Android WebView (Capacitor) the SW may be less relevant, but it's great for PWA installs.
 */
registerSW({
  immediate: true,
  onOfflineReady() {
    // لا نعرض تنبيهًا هنا للحفاظ على واجهة نظيفة.
  },
  onNeedRefresh() {
    toast(
      "يتوفر تحديث جديد للتطبيق. أعد فتح التطبيق أو حدّث الصفحة للحصول على آخر نسخة.",
      { duration: 8000 }
    );
  }
});
