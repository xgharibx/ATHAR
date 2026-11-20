import * as React from "react";
import { Trophy, Send, RotateCw, Loader2, CheckCircle2, AlertCircle, Clock, ShieldCheck, Trash2, Users, Calendar, Check, Copy, Plus, Share2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { buildLeaderboardScoreStatsForDay } from "@/lib/leaderboardScores";
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
  isRateLimited,
  clearRateLimitBackoff,
  validateLeaderboardAlias,
  type LeaderboardAdminAliasAuditRow,
  type LeaderboardAdminBlocklistRow,
  type LeaderboardAdminUserModeration, LEADERBOARD_SUBMITTED_EVENT, BOARD_REFRESH_MS } from "@/lib/leaderboard";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { arNum, arFullDate } from "@/lib/formatNumber";
import { accountScopedLocalStorage } from "@/lib/accountStorageScope";
import { writeClipboard } from "@/lib/nativeUI";
import { shareOrCopy } from "@/lib/shareTargets";
import { readFriendCode } from "@/lib/friendCode";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SharedKhatmaCard } from "@/components/leaderboard/SharedKhatmaCard";
import { isKhatmaCode, normalizeKhatmaCode } from "@/lib/groupKhatma";
import { getLocalDateKey } from "@/lib/dayBoundaries";
import { WEEKLY_CHALLENGES, challengeOfWeek, challengeStatus, weekStartOf } from "@/lib/weeklyChallenge";


const COOLDOWN_MS = 45_000;
const LAST_SUBMIT_KEY = "noor_lb_last_submit_at";

type BoardLoadState = "idle" | "loading" | "ok" | "error";

