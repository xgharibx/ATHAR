import * as React from "react";
import { Trophy, Send, RotateCw, Loader2, CheckCircle2, AlertCircle, Clock, ShieldCheck, Trash2, Users, BookMarked, Calendar, Check, Copy, Plus } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import { useNoorStore, type LocalFriend } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { cn } from "@/lib/utils";
import {
  type LeaderboardBoard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  fetchBoardRows,
  hasLocalLeaderboardAdminToken,
  loadLeaderboardAdminToken,
  saveLeaderboardAdminToken,
  clearLeaderboardAdminToken,
  fetchLeaderboardAdminSnapshot,
  fetchLeaderboardAdminUserModeration,
  getLeaderboardIdentity,
  getLocalRowsFromHistory,
  submitLeaderboardAdminAction,
  syncLeaderboardSnapshot,
  validateLeaderboardAlias,
  type LeaderboardAdminAliasAuditRow,
  type LeaderboardAdminBlocklistRow,
  type LeaderboardAdminUserModeration
} from "@/lib/leaderboard";

const COOLDOWN_MS = 45_000;

type BoardLoadState = "idle" | "loading" | "ok" | "error";

export function LeaderboardPage() {
  const { data } = useAdhkarDB();
  const prayerTimes = usePrayerTimes();
  const todayKey = useTodayKey({ mode: "ibadah", fajrTime: prayerTimes.data?.data?.timings?.Fajr });
  const progress = useNoorStore((s) => s.progress);
  const quranLastRead = useNoorStore((s) => s.quranLastRead);
  const prayersDone = useNoorStore((s) => s.dailyChecklist[todayKey] ?? {});
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);

  const endpoint = (import.meta.env.VITE_LEADERBOARD_ENDPOINT as string | undefined) ?? "";
  const [identity] = React.useState(() => getLeaderboardIdentity());

  const [board, setBoard] = React.useState<LeaderboardBoard>("global");
  const [period, setPeriod] = React.useState<LeaderboardPeriod>("daily");
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [remoteRows, setRemoteRows] = React.useState<LeaderboardEntry[]>([]);
  const [boardLoadState, setBoardLoadState] = React.useState<BoardLoadState>(endpoint ? "loading" : "idle");
  const [syncState, setSyncState] = React.useState<"idle" | "syncing" | "ok" | "error" | "cooldown">("idle");
  const [syncHint, setSyncHint] = React.useState("");
  const [lastSubmitAt, setLastSubmitAt] = React.useState(0);
  const [cooldownLeft, setCooldownLeft] = React.useState(0);
  const [serverHidden, setServerHidden] = React.useState(false);
  const [showAdminCard, setShowAdminCard] = React.useState(() => hasLocalLeaderboardAdminToken());

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

  React.useEffect(() => {
    setShowAdminCard(hasLocalLeaderboardAdminToken());
  }, []);

  const sections = React.useMemo(() => data?.db.sections ?? [], [data?.db.sections]);

  React.useEffect(() => {
    if (!selectedSection && sections.length) {
      setSelectedSection(sections[0].id);
    }
  }, [sections, selectedSection]);

  const stats = React.useMemo(
    () =>
      buildLeaderboardScoreStats({
        sections,
        progress,
        quranAyahIndex: quranLastRead?.ayahIndex ?? 0,
        prayersDone,
        quickTasbeeh,
        todayISO: todayKey
      }),
    [prayersDone, progress, quranLastRead?.ayahIndex, quickTasbeeh, sections, todayKey]
  );

  const myStats = React.useMemo(() => {
    return {
      id: identity.id,
      name: identity.alias,
      score: stats.global,
      dhikr: stats.dhikr,
      quran: stats.quran,
      prayers: stats.prayers,
      tasbeehDailyLabel: stats.tasbeehDailyLabel,
      tasbeehDailyTarget: stats.tasbeehDailyTarget,
      tasbeehDailyScore: stats.tasbeehDailyScore,
      sectionScore: selectedSection ? stats.sectionScores[selectedSection] ?? 0 : 0,
      scores: stats.scores
    };
  }, [identity.alias, identity.id, selectedSection, stats]);

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

  const usingRemoteRows = !!endpoint && boardLoadState === "ok";

  const mergedRows = React.useMemo(() => {
    const source = usingRemoteRows ? remoteRows : localRows.length > 0 ? localRows : [myEntry];
    const all = serverHidden && usingRemoteRows ? source.filter((r) => r.id !== myEntry.id) : source;
    return all
      .filter((r) => r.board === board && (board !== "section" || r.sectionId === selectedSection))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [board, localRows, myEntry, remoteRows, selectedSection, serverHidden, usingRemoteRows]);

  const myRank = React.useMemo(() => {
    const idx = mergedRows.findIndex((r) => r.id === myEntry.id);
    if (idx >= 0) return idx + 1;
    return usingRemoteRows ? null : 1;
  }, [mergedRows, myEntry.id, usingRemoteRows]);

  React.useEffect(() => {
    const mine = remoteRows.find((row) => row.id === identity.id);
    if (mine) setServerHidden(false);
  }, [identity.id, remoteRows]);

  const pullBoard = React.useCallback(async () => {
    if (!endpoint) {
      setRemoteRows([]);
      setBoardLoadState("idle");
      return;
    }
    setBoardLoadState("loading");
    try {
      const rows = await fetchBoardRows({
        endpoint,
        board,
        period,
        sectionId: board === "section" ? selectedSection : undefined,
        day: todayKey
      });
      setRemoteRows(rows);
      setBoardLoadState("ok");
    } catch {
      setBoardLoadState("error");
    }
  }, [board, endpoint, period, selectedSection, todayKey]);

  React.useEffect(() => {
    void pullBoard();
  }, [pullBoard]);

  const submitScore = React.useCallback(async (options?: { bypassCooldown?: boolean; pullAfter?: boolean }) => {
    const bypassCooldown = options?.bypassCooldown === true;
    const pullAfter = options?.pullAfter !== false;

    if (!bypassCooldown && Date.now() - lastSubmitAt < COOLDOWN_MS) {
      setSyncState("cooldown");
      setSyncHint("انتظر قليلًا قبل الإرسال");
      return;
    }

    if (!bypassCooldown) {
      setLastSubmitAt(Date.now());
    }

    if (!endpoint) {
      await syncLeaderboardSnapshot("", todayKey, myStats.scores);
      setSyncState("error");
      setSyncHint("المزامنة السحابية غير مفعّلة");
      return;
    }

    setSyncState("syncing");
    const flush = await syncLeaderboardSnapshot(endpoint, todayKey, myStats.scores);
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

    if (flush.hidden) {
      setServerHidden(true);
      setSyncState("ok");
      setSyncHint("تمت المزامنة لكن الحساب مخفي حاليًا من اللوحة من جهة الإدارة");
      if (pullAfter) await pullBoard();
      return;
    }

    setServerHidden(false);
    setSyncState("ok");
    setSyncHint(flush.sent > 0 ? "تم تحديث نقاطك على الخادم" : "لا توجد تغييرات معلقة");
    if (pullAfter) await pullBoard();
  }, [endpoint, lastSubmitAt, myStats.scores, pullBoard, todayKey]);

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
            يُنشأ تلقائيًا لكل حساب باسم عشوائي موحّد، ولا يمكن تغييره يدويًا.
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
            <ShieldCheck size={14} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold">{identity.alias}</span>
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
            disabled={boardLoadState === "loading"}
          >
            <RotateCw size={16} className={boardLoadState === "loading" ? "animate-spin" : ""} />
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
                    : endpoint
                      ? "تحديث تلقائي بالخلفية"
                      : "محلي"}
          </span>
        </div>

        {endpoint && boardLoadState === "error" && (
          <div className="mt-3 rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-4 py-3 text-xs leading-6 text-[var(--danger)]">
            تعذر تحديث ترتيب اللوحة من الخادم حاليًا. ما يظهر الآن هو آخر بيانات محلية متاحة فقط.
          </div>
        )}

        {serverHidden && (
          <div className="mt-3 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-xs text-yellow-200 leading-6">
            هذا الحساب مخفي حاليًا من لوحة المتصدرين من جهة الإدارة. يمكنك التواصل مع المشرف إذا احتجت مراجعة الحالة.
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
          {mergedRows.length === 0 ? (
            <div className="glass rounded-3xl border border-white/10 px-4 py-5 text-sm opacity-70 leading-7 text-center">
              لا توجد نتائج منشورة لهذا التصنيف بعد. ابدأ بالمزامنة لرفع أول نتيجة.
            </div>
          ) : (
            mergedRows.map((r, idx) => (
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
                      {r.id === myEntry.id ? `أنت • انضممت: ${identity.joinedAt}` : (r.day ? `عضو • ${r.day}` : "عضو")}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{r.score}</div>
              </div>
            ))
          )}
        </div>
      </Card>

      {showAdminCard ? (
        <LeaderboardAdminCard
          endpoint={endpoint}
          rows={mergedRows}
          onRefreshBoard={pullBoard}
          onAdminAccessChange={() => setShowAdminCard(hasLocalLeaderboardAdminToken())}
        />
      ) : null}

      {/* L1: Local friends board */}
      <LocalFriendsCard myStats={{ id: myStats.id, alias: myStats.name, score: myStats.score, dhikr: myStats.dhikr, quran: myStats.quran, prayers: myStats.prayers }} />

      {/* L2: Group khatma */}
      <GroupKhatmaCard />

      {/* L3: Weekly challenge */}
      <WeeklyChallengeCard />
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

function LeaderboardAdminCard(props: {
  endpoint: string;
  rows: LeaderboardEntry[];
  onRefreshBoard: () => void | Promise<void>;
  onAdminAccessChange: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [tokenDraft, setTokenDraft] = React.useState(() => loadLeaderboardAdminToken());
  const [adminToken, setAdminToken] = React.useState(() => loadLeaderboardAdminToken());
  const [snapshot, setSnapshot] = React.useState<{ blocklist: LeaderboardAdminBlocklistRow[]; audits: LeaderboardAdminAliasAuditRow[] }>({
    blocklist: [],
    audits: []
  });
  const [adminTone, setAdminTone] = React.useState<"idle" | "ok" | "error">("idle");
  const [adminHint, setAdminHint] = React.useState("أدخل رمز الإدارة المخزن في سر Edge Function لإدارة الأسماء من داخل التطبيق.");
  const [loadingSnapshot, setLoadingSnapshot] = React.useState(false);
  const [loadingUser, setLoadingUser] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedUserLabel, setSelectedUserLabel] = React.useState("");
  const [userModeration, setUserModeration] = React.useState<LeaderboardAdminUserModeration | null>(null);
  const [hidden, setHidden] = React.useState(false);
  const [forcedAlias, setForcedAlias] = React.useState("");
  const [moderationReason, setModerationReason] = React.useState("");
  const [releaseAliasClaim, setReleaseAliasClaim] = React.useState(true);
  const [blockTerm, setBlockTerm] = React.useState("");
  const [blockNote, setBlockNote] = React.useState("");
  const [blockMatchMode, setBlockMatchMode] = React.useState<"contains" | "exact">("contains");
  const [confirmResetScores, setConfirmResetScores] = React.useState(false);
  const [resettingScores, setResettingScores] = React.useState(false);

  const hasEndpoint = !!props.endpoint;
  const hasAdminToken = adminToken.trim().length > 0;
  const forcedAliasValidation = React.useMemo(
    () => (forcedAlias.trim() ? validateLeaderboardAlias(forcedAlias) : null),
    [forcedAlias]
  );

  const loadSnapshot = React.useCallback(async () => {
    if (!props.endpoint || !adminToken.trim()) return;
    setLoadingSnapshot(true);
    try {
      const next = await fetchLeaderboardAdminSnapshot({
        endpoint: props.endpoint,
        adminToken,
        auditLimit: 16
      });
      setSnapshot(next);
      setAdminTone("ok");
      setAdminHint("تم تحميل بيانات الإدارة.");
    } catch (error) {
      setAdminTone("error");
      setAdminHint(`تعذر تحميل لوحة الإدارة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    } finally {
      setLoadingSnapshot(false);
    }
  }, [adminToken, props.endpoint]);

  React.useEffect(() => {
    if (!expanded || !hasEndpoint || !hasAdminToken) return;
    void loadSnapshot();
  }, [expanded, hasAdminToken, hasEndpoint, loadSnapshot]);

  const loadModerationForUser = React.useCallback(async (userId: string, fallbackLabel?: string) => {
    const cleanId = userId.trim();
    if (!cleanId || !props.endpoint || !adminToken.trim()) return;
    setLoadingUser(true);
    try {
      const row = await fetchLeaderboardAdminUserModeration({
        endpoint: props.endpoint,
        adminToken,
        userId: cleanId
      });
      setSelectedUserId(cleanId);
      setSelectedUserLabel(fallbackLabel ?? cleanId);
      setUserModeration(row);
      setHidden(row?.hidden ?? false);
      setForcedAlias(row?.forcedAlias ?? "");
      setModerationReason(row?.reason ?? "");
      setAdminTone("ok");
      setAdminHint(row ? "تم تحميل حالة المستخدم الحالية." : "لا توجد قواعد إدارة مخزنة لهذا المستخدم بعد.");
    } catch (error) {
      setAdminTone("error");
      setAdminHint(`تعذر تحميل بيانات المستخدم: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    } finally {
      setLoadingUser(false);
    }
  }, [adminToken, props.endpoint]);

  const saveAdminTokenLocally = () => {
    const saved = saveLeaderboardAdminToken(tokenDraft);
    setAdminToken(saved);
    setTokenDraft(saved);
    setAdminTone(saved ? "ok" : "idle");
    setAdminHint(saved ? "تم حفظ رمز الإدارة محليًا على هذا الجهاز فقط." : "تم مسح رمز الإدارة المحلي.");
    props.onAdminAccessChange();
    if (saved && expanded && hasEndpoint) {
      void loadSnapshot();
    }
  };

  const clearAdminTokenLocally = () => {
    clearLeaderboardAdminToken();
    setAdminToken("");
    setTokenDraft("");
    setSnapshot({ blocklist: [], audits: [] });
    setAdminTone("idle");
    setAdminHint("تم حذف رمز الإدارة من هذا الجهاز. لن تظهر لوحة الإدارة هنا مرة أخرى حتى يُحفظ الرمز محليًا من جديد.");
    props.onAdminAccessChange();
  };

  const submitBlockRule = async () => {
    if (!props.endpoint || !adminToken.trim()) return;
    if (!blockTerm.trim()) {
      setAdminTone("error");
      setAdminHint("أدخل الكلمة أو الاسم الذي تريد حظره.");
      return;
    }

    try {
      await submitLeaderboardAdminAction({
        endpoint: props.endpoint,
        adminToken,
        action: "upsertBlockTerm",
        payload: {
          term: blockTerm,
          matchMode: blockMatchMode,
          note: blockNote
        }
      });
      setBlockTerm("");
      setBlockNote("");
      setAdminTone("ok");
      setAdminHint("تم حفظ قاعدة الحظر.");
      await loadSnapshot();
    } catch (error) {
      setAdminTone("error");
      setAdminHint(`تعذر حفظ قاعدة الحظر: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    }
  };

  const removeBlockRule = async (id: number) => {
    if (!props.endpoint || !adminToken.trim()) return;
    try {
      await submitLeaderboardAdminAction({
        endpoint: props.endpoint,
        adminToken,
        action: "deleteBlockTerm",
        payload: { id }
      });
      setAdminTone("ok");
      setAdminHint("تم حذف القاعدة.");
      await loadSnapshot();
    } catch (error) {
      setAdminTone("error");
      setAdminHint(`تعذر حذف القاعدة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    }
  };

  const saveUserModeration = async () => {
    if (!props.endpoint || !adminToken.trim()) return;
    if (!selectedUserId.trim()) {
      setAdminTone("error");
      setAdminHint("اختر مستخدمًا أو أدخل معرفه أولًا.");
      return;
    }

    if (forcedAliasValidation && !forcedAliasValidation.ok) {
      setAdminTone("error");
      setAdminHint(`الاسم الإجباري غير صالح: ${forcedAliasValidation.message}`);
      return;
    }

    try {
      const response = await submitLeaderboardAdminAction({
        endpoint: props.endpoint,
        adminToken,
        action: "setUserModeration",
        payload: {
          userId: selectedUserId,
          hidden,
          forcedAlias,
          reason: moderationReason
        }
      });
      const row = (response.userModeration as Record<string, unknown> | undefined) ?? null;
      setUserModeration(
        row
          ? {
              userId: String(row.userId ?? selectedUserId),
              hidden: row.hidden === true,
              forcedAlias: typeof row.forcedAlias === "string" ? row.forcedAlias : null,
              reason: typeof row.reason === "string" ? row.reason : null,
              updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined
            }
          : null
      );
      setAdminTone("ok");
      setAdminHint("تم حفظ إعدادات المستخدم.");
      await loadSnapshot();
      await props.onRefreshBoard();
    } catch (error) {
      setAdminTone("error");
      setAdminHint(`تعذر حفظ إدارة المستخدم: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    }
  };

  const clearUserModerationState = async () => {
    if (!props.endpoint || !adminToken.trim()) return;
    if (!selectedUserId.trim()) {
      setAdminTone("error");
      setAdminHint("اختر مستخدمًا أو أدخل معرفه أولًا.");
      return;
    }

    try {
      await submitLeaderboardAdminAction({
        endpoint: props.endpoint,
        adminToken,
        action: "clearUserModeration",
        payload: {
          userId: selectedUserId,
          releaseAliasClaim
        }
      });
      setUserModeration(null);
      setHidden(false);
      setForcedAlias("");
      setModerationReason("");
      setAdminTone("ok");
      setAdminHint(releaseAliasClaim ? "تمت إزالة الإدارة وتم تحرير الاسم المحجوز." : "تمت إزالة إدارة المستخدم.");
      await loadSnapshot();
      await props.onRefreshBoard();
    } catch (error) {
      setAdminTone("error");
      setAdminHint(`تعذر إزالة الإدارة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    }
  };

  const resetLeaderboardScores = async () => {
    if (!props.endpoint || !adminToken.trim()) return;
    setResettingScores(true);
    try {
      await submitLeaderboardAdminAction({
        endpoint: props.endpoint,
        adminToken,
        action: "resetLeaderboardScores"
      });
      setConfirmResetScores(false);
      setAdminTone("ok");
      setAdminHint("تم تصفير نقاط لوحة المتصدرين مع الإبقاء على قواعد الحظر والمراجعات.");
      await props.onRefreshBoard();
    } catch (error) {
      setAdminTone("error");
      setAdminHint(`تعذر تصفير المتصدرين: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    } finally {
      setResettingScores(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--accent)]" />
            <div className="text-sm font-semibold">إدارة المتصدرين</div>
          </div>
          <div className="mt-1 text-[11px] opacity-60">
            تحكم سريع في حظر الأسماء، الإخفاء، والاسم الإجباري من داخل التطبيق.
          </div>
        </div>
        <Button variant={expanded ? "secondary" : "outline"} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "إخفاء" : "فتح"}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {!hasEndpoint ? (
            <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-xs text-yellow-200 leading-6">
              لا يمكن استخدام لوحة الإدارة قبل ضبط VITE_LEADERBOARD_ENDPOINT وربطها بدالة Supabase المنشورة.
            </div>
          ) : null}

          <div className="rounded-3xl border border-white/10 bg-white/4 p-4 space-y-3">
            <div className="text-sm font-semibold">رمز الإدارة</div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                type="password"
                value={tokenDraft}
                onChange={(e) => setTokenDraft(e.target.value)}
                placeholder="LEADERBOARD_ADMIN_TOKEN"
              />
              <Button onClick={saveAdminTokenLocally} disabled={!hasEndpoint}>
                حفظ الرمز
              </Button>
              <Button variant="outline" onClick={clearAdminTokenLocally}>
                مسح
              </Button>
              <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={!hasAdminToken || !hasEndpoint || loadingSnapshot}>
                {loadingSnapshot ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                تحديث الإدارة
              </Button>
            </div>
            <div
              className={cn(
                "text-[11px] leading-5",
                adminTone === "error" ? "text-[var(--danger)]" : adminTone === "ok" ? "text-[var(--ok)]" : "opacity-60"
              )}
            >
              {adminHint}
            </div>
          </div>

          {hasAdminToken && hasEndpoint && (
            <>
              <div className="rounded-3xl border border-[var(--danger)]/20 bg-[var(--danger)]/8 p-4 space-y-3">
                <div className="text-sm font-semibold text-[var(--danger)]">إعادة تشغيل اللوحة</div>
                <div className="text-[11px] leading-6 opacity-75">
                  هذا الإجراء يمسح جميع النقاط المنشورة وسجل النتائج من الخادم، لكنه يُبقي قواعد الحظر ومراجعات الأسماء كما هي.
                </div>
                {confirmResetScores ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void resetLeaderboardScores()} disabled={resettingScores}>
                      {resettingScores ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      تأكيد التصفير الكامل
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmResetScores(false)} disabled={resettingScores}>
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setConfirmResetScores(true)}>
                    <Trash2 size={16} />
                    تصفير لوحة المتصدرين
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/4 p-4 space-y-3">
                  <div className="text-sm font-semibold">حظر أسماء أو كلمات</div>
                  <div className="flex gap-2 flex-wrap">
                    <BoardTab label="احتواء" active={blockMatchMode === "contains"} onClick={() => setBlockMatchMode("contains")} />
                    <BoardTab label="مطابقة تامة" active={blockMatchMode === "exact"} onClick={() => setBlockMatchMode("exact")} />
                  </div>
                  <Input value={blockTerm} onChange={(e) => setBlockTerm(e.target.value)} placeholder="الكلمة أو الاسم الممنوع" />
                  <Input value={blockNote} onChange={(e) => setBlockNote(e.target.value)} placeholder="ملاحظة داخلية اختيارية" />
                  <Button onClick={() => void submitBlockRule()} disabled={!blockTerm.trim()}>
                    إضافة قاعدة
                  </Button>

                  <div className="space-y-2 max-h-64 overflow-auto">
                    {snapshot.blocklist.length === 0 ? (
                      <div className="text-xs opacity-50">لا توجد قواعد حظر بعد.</div>
                    ) : (
                      snapshot.blocklist.map((rule) => (
                        <div key={rule.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium break-words">{rule.term}</div>
                            <div className="mt-1 text-[11px] opacity-55">
                              {rule.matchMode === "exact" ? "مطابقة تامة" : "احتواء"}
                              {rule.note ? ` • ${rule.note}` : ""}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => void removeBlockRule(rule.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/4 p-4 space-y-3">
                  <div className="text-sm font-semibold">إدارة مستخدم</div>
                  <Input
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    placeholder="معرّف المستخدم"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => void loadModerationForUser(selectedUserId, selectedUserLabel || selectedUserId)}
                      disabled={!selectedUserId.trim() || loadingUser}
                    >
                      {loadingUser ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                      تحميل الحالة
                    </Button>
                    {props.rows.slice(0, 6).map((row) => (
                      <Button
                        key={`admin-${row.id}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => void loadModerationForUser(row.id, row.name)}
                      >
                        {row.name}
                      </Button>
                    ))}
                  </div>

                  {selectedUserLabel ? (
                    <div className="text-[11px] opacity-55">المستخدم المحدد: {selectedUserLabel}</div>
                  ) : null}

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">إخفاء من اللوحة</div>
                      <div className="text-[11px] opacity-50">لن يظهر في القراءة العامة حتى تلغي الإخفاء.</div>
                    </div>
                    <Switch checked={hidden} onCheckedChange={(v) => setHidden(!!v)} />
                  </div>

                  <Input
                    value={forcedAlias}
                    onChange={(e) => setForcedAlias(e.target.value)}
                    placeholder="اسم إجباري آمن (اختياري)"
                  />
                  {forcedAliasValidation && !forcedAliasValidation.ok ? (
                    <div className="text-[11px] text-[var(--danger)]">{forcedAliasValidation.message}</div>
                  ) : null}

                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="سبب داخلي للمراجعة"
                    className="w-full min-h-[90px] rounded-3xl bg-white/6 border border-white/10 p-4 text-sm leading-7 outline-none focus:border-white/20"
                  />

                  {userModeration?.updatedAt ? (
                    <div className="text-[11px] opacity-50">آخر تحديث: {new Date(userModeration.updatedAt).toLocaleString("ar-SA")}</div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <div className="text-[11px] opacity-60">حرر الاسم المحجوز عند إزالة الإدارة</div>
                    <Switch checked={releaseAliasClaim} onCheckedChange={(v) => setReleaseAliasClaim(!!v)} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void saveUserModeration()} disabled={!selectedUserId.trim()}>
                      حفظ إدارة المستخدم
                    </Button>
                    <Button variant="outline" onClick={() => void clearUserModerationState()} disabled={!selectedUserId.trim()}>
                      إزالة الإدارة
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
                <div className="text-sm font-semibold mb-3">آخر مراجعات الأسماء</div>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {snapshot.audits.length === 0 ? (
                    <div className="text-xs opacity-50">لا توجد سجلات مراجعة بعد.</div>
                  ) : (
                    snapshot.audits.map((audit) => (
                      <div key={audit.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium break-words">{audit.resolvedAlias}</div>
                          <div className="mt-1 text-[11px] opacity-55 break-words">
                            المطلوب: {audit.requestedAlias || "—"} • الحالة: {audit.status}
                            {audit.reason ? ` • ${audit.reason}` : ""}
                          </div>
                          <div className="mt-1 text-[10px] opacity-45 break-all">{audit.userId}</div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => void loadModerationForUser(audit.userId, audit.resolvedAlias)}>
                          اختيار
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── L1: Local Friends Board ───────────────────────────────────────────────

function LocalFriendsCard(props: {
  myStats: Pick<LocalFriend, "id" | "alias" | "score" | "dhikr" | "quran" | "prayers">;
}) {
  const localFriends = useNoorStore((s) => s.localFriends);
  const addLocalFriend = useNoorStore((s) => s.addLocalFriend);
  const removeLocalFriend = useNoorStore((s) => s.removeLocalFriend);

  const [importCode, setImportCode] = React.useState("");
  const [importError, setImportError] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const myExportCode = React.useMemo(() => {
    const payload: LocalFriend = { ...props.myStats, addedAt: new Date().toISOString() };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }, [props.myStats]);

  const copyMyCode = async () => {
    try {
      await navigator.clipboard.writeText(myExportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setImportError("تعذر النسخ. انسخ الكود يدويًا.");
    }
  };

  const handleImport = () => {
    setImportError("");
    try {
      const json = decodeURIComponent(escape(atob(importCode.trim())));
      const data = JSON.parse(json) as Partial<LocalFriend>;
      if (!data.id || !data.alias || typeof data.score !== "number") {
        setImportError("الكود غير صالح أو غير مكتمل.");
        return;
      }
      if (data.id === props.myStats.id) {
        setImportError("لا يمكنك إضافة نفسك كصديق.");
        return;
      }
      if (localFriends.some((f) => f.id === data.id)) {
        setImportError("هذا الصديق مضاف مسبقًا.");
        return;
      }
      addLocalFriend({
        id: data.id,
        alias: data.alias,
        score: data.score,
        dhikr: data.dhikr ?? 0,
        quran: data.quran ?? 0,
        prayers: data.prayers ?? 0,
        addedAt: new Date().toISOString()
      });
      setImportCode("");
    } catch {
      setImportError("الكود غير صالح. تحقق من أنك لصقت الكود كاملًا.");
    }
  };

  const allRows = React.useMemo(() => {
    const me: LocalFriend = { ...props.myStats, addedAt: "" };
    return [...localFriends, me].sort((a, b) => b.score - a.score);
  }, [localFriends, props.myStats]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[var(--accent)]" />
          <div className="text-sm font-semibold">لوحة الأصدقاء</div>
          {localFriends.length > 0 && (
            <span className="text-[10px] opacity-50 tabular-nums">{localFriends.length} صديق</span>
          )}
        </div>
        <Button variant="secondary" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "إخفاء" : "إدارة"}
        </Button>
      </div>

      {/* Friend list */}
      <div className="mt-3 space-y-2">
        {allRows.length === 0 ? (
          <div className="text-xs opacity-50 text-center py-3">أضف أصدقاء لمقارنة تقدمكم المشترك.</div>
        ) : (
          allRows.map((f, idx) => (
            <div
              key={f.id}
              className={cn(
                "glass rounded-3xl p-3 border flex items-center justify-between gap-3",
                f.id === props.myStats.id ? "border-[var(--accent)]/35 bg-[var(--accent)]/8" : "border-white/10"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{f.alias}</div>
                  <div className="text-[10px] opacity-50 tabular-nums">ذكر {f.dhikr} · قرآن {f.quran} · صلاة {f.prayers}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold tabular-nums">{f.score}</div>
                {f.id !== props.myStats.id && (
                  <button
                    type="button"
                    onClick={() => removeLocalFriend(f.id)}
                    className="text-[var(--danger)] opacity-50 hover:opacity-100 transition"
                    aria-label="حذف الصديق"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import / export area */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
          <div>
            <div className="text-xs font-semibold mb-2">كود مشاركتي</div>
            <div className="flex gap-2">
              <code className="flex-1 text-[10px] break-all bg-white/5 border border-white/10 rounded-2xl px-3 py-2 leading-5 opacity-70 select-all">
                {myExportCode}
              </code>
              <Button variant="secondary" onClick={() => void copyMyCode()} aria-label="نسخ الكود">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <div className="mt-1 text-[10px] opacity-40">شارك هذا الكود مع صديق ليضيفك إلى لوحته.</div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-2">إضافة صديق</div>
            <div className="flex gap-2">
              <Input
                value={importCode}
                onChange={(e) => { setImportCode(e.target.value); setImportError(""); }}
                placeholder="الصق كود الصديق هنا"
              />
              <Button onClick={handleImport} disabled={!importCode.trim()}>
                <Plus size={14} />
                إضافة
              </Button>
            </div>
            {importError && <div className="mt-1 text-xs text-[var(--danger)]">{importError}</div>}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── L2: Group Khatma ──────────────────────────────────────────────────────

function GroupKhatmaCard() {
  const groupKhatma = useNoorStore((s) => s.groupKhatma);
  const setGroupKhatma = useNoorStore((s) => s.setGroupKhatma);
  const toggleGroupKhatmaJuz = useNoorStore((s) => s.toggleGroupKhatmaJuz);

  const [groupName, setGroupName] = React.useState("");
  const [membersRaw, setMembersRaw] = React.useState("");
  const [importCode, setImportCode] = React.useState("");
  const [importError, setImportError] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [mode, setMode] = React.useState<"view" | "create" | "import">("view");

  const MEMBER_COLORS = ["#fbbf24", "#34d399", "#f472b6", "#60a5fa", "#a78bfa", "#fb923c", "#2dd4bf"];

  const createGroup = () => {
    const names = membersRaw
      .split(/\n|،|,/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!groupName.trim() || names.length < 2) return;

    const juzPerMember = Math.floor(30 / names.length);
    const extra = 30 - juzPerMember * names.length;

    let juzCursor = 1;
    const members = names.map((name, i) => {
      const count = juzPerMember + (i < extra ? 1 : 0);
      const assignedJuz: number[] = [];
      for (let j = 0; j < count; j++) assignedJuz.push(juzCursor++);
      return { memberId: `m${i}`, name, assignedJuz, completedJuz: [] as number[] };
    });

    setGroupKhatma({
      groupId: Math.random().toString(36).slice(2),
      groupName: groupName.trim(),
      members,
      createdAt: new Date().toISOString()
    });
    setMode("view");
    setGroupName("");
    setMembersRaw("");
  };

  const shareCode = React.useMemo(() => {
    if (!groupKhatma) return "";
    return btoa(unescape(encodeURIComponent(JSON.stringify(groupKhatma))));
  }, [groupKhatma]);

  const copyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleImport = () => {
    setImportError("");
    try {
      const json = decodeURIComponent(escape(atob(importCode.trim())));
      const data = JSON.parse(json) as { groupId?: string; groupName?: string; members?: unknown[] };
      if (!data.groupId || !data.groupName || !Array.isArray(data.members)) {
        setImportError("كود المجموعة غير صالح.");
        return;
      }
      setGroupKhatma(data as Parameters<typeof setGroupKhatma>[0]);
      setImportCode("");
      setMode("view");
    } catch {
      setImportError("الكود غير صالح.");
    }
  };

  const totalJuz = groupKhatma
    ? groupKhatma.members.reduce((s, m) => s + m.completedJuz.length, 0)
    : 0;
  const completionPct = groupKhatma ? Math.round((totalJuz / 30) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookMarked size={16} className="text-[var(--accent)]" />
          <div className="text-sm font-semibold">ختمة جماعية</div>
          {groupKhatma && (
            <span className="text-[10px] opacity-50">{groupKhatma.groupName}</span>
          )}
        </div>
        {!groupKhatma ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMode(mode === "create" ? "view" : "create")}>إنشاء</Button>
            <Button variant="outline" onClick={() => setMode(mode === "import" ? "view" : "import")}>استيراد</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void copyShareCode()} aria-label="مشاركة كود الختمة">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "تم" : "كود المشاركة"}
            </Button>
            <button
              type="button"
              onClick={() => setGroupKhatma(null as unknown as Parameters<typeof setGroupKhatma>[0])}
              className="text-[var(--danger)] opacity-50 hover:opacity-100 transition"
              aria-label="حذف الختمة"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Create form */}
      {mode === "create" && !groupKhatma && (
        <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
          <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="اسم الختمة (مثال: ختمة رمضان)" />
          <textarea
            value={membersRaw}
            onChange={(e) => setMembersRaw(e.target.value)}
            placeholder={"أسماء الأعضاء (سطر لكل اسم)\nمثال:\nعبدالله\nفاطمة\nأحمد"}
            className="w-full min-h-[90px] rounded-3xl bg-white/6 border border-white/10 p-4 text-sm leading-7 outline-none focus:border-white/20"
          />
          <div className="text-[11px] opacity-45">سيتم توزيع الأجزاء الثلاثين تلقائيًا على الأعضاء.</div>
          <Button onClick={createGroup} disabled={!groupName.trim() || membersRaw.trim().split(/\n|،|,/).filter(Boolean).length < 2}>
            إنشاء الختمة
          </Button>
        </div>
      )}

      {/* Import form */}
      {mode === "import" && !groupKhatma && (
        <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
          <Input value={importCode} onChange={(e) => { setImportCode(e.target.value); setImportError(""); }} placeholder="الصق كود الختمة هنا" />
          {importError && <div className="text-xs text-[var(--danger)]">{importError}</div>}
          <Button onClick={handleImport} disabled={!importCode.trim()}>استيراد الختمة</Button>
        </div>
      )}

      {/* Khatma view */}
      {groupKhatma && (
        <div className="mt-4">
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%`, background: "var(--ok)" }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums" style={{ color: completionPct >= 100 ? "var(--ok)" : undefined }}>
              {totalJuz}/30
            </span>
          </div>

          {/* Members legend */}
          <div className="flex flex-wrap gap-2 mb-3">
            {groupKhatma.members.map((m, mi) => (
              <div key={m.memberId} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: MEMBER_COLORS[mi % MEMBER_COLORS.length] }} />
                <span className="opacity-75">{m.name}</span>
                <span className="opacity-45 tabular-nums">({m.completedJuz.length}/{m.assignedJuz.length})</span>
              </div>
            ))}
          </div>

          {/* 30-Juz grid */}
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
              const owner = groupKhatma.members.find((m) => m.assignedJuz.includes(juz));
              const ownerIdx = owner ? groupKhatma.members.indexOf(owner) : -1;
              const done = owner ? owner.completedJuz.includes(juz) : false;
              const color = owner ? MEMBER_COLORS[ownerIdx % MEMBER_COLORS.length] : "#ffffff22";

              return (
                <button
                  key={juz}
                  type="button"
                  onClick={() => { if (owner) toggleGroupKhatmaJuz(owner.memberId, juz); }}
                  className="relative aspect-square rounded-xl border text-xs font-semibold flex items-center justify-center transition-all"
                  style={{
                    background: done ? `${color}40` : "rgba(255,255,255,0.04)",
                    borderColor: done ? color : "rgba(255,255,255,0.1)",
                    color: done ? color : "rgba(255,255,255,0.5)",
                  }}
                  title={owner ? `${owner.name} — جزء ${juz}` : `جزء ${juz}`}
                >
                  {done ? <Check size={10} strokeWidth={3} style={{ color }} /> : juz}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── L3: Weekly Challenge ──────────────────────────────────────────────────

function WeeklyChallengeCard() {
  const weeklyChallenge = useNoorStore((s) => s.weeklyChallenge);
  const setWeeklyChallenge = useNoorStore((s) => s.setWeeklyChallenge);
  const toggleWeeklyChallengeDay = useNoorStore((s) => s.toggleWeeklyChallengeDay);

  const today = React.useMemo(() => new Date(), []);

  const getISOWeek = (d: Date): number => {
    const tmp = new Date(d.getTime());
    tmp.setHours(0, 0, 0, 0);
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const week1 = new Date(tmp.getFullYear(), 0, 4);
    return 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  };

  const currentWeekISO = `${today.getFullYear()}-W${String(getISOWeek(today)).padStart(2, "0")}`;
  const challengeType = getISOWeek(today) % 2 === 0 ? "al_kahf" : "morning_adhkar_5days";

  // Auto-initialize / reset if week changed
  React.useEffect(() => {
    if (!weeklyChallenge || weeklyChallenge.weekISO !== currentWeekISO || weeklyChallenge.type !== challengeType) {
      setWeeklyChallenge({ type: challengeType, weekISO: currentWeekISO, progress: {}, completed: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekISO, challengeType]);

  const dateKey = (d: Date) => d.toISOString().slice(0, 10);

  const last7Days = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return { key: dateKey(d), label: d.toLocaleDateString("ar-SA", { weekday: "short" }), isToday: i === 6 };
    });
  }, [today]);

  const daysChecked = weeklyChallenge
    ? last7Days.filter((d) => weeklyChallenge.progress[d.key]).length
    : 0;
  const isCompleted = weeklyChallenge?.completed ?? false;
  const targetDays = challengeType === "morning_adhkar_5days" ? 5 : 1;

  const challengeInfo = {
    al_kahf: {
      title: "اقرأ سورة الكهف",
      desc: "أتمّ قراءة سورة الكهف هذا الأسبوع",
      emoji: "📖",
      target: "مرة واحدة هذا الأسبوع"
    },
    morning_adhkar_5days: {
      title: "أذكار الصباح ٥ أيام",
      desc: "داوم على أذكار الصباح ٥ أيام من هذا الأسبوع",
      emoji: "🌅",
      target: "٥ أيام من ٧"
    }
  } as const;

  const info = challengeInfo[challengeType];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} className="text-[var(--accent)]" />
        <div className="text-sm font-semibold">تحدي الأسبوع</div>
        {isCompleted && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--ok)]/15 border border-[var(--ok)]/30 text-[var(--ok)] mr-auto">
            ✓ مكتمل
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl border"
            style={{
              background: isCompleted ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
              borderColor: isCompleted ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"
            }}
          >
            {info.emoji}
          </div>
          <div>
            <div className="text-sm font-semibold">{info.title}</div>
            <div className="text-[11px] opacity-55 mt-0.5">{info.desc}</div>
            <div className="text-[11px] opacity-40 mt-0.5">الهدف: {info.target}</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (daysChecked / targetDays) * 100)}%`,
              background: isCompleted ? "var(--ok)" : "var(--accent)"
            }}
          />
        </div>
        <span className="text-[11px] opacity-60 tabular-nums">{daysChecked}/{targetDays}</span>
      </div>

      {/* Day toggles */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {last7Days.map((day) => {
          const done = weeklyChallenge?.progress[day.key] ?? false;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleWeeklyChallengeDay(day.key)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl border transition-all"
              style={{
                background: done ? "rgba(52,211,153,0.15)" : day.isToday ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                borderColor: done ? "rgba(52,211,153,0.4)" : day.isToday ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"
              }}
              aria-label={`${day.label}: ${done ? "مكتمل" : "غير مكتمل"}`}
            >
              <span className="text-[8px] opacity-60">{day.label}</span>
              <span className="text-xs">
                {done
                  ? <Check size={12} strokeWidth={3} style={{ color: "var(--ok)" }} />
                  : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "8px" }}>·</span>}
              </span>
            </button>
          );
        })}
      </div>

      {isCompleted && (
        <div className="mt-3 rounded-2xl border border-[var(--ok)]/25 bg-[var(--ok)]/8 px-4 py-3 text-sm text-center" style={{ color: "var(--ok)" }}>
          أحسنت! أتممت تحدي هذا الأسبوع 🎉
        </div>
      )}
    </Card>
  );
}
