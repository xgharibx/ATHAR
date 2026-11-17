import * as React from "react";
import { BellRing, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { accountScopedLocalStorage } from "@/lib/accountStorageScope";
import { prayerCountdownAllowed, prayerCountdownPlatform } from "@/lib/prayerLiveActivity";
import { useNoorStore } from "@/store/noorStore";

const DISMISSED_KEY = "athar_countdown_suggestion_dismissed_v1";

function readDismissed(): boolean {
  try {
    return accountScopedLocalStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A one-time suggestion on Prayer Times to turn on the next-prayer countdown
 * (the Lock Screen and Dynamic Island on iPhone, the notification shade on
 * Android). It is off by default, as Apple asks of Live Activities, and the
 * switch in Settings alone was easy to miss.
 */
export function CountdownSuggestion() {
  const enabled = useNoorStore((s) => s.reminders.prayerLiveActivity ?? false);
  const setReminders = useNoorStore((s) => s.setReminders);
  const [dismissed, setDismissed] = React.useState(readDismissed);
  const platform = prayerCountdownPlatform();

  if (!platform || enabled || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      accountScopedLocalStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Shown again next time; harmless.
    }
  };

  const turnOn = async () => {
    setReminders({ prayerLiveActivity: true });
    if (!(await prayerCountdownAllowed())) {
      toast.error(platform === "ios"
        ? "فعّل «الأنشطة المباشرة» لتطبيق أثر من إعدادات الجهاز"
        : "اسمح لتطبيق أثر بإرسال الإشعارات من إعدادات الجهاز");
      return;
    }
    toast.success("سيظهر العدّ التنازلي للصلاة القادمة");
  };

  return (
    <div
      className="flex items-start gap-3 rounded-3xl border border-(--stroke) bg-(--card) p-4"
      role="region"
      aria-label="اقتراح: عدّاد الصلاة القادمة"
    >
      <BellRing size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-(--accent)" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">عدّاد الصلاة القادمة</div>
        <div className="mt-1 text-xs opacity-70 leading-relaxed">
          {platform === "ios"
            ? "اعرض عدًّا تنازليًا للصلاة القادمة على شاشة القفل وفي الجزيرة التفاعلية، دون فتح التطبيق."
            : "اعرض عدًّا تنازليًا للصلاة القادمة في شريط الإشعارات وعلى شاشة القفل، دون فتح التطبيق."}
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => void turnOn()}>تفعيل</Button>
          <Button size="sm" variant="outline" onClick={dismiss}>لا، شكرًا</Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="إخفاء الاقتراح"
        className="shrink-0 rounded-full p-1 opacity-60 hover:opacity-100"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
