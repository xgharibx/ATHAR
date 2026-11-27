/**
 * «خطة القراءة»: pick a plan (the two forties a hadith a day, a Sahih in a
 * year), then today's share, your progress and an optional daily reminder.
 * See lib/hadithPlans.ts; the reader moves the plan on as you read in order.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, CalendarCheck, ChevronLeft, X } from "lucide-react";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { useHadithPrefs } from "@/lib/hadithPrefs";
import { useHadithToc } from "@/data/useHadithBook";
import { HADITH_PLANS, planDef, planToday } from "@/lib/hadithPlans";
import { syncHadithPlanReminder } from "@/lib/hadithPlanReminder";
import { arNum } from "@/lib/formatNumber";
import { countAr, HADITH } from "@/lib/arabicCount";
import { hadithRefLabel } from "@/data/hadithNumbers";

const DEFAULT_REMINDER = "20:00";

export function HadithPlanCard() {
  const navigate = useNavigate();
  const plan = useHadithPrefs((s) => s.plan);
  const startPlan = useHadithPrefs((s) => s.startPlan);
  const stopPlan = useHadithPrefs((s) => s.stopPlan);
  const setPlanReminder = useHadithPrefs((s) => s.setPlanReminder);
  const def = plan ? planDef(plan.id) : null;
  const { data: toc } = useHadithToc(def?.book);
  const native = Capacitor.isNativePlatform();

  // Keep the phone's reminder in step with the plan (cancelled when there is none).
  React.useEffect(() => {
    void syncHadithPlanReminder({ time: plan?.reminder ?? null, title: def?.title ?? "" });
  }, [plan?.reminder, def?.title]);

  if (!plan || !def) {
    return (
      <section aria-label="خطط القراءة" className="rounded-3xl glass-strong p-4">
        <div className="mb-2 flex items-center gap-2">
          <CalendarCheck size={17} aria-hidden="true" className="text-(--accent)" />
          <h2 className="text-sm font-bold">خطة قراءة</h2>
        </div>
        <p className="mb-3 text-xs leading-6 text-(--muted)">اقرأ كتابًا على مهل، نصيبًا كل يوم، ويتقدّم معك وأنت تقرأ.</p>
        <div className="grid grid-cols-2 gap-2">
          {HADITH_PLANS.map((p) => (
            <button key={p.id} type="button" onClick={() => { startPlan(p.id); toast.success(`بدأت «${p.title}»`); }}
              className="rounded-2xl border border-(--stroke) bg-(--card) p-3 text-right press-effect">
              <span className="block text-[13px] font-bold leading-snug">{p.title}</span>
              <span className="mt-0.5 block text-[11px] text-(--muted)">{p.line}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const total = toc?.rows.length ?? 0;
  const today = total ? planToday(plan, total) : null;
  const next = toc?.rows[Math.min(plan.read, Math.max(0, total - 1))];
  const toggleReminder = async () => {
    if (plan.reminder) {
      setPlanReminder(null);
      toast.success("أُوقف تذكير الخطة");
      return;
    }
    const ok = await syncHadithPlanReminder({ time: DEFAULT_REMINDER, title: def.title, ask: true });
    if (!ok) {
      toast.error("اسمح لأثر بالإشعارات من إعدادات الهاتف أولًا");
      return;
    }
    setPlanReminder(DEFAULT_REMINDER);
    toast.success("يصلك تذكير الخطة كل يوم الساعة ٨ مساءً، وتغيّره من هنا");
  };

  return (
    <section aria-label="خطة القراءة" className="rounded-3xl glass-strong p-4">
      <div className="flex items-start gap-2">
        <CalendarCheck size={17} aria-hidden="true" className="mt-0.5 text-(--accent)" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">{def.title}</h2>
          {today && (
            <p className="mt-0.5 text-[11px] text-(--muted)">
              {today.finished ? "أتممت الخطة، بارك الله فيك" : `اليوم ${arNum(today.day)} من ${arNum(today.days)}، وقرأت ${arNum(Math.min(plan.read, total))} من ${arNum(total)}`}
            </p>
          )}
        </div>
        {native && (
          <button type="button" onClick={() => void toggleReminder()} aria-pressed={!!plan.reminder}
            aria-label={plan.reminder ? "أوقف تذكير الخطة" : "ذكّرني كل يوم"}
            className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) press-effect">
            {plan.reminder ? <Bell size={15} aria-hidden="true" className="text-(--accent)" /> : <BellOff size={15} aria-hidden="true" className="text-(--muted)" />}
          </button>
        )}
        <button type="button" onClick={() => { stopPlan(); toast.success("أُنهيت الخطة"); }} aria-label="أنهِ الخطة"
          className="grid h-9 w-9 place-items-center rounded-full border border-(--stroke) text-(--muted) press-effect">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      {native && plan.reminder && (
        <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-(--stroke) px-3 py-2 text-xs">
          <span className="text-(--muted)">وقت التذكير كل يوم</span>
          <input type="time" value={plan.reminder} aria-label="وقت تذكير الخطة"
            onChange={(e) => { if (/^\d{2}:\d{2}$/.test(e.target.value)) setPlanReminder(e.target.value); }}
            className="rounded-lg bg-transparent font-semibold outline-none" dir="ltr" />
        </label>
      )}
      {today ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-(--stroke)" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(plan.read, total)} aria-label="التقدم في الخطة">
            <div className="h-full rounded-full bg-(--accent)" style={{ width: `${(Math.min(plan.read, total) / total) * 100}%` }} />
          </div>
          {!today.finished && next && (
            <button type="button" onClick={() => navigate(`/hadith/${def.book}/${next[0]}`)}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right press-effect"
              style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }}>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-(--accent)">{today.done ? "أنهيت وِرد اليوم، اقرأ المزيد" : "اقرأ وِرد اليوم"}</span>
                <span className="mt-0.5 block text-[11px] text-(--muted)">
                  {today.done ? `التالي: ${next[2] ? hadithRefLabel(next[2]) : arNum(next[0])}` : `بقي ${countAr(today.left, HADITH)}، من ${next[2] ? hadithRefLabel(next[2]) : arNum(next[0])}`}
                  {today.behind > 0 ? `، ومتأخر ${countAr(today.behind, HADITH)}` : ""}
                </span>
              </span>
              <ChevronLeft size={16} aria-hidden="true" className="text-(--accent)" />
            </button>
          )}
        </>
      ) : (
        <div className="skeleton mt-3 h-14 rounded-2xl" aria-hidden="true" />
      )}
    </section>
  );
}
