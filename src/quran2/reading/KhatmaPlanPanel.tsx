/**
 * «خطة الختمة»: the khatma in days, its wird for today and a daily reminder.
 *
 * It is the app's own plan (khatmaStartISO, khatmaDays, khatmaDone): the
 * home screen, the widgets, the «القرآن» tab's dot and the plan's reminder
 * all read it, and the reading here ticks today's wird off (see bridge.ts).
 */
import * as React from "react";
import { toast } from "react-hot-toast";
import { Bell, Check } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";
import { getLocalDateKey } from "@/lib/dayBoundaries";
import { getKhatmaDayRange, getKhatmaPlanStatus, getKhatmaTimeline, countCompletedKhatmaDays } from "@/lib/quranKhatma";
import { TOTAL_QURAN_AYAHS } from "@/lib/quranMeta";
import { DEFAULT_KHATMA_REMINDER_TIME, findKhatmaReminder, newKhatmaReminder } from "@/lib/khatmaReminder";
import { requestCustomReminderPermission } from "@/lib/customReminderNotifications";
import { addCustomReminder, toggleCustomReminder, updateCustomReminder } from "@/store/customReminderActions";
import { arCount, arDigits } from "../data/arabic";

const PLAN_DAYS: Array<{ days: number; label: string; line: string }> = [
  { days: 7, label: "أسبوع", line: "أربعة أجزاء ونصف كل يوم" },
  { days: 15, label: "نصف شهر", line: "جزءان كل يوم" },
  { days: 30, label: "شهر", line: "جزء كل يوم" },
  { days: 60, label: "شهران", line: "نصف جزء كل يوم" },
  { days: 90, label: "ثلاثة أشهر", line: "ثلث جزء كل يوم" },
  { days: 180, label: "ستة أشهر", line: "سدس جزء كل يوم" },
  { days: 365, label: "سنة", line: "نحو سبع عشرة آية كل يوم" },
];

const WEEK = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

