import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Check, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { arNum } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useNoorStore, ibadahDayKeyOf } from "@/store/noorStore";
import { SECTIONS, deedsFor, type Deed, type Gender } from "@/data/muhasabaCatalog";
import { addDays, parseISO } from "@/lib/qadaa";
import {
  appliesOn, coverage, dayScore, fraction, levelOf, nextRung, steadyDays, trendOf, weeklyScores,
} from "@/lib/muhasaba";

const WEEKDAY = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const CORE = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const pct = (x: number | null) => (x === null ? "—" : `${arNum(Math.round(x * 100))}٪`);

function dayLabel(iso: string) {
  const ms = parseISO(iso);
  return ms === null ? iso : WEEKDAY[new Date(ms).getUTCDay()];
}

function Ring({ value, children }: { value: number; children: React.ReactNode }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--stroke)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))}
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function MuhasabaPage() {
  const navigate = useNavigate();
  useScrollRestoration();

  const log = useNoorStore((s) => s.muhasabaLog);
  const gender = useNoorStore((s) => s.muhasabaGender);
  const hidden = useNoorStore((s) => s.muhasabaHidden);
  const prayerLog = useNoorStore((s) => s.prayerLog);
  const today = useNoorStore((s) => ibadahDayKeyOf(s));
  const setMuhasaba = useNoorStore((s) => s.setMuhasaba);
  const setGender = useNoorStore((s) => s.setMuhasabaGender);
  const toggleHidden = useNoorStore((s) => s.toggleMuhasabaHidden);

  const [tab, setTab] = React.useState<"day" | "review">("day");
  const [day, setDay] = React.useState(today);
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  // The strip runs oldest to newest and can be wider than the screen: bring the
  // chosen day (today, at first) into view instead of leaving it off the edge.
  React.useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [day, today]);
  const [open, setOpen] = React.useState<Deed | null>(null);
  const [customize, setCustomize] = React.useState(false);

  // If the ibadah day rolls over while the page is open, follow it.
  const lastToday = React.useRef(today);
  React.useEffect(() => {
    if (lastToday.current !== today) {
      if (day === lastToday.current) setDay(today);
      lastToday.current = today;
    }
  }, [today, day]);

  const allDeeds = React.useMemo(() => deedsFor(gender), [gender]);
  const deeds = React.useMemo(() => allDeeds.filter((d) => !hidden[d.id]), [allDeeds, hidden]);
  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)), [today]);

  const header = (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => navigate(-1)} aria-label="رجوع" className="w-10 h-10 rounded-2xl bg-[var(--card)] flex items-center justify-center">
        <ChevronRight size={20} />
      </button>
      <div className="flex-1">
        <h1 className="text-xl font-semibold">جدول المحاسبة</h1>
        <p className="text-[11px] text-[var(--muted)]">حاسِب نفسك قبل أن تُحاسَب</p>
      </div>
      {gender && (
        <button type="button" onClick={() => setCustomize(true)} aria-label="تخصيص الجدول" className="w-10 h-10 rounded-2xl bg-[var(--card)] flex items-center justify-center">
          <SlidersHorizontal size={18} />
        </button>
      )}
    </div>
  );

  if (!gender) {
    return (
      <div dir="rtl" className="space-y-4 pb-24 page-enter px-1">
        {header}
        <Card className="p-5 space-y-4 text-center">
          <div className="text-lg font-semibold">لكل مقامٍ مراتب</div>
          <p className="text-sm text-[var(--muted)] leading-7">
            لكل عبادة درجات من الأدنى إلى الأعلى. تسجّل كل يوم أعلى درجة بلغتها، فترى أين ترتقي وأين بدأتَ تتراجع.
            ما تكتبه هنا بينك وبين ربك، ولا يُشارَك ولا يدخل في لوحة الترتيب.
          </p>
          <p className="text-xs text-[var(--muted)]">اختر ليُعرض لك الجدول المناسب</p>
          <div className="flex gap-2 justify-center">
            {(["male", "female"] as Gender[]).map((g) => (
              <Button key={g} variant="secondary" className="min-w-[110px]" onClick={() => setGender(g)}>
                {g === "male" ? "رجل" : "امرأة"}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const score = dayScore(log, deeds, day);
  const steady = steadyDays(log, deeds, today, CORE);
  const cov = coverage(log, deeds, today, 7);

  // ── Review ────────────────────────────────────────────────────────────────
  const trends = deeds.map((d) => ({ deed: d, t: trendOf(log, d, today) }));
  const slipping = trends.filter((x) => x.t.status === "slipping").sort((a, b) => (a.t.delta ?? 0) - (b.t.delta ?? 0));
  const rising = trends.filter((x) => x.t.status === "rising").sort((a, b) => (b.t.delta ?? 0) - (a.t.delta ?? 0));
  const missing = trends.filter((x) => x.t.missRun >= 2).sort((a, b) => b.t.missRun - a.t.missRun);
  const weeks = weeklyScores(log, deeds, today, 8);
  const anyData = weeks.some((w) => w.score !== null);

  const sheetDeed = open;
  const sheetLevel = sheetDeed ? levelOf(log, day, sheetDeed.id) : null;

  return (
    <div dir="rtl" className="space-y-4 pb-24 page-enter px-1">
      {header}

      <div className="flex gap-2">
        {([["day", "اليوم"], ["review", "المراجعة"]] as const).map(([id, label]) => (
          <button
            key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
            className={cn("flex-1 py-2.5 rounded-2xl text-sm border", tab === id ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent font-semibold" : "bg-[var(--card)] border-[var(--stroke)]")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "day" ? (
        <>
          <div ref={stripRef} className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="اختر اليوم">
            {days.map((d) => {
              const s = dayScore(log, deeds, d);
              const sel = d === day;
              return (
                <button
                  key={d} type="button" role="tab" aria-selected={sel} onClick={() => setDay(d)}
                  className={cn("shrink-0 w-[52px] rounded-2xl py-2 text-center border", sel ? "border-[var(--accent)] bg-[var(--card-2)]" : "border-[var(--stroke)] bg-[var(--card)]")}
                >
                  <div className="text-[10px] text-[var(--muted)]">{d === today ? "اليوم" : dayLabel(d).slice(0, 4)}</div>
                  <div className="text-sm font-semibold">{arNum(Number(d.slice(8)))}</div>
                  <div className="mx-auto mt-1 h-1 w-6 rounded-full bg-[var(--stroke)] overflow-hidden">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round((s.score ?? 0) * 100)}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          <Card className="p-5 flex items-center gap-5" data-testid="muhasaba-summary">
            <Ring value={score.score ?? 0}>
              <div className="text-xl font-bold leading-none">{pct(score.score)}</div>
              <div className="text-[10px] text-[var(--muted)] mt-1">درجة اليوم</div>
            </Ring>
            <div className="flex-1 space-y-1.5 text-sm">
              <div>سجّلتَ <b>{arNum(score.recorded)}</b> من {arNum(score.asked)}</div>
              <div className="text-[var(--muted)] text-xs">
                {steady > 0 ? `${arNum(steady)} يومًا متتابعًا على الفرائض الخمس` : "ابدأ بتسجيل فرائضك لتبني سلسلتك"}
              </div>
              <div className="text-[var(--muted)] text-xs">تغطية آخر ٧ أيام: {pct(cov)}</div>
            </div>
          </Card>

          {SECTIONS.map((sec) => {
            const rows = deeds.filter((d) => d.section === sec.id && appliesOn(d, day));
            if (!rows.length) return null;
            return (
              <Card key={sec.id} className="p-4 space-y-2">
                <div>
                  <h2 className="text-base font-semibold">{sec.title}</h2>
                  <p className="text-[11px] text-[var(--muted)]">{sec.blurb}</p>
                </div>
                {rows.map((d) => {
                  const lv = levelOf(log, day, d.id);
                  const suggested = d.prayer && lv === null && !!prayerLog?.[day]?.[d.prayer];
                  return (
                    <button
                      key={d.id} type="button" data-testid={`deed-${d.id}`} onClick={() => setOpen(d)}
                      className="w-full text-start rounded-2xl bg-[var(--card)] px-4 py-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{d.title}</div>
                        <div className={cn("text-[11px] mt-0.5 truncate", lv === 0 ? "text-[var(--danger)]" : "text-[var(--muted)]")}>
                          {lv === null ? (suggested ? "سجّلتَ هذه الصلاة في التطبيق — اختر مرتبتك" : "لم يُسجَّل") : lv === 0 ? "فاتتني" : d.levels[lv - 1]}
                        </div>
                      </div>
                      <div className="flex gap-0.5" aria-hidden>
                        {d.levels.map((_, i) => (
                          <span key={i} className={cn("w-1.5 h-4 rounded-full", lv !== null && i < lv ? "bg-[var(--accent)]" : "bg-[var(--stroke)]")} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </Card>
            );
          })}
        </>
      ) : (
        <div className="space-y-4" data-testid="muhasaba-review">
          {!anyData && (
            <Card className="p-5 text-center text-sm text-[var(--muted)] leading-7">
              سجّل بضعة أيام وستظهر هنا مراجعتك: أين ترتقي، وأين بدأتَ تتراجع، وما الدرجة التالية لك.
            </Card>
          )}

          <Card className="p-5 space-y-3">
            <h2 className="text-base font-semibold">آخر ٨ أسابيع</h2>
            <div className="flex items-end gap-1.5 h-24">
              {weeks.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <div className="w-full rounded-t-lg bg-[var(--accent)]" style={{ height: `${Math.max(w.score === null ? 3 : 8, (w.score ?? 0) * 100)}%`, opacity: w.score === null ? 0.2 : 1 }} />
                  <span className="text-[9px] text-[var(--muted)]">{w.score === null ? "—" : arNum(Math.round(w.score * 100))}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--muted)]">الدرجة = متوسط ما سجّلتَه فقط؛ الأيام غير المسجّلة لا تُحسب تقصيرًا.</p>
          </Card>

          {slipping.length > 0 && (
            <Card className="p-5 space-y-3">
              <h2 className="text-base font-semibold">تستحق التفقّد</h2>
              <p className="text-[11px] text-[var(--muted)]">انخفض مستواك فيها هذا الأسبوع عمّا كنتَ عليه. لا لوم — تفقّد وعُد.</p>
              {slipping.slice(0, 6).map(({ deed, t }) => {
                const back = nextRung(deed, Math.max(0, t.usual - 1));
                return (
                  <div key={deed.id} className="rounded-2xl bg-[var(--card)] px-4 py-3">
                    <div className="flex justify-between text-sm"><span className="font-medium">{deed.title}</span><span className="text-[var(--danger)]">{pct(t.delta)}</span></div>
                    {back && <div className="text-[11px] text-[var(--muted)] mt-1">ارجع إلى: {back.label}</div>}
                  </div>
                );
              })}
            </Card>
          )}

          {missing.length > 0 && (
            <Card className="p-5 space-y-2">
              <h2 className="text-base font-semibold">فاتتك متتاليًا</h2>
              {missing.map(({ deed, t }) => (
                <div key={deed.id} className="flex justify-between text-sm rounded-2xl bg-[var(--card)] px-4 py-2.5">
                  <span>{deed.title}</span><span className="text-[var(--muted)]">{arNum(t.missRun)} أيام</span>
                </div>
              ))}
            </Card>
          )}

          {rising.length > 0 && (
            <Card className="p-5 space-y-3">
              <h2 className="text-base font-semibold">ترتقي فيها</h2>
              {rising.slice(0, 6).map(({ deed, t }) => {
                const nxt = nextRung(deed, t.usual);
                return (
                  <div key={deed.id} className="rounded-2xl bg-[var(--card)] px-4 py-3">
                    <div className="flex justify-between text-sm"><span className="font-medium">{deed.title}</span><span className="text-[var(--accent)]">+{pct(t.delta)}</span></div>
                    {nxt && <div className="text-[11px] text-[var(--muted)] mt-1">الدرجة التالية: {nxt.label}</div>}
                  </div>
                );
              })}
            </Card>
          )}

          <Card className="p-5 space-y-2">
            <h2 className="text-base font-semibold">كل عبادة</h2>
            {trends.map(({ deed, t }) => (
              <div key={deed.id} className="flex items-center justify-between text-sm rounded-2xl bg-[var(--card)] px-4 py-2.5">
                <span>{deed.title}</span>
                <span className="text-[11px] text-[var(--muted)]">
                  {t.recent === null ? "لا بيانات" : `${pct(t.recent)} هذا الأسبوع`}
                  {t.status === "slipping" ? " ↓" : t.status === "rising" ? " ↑" : ""}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Ladder sheet */}
      <Modal open={!!sheetDeed} onClose={() => setOpen(null)} ariaLabel={sheetDeed?.title ?? "المراتب"}>
        {sheetDeed && (
          <div className="px-4 pt-2 pb-5" data-testid="ladder-sheet">
            <div className="text-base font-semibold">{sheetDeed.title}</div>
            <p className="text-[11px] text-[var(--muted)] mb-3">{dayLabel(day)} — اختر أعلى مرتبة بلغتَها، وكل مرتبة تشمل ما قبلها</p>
            <div className="flex flex-col-reverse gap-1.5 max-h-[60vh] overflow-y-auto">
              {sheetDeed.levels.map((label, i) => {
                const n = i + 1;
                const on = sheetLevel !== null && n <= sheetLevel;
                return (
                  <button
                    key={label} type="button" aria-pressed={sheetLevel === n}
                    onClick={() => { setMuhasaba(day, sheetDeed.id, n); setOpen(null); }}
                    className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-start text-sm border", sheetLevel === n ? "border-[var(--accent)] bg-[var(--card-2)] font-semibold" : "border-transparent bg-[var(--card)]")}
                  >
                    <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px]", on ? "bg-[var(--accent)] text-[var(--on-accent)]" : "bg-[var(--stroke)]")}>
                      {on ? <Check size={13} /> : arNum(n)}
                    </span>
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] text-[var(--muted)]">{pct(fraction(sheetDeed, n))}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setMuhasaba(day, sheetDeed.id, 0); setOpen(null); }}>فاتتني</Button>
              <Button variant="ghost" className="flex-1" disabled={sheetLevel === null} onClick={() => { setMuhasaba(day, sheetDeed.id, null); setOpen(null); }}>مسح</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Customise sheet */}
      <Modal open={customize} onClose={() => setCustomize(false)} ariaLabel="تخصيص الجدول">
        <div className="px-4 pt-2 pb-5 space-y-3">
          <div className="text-base font-semibold">تخصيص الجدول</div>
          <div className="flex gap-2">
            {(["male", "female"] as Gender[]).map((g) => (
              <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(g)}
                className={cn("flex-1 py-2.5 rounded-2xl text-sm border", gender === g ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}>
                {g === "male" ? "رجل" : "امرأة"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--muted)]">أخفِ ما لا يعنيك. ما أخفيتَه لا يُحسب في درجتك، وتبقى سجلاته محفوظة.</p>
          <div className="max-h-[44vh] overflow-y-auto space-y-1.5">
            {allDeeds.map((d) => (
              <label key={d.id} className="flex items-center justify-between rounded-2xl bg-[var(--card)] px-4 py-2.5 text-sm">
                <span>{d.title}</span>
                <input type="checkbox" checked={!hidden[d.id]} onChange={() => toggleHidden(d.id)} />
              </label>
            ))}
          </div>
          <Button className="w-full" onClick={() => setCustomize(false)}>تم</Button>
        </div>
      </Modal>
    </div>
  );
}
