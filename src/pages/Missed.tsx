import * as React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlarmClockCheck, BookOpenText, HandHeart } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NightlyPlanStrip } from "@/components/layout/NightlyPlanStrip";
import { DAILY_CHECKLIST_ITEMS, type DailyChecklistItem } from "@/data/dailyGrowth";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";

type MissedKind = "prayer" | "adhkar" | "quran";

type MissedEntry = {
  key: string;
  date: string;
  item: DailyChecklistItem;
  kind: MissedKind;
  done: boolean;
  route: string;
  title: string;
  hint: string;
  remedies: string[];
};

function isoDay(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function routeForCategory(category: DailyChecklistItem["category"]) {
  if (category === "quran") return "/quran";
  if (category === "dhikr") return "/c/morning";
  if (category === "salah") return "/ramadan";
  if (category === "sadaqah") return "/ramadan";
  return "/insights";
}

function kindForItem(itemId: string): MissedKind | null {
  if (itemId === "fajr_on_time" || itemId === "five_prayers") return "prayer";
  if (itemId === "morning_evening") return "adhkar";
  if (itemId === "quran_reading") return "quran";
  return null;
}

function remediesFor(entry: { kind: MissedKind; itemId: string }) {
  if (entry.kind === "prayer") {
    if (entry.itemId === "fajr_on_time") {
      return [
        "قضاء ما فاتك من الصلاة ثم تثبيت نية نوم مبكر لليوم القادم.",
        "تسبيح: سبحان الله 33 • الحمد لله 33 • الله أكبر 34 + صدقة سر بقدر الاستطاعة."
      ];
    }
    return [
      "خطة جبر الصلاة: ابدأ بالفرض الأقرب فورًا ثم راقب الصلاة القادمة مبكرًا.",
      "ذكر بعد الصلاة + نية صدقة اليوم دون تحديد مبلغ."
    ];
  }

  if (entry.kind === "adhkar") {
    return [
      "جلسة أذكار تعويضية قصيرة: 100 استغفار + 100 صلاة على النبي ﷺ.",
      "اختر عمل خير خفي اليوم (مساعدة، دعاء، صدقة) بنية الجبر."
    ];
  }

  return [
    "تعويض القرآن: اقرأ صفحة إلى ثلاث صفحات اليوم بتركيز.",
    "اختم الجلسة بـ 100 تسبيحة بنية تثبيت الورد وعدم الانقطاع."
  ];
}

function kindLabel(kind: MissedKind) {
  if (kind === "prayer") return "الصلاة";
  if (kind === "adhkar") return "الأذكار";
  return "القرآن";
}

function kindIcon(kind: MissedKind) {
  if (kind === "prayer") return <AlarmClockCheck size={15} />;
  if (kind === "quran") return <BookOpenText size={15} />;
  return <HandHeart size={15} />;
}

export function MissedPage() {
  const navigate = useNavigate();
  const todayKey = useTodayKey();
  const dailyChecklist = useNoorStore((s) => s.dailyChecklist);
  const missedRecoveryDone = useNoorStore((s) => s.missedRecoveryDone);
  const missedTrackingStartISO = useNoorStore((s) => s.missedTrackingStartISO);
  const setMissedRecoveryDone = useNoorStore((s) => s.setMissedRecoveryDone);
  const markMissedRecoveryBulk = useNoorStore((s) => s.markMissedRecoveryBulk);

  const [lookbackDays, setLookbackDays] = React.useState<7 | 14 | 30>(14);
  const [tab, setTab] = React.useState<"all" | MissedKind>("all");

  const dates = React.useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    const startISO = missedTrackingStartISO ?? todayKey;
    for (let i = 1; i <= lookbackDays; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const day = isoDay(d);
      if (day >= startISO) out.push(day);
    }
    return out;
  }, [lookbackDays, missedTrackingStartISO, todayKey]);

  const entries = React.useMemo(() => {
    const targetIds = new Set(["fajr_on_time", "five_prayers", "morning_evening", "quran_reading"]);
    const rows: MissedEntry[] = [];

    for (const date of dates) {
      const day = dailyChecklist[date] ?? {};

      for (const item of DAILY_CHECKLIST_ITEMS) {
        if (!targetIds.has(item.id)) continue;
        if (day[item.id]) continue;

        const kind = kindForItem(item.id);
        if (!kind) continue;

        const key = `${date}:${item.id}`;
        const remedies = remediesFor({ kind, itemId: item.id });
        rows.push({
          key,
          date,
          item,
          kind,
          done: !!missedRecoveryDone[key],
          route: routeForCategory(item.category),
          title: item.title,
          hint: item.subtitle,
          remedies
        });
      }
    }

    return rows;
  }, [dailyChecklist, dates, missedRecoveryDone]);

  const counts = React.useMemo(() => {
    const outstanding = entries.filter((e) => !e.done);
    return {
      total: outstanding.length,
      prayer: outstanding.filter((e) => e.kind === "prayer").length,
      adhkar: outstanding.filter((e) => e.kind === "adhkar").length,
      quran: outstanding.filter((e) => e.kind === "quran").length
    };
  }, [entries]);

  const visibleEntries = React.useMemo(() => {
    const filtered = tab === "all" ? entries : entries.filter((e) => e.kind === tab);
    return filtered.sort((a, b) => Number(a.done) - Number(b.done));
  }, [entries, tab]);

  const markAllOutstanding = () => {
    const keys = visibleEntries.filter((e) => !e.done).map((e) => e.key);
    if (keys.length === 0) return;
    markMissedRecoveryBulk(keys, true);
  };

  return (
    <div className="space-y-4">
      <NightlyPlanStrip />

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">مركز القضاء</div>
            <div className="text-xs opacity-65 mt-1">تتبع الفائت من الصلاة والأذكار والقرآن مع خطة جبر عملية</div>
          </div>
          <Badge>{todayKey}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat title="إجمالي القضاء" value={counts.total} />
          <Stat title="قضاء الصلاة" value={counts.prayer} />
          <Stat title="قضاء الأذكار" value={counts.adhkar} />
          <Stat title="قضاء القرآن" value={counts.quran} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs opacity-60">الفترة:</span>
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={lookbackDays === d ? "secondary" : "ghost"}
              onClick={() => setLookbackDays(d as 7 | 14 | 30)}
            >
              {d} يوم
            </Button>
          ))}
          <span className="text-xs opacity-60">بداية التتبع: {missedTrackingStartISO ?? todayKey}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={tab === "all" ? "secondary" : "ghost"} onClick={() => setTab("all")}>الكل</Button>
          <Button size="sm" variant={tab === "prayer" ? "secondary" : "ghost"} onClick={() => setTab("prayer")}>الصلاة</Button>
          <Button size="sm" variant={tab === "adhkar" ? "secondary" : "ghost"} onClick={() => setTab("adhkar")}>الأذكار</Button>
          <Button size="sm" variant={tab === "quran" ? "secondary" : "ghost"} onClick={() => setTab("quran")}>القرآن</Button>
          <Button size="sm" onClick={markAllOutstanding}>تعويض الكل الظاهر</Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-3">قائمة القضاء</div>
        <div className="space-y-2">
          {visibleEntries.length === 0 ? (
            <div className="text-xs opacity-65">لا توجد عناصر قضاء ضمن الفترة المختارة.</div>
          ) : (
            visibleEntries.map((entry) => (
              <div key={entry.key} className="glass rounded-3xl p-3 border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{entry.title}</div>
                    <div className="text-xs opacity-65 mt-1">{entry.date} • {entry.hint}</div>
                    <div className="mt-2 text-xs opacity-75">{kindLabel(entry.kind)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{kindIcon(entry.kind)}</Badge>
                    <Badge>{entry.done ? "مُعَوَّض" : "معلّق"}</Badge>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs space-y-1">
                  <div className="opacity-60">تعويض ذكي مقترح:</div>
                  {entry.remedies.map((line, idx) => (
                    <div key={idx}>• {line}</div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate(entry.route)}>
                    ابدأ التنفيذ
                  </Button>
                  <Button
                    size="sm"
                    variant={entry.done ? "ghost" : "secondary"}
                    onClick={() => setMissedRecoveryDone(entry.key, !entry.done)}
                  >
                    <CheckCircle2 size={14} />
                    {entry.done ? "إلغاء التعويض" : "تم التعويض"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
      <div className="text-[11px] opacity-60">{title}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
