import * as React from "react";
import { Trophy, Send, RotateCw } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { coerceCount } from "@/data/types";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";
import {
  type LeaderboardBoard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  buildSubmitPayload,
  enqueuePayload,
  fetchBoardRows,
  flushQueue,
  getLeaderboardIdentity,
  getLocalRowsFromHistory
} from "@/lib/leaderboard";

const COOLDOWN_MS = 45_000;

const DAILY_TASBEEH_POOL: Array<{ key: string; label: string }> = [
  { key: "subhanallah", label: "سُبْحَانَ الله" },
  { key: "alhamdulillah", label: "الْحَمْدُ لِلَّه" },
  { key: "la_ilaha_illallah", label: "لا إِلَهَ إِلَّا الله" },
  { key: "allahu_akbar", label: "اللهُ أَكْبَر" }
];

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function getDailyTasbeeh(todayISO: string) {
  const hash = hashString(todayISO);
  const item = DAILY_TASBEEH_POOL[hash % DAILY_TASBEEH_POOL.length];
  const target = 100 + (hash % 5) * 50;
  return { ...item, target };
}

export function LeaderboardPage() {
  const { data } = useAdhkarDB();
  const todayKey = useTodayKey();
  const progress = useNoorStore((s) => s.progress);
  const quranLastRead = useNoorStore((s) => s.quranLastRead);
  const prayersDone = useNoorStore((s) => s.dailyChecklist[todayKey] ?? {});
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);

  const endpoint = (import.meta.env.VITE_LEADERBOARD_ENDPOINT as string | undefined) ?? "";
  const identity = React.useMemo(() => getLeaderboardIdentity(), []);

  const [board, setBoard] = React.useState<LeaderboardBoard>("global");
  const [period, setPeriod] = React.useState<LeaderboardPeriod>("daily");
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [remoteRows, setRemoteRows] = React.useState<LeaderboardEntry[]>([]);
  const [syncState, setSyncState] = React.useState<"idle" | "syncing" | "ok" | "error" | "cooldown">("idle");
  const [syncHint, setSyncHint] = React.useState("");
  const [lastSubmitAt, setLastSubmitAt] = React.useState(0);

  const sections = React.useMemo(() => data?.db.sections ?? [], [data?.db.sections]);

  React.useEffect(() => {
    if (!selectedSection && sections.length) {
      setSelectedSection(sections[0].id);
    }
  }, [sections, selectedSection]);

  const sectionScores = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const section of sections) {
      let score = 0;
      section.content.forEach((it, idx) => {
        const target = coerceCount(it.count);
        const key = `${section.id}:${idx}`;
        const current = Math.min(Math.max(0, Number(progress[key]) || 0), target);
        score += current;
      });
      out[section.id] = score;
    }
    return out;
  }, [progress, sections]);

  const myStats = React.useMemo(() => {
    const dailyTasbeeh = getDailyTasbeeh(todayKey);
    const rawTasbeeh = Number(quickTasbeeh?.[dailyTasbeeh.key] ?? 0) || 0;
    const tasbeehDailyScore = Math.max(0, Math.min(rawTasbeeh, dailyTasbeeh.target));
    const dhikr = Object.values(progress).reduce((acc, v) => acc + (Number(v) || 0), 0);
    const quran = quranLastRead?.ayahIndex ?? 0;
    const prayers = Object.keys(prayersDone).filter((k) => prayersDone[k]).length;
    const score = dhikr + quran * 3 + prayers * 40 + tasbeehDailyScore;

    return {
      id: identity.id,
      name: identity.alias,
      score,
      dhikr,
      quran,
      prayers,
      tasbeehDailyLabel: dailyTasbeeh.label,
      tasbeehDailyTarget: dailyTasbeeh.target,
      tasbeehDailyScore,
      sectionScore: selectedSection ? sectionScores[selectedSection] ?? 0 : 0
    };
  }, [identity.alias, identity.id, prayersDone, progress, quranLastRead?.ayahIndex, quickTasbeeh, sectionScores, selectedSection, todayKey]);

  const myBoardScore =
    board === "global"
      ? myStats.score
      : board === "dhikr"
        ? myStats.dhikr
        : board === "quran"
          ? myStats.quran
          : board === "prayers"
            ? myStats.prayers
            : board === "tasbeeh_daily"
              ? myStats.tasbeehDailyScore
              : myStats.sectionScore;

  const myEntry = React.useMemo(
    () => ({
      id: myStats.id,
      name: myStats.name,
      board,
      score: myBoardScore,
      day: todayKey,
      sectionId: board === "section" ? selectedSection : undefined
    }) satisfies LeaderboardEntry,
    [board, myBoardScore, myStats.id, myStats.name, selectedSection, todayKey]
  );

  const mergedRows = React.useMemo(() => {
    const source =
      remoteRows.length > 0
        ? remoteRows
        : getLocalRowsFromHistory({
            identity,
            board,
            period,
            todayISO: todayKey,
            sectionId: board === "section" ? selectedSection : undefined
          });
    const all = [...source.filter((r) => r.id !== myEntry.id), myEntry];
    return all
      .filter((r) => r.board === board && (board !== "section" || r.sectionId === selectedSection))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [board, identity, myEntry, period, remoteRows, selectedSection, todayKey]);

  const myRank = React.useMemo(
    () => Math.max(1, mergedRows.findIndex((r) => r.id === myEntry.id) + 1),
    [mergedRows, myEntry.id]
  );

  const pullBoard = React.useCallback(async () => {
    if (!endpoint) {
      setRemoteRows([]);
      return;
    }
    setSyncState("syncing");
    try {
      const rows = await fetchBoardRows({
        endpoint,
        board,
        period,
        sectionId: board === "section" ? selectedSection : undefined,
        day: todayKey
      });
      setRemoteRows(rows);
      setSyncState("ok");
      setSyncHint("تم تحديث الترتيب");
    } catch {
      setSyncState("error");
      setSyncHint("تعذر جلب البيانات من الخادم");
    }
  }, [board, endpoint, period, selectedSection, todayKey]);

  React.useEffect(() => {
    void pullBoard();
  }, [pullBoard]);

  const submitScore = async () => {
    if (Date.now() - lastSubmitAt < COOLDOWN_MS) {
      setSyncState("cooldown");
      setSyncHint("انتظر قليلًا قبل الإرسال");
      return;
    }

    setLastSubmitAt(Date.now());

    const payload = await buildSubmitPayload(todayKey, {
      global: myStats.score,
      dhikr: myStats.dhikr,
      quran: myStats.quran,
      prayers: myStats.prayers,
      tasbeehDaily: myStats.tasbeehDailyScore,
      sections: sectionScores
    });
    enqueuePayload(payload);

    if (!endpoint) {
      setSyncState("error");
      setSyncHint("المزامنة السحابية غير مفعّلة");
      return;
    }

    setSyncState("syncing");
    const flush = await flushQueue(endpoint);
    if (!flush.ok) {
      setSyncState("error");
      setSyncHint(
        flush.reason === "rate_limited"
          ? "الخادم قيّد الطلبات مؤقتًا"
          : flush.reason === "auth"
            ? "مشكلة في مفاتيح المصادقة"
            : flush.reason === "invalid_payload"
              ? "بيانات الإرسال غير صالحة"
              : flush.reason === "network_retry"
                ? "مشكلة اتصال، أعد المحاولة"
                : "تعذر إكمال المزامنة"
      );
      return;
    }

    await pullBoard();
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">لوحة المتصدرين</div>
            <div className="text-xs opacity-65 mt-1">هوية مجهولة + مزامنة اختيارية</div>
          </div>
          <Trophy size={18} className="text-[var(--accent)]" />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <Stat title="النقاط" value={myStats.score} />
          <Stat title="الذكر" value={myStats.dhikr} />
          <Stat title="القرآن" value={myStats.quran} />
          <Stat title="المهام اليومية" value={myStats.prayers} />
        </div>

        <div className="mt-3 text-xs opacity-75">
          تحدي تسبيح اليوم: <span className="font-semibold">{myStats.tasbeehDailyLabel}</span> • الهدف {myStats.tasbeehDailyTarget}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <BoardTab label="يومي" active={period === "daily"} onClick={() => setPeriod("daily")} />
          <BoardTab label="أسبوعي" active={period === "weekly"} onClick={() => setPeriod("weekly")} />
          <BoardTab label="شهري" active={period === "monthly"} onClick={() => setPeriod("monthly")} />
          <BoardTab label="سنوي" active={period === "yearly"} onClick={() => setPeriod("yearly")} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <BoardTab label="عام" active={board === "global"} onClick={() => setBoard("global")} />
          <BoardTab label="الذكر" active={board === "dhikr"} onClick={() => setBoard("dhikr")} />
          <BoardTab label="القرآن" active={board === "quran"} onClick={() => setBoard("quran")} />
          <BoardTab label="الصلوات" active={board === "prayers"} onClick={() => setBoard("prayers")} />
          <BoardTab label="تسبيح اليوم" active={board === "tasbeeh_daily"} onClick={() => setBoard("tasbeeh_daily")} />
          <BoardTab label="قسم" active={board === "section"} onClick={() => setBoard("section")} />
        </div>

        {board === "section" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {sections.slice(0, 12).map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={selectedSection === s.id ? "secondary" : "ghost"}
                onClick={() => setSelectedSection(s.id)}
              >
                {s.title}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => void submitScore()}>
            <Send size={16} />
            مزامنة ترتيبي
          </Button>
          <Button variant="secondary" onClick={() => void pullBoard()}>
            <RotateCw size={16} />
            تحديث
          </Button>
          <Badge>رتبتي: #{myRank}</Badge>
          <Badge>
            {syncState === "syncing"
              ? "جارٍ المزامنة"
              : syncState === "ok"
                ? "تمت المزامنة"
                : syncState === "cooldown"
                  ? "انتظر قليلًا قبل الإرسال"
                : syncState === "error"
                  ? endpoint
                    ? syncHint || "فشل/تقييد مؤقت"
                    : "محلي فقط"
                  : "محلي"}
          </Badge>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-3">
          {board === "global"
            ? "أفضل النتائج العامة"
            : board === "dhikr"
              ? "أفضل نتائج الذكر"
              : board === "quran"
                ? "أفضل نتائج القرآن"
                : board === "prayers"
                  ? "أفضل نتائج الصلوات"
                  : board === "tasbeeh_daily"
                    ? "تحدي تسبيح اليوم"
                    : "أفضل نتائج القسم"}
        </div>
        <div className="space-y-2">
          {mergedRows.map((r, idx) => (
            <div key={r.id} className="glass rounded-3xl p-3 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs tabular-nums">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.name}</div>
                  <div className="text-[11px] opacity-60">
                    {r.id === myEntry.id ? "أنت" : "عضو"} • {r.day ?? todayKey}
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">{r.score}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat(props: { title: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-3 border border-white/10">
      <div className="text-[11px] opacity-60">{props.title}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{props.value}</div>
    </div>
  );
}

function BoardTab(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant={props.active ? "secondary" : "ghost"} onClick={props.onClick}>
      {props.label}
    </Button>
  );
}
