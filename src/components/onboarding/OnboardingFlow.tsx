import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNoorStore } from "@/store/noorStore";

const STEPS = [
  {
    emoji: "✨",
    title: "أهلاً بك في نور",
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
    action: "ابدأ الآن",
    onAction: async () => {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission().catch(() => {});
      }
    },
  },
] as const;

export function OnboardingFlow() {
  const setOnboardingDone = useNoorStore((s) => s.setOnboardingDone);
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const current = STEPS[step];

  const handleAction = async () => {
    setLoading(true);
    try {
      if ("onAction" in current && current.onAction) {
        await current.onAction();
      }
    } finally {
      setLoading(false);
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setOnboardingDone(true);
    }
  };

  const handleSkip = () => {
    setOnboardingDone(true);
  };

  return (
    <div className="onboarding-overlay" onClick={(e) => e.stopPropagation()} dir="rtl">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="onboarding-card"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="text-5xl mb-5 text-center">{current.emoji}</div>
          <h2 className="text-xl font-bold text-center mb-3 arabic-text">{current.title}</h2>
          <p className="text-sm opacity-70 text-center leading-relaxed mb-8 arabic-text">{current.description}</p>

          {/* Step dots */}
          <div className="onboarding-step-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={`onboarding-dot${i === step ? " active" : ""}`} />
            ))}
          </div>

          <button
            className="w-full mt-5 py-3.5 rounded-2xl bg-[var(--accent)] text-white font-semibold text-sm arabic-text disabled:opacity-60 transition"
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? "جارٍ…" : current.action}
          </button>

          {step < STEPS.length - 1 && (
            <button
              className="w-full mt-2 py-2.5 text-sm opacity-45 hover:opacity-70 transition arabic-text"
              onClick={handleSkip}
            >
              تخطي
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
