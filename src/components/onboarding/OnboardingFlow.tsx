import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useNoorStore } from "@/store/noorStore";
import { isNativePlatform, requestNotificationPermission } from "@/lib/reminders";

type ReminderPermission = "granted" | "denied" | "prompt";

async function requestReminderPermission(): Promise<ReminderPermission> {
  try {
    if (await isNativePlatform()) {
      const permission = await requestNotificationPermission();
      return permission === "granted" ? "granted" : permission === "denied" ? "denied" : "prompt";
    }
  } catch {
    // Fall through to the browser notification API when available.
  }

  if (!("Notification" in globalThis)) return "prompt";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const permission = await Notification.requestPermission().catch(() => "denied" as NotificationPermission);
  return permission === "granted" ? "granted" : permission === "denied" ? "denied" : "prompt";
}

const STEPS = [
  {
    emoji: "✨",
    title: "أهلاً بك في أثر",
    description: "تطبيقك اليومي للأذكار والقرآن الكريم. ابدأ رحلتك الروحية الآن.",
    action: "التالي",
  },
  {
    emoji: "🕌",
    title: "مواقيت الصلاة",
    description: "للحصول على مواقيت الصلاة الدقيقة في مدينتك، يحتاج التطبيق إلى الوصول لموقعك.",
    action: "السماح",
    onAction: async () => {
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { timeout: 8000 }
          );
        });
      }
    },
  },
  {
    emoji: "🔔",
    title: "التنبيهات",
    description: "هل تريد تذكيراً بالأذكار ومواقيت الصلاة؟ يمكنك تغيير هذا لاحقاً من الإعدادات.",
    action: "السماح",
    onAction: async () => {
      await requestReminderPermission();
    },
  },
  {
    emoji: "🌅",
    title: "تذكير بأوقات الصلاة",
    description: "تفعيل تنبيهات الأذان لجميع الصلوات الخمس؟ يمكنك ضبط كل صلاة بشكل مستقل لاحقاً.",
    action: "تفعيل التنبيهات",
    prayerReminders: true, // handled in component
  },
] as const;

export function OnboardingFlow() {
  const setOnboardingDone = useNoorStore((s) => s.setOnboardingDone);
  const setReminders = useNoorStore((s) => s.setReminders);
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const current = STEPS[step];
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleAction = async () => {
    setLoading(true);
    let remindersAllowed = true;
    try {
      if ("onAction" in current && current.onAction) {
        await current.onAction();
      }
      if (!mountedRef.current) return;
      if ("prayerReminders" in current && current.prayerReminders) {
        remindersAllowed = (await requestReminderPermission()) === "granted";
        if (!mountedRef.current) return;
        if (!remindersAllowed) {
          setReminders({ enabled: false, prayerAlertsEnabled: false });
          toast.error("لم يتم السماح بالإشعارات");
          return;
        }
        setReminders({
          enabled: true,
          prayerAlertsEnabled: true,
          prayerAlerts: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
        });
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    if (!mountedRef.current) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setOnboardingDone(true);
    }
  };

  const handleSkip = () => {
    setOnboardingDone(true);
  };

  const handleLater = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setOnboardingDone(true);
    }
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" onClick={(e) => e.stopPropagation()} dir="rtl">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="onboarding-card"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="text-5xl mb-5 text-center" aria-hidden="true">{current.emoji}</div>
          <h2 className="text-xl font-bold text-center mb-3 arabic-text" id="onboarding-title">{current.title}</h2>
          <p className="text-sm opacity-70 text-center leading-relaxed mb-8 arabic-text">{current.description}</p>

          {/* Step dots */}
          <div className="onboarding-step-dots" role="tablist" aria-orientation="horizontal" aria-label="خطوات التهيئة">
            {STEPS.map((_, i) => (
              <span key={i} className={`onboarding-dot${i === step ? " active" : ""}`} role="tab" aria-selected={i === step} aria-label={`خطوة ${i + 1} من ${STEPS.length}`} />
            ))}
          </div>

          <button type="button"
            autoFocus
            className="w-full mt-5 py-3.5 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold text-sm arabic-text disabled:opacity-60 transition"
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? "جارٍ…" : current.action}
          </button>

          {step < STEPS.length - 1 && !("prayerReminders" in current && current.prayerReminders) && (
            <button type="button"
              className="w-full mt-2 py-2.5 text-sm opacity-45 hover:opacity-70 transition arabic-text"
              onClick={handleSkip}
            >
              تخطي
            </button>
          )}
          {"prayerReminders" in current && current.prayerReminders && (
            <button type="button"
              className="w-full mt-2 py-2.5 text-sm opacity-45 hover:opacity-70 transition arabic-text"
              onClick={handleLater}
            >
              لاحقاً
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
