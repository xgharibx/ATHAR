import * as React from "react";
import toast from "react-hot-toast";
import { Clock, MapPin, CalendarDays, BellRing, Volume2, Timer, Plane } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { PRAYER_SOUND_OPTIONS } from "@/lib/reminders";
import { PRAYER_CALC_METHODS } from "@/lib/prayerCalcMethods";
import { ADJUSTABLE_PRAYERS, clampAdjust, PRAYER_ADJUST_LIMIT } from "@/lib/prayerAdjust";
import { forHijri } from "@/lib/hijri";
import { requestPrayerLocation } from "@/hooks/usePrayerTimes";
import { clearCachedPrayerCoordinates, readCachedPrayerCoordinates, PRAYER_LOCATION_CHANGED_EVENT } from "@/lib/prayerLocation";
import { arNum } from "@/lib/formatNumber";
import { Select } from "@/components/ui/Pickers";
import { AdhanAlarmCard } from "@/components/settings/AdhanAlarmCard";
import { PrayerSilenceCard } from "@/components/settings/PrayerSilenceCard";
import { Segmented, SettingsRow, SettingsSection, SoundChoices, Stepper, ToggleRow } from "@/components/settings/SettingsUI";
import { ensureNotificationsAllowed, usePlatform, useSoundPreview } from "@/components/settings/settingsHooks";

const PRAYER_NAMES: Record<(typeof ADJUSTABLE_PRAYERS)[number], string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

function minutesLabel(minutes: number): string {
  if (minutes === 0) return "بلا تعديل";
  return `${minutes > 0 ? "+" : "−"}${arNum(Math.abs(minutes))} د`;
}

function daysLabel(days: number): string {
  if (days === 0) return "بلا تعديل";
  const n = Math.abs(days);
  return `${days > 0 ? "+" : "−"}${n === 1 ? "يوم" : n === 2 ? "يومان" : `${arNum(n)} أيام`}`;
}

function hijriToday(): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-arab", { day: "numeric", month: "long", year: "numeric" })
      .format(forHijri(new Date()));
  } catch {
    return "";
  }
}

function useSavedLocation() {
  const [coords, setCoords] = React.useState(readCachedPrayerCoordinates);
  React.useEffect(() => {
    const refresh = () => setCoords(readCachedPrayerCoordinates());
    window.addEventListener(PRAYER_LOCATION_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PRAYER_LOCATION_CHANGED_EVENT, refresh);
  }, []);
  return [coords, setCoords] as const;
}

