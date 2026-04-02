import * as React from "react";
import { Trophy, Send, RotateCw, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { coerceCount } from "@/data/types";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";
import { cn } from "@/lib/utils";
import {
  type LeaderboardBoard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  buildSubmitPayload,
  enqueuePayload,
  fetchBoardRows,
  flushQueue,
  getLeaderboardIdentity,
  getLocalRowsFromHistory,
  resetLeaderboardAlias,
  setLeaderboardAlias,
  syncLeaderboardAliasFromServer,
  validateLeaderboardAlias
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
  const [identity, setIdentity] = React.useState(() => getLeaderboardIdentity());

  const [board, setBoard] = React.useState<LeaderboardBoard>("global");
  const [period, setPeriod] = React.useState<LeaderboardPeriod>("daily");
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [remoteRows, setRemoteRows] = React.useState<LeaderboardEntry[]>([]);
  const [syncState, setSyncState] = React.useState<"idle" | "syncing" | "ok" | "error" | "cooldown">("idle");
  const [syncHint, setSyncHint] = React.useState("");
  const [lastSubmitAt, setLastSubmitAt] = React.useState(0);
  const [cooldownLeft, setCooldownLeft] = React.useState(0);
  const [aliasDraft, setAliasDraft] = React.useState(identity.alias);
  const [aliasHint, setAliasHint] = React.useState("يمكنك اختيار اسم ظاهر وسيُراجع على الخادم عند المزامنة.");
  const [aliasTone, setAliasTone] = React.useState<"idle" | "ok" | "error" | "moderated">("idle");
  const [serverHidden, setServerHidden] = React.useState(false);

  const aliasValidation = React.useMemo(() => validateLeaderboardAlias(aliasDraft), [aliasDraft]);
  const aliasDirty = aliasDraft.trim() !== identity.alias;

  // Tick cooldown counter
  React.useEffect(() => {
    if (lastSubmitAt === 0) return;
    const interval = setInterval(() => {
      const left = Math.max(0, COOLDOWN_MS - (Date.now() - lastSubmitAt));
      setCooldownLeft(left);
      if (left === 0) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
  }, [lastSubmitAt]);

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

  const localRows = React.useMemo(
    () =>
      getLocalRowsFromHistory({
        identity,
        board,
        period,
        todayISO: todayKey,
        sectionId: board === "section" ? selectedSection : undefined
      }),
    [board, identity, period, selectedSection, todayKey]
  );

  const mergedRows = React.useMemo(() => {
    const source = remoteRows.length > 0 ? remoteRows : localRows.length > 0 ? localRows : [myEntry];
    const all = serverHidden && remoteRows.length > 0 ? source.filter((r) => r.id !== myEntry.id) : source;
    return all
      .filter((r) => r.board === board && (board !== "section" || r.sectionId === selectedSection))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [board, localRows, myEntry, remoteRows, selectedSection, serverHidden]);

  const myRank = React.useMemo(() => {
    const idx = mergedRows.findIndex((r) => r.id === myEntry.id);
    if (idx >= 0) return idx + 1;
    return remoteRows.length > 0 ? null : 1;
  }, [mergedRows, myEntry.id, remoteRows.length]);

  const applyServerAlias = React.useCallback((serverAlias?: string, aliasStatus?: string) => {
    if (!serverAlias) return;
    const nextIdentity = syncLeaderboardAliasFromServer(serverAlias);
    setIdentity(nextIdentity);
    setAliasDraft(nextIdentity.alias);

    if (aliasStatus === "forced") {
      setAliasTone("moderated");
      setAliasHint("تم فرض اسم آمن من جهة الإدارة لهذا الحساب.");
      return;
    }

    if (aliasStatus === "moderated" || aliasStatus === "fallback") {
      setAliasTone("moderated");
      setAliasHint("الخادم رفض الاسم المقترح واستخدم اسمًا آمنًا بدلًا منه.");
      return;
    }

    setAliasTone("ok");
    setAliasHint("تم اعتماد اسمك في لوحة المتصدرين.");
  }, []);

  React.useEffect(() => {
    const mine = remoteRows.find((row) => row.id === identity.id);
    if (!mine) return;
    if (mine.name && mine.name !== identity.alias) {
      applyServerAlias(mine.name, "accepted");
    }
    setServerHidden(false);
  }, [applyServerAlias, identity.alias, identity.id, remoteRows]);

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

  const saveAlias = () => {
    const result = setLeaderboardAlias(aliasDraft);
    if (!result.ok) {
      setAliasTone("error");
      setAliasHint(result.message);
      return;
    }

    setIdentity(result.identity);
    setAliasDraft(result.identity.alias);
    setAliasTone("ok");
    setAliasHint(endpoint ? "تم حفظ الاسم محليًا. سيخضع للتصفية عند أول مزامنة." : "تم حفظ الاسم محليًا.");
  };

  const restoreDefaultAlias = () => {
    const nextIdentity = resetLeaderboardAlias();
    setIdentity(nextIdentity);
    setAliasDraft(nextIdentity.alias);
    setAliasTone("ok");
    setAliasHint("تمت إعادة الاسم الافتراضي الآمن.");
  };

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

    if (flush.alias) {
      applyServerAlias(flush.alias, flush.aliasStatus);
    }

    if (flush.hidden) {
      setServerHidden(true);
      setSyncState("ok");
      setSyncHint("تمت المزامنة لكن الحساب مخفي حاليًا من اللوحة من جهة الإدارة");
      await pullBoard();
      return;
    }

    setServerHidden(false);

    await pullBoard();
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">لوحة المتصدرين</div>
            <div className="text-xs opacity-65 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block opacity-80" />
              {identity.alias}
            </div>
          </div>
          <Trophy size={18} className="text-[var(--accent)]" />
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat title="النقاط" value={myStats.score} />
          <Stat title="الذكر" value={myStats.dhikr} />
          <Stat title="القرآن" value={myStats.quran} />
          <Stat title="المهام اليومية" value={myStats.prayers} />
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/4 p-4">
          <div className="text-sm font-semibold">اسم الظهور</div>
          <div className="mt-1 text-[11px] opacity-60">
            الأسماء المخالفة أو المضللة قد تُستبدل تلقائيًا أو تُخفى من جهة الإدارة.
          </div>
          <div className="mt-3 flex flex-col md:flex-row gap-2">
            <Input
              value={aliasDraft}
              onChange={(e) => setAliasDraft(e.target.value)}
              maxLength={40}
              placeholder="مثال: نور الشام"
            />
            <Button onClick={saveAlias} disabled={!aliasDirty || !aliasValidation.ok}>
              حفظ الاسم
            </Button>
            <Button variant="outline" onClick={restoreDefaultAlias}>
              اسم افتراضي
            </Button>
          </div>
          <div
            className={cn(
              "mt-2 text-[11px] leading-5",
              aliasDirty && !aliasValidation.ok
                ? "text-[var(--danger)]"
                : aliasTone === "moderated"
                  ? "text-yellow-300"
                  : aliasTone === "ok"
                    ? "text-[var(--ok)]"
                    : "opacity-60"
            )}
          >
            {aliasDirty && !aliasValidation.ok ? aliasValidation.message : aliasHint}
          </div>
        </div>

        <div className="mt-3 text-xs opacity-75">
          تحدي تسبيح اليوم: <span className="font-semibold">{myStats.tasbeehDailyLabel}</span> • الهدف {myStats.tasbeehDailyTarget}
        </div>
        <div className="mt-1 text-[11px] opacity-45">
          الصيغة: ذكر + قرآن×3 + صلاة×40 + تسبيح
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

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => void submitScore()}
            disabled={syncState === "syncing" || cooldownLeft > 0}
          >
            {syncState === "syncing"
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />}
            {cooldownLeft > 0
              ? `انتظر ${Math.ceil(cooldownLeft / 1000)}ث`
              : "مزامنة ترتيبي"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void pullBoard()}
            disabled={syncState === "syncing"}
          >
            <RotateCw size={16} className={syncState === "syncing" ? "animate-spin" : ""} />
            تحديث
          </Button>
          <Badge>{myRank != null ? `رتبتي: #${myRank}` : "رتبتي: خارج أعلى 30"}</Badge>
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border",
            syncState === "ok"
              ? "border-[var(--ok)]/30 bg-[var(--ok)]/10 text-[var(--ok)]"
              : syncState === "error"
                ? "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]"
                : syncState === "cooldown"
                  ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400"
                  : syncState === "syncing"
                    ? "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-white/15 bg-white/6 opacity-70"
          )}>
            {syncState === "syncing" && <Loader2 size={10} className="animate-spin" />}
            {syncState === "ok" && <CheckCircle2 size={10} />}
            {syncState === "error" && <AlertCircle size={10} />}
            {syncState === "cooldown" && <Clock size={10} />}
            {syncState === "syncing"
              ? "جارٍ المزامنة"
              : syncState === "ok"
                ? "تمت المزامنة"
                : syncState === "cooldown"
                  ? "انتظر قليلًا"
                  : syncState === "error"
                    ? endpoint
                      ? syncHint || "فشل/تقييد مؤقت"
                      : "محلي فقط"
                    : "محلي"}
          </span>
        </div>

        {serverHidden && (
          <div className="mt-3 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-xs text-yellow-200 leading-6">
            هذا الحساب مخفي حاليًا من لوحة المتصدرين من جهة الإدارة. يمكنك تعديل الاسم ثم إعادة المزامنة أو التواصل مع المشرف.
          </div>
        )}
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
            <div key={r.id} className={cn(
              "glass rounded-3xl p-3 border flex items-center justify-between gap-3",
              r.id === myEntry.id ? "border-[var(--accent)]/35 bg-[var(--accent)]/8" : "border-white/10"
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs tabular-nums">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
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
      <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{props.value}</div>
    </div>
  );
}

function BoardTab(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant={props.active ? "secondary" : "ghost"}
      className={props.active ? "bg-[var(--accent)]/15 border border-[var(--accent)]/35" : ""}
      onClick={props.onClick}
    >
      {props.label}
    </Button>
  );
}
