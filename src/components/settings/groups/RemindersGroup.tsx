import * as React from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Bell, BellOff, BookOpen, Music2, Sparkles, Sun, Moon, BookMarked, RefreshCw } from "lucide-react";
import { useNoorStore, type Reminders } from "@/store/noorStore";
import { cancelAllReminders, REMINDER_SOUND_OPTIONS, syncReminders } from "@/lib/reminders";
import { openNotificationSettings } from "@/lib/systemSettings";
import { arNum } from "@/lib/formatNumber";
import { Input } from "@/components/ui/Input";
import { SettingsRow, SettingsSection, SoundChoices, ToggleRow } from "@/components/settings/SettingsUI";
import { ensureNotificationsAllowed, usePlatform, useNotificationPermission, useSoundPreview } from "@/components/settings/settingsHooks";

type TimedReminder = {
  id: string;
  title: string;
  hint: string;
  icon: React.ReactNode;
  enabled: keyof Reminders;
  time: keyof Reminders;
};

const TIMED: TimedReminder[] = [
  { id: "morning", title: "أذكار الصباح", hint: "تذكير يومي في الوقت الذي تختاره", icon: <Sun size={17} />, enabled: "morningEnabled", time: "morningTime" },
  { id: "evening", title: "أذكار المساء", hint: "تذكير يومي في الوقت الذي تختاره", icon: <Moon size={17} />, enabled: "eveningEnabled", time: "eveningTime" },
  { id: "wird", title: "الورد اليومي", hint: "تذكير بقراءة وردك من القرآن", icon: <BookOpen size={17} />, enabled: "dailyWirdEnabled", time: "dailyWirdTime" },
  { id: "khatma", title: "خطة الختمة", hint: "تذكير بنصيب اليوم من ختمتك", icon: <BookMarked size={17} />, enabled: "khatmaEnabled", time: "khatmaTime" },
  { id: "tasbeeh-reminder", title: "تسبيح واستغفار", hint: "تذكير لطيف بالذكر خلال يومك", icon: <Sparkles size={17} />, enabled: "tasbeehEnabled", time: "tasbeehTime" },
];

/** «تذكير واحد»، «تذكيران»، «٣ تذكيرات»، «١٢ تذكيرًا». */
function remindersCount(n: number): string {
  if (n === 1) return "تذكير واحد";
  if (n === 2) return "تذكيران";
  if (n >= 3 && n <= 10) return `${arNum(n)} تذكيرات`;
  return `${arNum(n)} تذكيرًا`;
}

