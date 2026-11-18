/**
 * Settings › تنبيهات الصلوات › الأذان كمنبّه: the Adhan as a real alarm that
 * rings on silent (src/lib/adhanAlarm.ts). Shown in the iPhone and Android
 * apps only.
 */
import * as React from "react";
import toast from "react-hot-toast";
import { AlarmClock } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import {
  adhanAlarmPreferences,
  adhanAlarmStatus,
  requestAdhanAlarmPermission,
  testAdhanAlarm,
  type AdhanAlarmStatus,
} from "@/lib/adhanAlarm";
import type { PrayerAlertPrayer, Reminders } from "@/store/noorStore";

const PRAYERS: Array<{ id: PrayerAlertPrayer; label: string }> = [
  { id: "Fajr", label: "الفجر" },
  { id: "Dhuhr", label: "الظهر" },
  { id: "Asr", label: "العصر" },
  { id: "Maghrib", label: "المغرب" },
  { id: "Isha", label: "العشاء" },
];

export function AdhanAlarmCard({
  reminders,
  setReminders,
  platform,
}: {
  reminders: Reminders;
  setReminders: (patch: Partial<Reminders>) => void;
  platform: "ios" | "android";
}) {
  const preferences = adhanAlarmPreferences(reminders);
  const [status, setStatus] = React.useState<AdhanAlarmStatus | null>(null);

  React.useEffect(() => {
    let alive = true;
    void adhanAlarmStatus().then((next) => { if (alive) setStatus(next); });
    return () => { alive = false; };
  }, []);

  const disabled = !reminders.prayerAlertsEnabled;

  const turnOn = async (on: boolean) => {
    if (!on) {
      setReminders({ adhanAlarm: { ...preferences, enabled: false } });
      return;
    }
    let current = status ?? (await adhanAlarmStatus());
    if (current.available && !current.authorized) current = await requestAdhanAlarmPermission();
    setStatus(current);
    if (!current.available) {
      toast.error(platform === "ios" ? "منبّه الأذان يحتاج iOS 26 أو أحدث" : "تعذّر تفعيل منبّه الأذان على هذا الجهاز");
      return;
    }
    if (!current.authorized) {
      toast.error(platform === "ios"
        ? "اسمح لأثر بالمنبّهات من الإعدادات › أثر"
        : "فعّل «المنبّهات والتذكيرات» لأثر ثم عُد");
      return;
    }
    setReminders({ adhanAlarm: { ...preferences, enabled: true } });
    toast.success("سيرنّ الأذان كمنبّه حتى في الوضع الصامت");
  };

  if (status && !status.available && platform === "ios") {
    return (
      <div className="mt-4 rounded-2xl border border-(--stroke) bg-(--card) p-3 text-xs leading-6 opacity-70">
        <span className="font-semibold">الأذان كمنبّه:</span> متاح على iOS 26 أو أحدث، ليرنّ الأذان حتى في الوضع الصامت.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-(--stroke) bg-(--card) p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlarmClock size={16} className="mt-0.5 text-(--accent)" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold">الأذان كمنبّه</div>
            <p className="mt-0.5 text-[11px] leading-5 opacity-65">
              يرنّ حتى في الوضع الصامت ويملأ الشاشة مع زر إيقاف — لئلا تفوتك صلاة الفجر.
            </p>
          </div>
        </div>
        <Switch
          aria-label="الأذان كمنبّه"
          checked={preferences.enabled}
          onCheckedChange={(on) => void turnOn(on)}
          disabled={disabled}
        />
      </div>

      {preferences.enabled ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="الصلوات التي يرنّ لها المنبّه">
            {PRAYERS.map((prayer) => {
              const active = preferences.prayers[prayer.id];
              return (
                <button
                  key={prayer.id}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => setReminders({
                    adhanAlarm: { ...preferences, prayers: { ...preferences.prayers, [prayer.id]: !active } },
                  })}
                  className={[
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                    active ? "border-accent-35 bg-accent-15 text-(--accent)" : "border-(--stroke) bg-(--card-2) opacity-75",
                  ].join(" ")}
                >
                  {prayer.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] leading-5 opacity-60">
              تنبيه هذه الصلوات يصدر بلا صوت، والمنبّه يتولّى الأذان.
              {platform === "android" && status && status.fullScreen === false
                ? " اسمح لأثر بإشعارات ملء الشاشة لتظهر شاشة الإيقاف فوق القفل."
                : ""}
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!(await testAdhanAlarm())) toast.error("تعذّر تشغيل التجربة");
              }}
              className="rounded-xl border border-(--stroke) bg-(--card-2) px-3 py-1.5 text-xs font-semibold"
            >
              جرّب المنبّه
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
