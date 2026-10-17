import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Minus, Plus, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Pickers";
import { arNum } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useNoorStore, ibadahDayKeyOf } from "@/store/noorStore";
import { addDays, parseISO } from "@/lib/qadaa";
import {
  SLOT_LABELS, SLOT_ORDER, TEMPLATES, WEEKDAY_SHORT, completionRate, countOn, dueOn, ratio, streak, weekRow,
  type WirdAuto, type WirdItem, type WirdKind, type WirdSlot,
} from "@/lib/wird";

const KIND_LABEL: Record<WirdKind, string> = { quran: "قرآن", dhikr: "ذكر", task: "عمل" };
const AUTO_LABEL: Record<WirdAuto, string> = {
  quranAyahs: "يُحتسب من قراءتك في التطبيق (آيات)",
  morningAdhkar: "يُحتسب من أذكار الصباح في التطبيق",
  eveningAdhkar: "يُحتسب من أذكار المساء في التطبيق",
};
const UNITS: Record<WirdKind, string[]> = { quran: ["وجه", "آية", "ربع", "حزب", "جزء"], dhikr: ["مرة"], task: ["مرة"] };
const pct = (x: number | null) => (x === null ? "—" : `${arNum(Math.round(x * 100))}٪`);

const newId = () => `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** What the app already knows about a day, for items linked to it. */
function useExternal() {
  const ayahs = useNoorStore((s) => s.quranDailyAyahs);
  const sections = useNoorStore((s) => s.sectionCompletions);
  return React.useCallback(
    (auto: WirdAuto, day: string) => {
      if (auto === "quranAyahs") return ayahs?.[day] ?? 0;
      if (auto === "morningAdhkar") return (sections?.morning ?? []).includes(day) ? 1 : 0;
      return (sections?.evening ?? []).includes(day) ? 1 : 0;
    },
    [ayahs, sections],
  );
}

type Draft = Omit<WirdItem, "id" | "createdISO"> & { id?: string };
const blankDraft = (): Draft => ({ title: "", kind: "quran", unit: "وجه", target: 5, slot: "fajr", days: [], auto: null });

export function WirdPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const items = useNoorStore((s) => s.wirdItems);
  const log = useNoorStore((s) => s.wirdLog);
  const today = useNoorStore((s) => ibadahDayKeyOf(s));
  const upsert = useNoorStore((s) => s.upsertWirdItem);
  const remove = useNoorStore((s) => s.removeWirdItem);
  const adjust = useNoorStore((s) => s.adjustWird);
  const external = useExternal();

  const [day, setDay] = React.useState(today);
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  // The strip runs oldest to newest and can be wider than the screen: bring the
  // chosen day (today, at first) into view instead of leaving it off the edge.
  React.useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [day, today]);
  const [draft, setDraft] = React.useState<Draft | null>(null);

  // Keep the launcher widget in step with what was just logged (debounced; a no-op off-device).
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { syncWirdTableWidget } = await import("@/lib/widgetDataBridge");
          await syncWirdTableWidget();
          const { refreshHomeWidgets } = await import("@/lib/widgetRefresh");
          await refreshHomeWidgets();
        } catch {
          /* widgets are a convenience; never let one break the page */
        }
      })();
    }, 800);
    return () => window.clearTimeout(t);
  }, [items, log]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const list = React.useMemo(() => Object.values(items), [items]);
  const due = React.useMemo(() => dueOn(list, day), [list, day]);
  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)), [today]);
  const dayName = (iso: string) => {
    const ms = parseISO(iso);
    return ms === null ? "" : WEEKDAY_SHORT[new Date(ms).getUTCDay()];
  };

  const doneCount = due.filter((i) => ratio(countOn(log, i, day, external), i.target) >= 1).length;
  const week = completionRate(log, list, today, 7, external);
  const month = completionRate(log, list, today, 30, external);

  const startFrom = (t: (typeof TEMPLATES)[number]) => {
    for (const it of t.items) upsert({ ...it, id: newId(), createdISO: today });
    toast.success("أُضيف الورد");
  };

  const save = () => {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) { toast.error("اكتب اسم الورد"); return; }
    const existing = draft.id ? items[draft.id] : null;
    upsert({ ...draft, title, id: draft.id ?? newId(), createdISO: existing?.createdISO ?? today });
    setDraft(null);
  };

  const header = (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => navigate(-1)} aria-label="رجوع" className="w-10 h-10 rounded-2xl bg-[var(--card)] flex items-center justify-center">
        <ChevronRight size={20} />
      </button>
      <div className="flex-1">
        <h1 className="text-xl font-semibold">جدول الورد</h1>
        <p className="text-[11px] text-[var(--muted)]">أورادك كلها وأسبوعك في نظرة</p>
      </div>
      {list.length > 0 && (
        <Button size="sm" onClick={() => setDraft(blankDraft())}>إضافة ورد</Button>
      )}
    </div>
  );

  if (list.length === 0 && !draft) {
    return (
      <div dir="rtl" className="space-y-4 pb-24 page-enter px-1">
        {header}
        <Card className="p-5 space-y-2 text-center">
          <div className="text-lg font-semibold">اجعل لكل يومٍ وِردًا</div>
          <p className="text-sm text-[var(--muted)] leading-7">
            ما قلّ ودام خير مما كثر وانقطع. اختر ورًدا جاهزًا وعدِّله، أو ابنِ وردك بنفسك. ما قرأتَه وما أتممتَ من أذكار في التطبيق يُحتسب فيه تلقائيًا.
          </p>
        </Card>
        <div className="space-y-2">
          {TEMPLATES.map((t) => (
            <Card key={t.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-[11px] text-[var(--muted)] mt-0.5">{t.blurb}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => startFrom(t)}>ابدأ</Button>
            </Card>
          ))}
        </div>
        <Button variant="outline" className="w-full" onClick={() => setDraft(blankDraft())}>أبني وردي بنفسي</Button>
        {sheet()}
      </div>
    );
  }

  function sheet() {
    return (
      <Modal open={!!draft} onClose={() => { setDraft(null); setConfirmDelete(false); }} ariaLabel={draft?.id ? "تعديل الورد" : "ورد جديد"}>
        {draft && (
          <div className="px-4 pt-2 pb-5 space-y-3 overflow-y-auto" data-testid="wird-form">
            <div className="text-base font-semibold">{draft.id ? "تعديل الورد" : "ورد جديد"}</div>
            <input
              value={draft.title} maxLength={60} placeholder="اسم الورد، مثل: وردي من القرآن"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-4 py-3 text-sm"
              aria-label="اسم الورد"
            />
            <div className="flex gap-2">
              {(Object.keys(KIND_LABEL) as WirdKind[]).map((k) => (
                <button key={k} type="button" aria-pressed={draft.kind === k}
                  onClick={() => setDraft({ ...draft, kind: k, unit: UNITS[k][0], auto: k === "quran" ? draft.auto : draft.auto === "quranAyahs" ? null : draft.auto })}
                  className={cn("flex-1 py-2 rounded-2xl text-sm border", draft.kind === k ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}>
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number" inputMode="numeric" min={1} max={10000} value={draft.target}
                onChange={(e) => setDraft({ ...draft, target: Math.max(1, Number(e.target.value) || 1) })}
                className="w-24 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-3 py-2.5 text-sm" aria-label="المقدار"
              />
              {UNITS[draft.kind].length > 1 ? (
                <Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} aria-label="الوحدة"
                  className="flex-1 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-4 py-2.5 text-sm">
                  {UNITS[draft.kind].map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
              ) : (
                <span className="text-sm text-[var(--muted)]">{draft.unit} في اليوم</span>
              )}
            </div>
            <Select value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value as WirdSlot })} aria-label="الوقت"
              className="w-full rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-4 py-2.5 text-sm">
              {SLOT_ORDER.map((s) => <option key={s} value={s}>{SLOT_LABELS[s]}</option>)}
            </Select>
            <div>
              <div className="text-[11px] text-[var(--muted)] mb-1.5">الأيام (بدون اختيار = كل يوم)</div>
              <div className="flex gap-1.5">
                {WEEKDAY_SHORT.map((w, i) => {
                  const on = draft.days.includes(i);
                  return (
                    <button key={w} type="button" aria-pressed={on}
                      onClick={() => setDraft({ ...draft, days: on ? draft.days.filter((d) => d !== i) : [...draft.days, i].sort() })}
                      className={cn("flex-1 py-2 rounded-xl text-[11px] border", on ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}>
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>
            <Select value={draft.auto ?? ""} onChange={(e) => setDraft({ ...draft, auto: (e.target.value || null) as WirdAuto | null })} aria-label="الربط التلقائي"
              className="w-full rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-4 py-2.5 text-sm">
              <option value="">بدون ربط (أسجّله بنفسي)</option>
              {(Object.keys(AUTO_LABEL) as WirdAuto[]).filter((a) => a !== "quranAyahs" || draft.kind === "quran").map((a) => (
                <option key={a} value={a}>{AUTO_LABEL[a]}</option>
              ))}
            </Select>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={save}>حفظ</Button>
              {draft.id && (
                confirmDelete ? (
                  <Button variant="danger" className="flex-1" onClick={() => { remove(draft.id!); setDraft(null); setConfirmDelete(false); }}>تأكيد الحذف</Button>
                ) : (
                  <Button variant="ghost" aria-label="حذف الورد" onClick={() => setConfirmDelete(true)}><Trash2 size={18} /></Button>
                )
              )}
            </div>
          </div>
        )}
      </Modal>
    );
  }

  const groups = SLOT_ORDER.map((slot) => ({ slot, rows: due.filter((i) => i.slot === slot) })).filter((g) => g.rows.length);

  return (
    <div dir="rtl" className="space-y-4 pb-24 page-enter px-1">
      {header}

      <div ref={stripRef} className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="اختر اليوم">
        {days.map((d) => {
          const dueItems = dueOn(list, d);
          const done = dueItems.filter((i) => ratio(countOn(log, i, d, external), i.target) >= 1).length;
          const sel = d === day;
          return (
            <button key={d} type="button" role="tab" aria-selected={sel} onClick={() => setDay(d)}
              className={cn("shrink-0 w-[52px] rounded-2xl py-2 text-center border", sel ? "border-[var(--accent)] bg-[var(--card-2)]" : "border-[var(--stroke)] bg-[var(--card)]")}>
              <div className="text-[10px] text-[var(--muted)]">{d === today ? "اليوم" : dayName(d)}</div>
              <div className="text-sm font-semibold">{arNum(Number(d.slice(8)))}</div>
              <div className="text-[9px] text-[var(--muted)] mt-0.5">{dueItems.length ? `${arNum(done)}/${arNum(dueItems.length)}` : "—"}</div>
            </button>
          );
        })}
      </div>

      <Card className="p-4 grid grid-cols-3 text-center gap-2" data-testid="wird-stats">
        <div><div className="text-lg font-bold">{arNum(doneCount)}/{arNum(due.length)}</div><div className="text-[10px] text-[var(--muted)]">أتممتَ اليوم</div></div>
        <div><div className="text-lg font-bold">{pct(week)}</div><div className="text-[10px] text-[var(--muted)]">آخر ٧ أيام</div></div>
        <div><div className="text-lg font-bold">{pct(month)}</div><div className="text-[10px] text-[var(--muted)]">آخر ٣٠ يومًا</div></div>
      </Card>

      {due.length === 0 && (
        <Card className="p-5 text-center text-sm text-[var(--muted)]">لا ورد مستحقّ في هذا اليوم.</Card>
      )}

      {groups.map((g) => (
        <Card key={g.slot} className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[var(--muted)]">{SLOT_LABELS[g.slot]}</h2>
          {g.rows.map((it) => {
            const count = countOn(log, it, day, external);
            const r = ratio(count, it.target);
            const linked = !!it.auto && count > (log[`${day}|${it.id}`] ?? 0);
            const step = it.kind === "dhikr" && it.target >= 33 ? 10 : 1;
            return (
              <div key={it.id} data-testid={`wird-${it.id}`} className="rounded-2xl bg-[var(--card)] px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="text-sm font-medium text-start flex-1" onClick={() => setDraft({ ...it })}>{it.title}</button>
                  <span className="text-[11px] text-[var(--muted)]">{arNum(count)}/{arNum(it.target)} {it.unit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--stroke)] overflow-hidden">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round(r * 100)}%`, transition: "width .3s" }} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label={`إنقاص ${it.title}`} disabled={(log[`${day}|${it.id}`] ?? 0) <= 0}
                    onClick={() => adjust(it.id, -step, day)}
                    className="w-10 h-9 rounded-xl border border-[var(--stroke)] flex items-center justify-center disabled:opacity-30"><Minus size={15} /></button>
                  <button type="button" aria-label={`زيادة ${it.title}`} onClick={() => adjust(it.id, step, day)}
                    className="w-12 h-9 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] flex items-center justify-center"><Plus size={16} /></button>
                  {r < 1 ? (
                    <button type="button" className="text-[11px] text-[var(--muted)] underline" onClick={() => adjust(it.id, it.target - count, day)}>إتمام</button>
                  ) : (
                    <span className="text-[11px] text-[var(--accent)] flex items-center gap-1"><Check size={13} /> تمّ</span>
                  )}
                  {linked && <span className="text-[10px] text-[var(--muted)] mr-auto">من التطبيق</span>}
                  <span className="text-[10px] text-[var(--muted)] mr-auto">{streak(log, it, today, external) > 1 ? `${arNum(streak(log, it, today, external))} أيام متتابعة` : ""}</span>
                </div>
              </div>
            );
          })}
        </Card>
      ))}

      <Card className="p-4 space-y-2" data-testid="wird-week">
        <h2 className="text-base font-semibold">أسبوعك</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-[11px]">
            <thead>
              <tr className="text-[var(--muted)]">
                <th className="text-start font-normal py-1">الورد</th>
                {days.map((d) => <th key={d} className="font-normal w-8">{arNum(Number(d.slice(8)))}</th>)}
              </tr>
            </thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.id}>
                  <td className="text-start py-1 pe-2 max-w-[110px] truncate">{it.title}</td>
                  {weekRow(log, it, today, external).map((c) => (
                    <td key={c.day} className="py-1">
                      <span
                        aria-label={c.due ? `${c.day}: ${Math.round(c.ratio * 100)}٪` : `${c.day}: غير مستحق`}
                        className={cn("inline-block w-4 h-4 rounded-full align-middle",
                          !c.due ? "border border-dashed border-[var(--stroke)]" : c.done ? "bg-[var(--accent)]" : c.ratio > 0 ? "bg-[var(--accent)] opacity-40" : "bg-[var(--stroke)]")}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {sheet()}
    </div>
  );
}
