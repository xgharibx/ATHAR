import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Minus, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { arNum, westernToArabicDigits } from "@/lib/formatNumber";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useQadaa } from "@/hooks/useQadaa";
import { useNoorStore } from "@/store/noorStore";
import { fullDayKeys } from "@/lib/qadaaSummary";
import {
  MADHHAB_LABELS,
  PRAYER_KEYS,
  PRAYER_LABELS,
  fastKey,
  fidyaTotal,
  parseISO,
  prayerKey,
  type Madhhab,
  type PlanMode,
  type PrayerKey,
} from "@/lib/qadaa";
import { QadaaSetup } from "@/components/qadaa/QadaaSetup";
import { QadaaGuidance } from "@/components/qadaa/QadaaGuidance";

const PRAYED_NAME: Record<string, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const arDate = (iso: string | null) => {
  const ms = iso ? parseISO(iso) : null;
  if (ms === null) return "";
  return new Date(ms).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
};

/** A year is not a quantity: no thousands separator ("١٤٤٧", not "١٬٤٤٧"). */
const arYear = (y: number) => westernToArabicDigits(String(y));

/** Arabic counted nouns: 3-10 take the plural, the rest the accusative singular. */
const arDays = (n: number) => (n === 1 ? "يوم" : n === 2 ? "يومان" : n >= 3 && n <= 10 ? `${arNum(n)} أيام` : `${arNum(n)} يومًا`);

const arDuration = (days: number) => {
  if (days < 45) return `${arNum(days)} يومًا`;
  if (days < 700) return `${arNum(Math.round(days / 30.44))} شهرًا`;
  const y = days / 365.25;
  return `${arNum(Math.round(y * 10) / 10)} سنة`;
};