export function RemindersGroup() {
  const reminders = useNoorStore((s) => s.reminders);
  const setReminders = useNoorStore((s) => s.setReminders);
  const customReminders = useNoorStore((s) => s.customReminders) ?? [];
  const platform = usePlatform();
  const native = platform !== "web";
  const [permission, refreshPermission] = useNotificationPermission();
  const sound = useSoundPreview();
  const on = reminders.enabled;

  const setDaily = async (next: boolean) => {
    if (next && !(await ensureNotificationsAllowed())) {
      void refreshPermission();
      return;
    }
    setReminders({ enabled: next });
    void refreshPermission();
    if (!native) return;
    if (!next && !reminders.prayerAlertsEnabled) {
      await cancelAllReminders();
    }
    toast.success(next ? "تم تفعيل التذكيرات اليومية" : "تم إيقاف التذكيرات اليومية");
  };

  const activeCount = TIMED.filter((item) => reminders[item.enabled] === true).length + (reminders.dailyHadithNotif ? 1 : 0);

  return (
    <>
      {native ? (
        <SettingsSection
          title="الإشعارات"
          footer={permission === "denied" ? "رُفض إذن الإشعارات من قبل، ولا يمكن طلبه من جديد إلا من إعدادات الهاتف." : undefined}
        >
          <SettingsRow
            id="notifications-permission"
            icon={permission === "granted" ? <Bell size={17} /> : <BellOff size={17} />}
            title="إذن الإشعارات"
            hint={permission === "granted" ? "مسموح لأثر بإرسال الإشعارات" : permission === "denied" ? "غير مسموح — لن تصلك التنبيهات" : "لم يُطلب بعد"}
            control={permission === "granted" ? undefined : (
              <button
                type="button"
                className="settings-choice-preview"
                onClick={async () => {
                  if (permission === "denied") {
                    if (!(await openNotificationSettings())) toast.error("افتح إعدادات الهاتف ثم أثر › الإشعارات");
                  } else {
                    await ensureNotificationsAllowed();
                    void refreshPermission();
                  }
                }}
              >
                {permission === "denied" ? "افتح إعدادات الهاتف" : "السماح"}
              </button>
            )}
          />
        </SettingsSection>
      ) : (
        <SettingsSection>
          <SettingsRow
            title="التنبيهات على الويب"
            hint="تصل التذكيرات بثبات من تطبيق الهاتف. في المتصفح قد يفوتك التنبيه إذا أُغلقت الصفحة."
          />
        </SettingsSection>
      )}

      <SettingsSection
        title="التذكيرات اليومية"
        footer="تنبيهات الأذان مستقلة عن هذه التذكيرات، وتجدها في «الصلاة»."
      >
        <ToggleRow
          id="daily-reminders"
          title="التذكيرات اليومية"
          hint={on ? `${arNum(activeCount)} مفعّلة` : "الأذكار والورد والختمة متوقفة"}
          checked={on}
          onChange={(next) => void setDaily(next)}
        />
        {TIMED.map((item) => {
          const enabled = reminders[item.enabled] === true;
          return (
            <ToggleRow
              key={item.id}
              id={item.id}
              icon={item.icon}
              title={item.title}
              hint={item.hint}
              checked={enabled}
              disabled={!on}
              onChange={(next) => setReminders({ [item.enabled]: next } as Partial<Reminders>)}
            >
              {enabled && on ? (
                <Input
                  type="time"
                  dir="ltr"
                  aria-label={`وقت تذكير ${item.title}`}
                  value={String(reminders[item.time] ?? "")}
                  onChange={(e) => setReminders({ [item.time]: e.target.value } as Partial<Reminders>)}
                />
              ) : null}
            </ToggleRow>
          );
        })}
        <ToggleRow
          id="hadith"
          title="حديث الفجر اليومي"
          hint="حديث نبوي عند أذان الفجر كل يوم"
          checked={reminders.dailyHadithNotif ?? false}
          disabled={!on}
          onChange={(next) => setReminders({ dailyHadithNotif: next })}
        />
      </SettingsSection>

      <SettingsSection title="صوت التذكير">
        <SettingsRow id="reminder-sound" icon={<Music2 size={17} />} title="النغمة" hint="تُسمع مع تذكيرات الأذكار والورد">
          <SoundChoices
            label="صوت التذكير"
            options={REMINDER_SOUND_OPTIONS}
            value={reminders.soundProfile}
            onChange={(id) => setReminders({ soundProfile: id })}
            playing={sound.playing}
            previewKey={(id) => `reminder:${id}`}
            onPreview={(id) => void sound.previewReminder(id)}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="تذكيراتي">
        <SettingsRow
          id="custom-reminders"
          icon={<Sparkles size={17} />}
          title="تذكيراتي المخصّصة"
          hint={customReminders.length
            ? `${remindersCount(customReminders.length)} — أنشئها بنفسك أو اطلبها من أثر`
            : "أنشئ تذكيرًا بنفسك، أو قل لأثر: «ذكّرني بأذكار الصباح كل يوم»"}
          control={<Link to="/reminders" className="settings-choice-preview inline-flex items-center">فتح</Link>}
        />
        {native && (on || reminders.prayerAlertsEnabled) ? (
          <SettingsRow
            title="إعادة جدولة التنبيهات"
            hint="إن تأخّر تنبيه أو لم يصل، أعد ترتيبها على الهاتف"
            control={
              <button
                type="button"
                className="settings-choice-preview inline-flex items-center gap-1.5"
                onClick={async () => {
                  try {
                    await syncReminders(reminders);
                    toast.success("أُعيدت جدولة التنبيهات");
                  } catch {
                    toast.error("تعذّرت إعادة الجدولة");
                  }
                }}
              >
                <RefreshCw size={13} aria-hidden="true" />
                إعادة
              </button>
            }
          />
        ) : null}
      </SettingsSection>
    </>
  );
}