export function PrayerGroup() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const reminders = useNoorStore((s) => s.reminders);
  const setReminders = useNoorStore((s) => s.setReminders);
  const platform = usePlatform();
  const native = platform !== "web";
  const sound = useSoundPreview();
  const [coords, setCoords] = useSavedLocation();
  const [locating, setLocating] = React.useState(false);
  const adjust = prefs.prayerTimeAdjust ?? {};
  const hijriOffset = prefs.hijriOffsetDays ?? 0;
  // Re-render the Hijri preview after the offset helper has caught up.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setTick((n) => n + 1), 30);
    return () => window.clearTimeout(timer);
  }, [hijriOffset]);

  const locateMe = async () => {
    setLocating(true);
    try {
      if (await requestPrayerLocation()) {
        setCoords(readCachedPrayerCoordinates());
        window.dispatchEvent(new Event(PRAYER_LOCATION_CHANGED_EVENT));
        toast.success("ستُحسب المواقيت لموقعك الحالي");
      } else {
        toast.error("تعذّر تحديد موقعك. اسمح لأثر بالوصول إلى الموقع ثم أعد المحاولة");
      }
    } finally {
      setLocating(false);
    }
  };

  const setPrayerAlerts = async (on: boolean) => {
    if (on && !(await ensureNotificationsAllowed())) return;
    setReminders({ prayerAlertsEnabled: on });
  };

  return (
    <>
      <SettingsSection title="المواقيت">
        <SettingsRow id="calc-method" icon={<Clock size={17} />} title="طريقة الحساب" hint="اختر الجهة المعتمدة في بلدك">
          <Select
            value={prefs.prayerCalcMethod ?? 5}
            onChange={(e) => setPrefs({ prayerCalcMethod: Number(e.target.value) })}
            aria-label="طريقة الحساب"
            className="w-full rounded-xl border border-(--stroke) bg-(--card) px-3 py-2.5 text-sm"
          >
            {PRAYER_CALC_METHODS.map((method) => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow id="asr" title="وقت العصر" hint="يتأخر العصر في المذهب الحنفي">
          <Segmented
            label="وقت العصر"
            value={prefs.asrMadhab ?? 0}
            onChange={(value) => setPrefs({ asrMadhab: value })}
            options={[{ value: 0, label: "الجمهور" }, { value: 1, label: "الحنفي" }] as const}
          />
        </SettingsRow>
        <SettingsRow
          id="location"
          icon={<MapPin size={17} />}
          title="الموقع"
          hint={coords ? "تُحسب المواقيت لموقعك المحفوظ" : "تُحسب المواقيت للقاهرة حتى تختار موقعك"}
        >
          <div className="flex flex-wrap gap-2">
            <button type="button" className="settings-choice-preview" onClick={() => void locateMe()} disabled={locating}>
              {locating ? "جارٍ تحديد موقعك…" : coords ? "تحديث موقعي" : "استخدم موقعي الحالي"}
            </button>
            {coords ? (
              <button
                type="button"
                className="settings-choice-preview"
                onClick={() => {
                  if (clearCachedPrayerCoordinates()) {
                    setCoords(null);
                    toast.success("عادت المواقيت إلى القاهرة");
                  }
                }}
              >
                نسيان موقعي
              </button>
            ) : null}
          </div>
        </SettingsRow>
        {native ? (
          <ToggleRow
            id="travel"
            icon={<Plane size={17} />}
            title="تحديث الموقع عند السفر"
            hint="عند فتح أثر في مدينة جديدة تتحدّث المواقيت والتنبيهات، دون تتبّع في الخلفية"
            checked={prefs.prayerLocationFollow !== false}
            onChange={(v) => setPrefs({ prayerLocationFollow: v })}
            disabled={!coords}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="ضبط دقيق"
        footer="إن اختلفت المواقيت قليلًا عن مسجدك، قدّم الصلاة أو أخّرها بالدقائق. يُطبَّق التعديل على المواقيت والتنبيهات والأدوات."
      >
        <SettingsRow id="adjust" title="تعديل المواقيت بالدقائق">
          <div className="flex flex-col gap-2">
            {ADJUSTABLE_PRAYERS.map((prayer) => (
              <div key={prayer} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{PRAYER_NAMES[prayer]}</span>
                <Stepper
                  label={`تعديل ${PRAYER_NAMES[prayer]}`}
                  value={clampAdjust(adjust[prayer])}
                  min={-PRAYER_ADJUST_LIMIT}
                  max={PRAYER_ADJUST_LIMIT}
                  format={minutesLabel}
                  onChange={(minutes) => setPrefs({ prayerTimeAdjust: { ...adjust, [prayer]: minutes } })}
                />
              </div>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow id="hijri" icon={<CalendarDays size={17} />} title="تعديل التاريخ الهجري" hint={`اليوم: ${hijriToday()}`}
          control={
            <Stepper
              label="التاريخ الهجري"
              value={hijriOffset}
              min={-2}
              max={2}
              format={daysLabel}
              onChange={(days) => setPrefs({ hijriOffsetDays: days })}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="الأذان والتنبيهات">
        <ToggleRow
          id="prayer-alerts"
          icon={<BellRing size={17} />}
          title="تنبيهات الصلوات"
          hint={native ? "إشعار بالأذان عند دخول وقت كل صلاة" : "يصدر الأذان من تطبيق الهاتف؛ هنا تُحفظ تفضيلاتك فقط"}
          checked={reminders.prayerAlertsEnabled}
          onChange={(on) => void setPrayerAlerts(on)}
        >
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="الصلوات التي يُؤذَّن لها">
            {ADJUSTABLE_PRAYERS.map((prayer) => {
              const on = reminders.prayerAlerts?.[prayer] ?? true;
              return (
                <button
                  key={prayer}
                  type="button"
                  aria-pressed={on}
                  disabled={!reminders.prayerAlertsEnabled}
                  onClick={() => setReminders({ prayerAlerts: { ...reminders.prayerAlerts, [prayer]: !on } })}
                  className={`min-h-10 rounded-xl border text-xs font-semibold transition ${on ? "border-accent-35 bg-accent-15 text-(--fg)" : "border-(--stroke) text-(--muted)"}`}
                >
                  {PRAYER_NAMES[prayer]}
                </button>
              );
            })}
          </div>
        </ToggleRow>
        <SettingsRow id="adhan-sound" icon={<Volume2 size={17} />} title="صوت الأذان" disabled={!reminders.prayerAlertsEnabled}>
          <SoundChoices
            label="صوت الأذان"
            options={PRAYER_SOUND_OPTIONS}
            value={reminders.prayerSoundProfile}
            onChange={(id) => setReminders({ prayerSoundProfile: id })}
            playing={sound.playing}
            previewKey={(id) => `prayer:${id}`}
            onPreview={(id) => void sound.previewPrayer(id)}
            disabled={!reminders.prayerAlertsEnabled}
          />
        </SettingsRow>
        {native ? (
          <div id="setting-adhan-alarm" className="settings-row">
            <div className="settings-row-body pt-3">
              <AdhanAlarmCard reminders={reminders} setReminders={setReminders} platform={platform} />
            </div>
          </div>
        ) : null}
        {native ? (
          <div id="setting-prayer-silence" className="settings-row">
            <div className="settings-row-body pt-3">
              <PrayerSilenceCard reminders={reminders} setReminders={setReminders} platform={platform} />
            </div>
          </div>
        ) : null}
      </SettingsSection>

      {native ? (
        <SettingsSection title="على شاشة القفل">
          <ToggleRow
            id="countdown"
            icon={<Timer size={17} />}
            title="عدّاد الصلاة القادمة"
            hint={platform === "ios"
              ? "عدّ تنازلي على شاشة القفل وفي الجزيرة التفاعلية"
              : "عدّ تنازلي في شريط الإشعارات وعلى شاشة القفل"}
            checked={reminders.prayerLiveActivity ?? false}
            onChange={(on) => {
              setReminders({ prayerLiveActivity: on });
              if (!on) return;
              void import("@/lib/prayerLiveActivity").then(async ({ prayerCountdownAllowed }) => {
                if (!(await prayerCountdownAllowed())) {
                  toast.error(platform === "ios"
                    ? "فعّل «الأنشطة المباشرة» لأثر من إعدادات الهاتف"
                    : "اسمح لأثر بالإشعارات من إعدادات الهاتف");
                }
              });
            }}
          />
          {reminders.prayerLiveActivity ? (
            <ToggleRow
              title="في رمضان: الإفطار والسحور"
              hint="يعدّ تنازليًا للإفطار ولانتهاء السحور بدل كل صلاة"
              checked={reminders.ramadanCountdown !== false}
              onChange={(on) => setReminders({ ramadanCountdown: on })}
            />
          ) : null}
        </SettingsSection>
      ) : null}
    </>
  );
}