function Ring({ percent, children }: { percent: number; children: React.ReactNode }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--stroke)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, percent) / 100)}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function QadaaPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const q = useQadaa();
  const logQadaa = useNoorStore((s) => s.logQadaa);
  const logQadaaBatch = useNoorStore((s) => s.logQadaaBatch);
  const undoQadaa = useNoorStore((s) => s.undoQadaa);
  const setQadaaSettings = useNoorStore((s) => s.setQadaaSettings);
  const resetQadaa = useNoorStore((s) => s.resetQadaa);
  const settings = useNoorStore((s) => s.qadaaSettings);
  const prayerLog = useNoorStore((s) => s.prayerLog);

  // Keep the launcher widget in step with what was just logged. Debounced so a
  // run of taps repaints it once, and a no-op off-device.
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { syncQadaaWidget } = await import("@/lib/widgetDataBridge");
          await syncQadaaWidget();
          const { refreshHomeWidgets } = await import("@/lib/widgetRefresh");
          await refreshHomeWidgets();
        } catch {
          /* widgets are a convenience; never let one break the page */
        }
      })();
    }, 800);
    return () => window.clearTimeout(t);
  }, [q.remainingTotal, q.quotaLeftTotal, q.fastRemaining, q.configured]);

  const [editing, setEditing] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);

  const prayedToday = React.useMemo(() => {
    const day = prayerLog?.[q.today] ?? {};
    const out = new Set<PrayerKey>();
    for (const [k, n] of Object.entries(PRAYED_NAME)) if (day[n]) out.add(k as PrayerKey);
    return out;
  }, [prayerLog, q.today]);

  const header = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="رجوع"
        className="w-10 h-10 rounded-2xl bg-[var(--card)] flex items-center justify-center"
      >
        <ChevronRight size={20} />
      </button>
      <h1 className="text-xl font-semibold">قضاء الفوائت</h1>
    </div>
  );

  if (!q.configured || editing) {
    return (
      <div dir="rtl" className="space-y-4 pb-24 page-enter px-1">
        {header}
        {!q.configured && (
          <Card className="p-5 text-center space-y-2">
            <div className="text-lg font-semibold">لنُحصِ ما عليك ثم نقضيه بهدوء</div>
            <p className="text-sm text-[var(--muted)] leading-7">
              خطة تتكيف مع ما تصليه كل يوم، وتخبرك متى ستنتهي بإذن الله، وتتابع صيامك مع العدّ التنازلي لرمضان.
            </p>
          </Card>
        )}
        <QadaaSetup onDone={() => setEditing(false)} />
        {editing && (
          <Button variant="ghost" className="w-full" onClick={() => setEditing(false)}>
            إلغاء
          </Button>
        )}
        <QadaaGuidance />
      </div>
    );
  }

  const open = PRAYER_KEYS.filter((k) => q.owed[k] > 0 || q.remaining[k] > 0);
  const maxBar = Math.max(1, ...q.last14.map((d) => d.count));
  const finished = q.owedTotal > 0 && q.remainingTotal === 0;
  const fullDay = fullDayKeys(q);

  const bump = (k: PrayerKey) => {
    logQadaa(prayerKey(k), 1);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  };

  const planModes: Array<{ id: PlanMode; label: string }> = [
    { id: "perFard", label: "مع كل فرض" },
    { id: "daily", label: "عدد يوميًا" },
    { id: "byDate", label: "حتى تاريخ" },
  ];

  return (
    <div dir="rtl" className="space-y-4 pb-24 page-enter px-1">
      {header}

      {/* Hero */}
      <Card className="p-5" data-testid="qadaa-hero">
        <Ring percent={q.percent}>
          {finished ? (
            <>
              <Check size={28} className="text-[var(--accent)]" />
              <div className="text-sm font-semibold mt-1">أتممتَ القضاء</div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold leading-none" data-testid="qadaa-remaining">{arNum(q.remainingTotal)}</div>
              <div className="text-[11px] text-[var(--muted)] mt-1">صلاة متبقية</div>
              <div className="text-[11px] text-[var(--muted)]">{arNum(q.percent)}٪ من {arNum(q.owedTotal)}</div>
            </>
          )}
        </Ring>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="rounded-2xl bg-[var(--card)] py-2.5">
            <div className="text-base font-semibold">{arNum(q.streak)}</div>
            <div className="text-[10px] text-[var(--muted)]">يوم متتابع</div>
          </div>
          <div className="rounded-2xl bg-[var(--card)] py-2.5">
            <div className="text-base font-semibold">{arNum(Math.round(q.pace * 10) / 10)}</div>
            <div className="text-[10px] text-[var(--muted)]">معدلك اليومي</div>
          </div>
          <div className="rounded-2xl bg-[var(--card)] py-2.5">
            <div className="text-base font-semibold">{q.planDays !== null && !finished ? arDuration(q.planDays) : "—"}</div>
            <div className="text-[10px] text-[var(--muted)]">بخطتك</div>
          </div>
        </div>
        {!finished && q.planFinish && (
          <p className="text-xs text-[var(--muted)] leading-6 mt-3 text-center">
            تنتهي بإذن الله نحو {arDate(q.planFinish)} إن التزمت بخطتك
            {q.paceFinish && q.pace > 0 ? `، وبمعدلك الحالي نحو ${arDate(q.paceFinish)}` : ""}.
          </p>
        )}
      </Card>

      {/* Today */}
      {!finished && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">اليوم</h2>
            <span className="text-xs text-[var(--muted)]" data-testid="qadaa-today-status">
              {q.todayComplete ? "أتممتَ ما عليك اليوم" : `بقي ${arNum(q.quotaLeftTotal)} من ${arNum(q.quotaTotal)}`}
            </span>
          </div>
          <div className="space-y-2">
            {open.map((k) => {
              const left = q.quotaLeft[k];
              const doneToday = q.todayDone[k];
              const prayedNow = prayedToday.has(k) && left > 0;
              return (
                <div
                  key={k}
                  data-testid={`qadaa-row-${k}`}
                  className="flex items-center justify-between rounded-2xl bg-[var(--card)] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{PRAYER_LABELS[k]}</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      متبقٍ {arNum(q.remaining[k])}
                      {q.quota[k] > 0 ? ` · اليوم ${arNum(Math.min(doneToday, q.quota[k]))}/${arNum(q.quota[k])}` : ""}
                      {prayedNow ? " · صليتَ حاضرته الآن" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`تراجع عن ${PRAYER_LABELS[k]}`}
                      disabled={doneToday <= 0}
                      onClick={() => undoQadaa(prayerKey(k))}
                      className="w-10 h-10 rounded-2xl border border-[var(--stroke)] flex items-center justify-center disabled:opacity-30"
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={`قضيتُ ${PRAYER_LABELS[k]}`}
                      disabled={q.remaining[k] <= 0}
                      onClick={() => bump(k)}
                      className={
                        "w-12 h-10 rounded-2xl flex items-center justify-center bg-[var(--accent)] text-[var(--on-accent)] disabled:opacity-30 " +
                        (prayedNow ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent" : "")
                      }
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {fullDay.length > 1 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                logQadaaBatch(fullDay);
                toast.success("تقبل الله");
              }}
            >
              قضيتُ يومًا كاملًا
            </Button>
          )}
          {q.order && (
            <p className="text-xs text-[var(--muted)] leading-6">
              الأصل الترتيب عند قلة الفوائت: {q.order.map((k) => PRAYER_LABELS[k]).join(" ثم ")}.
            </p>
          )}
        </Card>
      )}

      {/* Plan */}
      {!finished && (
        <Card className="p-5 space-y-3">
          <h2 className="text-base font-semibold">خطتك</h2>
          <div className="flex gap-2 flex-wrap">
            {planModes.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={q.plan.mode === m.id}
                onClick={() => setQadaaSettings({ planMode: m.id })}
                className={
                  "px-3 py-2 rounded-2xl text-sm border min-h-[40px] " +
                  (q.plan.mode === m.id
                    ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent"
                    : "bg-[var(--card)] border-[var(--stroke)]")
                }
              >
                {m.label}
              </button>
            ))}
          </div>
          {q.plan.mode === "perFard" && (
            <p className="text-xs text-[var(--muted)] leading-6">
              مع كل فرض حاضر تقضي فرضًا فائتًا مثله، وهي أيسر الطرق. ما زاد عن المطلوب يُحتسب نافلة.
            </p>
          )}
          {q.plan.mode === "daily" && (
            <div className="flex items-center gap-3">
              <span className="text-sm">أيام كاملة كل يوم</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={settings.planPerDay ?? 1}
                onChange={(e) => setQadaaSettings({ planPerDay: Number(e.target.value) || 1 })}
                className="w-20 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2 text-sm"
              />
            </div>
          )}
          {q.plan.mode === "byDate" && (
            <div className="flex items-center gap-3">
              <span className="text-sm">أنتهي قبل</span>
              <input
                type="date"
                value={settings.planFinishBy ?? ""}
                min={q.today}
                onChange={(e) => setQadaaSettings({ planFinishBy: e.target.value || null })}
                className="rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="flex items-end gap-1 h-14" aria-label="آخر ١٤ يومًا">
            {q.last14.map((d) => (
              <div
                key={d.iso}
                title={`${d.iso}: ${d.count}`}
                className="flex-1 rounded-t-md bg-[var(--accent)]"
                style={{ height: `${Math.max(d.count ? 12 : 3, (d.count / maxBar) * 100)}%`, opacity: d.count ? 1 : 0.25 }}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Prayers detail */}
      <Card className="p-5 space-y-2">
        <h2 className="text-base font-semibold">الصلوات</h2>
        {open.map((k) => (
          <div key={k} className="flex items-center justify-between text-sm rounded-2xl bg-[var(--card)] px-4 py-2.5">
            <span>{PRAYER_LABELS[k]}</span>
            <span className="text-[var(--muted)] text-xs">
              عليّ {arNum(q.owed[k])} · قضيتُ {arNum(Math.min(q.owed[k], q.owed[k] - q.remaining[k]))}
              {q.surplus[k] > 0 ? ` · زيادة نافلة ${arNum(q.surplus[k])}` : ""}
            </span>
          </div>
        ))}
      </Card>

      {/* Fasting */}
      <Card className="p-5 space-y-3" data-testid="qadaa-fasting">
        <h2 className="text-base font-semibold">الصيام</h2>
        <div className="rounded-2xl bg-[var(--card)] p-4 text-center">
          <div className="text-xs text-[var(--muted)]">
            {q.nextRamadan.inRamadan ? "أنت في رمضان الآن" : "رمضان القادم بعد نحو"}
          </div>
          <div className="text-2xl font-bold mt-1">{arDuration(q.nextRamadan.daysUntil)}</div>
          <div className="text-[10px] text-[var(--muted)] mt-1">تقدير فلكي قد يختلف عن الرؤية بيوم أو أكثر</div>
        </div>
        {q.fastOwedTotal > 0 ? (
          <>
            <p className="text-sm leading-7" data-testid="qadaa-fast-advice">
              {q.fastAdvice.level === "comfortable" && `عليك ${arDays(q.fastRemaining)} والوقت واسع، يكفيك صيام يوم أو يومين أسبوعيًا.`}
              {q.fastAdvice.level === "start" && `عليك ${arDays(q.fastRemaining)}. ابدأ الآن حتى لا يضيق عليك الوقت.`}
              {q.fastAdvice.level === "urgent" && `عليك ${arDays(q.fastRemaining)} والوقت يضيق، فصُم ما استطعت من الآن.`}
              {q.fastAdvice.level === "cannot" &&
                `عليك ${arDays(q.fastRemaining)} ولن تكفيك الأيام قبل رمضان؛ صُم ما تقدر عليه، وأتمم الباقي بعده.`}
              {q.fastAdvice.level === "none" && "لا صيام عليك."}
            </p>
            {q.fastAdvice.level === "cannot" && q.fastAdvice.fidyaIfDelayed && (
              <p className="text-xs text-[var(--muted)] leading-6">
                عند الجمهور (المالكية والشافعية والحنابلة) من أخّر القضاء حتى دخل رمضان بلا عذر يقضي ويُطعم مسكينًا عن كل يوم.
                وعند الحنفية القضاء فقط.
              </p>
            )}
            <div className="space-y-2">
              {q.fasts.map((f) => (
                <div key={f.year} className="flex items-center justify-between rounded-2xl bg-[var(--card)] px-4 py-2.5">
                  <div>
                    <div className="text-sm">رمضان {arYear(f.year)} هـ</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      عليّ {arNum(f.owed)} · متبقٍ {arNum(f.remaining)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`تراجع صيام ${arYear(f.year)}`}
                      disabled={f.done <= 0}
                      onClick={() => undoQadaa(fastKey(f.year))}
                      className="w-10 h-10 rounded-2xl border border-[var(--stroke)] flex items-center justify-center disabled:opacity-30"
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={`صمتُ يومًا من ${arYear(f.year)}`}
                      disabled={f.remaining <= 0}
                      onClick={() => logQadaa(fastKey(f.year), 1)}
                      className="w-12 h-10 rounded-2xl flex items-center justify-center bg-[var(--accent)] text-[var(--on-accent)] disabled:opacity-30"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {q.fastAdvice.fidyaIfDelayed && (
              <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                <span>تكلفة وجبة مسكين</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={settings.mealCost ?? ""}
                  onChange={(e) => setQadaaSettings({ mealCost: Number(e.target.value) || 0 })}
                  className="w-24 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2 text-sm"
                />
                {(settings.mealCost ?? 0) > 0 && (
                  <span>إجمالي الفدية إن لزمت: {arNum(fidyaTotal(q.fastRemaining, settings.mealCost ?? 0))}</span>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-[var(--muted)] leading-6">
            لم تُسجَّل أيام صيام عليك. يمكنك إضافتها من زر «تعديل الأرقام» بالأسفل.
          </p>
        )}
      </Card>

      <QadaaGuidance />

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
          تعديل الأرقام
        </Button>
        {!confirmReset ? (
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmReset(true)}>
            مسح الكل
          </Button>
        ) : (
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              resetQadaa();
              setConfirmReset(false);
            }}
          >
            تأكيد المسح
          </Button>
        )}
      </div>
      {q.madhhab && (
        <p className="text-[11px] text-center text-[var(--muted)]">
          المذهب: {MADHHAB_LABELS[q.madhhab as Madhhab]} · هذه الأداة للتنظيم وليست فتوى، فراجع مفتيك في حالتك.
        </p>
      )}
    </div>
  );
}
