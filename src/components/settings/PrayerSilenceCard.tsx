/**
 * Settings › تنبيهات الصلوات › صامت أثناء الصلاة (src/lib/prayerSilence.ts).
 * Android switches Do Not Disturb on for a few minutes from each Adhan;
 * iPhone has no such permission for apps, so it shows how to set up a Focus.
 */
import * as React from "react";
import toast from "react-hot-toast";
import { BellOff } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { arNum } from "@/lib/formatNumber";
import {
  prayerSilenceAllowed,
  prayerSilencePreferences,
  requestPrayerSilenceAccess,
  SILENCE_MINUTES,
} from "@/lib/prayerSilence";
import type { Reminders } from "@/store/noorStore";

export function PrayerSilenceCard({
  reminders,
  setReminders,
  platform,
}: {
  reminders: Reminders;
  setReminders: (patch: Partial<Reminders>) => void;
  platform: "ios" | "android";
}) {
  const preferences = prayerSilencePreferences(reminders);
  const disabled = !reminders.prayerAlertsEnabled;
  const [waitingForAccess, setWaitingForAccess] = React.useState(false);

  // Back from Android's Do Not Disturb access screen: finish turning it on.
  React.useEffect(() => {
    if (!waitingForAccess) return;
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      if (await prayerSilenceAllowed()) {
        setWaitingForAccess(false);
        setReminders({ prayerSilence: { ...preferences, enabled: true } });
        toast.success("سيصمت الهاتف أثناء الصلاة");
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [waitingForAccess, preferences, setReminders]);

  if (platform === "ios") {
    return (
      <details className="mt-4 rounded-2xl border border-(--stroke) bg-(--card) p-3 text-xs leading-6">
        <summary className="cursor-pointer text-sm font-semibold">صامت أثناء الصلاة</summary>
        <p className="mt-2 opacity-75">
          لا تسمح Apple للتطبيقات بإسكات الهاتف، والأقرب وضع «تركيز» تفعّله بنفسك:
        </p>
        <ol className="mt-1 list-decimal pr-5 opacity-75">
          <li>الإعدادات › التركيز › ＋ › مخصص، وسمِّه «الصلاة».</li>
          <li>أضِف جدولًا بوقت كل صلاة، أو فعّله من مركز التحكم عند دخول المسجد.</li>
          <li>اسمح بأثر ضمن التطبيقات المسموحة ليصلك الأذان.</li>
        </ol>
      </details>
    );
  }

  const turnOn = async (on: boolean) => {
    if (!on) {
      setReminders({ prayerSilence: { ...preferences, enabled: false } });
      return;
    }
    if (await prayerSilenceAllowed()) {
      setReminders({ prayerSilence: { ...preferences, enabled: true } });
      toast.success("سيصمت الهاتف أثناء الصلاة");
      return;
    }
    toast("اسمح لأثر بالوصول إلى «عدم الإزعاج» ثم عُد", { icon: "🔕" });
    setWaitingForAccess(true);
    await requestPrayerSilenceAccess();
  };

  return (
    <div className="mt-4 rounded-2xl border border-(--stroke) bg-(--card) p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <BellOff size={16} className="mt-0.5 text-(--accent)" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold">صامت أثناء الصلاة</div>
            <p className="mt-0.5 text-[11px] leading-5 opacity-65">
              يفعّل «عدم الإزعاج» من الأذان لدقائق ثم يعيد الهاتف كما كان. المنبّهات تبقى مسموعة.
            </p>
          </div>
        </div>
        <Switch
          aria-label="صامت أثناء الصلاة"
          checked={preferences.enabled}
          onCheckedChange={(on) => void turnOn(on)}
          disabled={disabled}
        />
      </div>
      {preferences.enabled ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="مدة الصمت">
          <span className="text-[11px] opacity-65">المدة:</span>
          {SILENCE_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              aria-pressed={preferences.minutes === minutes}
              disabled={disabled}
              onClick={() => setReminders({ prayerSilence: { ...preferences, minutes } })}
              className={[
                "rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                preferences.minutes === minutes ? "border-accent-35 bg-accent-15 text-(--accent)" : "border-(--stroke) bg-(--card-2) opacity-75",
              ].join(" ")}
            >
              {arNum(minutes)} دقيقة
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