/** The plan's daily reminder, at the time you choose; skipped on days already read. */
function ReminderRow({ today }: { today: string }) {
  const reminder = useNoorStore((s) => findKhatmaReminder(s.customReminders));
  const startISO = useNoorStore((s) => s.khatmaStartISO);
  const days = useNoorStore((s) => s.khatmaDays);
  const version = useNoorStore((s) => s.khatmaScheduleVersion);
  const done = useNoorStore((s) => s.khatmaDone);
  const dailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const [busy, setBusy] = React.useState(false);
  const on = Boolean(reminder?.enabled);
  const time = reminder?.atTimeOfDay ?? DEFAULT_KHATMA_REMINDER_TIME;

  const turn = async () => {
    if (on) {
      if (reminder) toggleCustomReminder(reminder.id, false);
      return;
    }
    setBusy(true);
    try {
      if (!(await requestCustomReminderPermission())) {
        toast.error("اسمح لأثر بالإشعارات من إعدادات الهاتف ليصلك التذكير");
        return;
      }
      if (reminder) toggleCustomReminder(reminder.id, true);
      else {
        const fresh = newKhatmaReminder({ startISO, days, version, done, dailyAyahs }, today, time);
        if (fresh) addCustomReminder(fresh);
      }
      toast.success("سيصلك تذكير الورد كل يوم");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="q2-card" style={{ padding: "12px 14px", marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Bell size={18} aria-hidden="true" style={{ color: "var(--q2-gold)", flex: "none" }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", fontSize: 15 }}>تذكير يومي بالورد</b>
          <span className="q2-small">يصلك في وقته، ولا يصلك يومَ تُتمّ وردك</span>
        </span>
        <button type="button" role="switch" aria-checked={on} disabled={busy} className={`q2-switch${on ? " is-on" : ""}`} onClick={() => void turn()} aria-label="تذكير يومي بالورد">
          <span />
        </button>
      </div>
      {on && reminder ? (
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
          <span className="q2-small">وقت التذكير</span>
          <input className="q2-input" style={{ width: 130 }} type="time" value={time} onChange={(e) => updateCustomReminder(reminder.id, { atTimeOfDay: e.target.value })} />
        </label>
      ) : null}
    </div>
  );
}

export function KhatmaPlanPanel({ onChoose }: { onChoose?: (days: number | null) => void }) {
  const today = useTodayKey();
  const startISO = useNoorStore((s) => s.khatmaStartISO);
  const days = useNoorStore((s) => s.khatmaDays);
  const version = useNoorStore((s) => s.khatmaScheduleVersion);
  const done = useNoorStore((s) => s.khatmaDone);
  const dailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const setPlan = useNoorStore((s) => s.setKhatmaPlan);
  const resetPlan = useNoorStore((s) => s.resetKhatma);
  const setDone = useNoorStore((s) => s.setKhatmaDone);
  const [confirmReset, setConfirmReset] = React.useState(false);

  const plan = React.useMemo(() => {
    if (!startISO || !days) return null;
    const timeline = getKhatmaTimeline(startISO, today, days);
    if (!timeline) return null;
    const doneCount = countCompletedKhatmaDays(startISO, days, done);
    const status = getKhatmaPlanStatus(timeline.elapsedDays, days, doneCount);
    const dayIndex = Math.max(0, Math.min(days - 1, timeline.elapsedDays));
    const range = getKhatmaDayRange(dayIndex, days, TOTAL_QURAN_AYAHS, version ?? 1);
    const doneToday = Boolean(done?.[getLocalDateKey(new Date())]);
    return { timeline, doneCount, status, range, doneToday, dayIndex };
  }, [startISO, days, version, done, today]);

  const choose = (d: number) => {
    setPlan({ startISO: getLocalDateKey(new Date()), days: d });
    onChoose?.(d);
    toast.success(`خطة الختمة: ${arCount(d, "يوم", "يومان", "أيام", "يومًا")}`);
  };

  const todayRead = dailyAyahs?.[today] ?? 0;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = getLocalDateKey(d);
    return { key, label: WEEK[d.getDay()]!, day: d.getDate(), done: Boolean(done?.[key]), isToday: i === 6 };
  });

  return (
    <section className="q2-section">
      <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> خطة الختمة</h2>
      {!plan ? (
        <>
          <p className="q2-small" style={{ marginTop: 6 }}>اختر في كم تختم، فيقسم أثر المصحف وردًا يوميًا ويذكّرك به.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginTop: 10 }}>
            {PLAN_DAYS.map((p) => (
              <button key={p.days} type="button" className="q2-card q2-press" style={{ padding: "12px 14px", textAlign: "start" }} onClick={() => choose(p.days)}>
                <b style={{ display: "block", fontSize: 16 }}>في {p.label}</b>
                <span className="q2-small">{p.line}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="q2-card" style={{ padding: 16, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <b style={{ fontSize: 17 }}>ختمة في {arCount(days!, "يوم", "يومين", "أيام", "يومًا")}</b>
            <span className="q2-small">
              {plan.status === "completed"
                ? "أتممت أيامها، تقبّل الله"
                : plan.status === "expired"
                  ? "انتهت مدتها قبل أن تكتمل أيامها"
                  : plan.timeline.isUpcoming
                    ? "تبدأ قريبًا"
                    : `اليوم ${arDigits(plan.dayIndex + 1)} من ${arDigits(days!)}`}
            </span>
          </div>
          <div className="q2-bar" style={{ marginTop: 10 }}><span style={{ width: `${Math.min(100, (plan.doneCount / days!) * 100)}%` }} /></div>
          <p className="q2-small" style={{ marginTop: 6 }}>
            {arCount(plan.doneCount, "يوم مكتمل", "يومان مكتملان", "أيام مكتملة", "يومًا مكتملًا")}
          </p>

          {plan.status === "active" && plan.timeline.isWithinPlan ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <span style={{ flex: 1 }}>
                <b style={{ display: "block" }}>ورد اليوم: {arCount(plan.range.dailyTarget, "آية", "آيتان", "آيات", "آية")}</b>
                <span className="q2-small">قرأت اليوم {arCount(todayRead, "آية", "آيتين", "آيات", "آية")}</span>
              </span>
              <button
                type="button"
                className={`q2-chip q2-press${plan.doneToday ? " is-on" : ""}`}
                aria-pressed={plan.doneToday}
                onClick={() => setDone(getLocalDateKey(new Date()), !plan.doneToday)}
              >
                <Check size={15} aria-hidden="true" /> {plan.doneToday ? "أتممت ورد اليوم" : "سجّل ورد اليوم"}
              </button>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginTop: 14 }} aria-label="آخر سبعة أيام">
            {week.map((d) => (
              <div key={d.key} style={{ textAlign: "center" }}>
                <span className="q2-small" style={{ fontSize: 10.5, fontWeight: d.isToday ? 700 : 400 }}>{d.label}</span>
                <span className={`q2-day${d.done ? " is-done" : ""}${d.isToday ? " is-today" : ""}`} aria-label={`${d.label}: ${d.done ? "مكتمل" : "لم يكتمل"}`}>
                  {d.done ? <Check size={14} aria-hidden="true" /> : arDigits(d.day)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {PLAN_DAYS.filter((p) => p.days !== days).slice(0, 4).map((p) => (
              <button key={p.days} type="button" className="q2-chip q2-press" onClick={() => choose(p.days)}>
                في {p.label}
              </button>
            ))}
            <button
              type="button"
              className="q2-chip q2-press"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                resetPlan();
                onChoose?.(null);
                setConfirmReset(false);
              }}
            >
              {confirmReset ? "تأكيد: ألغِ الخطة" : "ألغِ الخطة"}
            </button>
          </div>
        </div>
      )}
      {plan ? <ReminderRow today={today} /> : null}
    </section>
  );
}