export function LeaderboardPage() {
  const { data } = useAdhkarDB();
  useScrollRestoration();
  // An invitation link («/leaderboard?khatma=ABCD2345») opens the khatma's join form.
  const [searchParams] = useSearchParams();
  const khatmaParam = searchParams.get("khatma");
  const khatmaInvite = khatmaParam && isKhatmaCode(khatmaParam) ? normalizeKhatmaCode(khatmaParam) : null;
  React.useEffect(() => {
    if (!khatmaInvite) return;
    const timer = window.setTimeout(() => document.getElementById("group-khatma")?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    return () => window.clearTimeout(timer);
  }, [khatmaInvite]);
  const prayerTimes = usePrayerTimes();
  const lastKnownFajrTime = useNoorStore((s) => s.lastKnownFajrTime);
  const effectiveFajr = prayerTimes.data?.data?.timings?.Fajr ?? lastKnownFajrTime ?? undefined;
  const todayKey = useTodayKey({ mode: "ibadah", fajrTime: effectiveFajr });
  const civilTodayKey = useTodayKey();
  const progress = useNoorStore((s) => s.progress);
  const customPacks = useNoorStore((s) => s.customPacks);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const dailyChecklist = useNoorStore((s) => s.dailyChecklist);
  const prayerLog = useNoorStore((s) => s.prayerLog);
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const tasbeehDayTotals = useNoorStore((s) => s.tasbeehDayTotals);

  const endpoint = (import.meta.env.VITE_LEADERBOARD_ENDPOINT as string | undefined) ?? "";
  const [identity] = React.useState(() => getLeaderboardIdentity());
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [board, setBoard] = React.useState<LeaderboardBoard>("global");
  const [period, setPeriod] = React.useState<LeaderboardPeriod>("daily");
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [remoteRows, setRemoteRows] = React.useState<LeaderboardEntry[]>([]);
  const [boardLoadState, setBoardLoadState] = React.useState<BoardLoadState>(endpoint ? "loading" : "idle");
  const [syncState, setSyncState] = React.useState<"idle" | "syncing" | "ok" | "error" | "cooldown">("idle");
  const [syncHint, setSyncHint] = React.useState("");
  const [lastSubmitAt, setLastSubmitAt] = React.useState(() => {
    try { return Number(accountScopedLocalStorage.getItem(LAST_SUBMIT_KEY) ?? "0"); } catch { return 0; }
  });
  const persistLastSubmitAt = React.useCallback((ts: number) => {
    setLastSubmitAt(ts);
    try { accountScopedLocalStorage.setItem(LAST_SUBMIT_KEY, String(ts)); } catch { /* ignore */ }
  }, []);
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
      buildLeaderboardScoreStatsForDay({
        sections,
        customPacks,
        progress,
        quranDailyAyahs,
        dailyChecklist,
        prayerLog,
        quickTasbeeh,
        tasbeehDayTotals,
        todayISO: todayKey,
        civilTodayISO: civilTodayKey,
      }),
    [civilTodayKey, customPacks, dailyChecklist, prayerLog, progress, quranDailyAyahs, quickTasbeeh, sections, tasbeehDayTotals, todayKey]
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
      scores: stats.scores,
      // The raw components, so a manual submission is scored by the server on
      // the same terms as an automatic one.
      metrics: stats.metrics
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
      joinedAt: identity.joinedAt,
      sectionId: board === "section" ? selectedSection : undefined
    }) satisfies LeaderboardEntry,
    [board, identity.joinedAt, myBoardScore, myStats.id, myStats.name, selectedSection, todayKey]
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
      .filter((r) => r.board === board && (board !== "section" || !selectedSection || r.sectionId === selectedSection))
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
      if (mountedRef.current) {
        setRemoteRows(rows);
        setBoardLoadState("ok");
      }
    } catch {
      if (mountedRef.current) setBoardLoadState("error");
    }
  }, [board, endpoint, period, selectedSection, todayKey]);

  React.useEffect(() => {
    void pullBoard();
  }, [pullBoard]);

  /**
   * Keep the standings live while someone is looking at them.
   *
   * The board used to load once, on mount, and then sit there. Scores were
   * already being posted automatically in the background — but the ranking on
   * screen never moved, so the only way to see any change was to press تحديث,
   * which made the whole thing feel manual when only the *view* was.
   *
   * Refreshes on returning to the app, and on a slow tick while visible. The
   * tick is deliberately unhurried and stops dead when the page is hidden: a
   * leaderboard left open in a background tab must not sit polling a server all
   * day on someone's mobile data.
   */
  React.useEffect(() => {
    if (!endpoint) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "hidden") return;
      void pullBoard();
    };

    // The bridge posts on its own; this is how the board hears that it did.
    const onSubmitted = () => refreshIfVisible();

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener(LEADERBOARD_SUBMITTED_EVENT, onSubmitted);
    const tick = window.setInterval(refreshIfVisible, BOARD_REFRESH_MS);

    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener(LEADERBOARD_SUBMITTED_EVENT, onSubmitted);
      window.clearInterval(tick);
    };
  }, [endpoint, pullBoard]);

  const submitScore = React.useCallback(async (options?: { bypassCooldown?: boolean; pullAfter?: boolean }) => {
    const bypassCooldown = options?.bypassCooldown === true;
    const pullAfter = options?.pullAfter !== false;

    if (!bypassCooldown && Date.now() - lastSubmitAt < COOLDOWN_MS) {
      setSyncState("cooldown");
      setSyncHint("انتظر قليلًا قبل الإرسال");
      return;
    }

    if (!bypassCooldown && isRateLimited()) {
      setSyncState("error");
      setSyncHint("الخادم قيّد الطلبات مؤقتًا، أعد المحاولة بعد قليل");
      return;
    }

    if (!bypassCooldown) {
      persistLastSubmitAt(Date.now());
    }

    if (!endpoint) {
      await syncLeaderboardSnapshot("", todayKey, myStats.scores, myStats.metrics);
      setSyncState("error");
      setSyncHint("المزامنة السحابية غير مفعّلة");
      return;
    }

    setSyncState("syncing");
    const flush = await syncLeaderboardSnapshot(endpoint, todayKey, myStats.scores, myStats.metrics);
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
    clearRateLimitBackoff();
    setSyncHint(flush.sent > 0 ? "تم تحديث نقاطك على الخادم" : "لا توجد تغييرات معلقة");
    if (pullAfter) await pullBoard();
  }, [endpoint, lastSubmitAt, myStats.scores, myStats.metrics, persistLastSubmitAt, pullBoard, todayKey]);

  return (
    <div className="stack-y-4 page-enter">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold leading-none">لوحة المتصدرين</h1>
            <div className="text-xs opacity-65 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-(--accent) inline-block opacity-80" />
              {identity.alias}
            </div>
          </div>
          <Trophy size={18} aria-hidden="true" className="text-(--accent)" />
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat title="النقاط" value={myStats.score} />
          <Stat title="الذكر" value={myStats.dhikr} />
          <Stat title="القرآن" value={myStats.quran} />
          <Stat title="المهام اليومية" value={myStats.prayers} />
        </div>

        <div className="mt-4 rounded-3xl border border-(--stroke) bg-(--card) p-4">
          <div className="text-sm font-semibold">اسم الظهور</div>
          <div className="mt-1 text-[11px] opacity-60">
            يُنشأ تلقائيًا لكل حساب باسم عشوائي موحّد، ولا يمكن تغييره يدويًا.
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-(--stroke) bg-(--card-2) px-3 py-2">
            <ShieldCheck size={14} aria-hidden="true" className="text-(--accent)" />
            <span className="text-sm font-semibold">{identity.alias}</span>
          </div>
        </div>

        <div className="mt-3 text-xs opacity-75">
          {/* Every phrase counts now, not just one chosen for the day, so the
              copy names the ceiling rather than a single dhikr. */}
          تسبيح اليوم: <span className="font-semibold">{arNum(myStats.tasbeehDailyScore)}</span> من {arNum(myStats.tasbeehDailyTarget)} — كل التسبيح يُحتسب
        </div>
        <div className="mt-1 text-[11px] opacity-45">
          الصيغة: ذكر + قرآن×٣ + مهام×٤٠ + تسبيح
        </div>

        <div role="tablist" aria-orientation="horizontal" aria-label="الفترة الزمنية" className="mt-3 flex flex-wrap gap-2"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
          <BoardTab label="يومي" active={period === "daily"} onClick={() => setPeriod("daily")} controls="lb-board-panel" />
          <BoardTab label="أسبوعي" active={period === "weekly"} onClick={() => setPeriod("weekly")} controls="lb-board-panel" />
          <BoardTab label="شهري" active={period === "monthly"} onClick={() => setPeriod("monthly")} controls="lb-board-panel" />
          <BoardTab label="سنوي" active={period === "yearly"} onClick={() => setPeriod("yearly")} controls="lb-board-panel" />
        </div>

        <div role="tablist" aria-orientation="horizontal" aria-label="نوع اللوحة" className="mt-3 flex flex-wrap gap-2"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
          <BoardTab label="الذكر" active={board === "dhikr"} onClick={() => setBoard("dhikr")} controls="lb-board-panel" />
          <BoardTab label="القرآن" active={board === "quran"} onClick={() => setBoard("quran")} controls="lb-board-panel" />
          <BoardTab label="المهام اليومية" active={board === "prayers"} onClick={() => setBoard("prayers")} controls="lb-board-panel" />
          <BoardTab label="تسبيح اليوم" active={board === "tasbeeh_daily"} onClick={() => setBoard("tasbeeh_daily")} controls="lb-board-panel" />
          <BoardTab label="قسم" active={board === "section"} onClick={() => setBoard("section")} controls="lb-board-panel" />
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
              ? <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              : <Send size={16} aria-hidden="true" />}
            {cooldownLeft > 0
              ? `انتظر ${arNum(Math.ceil(cooldownLeft / 1000))}ث`
              : "مزامنة ترتيبي"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void pullBoard()}
            disabled={boardLoadState === "loading"}
          >
            <RotateCw size={16} aria-hidden="true" className={boardLoadState === "loading" ? "animate-spin" : ""} />
            تحديث
          </Button>
          <Badge>{myRank != null ? `رتبتي: #${arNum(myRank)}` : "رتبتي: خارج أعلى ٣٠"}</Badge>
          <span aria-live="polite" aria-atomic="true" className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border",
            syncState === "ok"
              ? "border-ok-30 bg-ok-10 text-(--ok)"
              : syncState === "error"
                ? "border-danger-30 bg-danger-10 text-(--danger)"
                : syncState === "cooldown"
                  ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400"
                  : syncState === "syncing"
                    ? "border-accent-30 bg-accent-10 text-(--accent)"
                    : "border-(--stroke) bg-(--card) opacity-70"
          )}>
            {syncState === "syncing" && <Loader2 size={10} aria-hidden="true" className="animate-spin" />}
            {syncState === "ok" && <CheckCircle2 size={10} aria-hidden="true" />}
            {syncState === "error" && <AlertCircle size={10} aria-hidden="true" />}
            {syncState === "cooldown" && <Clock size={10} aria-hidden="true" />}
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
          <div role="alert" className="mt-3 rounded-2xl border border-danger-25 bg-danger-10 px-4 py-3 text-xs leading-6 text-(--danger)">
            تعذر تحديث ترتيب اللوحة من الخادم حاليًا. ما يظهر الآن هو آخر بيانات محلية متاحة فقط.
          </div>
        )}

        {serverHidden && (
          <div className="mt-3 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-xs text-yellow-200 leading-6">
            هذا الحساب مخفي حاليًا من لوحة المتصدرين من جهة الإدارة. يمكنك التواصل مع المشرف إذا احتجت مراجعة الحالة.
          </div>
        )}
      </Card>

      <Card id="lb-board-panel" className="p-5">
        <div className="text-sm font-semibold mb-3">
          {board === "global"
            ? "أفضل النتائج العامة"
            : board === "dhikr"
              ? "أفضل نتائج الذكر"
              : board === "quran"
                ? "أفضل نتائج القرآن"
                : board === "prayers"
                  ? "أفضل نتائج المهام اليومية"
                  : board === "tasbeeh_daily"
                    ? "تحدي تسبيح اليوم"
                    : "أفضل نتائج القسم"}
        </div>
        <div className="stack-y-2" role="list" aria-label="ترتيب المتسابقين">
          {mergedRows.length === 0 ? (
            <div className="glass rounded-3xl border border-(--stroke) px-4 py-5 text-sm opacity-70 leading-7 text-center">
              لا توجد نتائج منشورة لهذا التصنيف بعد. ابدأ بالمزامنة لرفع أول نتيجة.
            </div>
          ) : (
            mergedRows.map((r, idx) => {
              const joinedDate = formatLeaderboardJoinedDate(r.id === myEntry.id ? identity.joinedAt : r.joinedAt);

              return (
                <div key={r.id} role="listitem" className={cn(
                  "glass rounded-3xl p-3 border flex items-center justify-between gap-3",
                  r.id === myEntry.id ? "border-accent-35 bg-accent-8" : "border-(--stroke)"
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-(--card) border border-(--stroke) flex items-center justify-center text-xs tabular-nums">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : arNum((idx + 1))}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{r.name}</div>
                      <div className="text-[11px] opacity-60">
                        {r.id === myEntry.id
                          ? `أنت، انضممت: ${joinedDate || "غير متاح"}`
                          : joinedDate
                            ? `عضو، انضم: ${joinedDate}`
                            : "عضو"}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{arNum(r.score)}</div>
                </div>
              );
            })
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
      <LocalFriendsCard endpoint={endpoint} todayKey={todayKey} myStats={{ id: myStats.id, alias: myStats.name, score: myStats.score }} />

      {/* L2: Group khatma, shared between friends' phones */}
      <SharedKhatmaCard initialCode={khatmaInvite} />

      {/* L3: Weekly challenge */}
      <WeeklyChallengeCard />
    </div>
  );
}

function Stat(props: { title: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-3 border border-(--stroke)">
      <div className="text-[11px] opacity-60">{props.title}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{arNum(props.value)}</div>
    </div>
  );
}

function BoardTab(props: { label: string; active: boolean; onClick: () => void; controls?: string }) {
  return (
    <Button
      role="tab"
      aria-controls={props.controls}
      aria-selected={props.active}
      size="sm"
      variant={props.active ? "secondary" : "ghost"}
      className={props.active ? "bg-accent-15 border border-accent-35" : ""}
      onClick={props.onClick}
    >
      {props.label}
    </Button>
  );
}

function formatLeaderboardJoinedDate(dateISO?: string) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return "";
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
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
      setAdminHint("تم تصفير نقاط لوحة المتصدرين مع حفظ تواريخ الانضمام وقواعد الحظر والمراجعات.");
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
            <ShieldCheck size={16} aria-hidden="true" className="text-(--accent)" />
            <div className="text-sm font-semibold">إدارة المتصدرين</div>
          </div>
          <div className="mt-1 text-[11px] opacity-60">
            تحكم سريع في حظر الأسماء، الإخفاء، والاسم الإجباري من داخل التطبيق.
          </div>
        </div>
        <Button variant={expanded ? "secondary" : "outline"} aria-expanded={expanded} aria-controls="lb-admin-panel" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "إخفاء" : "فتح"}
        </Button>
      </div>

      {expanded && (
        <div id="lb-admin-panel" className="mt-4 stack-y-4">
          {!hasEndpoint ? (
            <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-xs text-yellow-200 leading-6">
              لا يمكن استخدام لوحة الإدارة قبل ضبط VITE_LEADERBOARD_ENDPOINT وربطها بدالة Supabase المنشورة.
            </div>
          ) : null}

          <div className="rounded-3xl border border-(--stroke) bg-(--card) p-4 stack-y-3">
            <div className="text-sm font-semibold">رمز الإدارة</div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                type="password"
                value={tokenDraft}
                onChange={(e) => setTokenDraft(e.target.value)}
                placeholder="LEADERBOARD_ADMIN_TOKEN"
                aria-label="رمز الإدارة"
              />
              <Button onClick={saveAdminTokenLocally} disabled={!hasEndpoint}>
                حفظ الرمز
              </Button>
              <Button variant="outline" onClick={clearAdminTokenLocally}>
                مسح
              </Button>
              <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={!hasAdminToken || !hasEndpoint || loadingSnapshot}>
                {loadingSnapshot ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <RotateCw size={16} aria-hidden="true" />}
                تحديث الإدارة
              </Button>
            </div>
            <div
              className={cn(
                "text-[11px] leading-5",
                adminTone === "error" ? "text-(--danger)" : adminTone === "ok" ? "text-(--ok)" : "opacity-60"
              )}
            >
              {adminHint}
            </div>
          </div>

          {hasAdminToken && hasEndpoint && (
            <>
              <div className="rounded-3xl border border-danger-20 bg-danger-8 p-4 stack-y-3">
                <div className="text-sm font-semibold text-(--danger)">إعادة تشغيل اللوحة</div>
                <div className="text-[11px] leading-6 opacity-75">
                  هذا الإجراء يمسح جميع النقاط المنشورة وسجل النتائج من الخادم، لكنه يُبقي تواريخ الانضمام وقواعد الحظر ومراجعات الأسماء كما هي.
                </div>
                {confirmResetScores ? (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void resetLeaderboardScores()} disabled={resettingScores}>
                      {resettingScores ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Trash2 size={16} aria-hidden="true" />}
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
                <div className="rounded-3xl border border-(--stroke) bg-(--card) p-4 stack-y-3">
                  <div className="text-sm font-semibold">حظر أسماء أو كلمات</div>
                  <div role="tablist" aria-orientation="horizontal" aria-label="نمط التطابق" className="flex gap-2 flex-wrap"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}>
                    <BoardTab label="احتواء" active={blockMatchMode === "contains"} onClick={() => setBlockMatchMode("contains")} />
                    <BoardTab label="مطابقة تامة" active={blockMatchMode === "exact"} onClick={() => setBlockMatchMode("exact")} />
                  </div>
                  <Input value={blockTerm} onChange={(e) => setBlockTerm(e.target.value)} placeholder="الكلمة أو الاسم الممنوع" aria-label="الكلمة أو الاسم الممنوع" />
                  <Input value={blockNote} onChange={(e) => setBlockNote(e.target.value)} placeholder="ملاحظة داخلية اختيارية" aria-label="ملاحظة داخلية" />
                  <Button onClick={() => void submitBlockRule()} disabled={!blockTerm.trim()}>
                    إضافة قاعدة
                  </Button>

                  <div className="stack-y-2 max-h-64 overflow-auto">
                    {snapshot.blocklist.length === 0 ? (
                      <div className="text-xs opacity-50">لا توجد قواعد حظر بعد.</div>
                    ) : (
                      snapshot.blocklist.map((rule) => (
                        <div key={rule.id} className="rounded-2xl border border-(--stroke) bg-(--card) px-3 py-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium wrap-break-word">{rule.term}</div>
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

                <div className="rounded-3xl border border-(--stroke) bg-(--card) p-4 stack-y-3">
                  <div className="text-sm font-semibold">إدارة مستخدم</div>
                  <Input
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    placeholder="معرّف المستخدم"
                    aria-label="معرّف المستخدم"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => void loadModerationForUser(selectedUserId, selectedUserLabel || selectedUserId)}
                      disabled={!selectedUserId.trim() || loadingUser}
                    >
                      {loadingUser ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <RotateCw size={16} aria-hidden="true" />}
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

                  <div className="rounded-2xl border border-(--stroke) bg-(--card) px-3 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">إخفاء من اللوحة</div>
                      <div className="text-[11px] opacity-50">لن يظهر في القراءة العامة حتى تلغي الإخفاء.</div>
                    </div>
                    <Switch aria-label="إخفاء من اللوحة" checked={hidden} onCheckedChange={(v) => setHidden(!!v)} />
                  </div>

                  <Input
                    value={forcedAlias}
                    onChange={(e) => setForcedAlias(e.target.value)}
                    placeholder="اسم إجباري آمن (اختياري)"
                    aria-label="اسم إجباري"
                    aria-describedby="forced-alias-error"
                  />
                  {forcedAliasValidation && !forcedAliasValidation.ok ? (
                    <div id="forced-alias-error" role="alert" className="text-[11px] text-(--danger)">{forcedAliasValidation.message}</div>
                  ) : null}

                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="سبب داخلي للمراجعة"
                    aria-label="سبب المراجعة"
                    className="w-full min-h-[90px] rounded-3xl bg-(--card) border border-(--stroke) p-4 text-sm leading-7 outline-hidden focus:border-(--stroke)"
                  />

                  {userModeration?.updatedAt ? (
                    <div className="text-[11px] opacity-50">آخر تحديث: {arFullDate(new Date(userModeration.updatedAt))}</div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-(--stroke) bg-(--card) px-3 py-3">
                    <div className="text-[11px] opacity-60">حرر الاسم المحجوز عند إزالة الإدارة</div>
                    <Switch aria-label="حرر الاسم المحجوز عند إزالة الإدارة" checked={releaseAliasClaim} onCheckedChange={(v) => setReleaseAliasClaim(!!v)} />
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

              <div className="rounded-3xl border border-(--stroke) bg-(--card) p-4">
                <div className="text-sm font-semibold mb-3">آخر مراجعات الأسماء</div>
                <div className="stack-y-2 max-h-72 overflow-auto">
                  {snapshot.audits.length === 0 ? (
                    <div className="text-xs opacity-50">لا توجد سجلات مراجعة بعد.</div>
                  ) : (
                    snapshot.audits.map((audit) => (
                      <div key={audit.id} className="rounded-2xl border border-(--stroke) bg-(--card) px-3 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium wrap-break-word">{audit.resolvedAlias}</div>
                          <div className="mt-1 text-[11px] opacity-55 wrap-break-word">
                            المطلوب: {audit.requestedAlias || "—"}، الحالة: {audit.status}
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

/**
 * «لوحة الأصدقاء»: the reader and the friends they added, ranked by this
 * week's (or month's) score, read live from the leaderboard.
 *
 * It used to rank the score each friend had on the day they shared their
 * code — a number that never changed again — against the reader's own
 * score of today.
 */
function LocalFriendsCard(props: {
  endpoint: string;
  todayKey: string;
  myStats: Pick<LocalFriend, "id" | "alias" | "score">;
}) {
  const localFriends = useNoorStore((s) => s.localFriends);
  const addLocalFriend = useNoorStore((s) => s.addLocalFriend);
  const removeLocalFriend = useNoorStore((s) => s.removeLocalFriend);

  const [importCode, setImportCode] = React.useState("");
  const [importError, setImportError] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<"weekly" | "monthly">("weekly");
  // The live scores, and the request they answer (friends, period, day).
  const [live, setLive] = React.useState<{ key: string; rows: Map<string, LeaderboardEntry> } | null>(null);
  const [failedKey, setFailedKey] = React.useState<string | null>(null);

  const myCode = props.myStats.id;
  const idsKey = [props.myStats.id, ...localFriends.map((f) => f.id)].join(",");

  const requestKey = `${period}|${props.todayKey}|${idsKey}`;
  React.useEffect(() => {
    if (!props.endpoint || localFriends.length === 0) return;
    let cancelled = false;
    fetchBoardRows({ endpoint: props.endpoint, board: "global", period, day: props.todayKey, ids: idsKey.split(",") })
      .then((rows) => { if (!cancelled) setLive({ key: requestKey, rows: new Map(rows.map((row) => [row.id, row])) }); })
      .catch(() => { if (!cancelled) setFailedKey(requestKey); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.endpoint, requestKey]);
  const liveState = !props.endpoint ? "failed" : live?.key === requestKey ? "ready" : failedKey === requestKey ? "failed" : "loading";
  const liveRows = live?.rows ?? null;

  const share = async () => {
    await shareOrCopy(`أضفني صديقًا في «أثر» لنتنافس في الخير 🤍\nلوحة الترتيب ← الأصدقاء ← إضافة صديق، ثم الصق الكود:\n${myCode}`, { title: "كود صداقتي في أثر", copiedMessage: "نُسخ الكود" });
  };
  const copyMyCode = async () => {
    try {
      await writeClipboard(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setImportError("تعذر النسخ. انسخ الكود يدويًا.");
    }
  };

  const handleImport = () => {
    setImportError("");
    const friend = readFriendCode(importCode);
    if (!friend) {
      setImportError("الكود غير صالح. تحقق من أنك لصقت الكود كاملًا.");
      return;
    }
    if (friend.id === props.myStats.id) {
      setImportError("هذا كودك أنت.");
      return;
    }
    if (localFriends.some((f) => f.id === friend.id)) {
      setImportError("هذا الصديق مضاف مسبقًا.");
      return;
    }
    if (localFriends.length >= 49) {
      setImportError("بلغت الحد الأقصى للأصدقاء (٤٩).");
      return;
    }
    addLocalFriend({ id: friend.id, alias: friend.alias ?? "صديق", score: 0, dhikr: 0, quran: 0, prayers: 0, addedAt: new Date().toISOString() });
    setImportCode("");
    toast.success("أُضيف الصديق");
  };

  const ready = liveState === "ready" && liveRows !== null;
  const rows = React.useMemo(() => {
    const people = [
      ...localFriends.map((f) => ({ id: f.id, name: liveRows?.get(f.id)?.name ?? f.alias, score: ready ? liveRows!.get(f.id)?.score ?? 0 : null, me: false })),
      { id: props.myStats.id, name: liveRows?.get(props.myStats.id)?.name ?? props.myStats.alias, score: ready ? liveRows!.get(props.myStats.id)?.score ?? 0 : null, me: true },
    ];
    return people.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [localFriends, liveRows, ready, props.myStats.id, props.myStats.alias]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} aria-hidden="true" className="text-(--accent)" />
          <div className="text-sm font-semibold">لوحة الأصدقاء</div>
          {localFriends.length > 0 && (
            <span className="text-[10px] opacity-50 tabular-nums">{arNum(localFriends.length)} صديق</span>
          )}
        </div>
        <Button variant="secondary" aria-expanded={expanded} aria-controls="lb-friends-manage" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "إخفاء" : localFriends.length === 0 ? "إضافة صديق" : "إدارة"}
        </Button>
      </div>

      {localFriends.length > 0 ? (
        <>
          <div className="mt-3 flex items-center gap-1.5" role="group" aria-label="مدة المقارنة">
            {([["weekly", "هذا الأسبوع"], ["monthly", "هذا الشهر"]] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
                className={cn("rounded-full border px-3 py-1 text-[11.5px] transition", period === value ? "border-accent-35 bg-accent-15 text-(--accent) font-semibold" : "border-(--stroke) bg-(--card) opacity-75")}>
                {label}
              </button>
            ))}
            {liveState === "loading" ? <Loader2 size={13} className="ms-auto animate-spin opacity-50" aria-label="جارٍ التحديث" /> : null}
          </div>
          {liveState === "failed" ? (
            <div className="mt-2 text-[11px] text-(--muted)">تعذّر جلب نتائج الأصدقاء الآن. تحقق من الاتصال ثم أعد فتح الصفحة.</div>
          ) : null}
          <div className="mt-3 stack-y-2" role="list" aria-label="قائمة الأصدقاء">
            {rows.map((f, idx) => (
              <div
                key={f.id}
                role="listitem"
                className={cn(
                  "glass rounded-3xl p-3 border flex items-center justify-between gap-3",
                  f.me ? "border-accent-35 bg-accent-8" : "border-(--stroke)"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-(--card) border border-(--stroke) flex items-center justify-center text-xs">
                    {ready ? (idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : arNum(idx + 1)) : "·"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{f.name}{f.me ? " (أنت)" : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold tabular-nums">{f.score === null ? "—" : arNum(f.score)}</div>
                  {!f.me ? (
                    confirmRemove === f.id ? (
                      <span className="flex items-center gap-1">
                        <button type="button" onClick={() => { removeLocalFriend(f.id); setConfirmRemove(null); }} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-(--danger) bg-danger-10">حذف</button>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="rounded-lg px-2 py-1 text-[11px] opacity-60">إلغاء</button>
                      </span>
                    ) : (
                      <button type="button"
                        onClick={() => setConfirmRemove(f.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-(--danger) opacity-60 hover:opacity-100 transition"
                        aria-label={`حذف ${f.name} من الأصدقاء`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3 text-xs opacity-55 leading-6">أضف أصدقاءك بكودهم، وتنافسوا أسبوعيًا في الذكر والقرآن والمهام.</div>
      )}

      {expanded && (
        <div id="lb-friends-manage" className="mt-4 stack-y-3 border-t border-(--stroke) pt-4">
          <div>
            <div className="text-xs font-semibold mb-2">كود صداقتي</div>
            <div className="flex gap-2">
              <code className="flex-1 min-w-0 truncate text-[11px] bg-(--card) border border-(--stroke) rounded-2xl px-3 py-2.5 opacity-80 select-all" dir="ltr">
                {myCode}
              </code>
              <Button variant="secondary" onClick={() => void copyMyCode()} aria-label="نسخ الكود">
                {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              </Button>
              <Button variant="secondary" onClick={() => void share()} aria-label="مشاركة الكود">
                <Share2 size={14} aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-1 text-[10px] opacity-45">أرسله لصديقك ليضيفك، وأضِف كوده هنا لتريا نتائجكما معًا.</div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-2">إضافة صديق</div>
            <div className="flex gap-2">
              <Input
                value={importCode}
                onChange={(e) => { setImportCode(e.target.value); setImportError(""); }}
                placeholder="الصق كود الصديق هنا"
                aria-label="كود الصديق"
                aria-describedby="lb-friend-import-error"
                dir="ltr"
              />
              <Button onClick={handleImport} disabled={!importCode.trim()}>
                <Plus size={14} aria-hidden="true" />
                إضافة
              </Button>
            </div>
            <div id="lb-friend-import-error" role="alert" className="mt-1 text-xs text-(--danger)">{importError}</div>
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
  const sectionCompletions = useNoorStore((s) => s.sectionCompletions);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const quranDailyGoal = useNoorStore((s) => s.prefs.quranDailyGoal);
  const kahfReadOn = useNoorStore((s) => s.kahfReadOn);
  const navigate = useNavigate();

  // The phone's own date; re-read when the app comes back so a page left open
  // overnight moves on to the new day (and, on Saturday, the new week).
  const [today, setToday] = React.useState(() => getLocalDateKey());
  React.useEffect(() => {
    const refresh = () => setToday(getLocalDateKey());
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { document.removeEventListener("visibilitychange", refresh); window.clearInterval(timer); };
  }, []);

  const weekStart = weekStartOf(today);
  const kind = challengeOfWeek(weekStart);
  // A new week (or a challenge saved before this version) starts afresh.
  React.useEffect(() => {
    if (!weeklyChallenge || weeklyChallenge.weekISO !== weekStart || weeklyChallenge.type !== kind) {
      setWeeklyChallenge({ type: kind, weekISO: weekStart, progress: {}, completed: false });
    }
  }, [weeklyChallenge, weekStart, kind, setWeeklyChallenge]);

  const manual = weeklyChallenge?.weekISO === weekStart ? weeklyChallenge.progress : {};
  const status = challengeStatus(today, manual, { sectionCompletions, quranDailyAyahs, quranDailyGoal, kahfReadOn });
  const info = WEEKLY_CHALLENGES[status.kind];
  const once = status.target === 1;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} aria-hidden="true" className="text-(--accent)" />
        <div className="text-sm font-semibold">تحدي الأسبوع</div>
        {status.completed && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-ok-15 border border-ok-30 text-(--ok) ms-auto">
            ✓ مكتمل
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-(--stroke) bg-(--card) p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-xl border"
            style={{
              background: status.completed ? "rgba(52,211,153,0.15)" : "var(--card)",
              borderColor: status.completed ? "rgba(52,211,153,0.3)" : "var(--stroke)"
            }}
          >
            {info.emoji}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{info.title}</div>
            <div className="text-[11px] opacity-55 mt-0.5">{info.desc}</div>
            <div className="text-[11px] opacity-40 mt-0.5">الهدف: {info.targetLabel}</div>
          </div>
        </div>
        {!status.completed ? (
          <Button variant="secondary" className="mt-3 w-full" onClick={() => navigate(info.route)}>
            {info.action}
          </Button>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className="flex-1 h-1.5 rounded-full bg-(--card) overflow-hidden"
          role="progressbar"
          aria-valuenow={status.count}
          aria-valuemin={0}
          aria-valuemax={status.target}
          aria-label={`تقدم التحدي: ${arNum(Math.min(status.count, status.target))} من ${arNum(status.target)}`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (status.count / status.target) * 100)}%`,
              background: status.completed ? "var(--ok)" : "var(--accent)"
            }}
          />
        </div>
        <span className="text-[11px] opacity-60 tabular-nums">{arNum(Math.min(status.count, status.target))}/{arNum(status.target)}</span>
      </div>

      {/* The week, Saturday to Friday. A day the app saw done is marked by
          itself; a past day can be marked by hand (a printed mushaf, say). */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {status.days.map((day) => {
          const done = day.auto || day.manual;
          const locked = day.auto || day.isFuture;
          return (
            <button type="button"
              key={day.key}
              disabled={locked}
              onClick={() => toggleWeeklyChallengeDay(day.key)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-xl border transition-all",
                day.isFuture && "opacity-40",
                day.isToday && !done && "ring-1 ring-(--accent)/50",
              )}
              style={{
                background: done ? "rgba(52,211,153,0.15)" : day.isToday ? "var(--card-2)" : "var(--card)",
                borderColor: done ? "rgba(52,211,153,0.4)" : "var(--stroke)"
              }}
              aria-pressed={done}
              aria-label={`${day.label}: ${day.auto ? "تمّ في التطبيق" : day.manual ? "علّمته بنفسك" : day.isFuture ? "لم يأتِ بعد" : "لم يكتمل"}`}
            >
              <span className="text-[8.5px] opacity-60">{day.label}</span>
              <span className="text-xs">
                {done
                  ? <Check size={12} aria-hidden="true" strokeWidth={3} style={{ color: "var(--ok)", opacity: day.manual ? 0.7 : 1 }} />
                  : <span style={{ color: "var(--muted-2)", fontSize: "8px" }}>·</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] leading-5 opacity-45">
        {once
          ? "يُحتسب تلقائيًا حين تبلغ آخر آية من سورة الكهف في المصحف، أو علّم اليوم الذي قرأتها فيه."
          : "يُحتسب اليوم تلقائيًا حين تتمّه في التطبيق، ويمكنك تعليم يوم مضى بنفسك."}
      </p>

      {status.completed && (
        <div className="mt-3 rounded-2xl border border-ok-25 bg-ok-8 px-4 py-3 text-sm text-center" style={{ color: "var(--ok)" }}>
          أحسنت! أتممت تحدي هذا الأسبوع 🎉
        </div>
      )}
    </Card>
  );
}
