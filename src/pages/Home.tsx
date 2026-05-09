import * as React from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import {
  Sparkles,
  Shuffle,
  RotateCw,
  Copy,
  Share2,
  CheckCircle2,
  ChevronDown,
  MoreVertical,
  Radio,
  Loader2,
} from "lucide-react";

import pulse from "@/assets/noor-pulse.json";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { type HomeWidgetKey, DEFAULT_HOME_WIDGETS_ORDER, useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { PrayerWidget } from "@/components/layout/PrayerWidget";
import { pct, cn } from "@/lib/utils";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { trackUxEvent } from "@/lib/uxMetrics";
import { useQuranDB } from "@/data/useQuranDB";
import { coerceCount } from "@/data/types";
import { useTodayKey } from "@/hooks/useTodayKey";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { DAILY_CHECKLIST_ITEMS, BETTER_MUSLIM_DAILY_STEPS, type DailyChecklistItem } from "@/data/dailyGrowth";
import { QURAN_VOCAB } from "@/data/quranVocab";
import { parseDateKey, shiftDateKey } from "@/lib/dayBoundaries";
import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import { DailyCarousel } from "@/components/ui/DailyCarousel";
import { getRadioState, subscribeRadio, toggleRadio } from "@/lib/radioPlayer";
import { useScrollRestoration, useElementScrollRestoration } from "@/hooks/useScrollRestoration";

function useRadioState() {
  const [state, setState] = React.useState(getRadioState);
  React.useEffect(() => subscribeRadio(() => setState(getRadioState())), []);
  return state;
}

type QuickTasbeehKey = "subhanallah" | "alhamdulillah" | "la_ilaha_illallah" | "allahu_akbar";
const QUICK_TASBEEH: Array<{ key: QuickTasbeehKey; label: string }> = [
  { key: "subhanallah", label: "سُبْحَانَ الله" },
  { key: "alhamdulillah", label: "الْحَمْدُ لِلَّه" },
  { key: "la_ilaha_illallah", label: "لا إِلَهَ إِلَّا الله" },
  { key: "allahu_akbar", label: "اللهُ أَكْبَر" }
];

const DEFAULT_HOME_WIDGETS = {
  prayer: true,
  hadith: true,
  wisdom: true,
  smart: true,
  checklist: true,
  dailyStep: true,
  tasbeeh: true,
  dailyWird: true,
  dailyVerse: true,
  quests: true,
} satisfies Record<HomeWidgetKey, boolean>;



function parseISODate(dateISO: string) {
  return parseDateKey(dateISO);
}

function textClassByLength(text: string) {
  const len = (text ?? "").trim().length;
  if (len > 900) return "text-xs leading-6";
  if (len > 520) return "text-sm leading-7";
  return "text-base leading-8";
}

// Preferred section strip order (first visible sections in the quick-access bar)
const PREFERRED_STRIP_ORDER = ["my_adhkar", "morning", "evening", "waking", "sleep", "essentials", "salawat", "tasabeeh", "post_prayer", "quranic_duas", "prophets_duas", "prophetic_duas", "jawami_dua", "ruqyah"];

const CHECKLIST_CATEGORY_ICON: Record<DailyChecklistItem["category"], string> = {
  salah:   "🕌",
  quran:   "📖",
  dhikr:   "📿",
  akhlaq:  "💛",
  family:  "🤝",
  sadaqah: "🌸",
};

function timeGreeting(hour: number): string {
  if (hour < 5)  return "ليلة طيبة";
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "نهارك طيب";
  if (hour < 20) return "مساء الخير";
  return "ليلة سعيدة";
}

function getHijriDate(): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

function routeForChecklistCategory(category: DailyChecklistItem["category"]) {
  if (category === "quran") return "/quran";
  if (category === "dhikr") return "/c/morning";
  if (category === "salah") return "/c/morning"; // dhikr before prayer is the best action
  if (category === "sadaqah") return "/duas";
  if (category === "family") return "/duas";
  return "/insights";
}

type PrayerContext = {
  nextPrayer: { label: string; at: Date } | null;
  nextPrayerMinutes: number | null;
};

type MissionStep = {
  item: DailyChecklistItem;
  title: string;
  tip: string;
  route: string;
  priority: number;
};

function rescueTipByCategory(category: DailyChecklistItem["category"]) {
  if (category === "quran") return "اقرأ صفحة واحدة فقط";
  if (category === "dhikr") return "ابدأ بذكر قصير 30 ثانية";
  if (category === "salah") return "تحقق من الصلاة القادمة واستعد لها";
  if (category === "sadaqah") return "نفّذ صدقة بسيطة الآن";
  if (category === "family") return "رسالة صلة رحم سريعة";
  return "دعاء صادق لشخص آخر";
}

function HomeRadioButton() {
  const radio = useRadioState();
  return (
    <button type="button"
      onClick={() => toggleRadio()}
      aria-label={radio.playing ? "إيقاف راديو القرآن" : "تشغيل راديو القرآن"}
      className="press-effect inline-flex items-center gap-1.5 px-3 h-9 rounded-2xl border transition-all shrink-0"
      style={
        radio.playing
          ? {
              background: "color-mix(in srgb, var(--ok) 18%, transparent)",
              borderColor: "color-mix(in srgb, var(--ok) 45%, transparent)",
              color: "var(--ok)",
            }
          : {
              background: "var(--card)",
              borderColor: "var(--stroke)",
              color: "inherit",
            }
      }
    >
      {radio.loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />
      ) : (
        <Radio size={14} aria-hidden="true" className="shrink-0" style={radio.playing ? { filter: "drop-shadow(0 0 4px var(--ok))" } : undefined} />
      )}
      <span className="text-xs font-medium whitespace-nowrap">
        {radio.playing ? "القرآن يُبث" : "راديو القرآن"}
      </span>
      {radio.playing && (
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "var(--ok)" }} />
      )}
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdhkarDB();
  const quran = useQuranDB();
  const activity = useNoorStore((s) => s.activity);
  const progressMap = useNoorStore((s) => s.progress);
  const lastVisitedSectionId = useNoorStore((s) => s.lastVisitedSectionId);
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);

  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const resetAllQuickTasbeeh = useNoorStore((s) => s.resetAllQuickTasbeeh);

  const dailyWirdDone = useNoorStore((s) => s.dailyWirdDone);
  const setDailyWirdDone = useNoorStore((s) => s.setDailyWirdDone);
  const dailyWirdStartISO = useNoorStore((s) => s.dailyWirdStartISO);
  const setDailyWirdStartISO = useNoorStore((s) => s.setDailyWirdStartISO);

  const dailyBetterStepDone = useNoorStore((s) => s.dailyBetterStepDone);
  const setDailyBetterStepDone = useNoorStore((s) => s.setDailyBetterStepDone);
  const quranLastRead = useNoorStore((s) => s.quranLastRead);
  const quranReadingHistory = useNoorStore((s) => s.quranReadingHistory);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const quranStreak = useNoorStore((s) => s.quranStreak);
  const prayerLog = useNoorStore((s) => s.prayerLog);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);

  const sectionsRaw = data?.db.sections;
  const sections = React.useMemo(() => sectionsRaw ?? [], [sectionsRaw]);
  const customPacks = useNoorStore((s) => s.customPacks);

  // ── Scroll restoration ──────────────────────────────────────
  useScrollRestoration();
  const stripScrollRef = useElementScrollRestoration<HTMLDivElement>("home-strip");
  // ── Strip drag-and-drop ────────────────────────────────────
  const [liveStripIds, setLiveStripIds] = React.useState<string[] | null>(null);
  const [draggingStripId, setDraggingStripId] = React.useState<string | null>(null);
  const stripLongPressRef = React.useRef<number | null>(null);
  const stripDragWasActive = React.useRef(false);

  const defaultStripIds = React.useMemo(() => {
    const saved: string[] = prefs.homeStripOrder ?? [];
    const sectionIds = sections.map((s) => s.id);
    // Sort sections: preferred order first, then the rest in original order
    const orderedSections = [
      ...PREFERRED_STRIP_ORDER.filter((id) => sectionIds.includes(id)),
      ...sectionIds.filter((id) => !PREFERRED_STRIP_ORDER.includes(id)),
    ];
    const all = [...customPacks.map((p) => p.id), ...orderedSections];
    const result = saved.filter((id) => all.includes(id));
    for (const id of all) if (!result.includes(id)) result.push(id);
    return result;
  }, [customPacks, sections, prefs.homeStripOrder]);

  const activeStripIds = liveStripIds ?? defaultStripIds;

  const onStripItemPointerDown = React.useCallback((id: string, e: React.PointerEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    if (stripLongPressRef.current) clearTimeout(stripLongPressRef.current);

    const cancel = () => {
      if (stripLongPressRef.current) { clearTimeout(stripLongPressRef.current); stripLongPressRef.current = null; }
      window.removeEventListener("pointermove", onEarlyMove);
      window.removeEventListener("pointerup", onEarlyUp);
      window.removeEventListener("pointercancel", onEarlyUp);
    };
    const onEarlyMove = (me: PointerEvent) => {
      if (Math.abs(me.clientX - startX) > 8 || Math.abs(me.clientY - startY) > 8) cancel();
    };
    const onEarlyUp = () => cancel();

    window.addEventListener("pointermove", onEarlyMove);
    window.addEventListener("pointerup", onEarlyUp);
    window.addEventListener("pointercancel", onEarlyUp);

    stripLongPressRef.current = window.setTimeout(() => {
      window.removeEventListener("pointermove", onEarlyMove);
      window.removeEventListener("pointerup", onEarlyUp);
      window.removeEventListener("pointercancel", onEarlyUp);
      stripLongPressRef.current = null;
      setDraggingStripId(id);
      setLiveStripIds([...defaultStripIds]);
      stripDragWasActive.current = true;
      if (prefs.enableHaptics && "vibrate" in navigator) navigator.vibrate(35);
    }, 420);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStripIds, prefs.enableHaptics]);

  const onStripPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!draggingStripId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const itemEl = el?.closest("[data-strip-id]") as HTMLElement | null;
    const overId = itemEl?.dataset?.stripId;
    if (!overId || overId === draggingStripId) return;
    setLiveStripIds((prev) => {
      const arr = [...(prev ?? defaultStripIds)];
      const fromIdx = arr.indexOf(draggingStripId);
      const toIdx = arr.indexOf(overId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
      return arr;
    });
  }, [draggingStripId, defaultStripIds]);

  const onStripPointerUp = React.useCallback(() => {
    if (draggingStripId && liveStripIds) {
      setPrefs({ homeStripOrder: liveStripIds });
    }
    setDraggingStripId(null);
    setLiveStripIds(null);
    // wasDragging stays true briefly so onClick ignores the tap
    window.setTimeout(() => { stripDragWasActive.current = false; }, 80);
  }, [draggingStripId, liveStripIds, setPrefs]);
  // ── End strip drag ─────────────────────────────────────────

  const [checklistExpanded, setChecklistExpanded] = React.useState(false);
  const [checklistShowAll, setChecklistShowAll] = React.useState(false);
  const [dailyWirdExpanded, setDailyWirdExpanded] = React.useState(false);
  const [tasbeehTarget, setTasbeehTarget] = React.useState<33 | 100>(100);
  const homeWidgets = React.useMemo(
    () => ({ ...DEFAULT_HOME_WIDGETS, ...prefs.homeWidgets }),
    [prefs.homeWidgets]
  );
  const homeWidgetsOrder: HomeWidgetKey[] = prefs.homeWidgetsOrder ?? DEFAULT_HOME_WIDGETS_ORDER;

  const quranLastReadSurahName = React.useMemo(() => {
    if (!quranLastRead || !quran.data) return null;
    return quran.data.find((s) => s.id === quranLastRead.surahId)?.name ?? null;
  }, [quran.data, quranLastRead]);

  const quranReadingPct = React.useMemo(() => {
    if (!quran.data) return 0;
    const totalAyahs = quran.data.reduce((sum, s) => sum + s.ayahs.length, 0);
    if (!totalAyahs) return 0;
    const readAyahs = quran.data.reduce((sum, s) => {
      const reached = Math.min(s.ayahs.length, Math.max(0, Number(quranReadingHistory[String(s.id)] ?? 0)));
      return sum + reached;
    }, 0);
    return Math.round((readAyahs / totalAyahs) * 100);
  }, [quran.data, quranReadingHistory]);
  const [confirmTasbeehReset, setConfirmTasbeehReset] = React.useState(false);
  const [activePhraseKey, setActivePhraseKey] = React.useState<QuickTasbeehKey | null>(null);
  const prayerTimes = usePrayerTimes();
  const civilTodayKey = useTodayKey();
  const dailyVocabWord = React.useMemo(() => {
    const dayNum = Math.floor(Date.now() / 86400000);
    const id = (dayNum % QURAN_VOCAB.length) + 1;
    return QURAN_VOCAB.find((w) => w.id === id) ?? QURAN_VOCAB[0];
  }, []);
  const worshipDayKey = useTodayKey({
    mode: "ibadah",
    fajrTime: prayerTimes.data?.data?.timings?.Fajr,
  });
  const dailyChecklistToday = useNoorStore((s) => s.dailyChecklist[worshipDayKey] ?? {});
  const yesterdayKey = React.useMemo(() => shiftDateKey(worshipDayKey, -1), [worshipDayKey]);
  const dailyChecklistYesterday = useNoorStore((s) => s.dailyChecklist[yesterdayKey] ?? {});
  const toggleDailyChecklist = useNoorStore((s) => s.toggleDailyChecklist);

  React.useEffect(() => {
    if (!dailyWirdStartISO) {
      setDailyWirdStartISO(worshipDayKey);
    }
  }, [dailyWirdStartISO, setDailyWirdStartISO, worshipDayKey]);

  const dailyWird = React.useMemo(() => {
    if (!quran.data) return null;
    if (!dailyWirdStartISO) return null;

    const start = parseISODate(dailyWirdStartISO);
    if (!start) return null;

    // Sequential wird: move forward only when previous chunk is marked done.
    const CHUNK = 7;
    const startKey = dailyWirdStartISO;

    const completedChunks = Object.entries(dailyWirdDone ?? {}).reduce((acc, [date, done]) => {
      if (!done) return acc;
      return date >= startKey ? acc + 1 : acc;
    }, 0);

    const chunkIndex = Math.max(0, completedChunks);

    // Build a compact index of [surahId, surahName, ayahIndex, globalOffset] without storing text.
    // Then collect CHUNK items starting at startAt, wrapping if needed.
    // Two-pass: pass 1 counts total & collects from startAt onward; pass 2 wraps from beginning.
    type WirdItem = { surahId: number; surahName: string; ayahIndex: number; text: string };
    let totalAyahCount = 0;
    const itemsPass1: WirdItem[] = [];
    const itemsPass2: WirdItem[] = [];

    // Count total first
    for (const s of quran.data) {
      for (let i = 0; i < s.ayahs.length; i++) {
        if ((s.ayahs[i] ?? "").trim()) totalAyahCount++;
      }
    }
    if (totalAyahCount === 0) return null;

    const startAt = (chunkIndex * CHUNK) % totalAyahCount;

    // Single walk: collect CHUNK items starting from startAt, then wrap-around items from 0
    let globalPos = 0;
    for (const s of quran.data) {
      for (let i = 0; i < s.ayahs.length; i++) {
        const text = (s.ayahs[i] ?? "").trim();
        if (!text) continue;
        if (globalPos >= startAt && itemsPass1.length < CHUNK) {
          itemsPass1.push({ surahId: s.id, surahName: s.name, ayahIndex: i + 1, text });
        } else if (globalPos < startAt && itemsPass2.length < CHUNK - itemsPass1.length) {
          itemsPass2.push({ surahId: s.id, surahName: s.name, ayahIndex: i + 1, text });
        }
        globalPos++;
        if (itemsPass1.length >= CHUNK) break;
      }
      if (itemsPass1.length >= CHUNK) break;
    }

    const items = [...itemsPass1, ...itemsPass2].slice(0, CHUNK);

    const copyText = items
      .map((p) => `${p.text}\n— ${p.surahName} (${p.surahId}) • (${p.ayahIndex})`)
      .join("\n\n");

    return {
      items,
      copyText,
      meta: {
        from: startAt + 1,
        to: startAt + CHUNK > totalAyahCount ? totalAyahCount : startAt + CHUNK,
        total: totalAyahCount,
        chunkIndex,
        chunk: CHUNK
      }
    };
  }, [dailyWirdDone, dailyWirdStartISO, quran.data]);

  const isDailyWirdDone = !!dailyWirdDone[worshipDayKey];

  const wirdStreak = React.useMemo(() => {
    let streak = isDailyWirdDone ? 1 : 0;
    const today = new Date();
    const startOffset = isDailyWirdDone ? 1 : 0;
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (dailyWirdDone[k]) streak++;
      else break;
    }
    return streak;
  }, [dailyWirdDone, isDailyWirdDone]);

  const copyDailyWird = async () => {
    if (!dailyWird) return;
    try {
      await navigator.clipboard.writeText(dailyWird.copyText);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const onRandom = () => {
    if (!data?.flat?.length) return;
    const r = data.flat[Math.floor(Math.random() * data.flat.length)];
    trackUxEvent("home_cta:random_dhikr");
    navigate(`/c/${r.sectionId}?focus=${r.index}`);
  };

  const onQuick = (id: string) => {
    trackUxEvent(`home_cta:quick_${id}`);
    navigate(`/c/${id}`);
  };

  const lastVisitedSection = React.useMemo(() => {
    if (!lastVisitedSectionId) return null;
    return sections.find((s) => s.id === lastVisitedSectionId) ?? null;
  }, [lastVisitedSectionId, sections]);

  const quickTotal = React.useMemo(() => {
    const target = tasbeehTarget;
    const done = QUICK_TASBEEH.reduce((acc, it) => acc + Math.min(target, quickTasbeeh[it.key] ?? 0), 0);
    const total = QUICK_TASBEEH.length * target;
    const percent = pct(done, total);
    return { done, total, percent };
  }, [quickTasbeeh, tasbeehTarget]);

  const streak = React.useMemo(() => {
    const set = new Set(Object.keys(activity).filter((k) => (activity[k] ?? 0) > 0));
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 3650; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (set.has(k)) s++;
      else break;
    }
    return s;
  }, [activity]);

  // 5C: Quests + XP
  const questsData = React.useMemo(() => {
    const prayersDone: Record<string, boolean> = prayerLog[civilTodayKey] ?? {};
    const quranAyahsToday = quranReadingHistory
      ? Object.values(quranReadingHistory).reduce((a, v) => a + (Number(v) || 0), 0)
      : 0;
    const scores = buildLeaderboardScoreStats({
      sections: sections,
      progress: progressMap,
      quranAyahIndex: quranAyahsToday,
      prayersDone,
      quickTasbeeh,
      todayISO: civilTodayKey,
    });
    const totalXp = scores.global;

    // Quest auto-resolution
    const ayahsToday = Number(quranDailyAyahs[civilTodayKey] ?? 0);
    const dhikrToday = Number(activity[civilTodayKey] ?? 0);
    const tasbeehMax = Math.max(...Object.values(quickTasbeeh).map((v) => Number(v) || 0), 0);

    const quests = [
      { id: "quran5", label: "اقرأ ٥ آيات", done: ayahsToday >= 5, icon: "📖" },
      { id: "dhikr3", label: "٣ أذكار أو مهام", done: dhikrToday >= 3, icon: "📿" },
      { id: "tasbeeh33", label: "سبّح ٣٣ مرة", done: tasbeehMax >= 33, icon: "🌿" },
    ];
    const doneCount = quests.filter((q) => q.done).length;
    const xpLevel =
      totalXp >= 20000 ? { label: "إمام", emoji: "💎", color: "#a78bfa" } :
      totalXp >= 5000  ? { label: "حافظ", emoji: "🏆", color: "#fb923c" } :
      totalXp >= 1000  ? { label: "مواظب", emoji: "⭐", color: "#fbbf24" } :
                          { label: "مبتدئ", emoji: "🌱", color: "#6ee7b7" };
    const nextLevelXp = totalXp >= 20000 ? 30000 : totalXp >= 5000 ? 20000 : totalXp >= 1000 ? 5000 : 1000;
    const prevLevelXp = totalXp >= 20000 ? 20000 : totalXp >= 5000 ? 5000 : totalXp >= 1000 ? 1000 : 0;
    const xpPct = Math.min(100, Math.round(((totalXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100));

    return { quests, doneCount, totalXp, xpLevel, xpPct };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, civilTodayKey, prayerLog, progressMap, quickTasbeeh, sections, quranDailyAyahs]);

  const prayerContext = React.useMemo<PrayerContext>(() => {
    const timings = prayerTimes.data?.data?.timings;
    if (!timings) return { nextPrayer: null, nextPrayerMinutes: null };

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const prayerList = [
      { label: "الفجر", value: timings.Fajr },
      { label: "الظهر", value: timings.Dhuhr },
      { label: "العصر", value: timings.Asr },
      { label: "المغرب", value: timings.Maghrib },
      { label: "العشاء", value: timings.Isha }
    ]
      .map((p) => {
        const clean = String(p.value ?? "").trim().split(" ")[0] ?? "";
        const [hh, mm] = clean.split(":").map((x) => Number.parseInt(x, 10));
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
        const at = new Date(dayStart);
        at.setHours(hh, mm, 0, 0);
        return { label: p.label, at };
      })
      .filter((p): p is { label: string; at: Date } => !!p);

    const nextPrayer = prayerList.find((p) => p.at.getTime() > now.getTime()) ?? prayerList[0] ?? null;
    const nextPrayerMinutes = nextPrayer ? Math.max(0, Math.floor((nextPrayer.at.getTime() - now.getTime()) / 60000)) : null;

    return { nextPrayer, nextPrayerMinutes };
  }, [prayerTimes.data?.data?.timings]);

  const smartNow = React.useMemo(() => {
    const hour = new Date().getHours();
    const periodLabel =
      hour < 5 ? "قبل الفجر" : hour < 12 ? "الصباح" : hour < 17 ? "بعد الظهر" : hour < 21 ? "المساء" : "الليل";

    // D10: time-based section suggestion
    const isMorningWindow = hour >= 4 && hour < 11;
    const isEveningWindow = hour >= 15 && hour < 21;
    const isSleepWindow = hour >= 21 || hour < 4;

    const nextChecklist = DAILY_CHECKLIST_ITEMS.find((item) => !dailyChecklistToday[item.id]);
    let suggestedAction =
      nextChecklist?.title ??
      (isDailyWirdDone ? "حافظ على الاستمرارية وراجع نية الغد" : "أنهِ ورد اليوم قبل النوم");

    if (isMorningWindow) {
      suggestedAction = "ابدأ يومك بأذكار الصباح";
    } else if (isEveningWindow) {
      suggestedAction = "لا تنسَ أذكار المساء";
    } else if (isSleepWindow) {
      suggestedAction = "اختم يومك بأذكار النوم";
    } else if (nextChecklist?.id === "fajr_on_time") {
      suggestedAction = prayerContext.nextPrayer?.label === "الفجر"
        ? "استعد لصلاة الفجر القادمة"
        : "ثبّت الصلوات القادمة في وقتها";
    } else if (nextChecklist?.id === "five_prayers" && prayerContext.nextPrayer) {
      suggestedAction = `حافظ على ${prayerContext.nextPrayer.label} في وقتها`;
    }

    // D10: smart routing based on time of day
    const timeRoute = isMorningWindow
      ? "/c/morning"
      : isEveningWindow
        ? "/c/evening"
        : isSleepWindow
          ? "/c/sleep"
          : null;

    const actionRoute = !isDailyWirdDone
      ? (prefs.quranMushafPage ? `/mushaf/${prefs.quranMushafPage}` : "/mushaf/1")
      : timeRoute
        ? timeRoute
        : nextChecklist
          ? routeForChecklistCategory(nextChecklist.category)
          : "/insights";

    const actionLabel = !isDailyWirdDone
      ? "اذهب إلى ورد القرآن"
      : isMorningWindow
        ? "📖 أذكار الصباح"
        : isEveningWindow
          ? "🌙 أذكار المساء"
          : isSleepWindow
            ? "💤 أذكار النوم"
            : nextChecklist
              ? "نفّذ المهمة التالية الآن"
              : "راجع تقدمك اليوم";

    const missedYesterday = DAILY_CHECKLIST_ITEMS.filter((item) => !dailyChecklistYesterday[item.id]).length;
    const todayActivity = Number(activity[civilTodayKey] ?? 0);
    const streakRisk = hour >= 20 && todayActivity === 0;

    return { periodLabel, suggestedAction, missedYesterday, streakRisk, actionRoute, actionLabel };
  }, [activity, civilTodayKey, dailyChecklistToday, dailyChecklistYesterday, isDailyWirdDone, prayerContext.nextPrayer, prefs.quranMushafPage]);

  const adaptiveMission = React.useMemo(() => {
    const nextPrayer = prayerContext.nextPrayer;
    const nextPrayerMinutes = prayerContext.nextPrayerMinutes;

    const debtToday = DAILY_CHECKLIST_ITEMS.filter((item) => !dailyChecklistToday[item.id]);
    const missedYesterdayItems = DAILY_CHECKLIST_ITEMS.filter((item) => !dailyChecklistYesterday[item.id]);

    const toMissionStep = (item: DailyChecklistItem): MissionStep | null => {
      const route = routeForChecklistCategory(item.category);
      const nearPrayerWindow = nextPrayerMinutes != null && nextPrayerMinutes <= 45;
      const basePriorityMap: Record<DailyChecklistItem["category"], number> = {
        salah: 1,
        quran: 2,
        dhikr: 3,
        sadaqah: 4,
        family: 5,
        akhlaq: 6
      };

      if (item.id === "fajr_on_time") {
        if (nextPrayer?.label !== "الفجر") return null;
        return {
          item,
          title: "استعد لصلاة الفجر القادمة",
          tip: "نوم مبكر + منبه + نية",
          route,
          priority: 0
        };
      }

      if (item.id === "five_prayers") {
        if (!nextPrayer) return null;
        return {
          item,
          title: `حافظ على ${nextPrayer.label} في وقتها`,
          tip: "تهيأ للصلاة قبل الأذان بدقائق",
          route,
          priority: nearPrayerWindow ? 0 : 1
        };
      }

      let title = item.title;
      let tip = rescueTipByCategory(item.category);
      let priority = basePriorityMap[item.category] ?? 10;

      if (nearPrayerWindow && item.category === "quran") {
        title = "ورد قرآن قصير قبل الصلاة القادمة";
        tip = "صفحة واحدة بتدبر تكفي";
        priority = 1;
      }

      if (smartNow.streakRisk && item.category === "dhikr") {
        title = "ذكر سريع لإنقاذ السلسلة";
        tip = "ابدأ بـ 30 ثانية الآن";
        priority = Math.min(priority, 2);
      }

      return { item, title, tip, route, priority };
    };

    const allMissionSteps = debtToday
      .map(toMissionStep)
      .filter((step): step is MissionStep => !!step)
      .sort((a, b) => a.priority - b.priority);

    const recoveryItem = allMissionSteps[0]?.item ?? null;
    const priorityCategories: DailyChecklistItem["category"][] = ["salah", "quran", "dhikr", "sadaqah", "family", "akhlaq"];
    const recoveryPlan = [...allMissionSteps]
      .sort((a, b) => {
        const catDiff = priorityCategories.indexOf(a.item.category) - priorityCategories.indexOf(b.item.category);
        if (catDiff !== 0) return catDiff;
        return a.priority - b.priority;
      })
      .slice(0, 3);

    const urgency =
      smartNow.streakRisk || debtToday.length >= 4
        ? "high"
        : debtToday.length >= 2 || (nextPrayerMinutes != null && nextPrayerMinutes <= 30)
          ? "medium"
          : "low";

    const urgencyLabel =
      urgency === "high"
        ? "أولوية عالية"
        : urgency === "medium"
          ? "أولوية متوسطة"
          : "أولوية هادئة";

    return {
      debtToday,
      missedYesterdayItems,
      recoveryItem,
      allMissionSteps,
      recoveryPlan,
      nextPrayer,
      nextPrayerMinutes,
      urgency,
      urgencyLabel
    };
  }, [dailyChecklistToday, dailyChecklistYesterday, prayerContext.nextPrayer, prayerContext.nextPrayerMinutes, smartNow.streakRisk]);

  const recoverOneTask = React.useCallback(() => {
    const item = adaptiveMission.recoveryItem;
    if (!item) {
      toast.success("لا توجد مهام متأخرة الآن");
      return;
    }
    toggleDailyChecklist(worshipDayKey, item.id, true);
    toast.success(`تم إنجاز: ${item.title}`);
  }, [adaptiveMission.recoveryItem, toggleDailyChecklist, worshipDayKey]);

  // Time-aware hero adhkar CTA — memoized; hour is stable for minutes at a time
  const heroAdhkar = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 4) return { id: "sleep",   label: "ابدأ بأذكار النوم" };
    if (hour >= 15)              return { id: "evening", label: "ابدأ بأذكار المساء" };
    return                              { id: "morning", label: "ابدأ بأذكار الصباح" };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [civilTodayKey]);

  if (isLoading) {
    return (
      <div className="space-y-4 page-enter" role="status" aria-label="جارٍ التحميل…">
        <span className="sr-only">جارٍ التحميل…</span>
        <div className="glass-strong rounded-3xl p-5 space-y-4">
          <div className="skeleton h-8 w-3/4 rounded-xl" />
          <div className="skeleton h-4 w-1/2 rounded-lg" />
          <div className="flex gap-2">
            <div className="skeleton h-10 w-28 rounded-2xl" />
            <div className="skeleton h-10 w-20 rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]"><div className="skeleton h-3 w-12 rounded-lg" /><div className="skeleton h-6 w-8 rounded-xl mt-2" /></div>
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]"><div className="skeleton h-3 w-12 rounded-lg" /><div className="skeleton h-6 w-8 rounded-xl mt-2" /></div>
          <div className="glass rounded-3xl p-4 border border-[var(--stroke)]"><div className="skeleton h-3 w-12 rounded-lg" /><div className="skeleton h-6 w-8 rounded-xl mt-2" /></div>
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold">حدث خطأ</div>
          <div className="opacity-70 mt-2 text-sm leading-6">
            لم نستطع تحميل قاعدة الأذكار. تأكد من وجود الملف{" "}
            <code className="px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--stroke)]">
              public/data/adhkar
            </code>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 page-enter">
      <Card className="p-5 overflow-hidden relative">
        <div className="absolute -top-10 -left-8 opacity-80" aria-hidden="true">
          <div className="w-32 h-32">
            <Lottie animationData={pulse} loop />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <div>
            <div>
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <Sparkles size={14} className="text-[var(--accent)]" aria-hidden="true" />
                <span className="text-xs font-medium opacity-65">{timeGreeting(new Date().getHours())}</span>
                {(() => { const h = getHijriDate(); return h ? <span className="text-xs opacity-50 border border-[var(--stroke)] rounded-full px-2 py-0.5">{h}</span> : null; })()}
                {streak > 0 && (
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full glass border border-[var(--stroke)] streak-fire cursor-pointer active:scale-95 transition-transform ${streak >= 30 ? "text-orange-400" : streak >= 7 ? "text-yellow-400" : "text-[var(--accent)]"}`}
                    onClick={async () => {
                      const emoji = streak >= 30 ? "🔥" : streak >= 7 ? "⚡" : "✨";
                      const text = `${emoji} سلسلة ${streak} يوم متواصل في تطبيق أثر!\n\nالاستمرار في الذكر والعبادة — اترك أثراً طيباً.`;
                      if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
                      else { await navigator.clipboard.writeText(text).catch(() => {}); toast.success("تم النسخ"); }
                    }}
                  >
                    {streak >= 30 ? "🔥" : streak >= 7 ? "⚡" : "✨"} {streak} يوم متواصل
                  </button>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-semibold leading-tight">
                أثر — اترك <span className="text-[var(--accent)]">أثراً</span> طيباً
              </h1>
              <div className="mt-2 text-sm opacity-70 leading-6 max-w-2xl">
                {"﴿وَقُلْ رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا﴾"}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 max-w-xl">
                <Button className="press-effect" onClick={() => onQuick(heroAdhkar.id)}>{heroAdhkar.label}</Button>
                {quranLastRead ? (
                  <Button className="press-effect" variant="secondary" onClick={() => { trackUxEvent("home_cta:continue_quran"); navigate(prefs.quranMushafPage ? `/mushaf/${prefs.quranMushafPage}` : `/mushaf/1`); }}>
                    📖 {quranLastReadSurahName ? `تابع ${quranLastReadSurahName}` : "تابع القرآن"}
                  </Button>
                ) : (
                  <Button className="press-effect" variant="secondary" onClick={() => { trackUxEvent("home_cta:quran"); navigate("/mushaf/1"); }}>المصحف</Button>
                )}
                {lastVisitedSection ? (
                  <Button className="press-effect" variant="secondary" onClick={() => { trackUxEvent("home_cta:last_section"); navigate(`/c/${lastVisitedSection.id}`); }}>
                    تابع آخر قسم
                  </Button>
                ) : null}
                <Button className="press-effect" variant="secondary" onClick={() => { trackUxEvent("home_cta:sebha"); navigate("/sebha"); }}>السبحة</Button>
                <HomeRadioButton />
                <button type="button"
                  onClick={onRandom}
                  aria-label="ذكر عشوائي"
                  className="press-effect inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] hover:bg-[var(--card-2)] active:scale-[.97] transition shrink-0"
                >
                  <Shuffle size={16} aria-hidden="true" />
                </button>
              </div>

              {/* Quran reading progress micro-bar */}
              {quranReadingPct > 0 && (
                <button type="button"
                  onClick={() => navigate(prefs.quranMushafPage ? `/mushaf/${prefs.quranMushafPage}` : "/mushaf/1")}
                  className="mt-3 flex items-center gap-2.5 group"
                  aria-label={`القرآن: ${quranReadingPct}% مقروء`}
                >
                  <span className="text-xs opacity-60" aria-hidden="true">📖</span>
                  <div className="w-28 h-1.5 rounded-full bg-[var(--card)] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quranReadingPct} aria-label={`${quranReadingPct}% مقروء`}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${quranReadingPct}%`, background: "var(--accent)" }}
                    />
                  </div>
                  <span className="text-xs opacity-55 tabular-nums group-hover:opacity-80 transition-opacity">
                    {quranReadingPct}%
                  </span>
                  {quranStreak > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] tabular-nums" style={{ color: "#fb923c" }}>
                      🔥 {quranStreak}
                    </span>
                  )}
                  {quranLastRead && quranLastReadSurahName && (
                    <span className="text-[10px] opacity-40 arabic-text line-clamp-2 leading-tight max-w-[70px]">{quranLastReadSurahName}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </Card>

      {/* ── Sections quick-access strip (drag-and-drop to reorder) ── */}
      {(sections.length > 0 || customPacks.length > 0) && (
        <div
          ref={stripScrollRef}
          className="overflow-x-auto no-scrollbar -mx-0.5 px-0.5"
          style={{ touchAction: draggingStripId ? "none" : "pan-x" }}
          onPointerMove={onStripPointerMove}
          onPointerUp={onStripPointerUp}
          onPointerCancel={onStripPointerUp}
        >
          {draggingStripId && (
            <div className="text-[10px] opacity-40 text-center mb-1 arabic-text">اسحب لإعادة الترتيب · ارفع إصبعك للحفظ</div>
          )}
          {!draggingStripId && !prefs.homeStripOrder && (
            <div className="text-[10px] opacity-30 text-center mb-1 arabic-text select-none">اضغط مطولاً على أي قسم لإعادة ترتيبه</div>
          )}
          <div className="flex gap-2 pb-0.5" style={{ width: "max-content" }}>
            {/* ── Fixed "+" add custom button (not draggable) — always first ── */}
            <button type="button"
              onClick={() => { trackUxEvent("home_strip:custom_manage"); navigate("/adhkar/custom"); }}
              className="press-effect flex-none flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl glass border min-w-[60px] active:scale-[.91] transition-all"
              style={{ borderColor: "var(--stroke)", opacity: draggingStripId ? 0.3 : 0.7 }}
            >
              <span className="text-[22px] leading-none">＋</span>
              <span className="text-[10px] font-medium opacity-60 leading-none mt-0.5">أذكاري</span>
              <div className="w-full h-[3px] rounded-full bg-[var(--card)] overflow-hidden mt-1" />
            </button>
            {/* ── Draggable items (custom packs + sections) ── */}
            {(() => {
              const packMap = new Map(customPacks.map((p) => [p.id, p]));
              const secMap = new Map(sections.map((s) => [s.id, s]));
              return activeStripIds.map((id) => {
                const pack = packMap.get(id);
                if (pack) {
                  let done = 0;
                  const total = pack.items.length;
                  pack.items.forEach((item, i) => {
                    const have = Math.min(item.count, Math.max(0, Number(progressMap[`${pack.id}:${i}`]) || 0));
                    if (have >= item.count) done++;
                  });
                  const isComplete = total > 0 && done === total;
                  const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isDragging = draggingStripId === id;
                  return (
                    <button type="button"
                      key={id}
                      data-strip-id={id}
                      onPointerDown={(e) => onStripItemPointerDown(id, e)}
                      onClick={() => { if (stripDragWasActive.current) return; trackUxEvent(`home_strip:${id}`); navigate(`/c/${id}`); }}
                      className="press-effect flex-none flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl glass border min-w-[60px] active:scale-[.91] transition-all"
                      style={{
                        borderColor: isDragging
                          ? "color-mix(in srgb, var(--accent) 60%, transparent)"
                          : isComplete
                            ? "color-mix(in srgb, var(--ok) 30%, transparent)"
                            : pctDone > 0 ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--card)",
                        transform: isDragging ? "scale(1.07)" : undefined,
                        boxShadow: isDragging ? "0 8px 28px rgba(0,0,0,0.45)" : undefined,
                        zIndex: isDragging ? 10 : undefined,
                        transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
                        opacity: draggingStripId && !isDragging ? 0.65 : 1,
                      }}
                    >
                      <span className="text-[22px] leading-none" aria-hidden="true">📝</span>
                      <span className="text-[10px] font-medium opacity-60 leading-tight mt-0.5 max-w-[60px] line-clamp-2">{pack.title}</span>
                      <div className="w-full h-[3px] rounded-full bg-[var(--card)] overflow-hidden mt-1">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pctDone}%`, background: isComplete ? "var(--ok)" : "var(--accent)" }} />
                      </div>
                    </button>
                  );
                }
                const section = secMap.get(id);
                if (section) {
                  const identity = getSectionIdentity(section.id);
                  let done = 0;
                  const total = section.content.length;
                  section.content.forEach((item, i) => {
                    const need = coerceCount(item.count);
                    const have = Math.min(need, Math.max(0, Number(progressMap[`${section.id}:${i}`]) || 0));
                    if (have >= need) done++;
                  });
                  const isComplete = total > 0 && done === total;
                  const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isDragging = draggingStripId === id;
                  return (
                    <button type="button"
                      key={id}
                      data-strip-id={id}
                      onPointerDown={(e) => onStripItemPointerDown(id, e)}
                      onClick={() => { if (stripDragWasActive.current) return; trackUxEvent(`home_strip:${id}`); navigate(`/c/${id}`); }}
                      className="press-effect flex-none flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl glass border min-w-[60px] active:scale-[.91] transition-all"
                      style={{
                        borderColor: isDragging
                          ? "color-mix(in srgb, var(--accent) 60%, transparent)"
                          : isComplete
                            ? "color-mix(in srgb, var(--ok) 30%, transparent)"
                            : pctDone > 0 ? `${identity.accent}40` : "var(--card)",
                        transform: isDragging ? "scale(1.07)" : undefined,
                        boxShadow: isDragging ? "0 8px 28px rgba(0,0,0,0.45)" : undefined,
                        zIndex: isDragging ? 10 : undefined,
                        transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
                        opacity: draggingStripId && !isDragging ? 0.65 : 1,
                      }}
                    >
                      <span className="text-[22px] leading-none">{identity.icon}</span>
                      <span className="text-[10px] font-medium opacity-60 leading-tight mt-0.5 w-full text-center line-clamp-2">{identity.badge}</span>
                      <div className="w-full h-[3px] rounded-full bg-[var(--card)] overflow-hidden mt-1">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pctDone}%`, background: isComplete ? "var(--ok)" : identity.accent }} />
                      </div>
                    </button>
                  );
                }
                return null;
              });
            })()}
          </div>
        </div>
      )}

      {homeWidgetsOrder.map((widgetKey) => {
        if (widgetKey === "prayer") {
          return homeWidgets.prayer ? <PrayerWidget key="prayer" /> : null;
        }
        if (widgetKey === "hadith") {
          return homeWidgets.hadith ? <DailyCarousel key="hadith" dateKey={civilTodayKey} /> : null;
        }
        if (widgetKey === "wisdom") {
          return null; // wisdom content is inside DailyCarousel (slide 3)
        }
        if (widgetKey === "smart") {
          if (!homeWidgets.smart) return null;
          return (
            <Card key="smart" className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold opacity-55">الآن ماذا أفعل؟</span>
                    <Badge>{smartNow.periodLabel}</Badge>
                    {adaptiveMission.urgency === "high" && <Badge>{adaptiveMission.urgencyLabel}</Badge>}
                    {adaptiveMission.urgency !== "high" && adaptiveMission.debtToday.length > 0 && (
                      <Badge>{adaptiveMission.debtToday.length} متبقية</Badge>
                    )}
                  </div>
                  <div className="mt-2 text-[15px] font-bold leading-snug">
                    {smartNow.suggestedAction}
                  </div>
                </div>
                <Dropdown.Root modal={false}>
                  <Dropdown.Trigger asChild>
                    <button type="button"
                      className="shrink-0 w-11 h-11 rounded-xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center transition active:scale-90 mt-0.5"
                      aria-label="خيارات إضافية"
                    >
                      <MoreVertical size={16} aria-hidden="true" />
                    </button>
                  </Dropdown.Trigger>
                  <Dropdown.Portal>
                    <Dropdown.Content
                      align="start"
                      sideOffset={8}
                      style={{ zIndex: 100000 }}
                      className="glass-strong rounded-3xl min-w-[240px] border border-[var(--stroke)] p-2 shadow-2xl"
                    >
                      <Dropdown.Label className="px-3 pt-2 text-[11px] font-semibold opacity-45">ملخص سريع</Dropdown.Label>
                      <div className="px-3 pb-2 pt-1 text-[11px] opacity-60 leading-5">
                        أنجزت {DAILY_CHECKLIST_ITEMS.length - adaptiveMission.debtToday.length} من {DAILY_CHECKLIST_ITEMS.length} اليوم
                        {smartNow.missedYesterday > 0 ? ` • فاتك ${smartNow.missedYesterday} أمس` : ""}
                      </div>
                      <Dropdown.Separator className="my-1 h-px bg-[var(--card)]" />
                      {adaptiveMission.recoveryItem ? (
                        <HomeQuickMenuAction
                          label="استدرك المهمة الأقرب"
                          hint={adaptiveMission.recoveryItem.title}
                          onSelect={recoverOneTask}
                        />
                      ) : null}
                      <HomeQuickMenuAction
                        label="راجع التقدم اليومي"
                        hint="الإحصاءات وقائمة اليوم"
                        onSelect={() => navigate("/insights")}
                      />
                      <HomeQuickMenuAction
                        label="خطة الختمة"
                        hint="أصبحت داخل صفحة المصحف"
                        onSelect={() => navigate("/quran")}
                      />
                    </Dropdown.Content>
                  </Dropdown.Portal>
                </Dropdown.Root>
              </div>
              <Button className="mt-3 w-full press-effect" onClick={() => navigate(smartNow.actionRoute)}>
                {smartNow.actionLabel}
              </Button>
            </Card>
          );
        }
        if (widgetKey === "checklist") {
          if (!homeWidgets.checklist) return null;
          const allChecklistDone = DAILY_CHECKLIST_ITEMS.every((item) => !!dailyChecklistToday[item.id]);
          const showItems = checklistExpanded;
          const CHECKLIST_INITIAL_LIMIT = 5;
          const { quests, totalXp, xpLevel, xpPct } = questsData;
          return (
            <Card key="checklist" className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">المهام والأهداف اليومية</div>
                  {(homeWidgets.quests ?? true) && (
                  <button
                    type="button"
                    className="text-xs opacity-55 mt-0.5 hover:opacity-80 transition-opacity text-right"
                    onClick={async () => {
                      const text = `وصلت لمستوى: ${xpLevel.emoji} ${xpLevel.label} (${totalXp.toLocaleString("ar-SA")} نقطة) في تطبيق أثر!\n\nاترك أثراً طيباً كل يوم.`;
                      if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
                      else { await navigator.clipboard.writeText(text).catch(() => {}); toast.success("تم النسخ"); }
                    }}
                  >
                    {xpLevel.emoji} {xpLevel.label} — {totalXp.toLocaleString("ar-SA")} نقطة
                  </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{`${DAILY_CHECKLIST_ITEMS.length - adaptiveMission.debtToday.length}/${DAILY_CHECKLIST_ITEMS.length}`}</Badge>
                  <button type="button"
                    onClick={() => setChecklistExpanded((v) => !v)}
                    className="w-8 h-8 rounded-xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center transition active:scale-90"
                    aria-label="توسيع القائمة اليومية"
                    aria-expanded={showItems}
                    aria-controls="home-checklist-items"
                  >
                    <ChevronDown size={14} aria-hidden="true" className={cn("transition-transform duration-200", showItems && "rotate-180")} />
                  </button>
                </div>
              </div>
              {/* XP progress bar + quest chips — hidden when quests widget is off */}
              {(homeWidgets.quests ?? true) && (
              <>
              <div className="mt-2.5 h-1 rounded-full bg-[var(--card)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${xpPct}%`, backgroundColor: xpLevel.color }}
                />
              </div>
              <div className="mt-2.5 flex gap-2 flex-wrap" role="list" aria-label="المهام">
                {quests.map((q) => (
                  <div
                    key={q.id}
                    role="listitem"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={q.done ? {
                      background: "color-mix(in srgb, var(--ok) 15%, transparent)",
                      borderColor: "color-mix(in srgb, var(--ok) 30%, transparent)",
                      color: "var(--ok)",
                    } : {
                      background: "var(--card)",
                      borderColor: "var(--stroke)",
                    }}
                  >
                    <span>{q.icon}</span>
                    {q.done && <CheckCircle2 size={10} aria-hidden="true" />}
                    {q.label}
                  </div>
                ))}
              </div>
              </>
              )}
              {/* Checklist items progress bar */}
              {DAILY_CHECKLIST_ITEMS.length > 0 && (
                <div className="mt-2.5 h-1 rounded-full bg-[var(--card)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.round(((DAILY_CHECKLIST_ITEMS.length - adaptiveMission.debtToday.length) / DAILY_CHECKLIST_ITEMS.length) * 100)}%`,
                      background: adaptiveMission.debtToday.length === 0 ? "var(--ok)" : "var(--accent)",
                    }}
                  />
                </div>
              )}
              {allChecklistDone && (
                <div className="mt-3 rounded-2xl bg-ok-10 border border-ok-20 px-4 py-3 text-sm font-semibold text-center" style={{ color: "var(--ok)" }}>
                  أحسنت — اكتملت قائمة اليوم ✅
                </div>
              )}
              {showItems && (
                <div id="home-checklist-items" className="mt-3 space-y-2" role="list" aria-label="قائمة العبادات اليومية">
                  {DAILY_CHECKLIST_ITEMS.slice(0, checklistShowAll ? DAILY_CHECKLIST_ITEMS.length : CHECKLIST_INITIAL_LIMIT).map((item) => {
                    const isDone = !!dailyChecklistToday[item.id];
                    return (
                      <button type="button"
                        key={item.id}
                        onClick={() => toggleDailyChecklist(worshipDayKey, item.id, !isDone)}
                        aria-pressed={isDone}
                        aria-label={`${item.title}${isDone ? " — تم" : ""}`}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 min-h-[48px] border transition-all active:scale-[.97]",
                          isDone
                            ? "bg-[var(--card)] border-[var(--stroke)] opacity-70"
                            : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card)]"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full border-2 grid place-items-center transition-all shrink-0 text-[13px]",
                          isDone
                            ? "border-[var(--ok)] bg-ok-20"
                            : "border-[var(--stroke)]"
                        )}>
                          {isDone ? <CheckCircle2 size={15} className="text-[var(--ok)]" aria-hidden="true" /> : CHECKLIST_CATEGORY_ICON[item.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-sm", isDone && "line-through opacity-60")}>{item.title}</div>
                          {!isDone && <div className="text-[11px] opacity-45 mt-0.5 leading-4">{item.subtitle}</div>}
                        </div>
                      </button>
                    );
                  })}
                  {DAILY_CHECKLIST_ITEMS.length > CHECKLIST_INITIAL_LIMIT && !checklistShowAll && (
                    <button
                      type="button"
                      onClick={() => setChecklistShowAll(true)}
                      className="w-full text-center text-xs opacity-55 hover:opacity-80 transition-opacity py-2"
                    >
                      عرض جميع المهام ({DAILY_CHECKLIST_ITEMS.length - CHECKLIST_INITIAL_LIMIT} إضافية) ▼
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        }
        if (widgetKey === "dailyStep") {
          if (!homeWidgets.dailyStep) return null;
          const dayIndex = Math.floor(Date.now() / 86400000);
          const step = BETTER_MUSLIM_DAILY_STEPS[dayIndex % BETTER_MUSLIM_DAILY_STEPS.length] ?? "";
          const isStepDone = !!dailyBetterStepDone[worshipDayKey];
          return (
            <Card key="dailyStep" className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">خطوة اليوم</div>
                  <div className="text-xs opacity-55 mt-1">عادة يومية للنمو الإيماني</div>
                </div>
                <Button
                  variant={isStepDone ? "primary" : "secondary"}
                  onClick={() => {
                    setDailyBetterStepDone(worshipDayKey, !isStepDone);
                    if (!isStepDone) toast.success("أحسنت — تم تسجيل الخطوة");
                  }}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {isStepDone ? "تم" : "أتممتها"}
                </Button>
              </div>
              <div className={cn(
                "mt-3 rounded-2xl px-4 py-3.5 border text-sm leading-7",
                isStepDone
                  ? "bg-ok-8 border-ok-20 opacity-70 line-through"
                  : "bg-accent-8 border-accent-20"
              )}>
                {step}
              </div>
            </Card>
          );
        }
        if (widgetKey === "tasbeeh") {
          if (!homeWidgets.tasbeeh) return null;
          return (
            <Card key="tasbeeh" className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <button type="button" onClick={() => navigate("/sebha")} className="text-sm font-semibold hover:opacity-75 transition-opacity text-right">
                    مختارات اليوم ↗
                  </button>
                  <div className="mt-1 text-xs opacity-55">هدف التسبيح: {tasbeehTarget}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-1">
                    {[33, 100].map((target) => (
                      <button type="button"
                        key={target}
                        onClick={() => setTasbeehTarget(target as 33 | 100)}
                        className={cn(
                          "min-w-10 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition",
                          tasbeehTarget === target
                            ? "bg-[var(--accent)] text-[var(--on-accent)]"
                            : "text-[var(--muted)] hover:bg-[var(--card-2)]"
                        )}
                      >
                        {target}
                      </button>
                    ))}
                  </div>
                  <Badge>{`${quickTotal.done}/${quickTotal.total}`}</Badge>
                  {confirmTasbeehReset ? (
                    <>
                      <Button size="sm" variant="danger" onClick={() => { resetAllQuickTasbeeh(); toast.success("تم تصفير التسابيح"); setConfirmTasbeehReset(false); }}>تأكيد</Button>
                      <Button size="sm" variant="secondary" onClick={() => setConfirmTasbeehReset(false)}>إلغاء</Button>
                    </>
                  ) : (
                    <IconButton
                      aria-label="تصفير التسابيح"
                      onClick={() => setConfirmTasbeehReset(true)}
                    >
                      <RotateCw size={16} aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
              </div>
              <div
                className="mt-3 h-2 rounded-full bg-[var(--card)] overflow-hidden border border-[var(--stroke)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(quickTotal.percent)}
                aria-label={`إجمالي التسابيح: ${quickTotal.total} (${Math.round(quickTotal.percent)}%)`}
              >
                <div className="h-full progress-accent" style={{ width: `${quickTotal.percent}%` }} />
              </div>
              {quickTotal.percent >= 100 && (
                <div className="mt-3 rounded-2xl border border-ok-30 bg-ok-10 px-4 py-3 flex items-center gap-2">
                  <span>✅</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--ok)" }}>تمت التسابيح</div>
                    <div className="text-[11px] opacity-60 mt-0.5">{quickTotal.total}/{quickTotal.total} — بارك الله فيك</div>
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3" role="list" aria-label="التسابيح السريعة">
                {QUICK_TASBEEH.map((it) => {
                  const target = tasbeehTarget;
                  const v = Math.min(target, quickTasbeeh[it.key] ?? 0);
                  const pct = target ? v / target : 0;
                  const r = 22;
                  const C = 2 * Math.PI * r;
                  const dash = C;
                  const offset = C - pct * C;
                  const done = v >= target;
                  return (
                    <button type="button"
                      key={it.key}
                      onClick={() => {
                        setActivePhraseKey(it.key);
                        incQuickTasbeeh(it.key, tasbeehTarget);
                      }}
                      className={cn(
                        "glass rounded-3xl p-3 text-right transition border select-none press-effect glass-hover min-h-[110px] overflow-hidden",
                        activePhraseKey === it.key
                          ? "border-accent-60 ring-2 ring-accent-30 bg-accent-10"
                          : "border-[var(--stroke)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div
                            className="text-sm font-semibold arabic-text"
                            style={{ lineHeight: "1.55", maxHeight: "3.1em", overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 } as React.CSSProperties}
                          >{it.label}</div>
                          <div className="mt-1 text-xs opacity-65 tabular-nums">{v}/{target}</div>
                        </div>
                        <div className="shrink-0">
                          <div className="w-11 h-11 rounded-full bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center">
                            <svg width="40" height="40" viewBox="0 0 60 60" aria-hidden="true">
                              <circle cx="30" cy="30" r={r} fill="transparent" stroke="var(--stroke)" strokeWidth="6" />
                              <circle
                                cx="30" cy="30" r={r}
                                fill="transparent"
                                stroke={done ? "var(--ok)" : "var(--accent)"}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={dash}
                                strokeDashoffset={offset}
                                className="progress-ring-circle"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-xs opacity-70">انقر للعدّ</div>
                        <Badge>{done ? "تم" : `${target - v} متبقّي`}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        }
        if (widgetKey === "dailyWird") {
          if (!homeWidgets.dailyWird) return null;
          return (
            <Card key="dailyWird" className={`p-5 transition-colors ${isDailyWirdDone ? "border border-ok-25" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">ورد اليوم</div>
                    {wirdStreak > 1 && (
                      <span className="text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                        🔥 {wirdStreak}
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-65 mt-1">
                    {dailyWird ? `آيات ${dailyWird.meta.from}–${dailyWird.meta.to} من ${dailyWird.meta.total}` : "مختارات يومية من القرآن"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setDailyWirdExpanded((v) => !v)}
                    className="w-8 h-8 rounded-xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center transition active:scale-90"
                    aria-label="توسيع ورد اليوم"
                    aria-expanded={dailyWirdExpanded}
                    aria-controls="home-daily-wird-content"
                  >
                    <ChevronDown size={14} aria-hidden="true" className={cn("transition-transform duration-200", dailyWirdExpanded && "rotate-180")} />
                  </button>
                  <Button variant="secondary" onClick={copyDailyWird} disabled={!dailyWird}>
                    <Copy size={16} aria-hidden="true" />
                    نسخ
                  </Button>
                  <Button variant="secondary" disabled={!dailyWird} onClick={async () => {
                    if (!dailyWird) return;
                    if (navigator.share) { await navigator.share({ text: dailyWird.copyText }).catch(() => {}); }
                    else { await navigator.clipboard.writeText(dailyWird.copyText).catch(() => {}); toast.success("تم النسخ"); }
                  }}>
                    <Share2 size={16} />
                  </Button>
                  <Button
                    variant={isDailyWirdDone ? "primary" : "secondary"}
                    onClick={() => {
                      if (isDailyWirdDone) {
                        setDailyWirdDone(worshipDayKey, false);
                        toast("تم التراجع عن الإتمام", { icon: "↩️" });
                      } else {
                        setDailyWirdDone(worshipDayKey, true);
                        toast.success("تم حفظ الإتمام");
                      }
                    }}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {isDailyWirdDone ? "منجز ↩" : "تم"}
                  </Button>
                </div>
              </div>
              {quran.isLoading ? (
                <div className="mt-4 text-sm opacity-65" role="status" aria-live="polite">جارٍ تحميل ورد اليوم…</div>
              ) : quran.error || !dailyWird ? (
                <div className="mt-4 text-sm opacity-65 leading-7">تعذر تحميل ورد اليوم.</div>
              ) : dailyWirdExpanded ? (
                <div id="home-daily-wird-content" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" role="list" aria-label="ورد اليوم">
                  {dailyWird.items.map((p) => (
                    <button type="button"
                      key={`${p.surahId}:${p.ayahIndex}`}
                      className="glass rounded-3xl p-4 text-right transition border border-[var(--stroke)] press-effect glass-hover"
                      onClick={() => navigate(`/mushaf?surah=${p.surahId}&ayah=${p.ayahIndex}`)}
                    >
                      <div className="text-xs opacity-65 mb-2">
                        {p.surahName} • ({p.surahId}) • ﴿{p.ayahIndex}﴾
                      </div>
                      <div className={"arabic-text opacity-90 " + textClassByLength(p.text)}>
                        {p.text}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm opacity-75 leading-7">
                  تم طي ورد اليوم. افتحه وقت القراءة أو المراجعة.
                </div>
              )}
            </Card>
          );
        }
        // ── 5C: Streak & Daily Quests Card ────────────────────────────────────
        if (widgetKey === "quests") {
          // Merged into checklist widget — render nothing here
          return null;
        }
        if (widgetKey === "dailyVerse") {
          if (!quran.data) return null;
          const dayNum = Math.floor(Date.now() / 86400000);
          // Cycle through a curated list of meaningful ayahs by day
          const VERSE_REFS: Array<{ s: number; a: number }> = [
            { s: 2, a: 152 }, { s: 2, a: 186 }, { s: 2, a: 255 }, { s: 2, a: 286 },
            { s: 3, a: 139 }, { s: 3, a: 160 }, { s: 6, a: 54 }, { s: 7, a: 56 },
            { s: 13, a: 28 }, { s: 14, a: 7 }, { s: 16, a: 97 }, { s: 17, a: 9 },
            { s: 18, a: 10 }, { s: 20, a: 132 }, { s: 23, a: 1 }, { s: 29, a: 45 },
            { s: 33, a: 41 }, { s: 39, a: 53 }, { s: 40, a: 60 }, { s: 49, a: 13 },
            { s: 55, a: 13 }, { s: 65, a: 3 }, { s: 94, a: 5 }, { s: 112, a: 1 },
          ];
          const ref = VERSE_REFS[dayNum % VERSE_REFS.length]!;
          const surah = quran.data.find((s) => s.id === ref.s);
          const ayah = surah?.ayahs[ref.a - 1];
          if (!surah || !ayah) return null;
          return (
            <button
              type="button"
              key={widgetKey}
              onClick={() => navigate(`/mushaf?surah=${ref.s}&ayah=${ref.a}`)}
              className="w-full text-right rounded-3xl border transition-all active:scale-[0.99] p-4"
              style={{
                background: "color-mix(in srgb, var(--accent) 5%, var(--card))",
                borderColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
              }}
              aria-label="آية اليوم — انتقل للمصحف"
            >
              <div className="text-[10px] font-semibold opacity-40 mb-2 tracking-wide">������ آية اليوم</div>
              <div
                className="text-base leading-8 mb-2 text-right"
                style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--fg)" }}
                lang="ar"
                dir="rtl"
              >
                {ayah}
              </div>
              <div className="text-[10px] opacity-45 flex items-center justify-between">
                <span>{surah.name} — آية {ref.a.toLocaleString("ar-EG")}</span>
                <span className="opacity-50">❮</span>
              </div>
            </button>
          );
        }
        return null;
      })}

      {/* ── كلمة اليوم — vocab ── */}
      {dailyVocabWord && (
        <button
          type="button"
          onClick={() => navigate("/quran-vocab")}
          className="w-full text-right rounded-3xl border transition-all active:scale-[0.99] p-4"
          style={{
            background: "color-mix(in srgb, var(--accent) 6%, var(--card))",
            borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
          }}
          aria-label="كلمة اليوم — انتقل إلى مفردات القرآن"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold opacity-45 mb-1.5 tracking-wide uppercase">★ كلمة اليوم</div>
              <div
                className="text-2xl font-bold mb-1 leading-tight"
                style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--accent)" }}
                lang="ar"
              >
                {dailyVocabWord.arabic}
              </div>
              <div className="text-sm font-medium opacity-75">{dailyVocabWord.meaning}</div>
            </div>
            <div className="text-[10px] opacity-30 self-center">❮</div>
          </div>
        </button>
      )}

      {/* هدف آيات اليوم */}
      {(prefs.quranDailyGoal ?? 10) > 0 && (() => {
        const todayAyahs = quranDailyAyahs[civilTodayKey] ?? 0;
        const goal = Math.max(1, prefs.quranDailyGoal ?? 10);
        const pct = Math.min(100, Math.round((todayAyahs / goal) * 100));
        const met = todayAyahs >= goal;
        return (
          <button
            type="button"
            onClick={() => navigate("/quran")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.99]"
            style={{
              background: met ? "color-mix(in srgb, var(--ok) 8%, var(--card))" : "color-mix(in srgb, var(--accent) 5%, var(--card))",
              borderColor: met ? "color-mix(in srgb, var(--ok) 25%, transparent)" : "color-mix(in srgb, var(--accent) 18%, transparent)",
            }}
            aria-label="هدف القرآن اليومي"
          >
            <span className="text-base shrink-0" aria-hidden="true">{met ? "✅" : "������"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: met ? "var(--ok)" : "var(--accent)" }}>آيات اليوم</span>
                <span className="text-xs tabular-nums opacity-70">{todayAyahs.toLocaleString("ar-EG")} / {goal.toLocaleString("ar-EG")}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: met ? "var(--ok)" : "var(--accent)" }} />
              </div>
            </div>
            <span className="text-[10px] opacity-30 shrink-0">❮</span>
          </button>
        );
      })()}

      {/* ختمة القرآن */}
      {khatmaStartISO && khatmaDays && (() => {
        const start = new Date(khatmaStartISO);
        const end = new Date(start.getTime() + khatmaDays * 86400000);
        const now = Date.now();
        if (now >= end.getTime()) return null; // finished
        const totalMs = end.getTime() - start.getTime();
        const elapsedMs = now - start.getTime();
        const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
        const daysLeft = Math.ceil((end.getTime() - now) / 86400000);
        const doneCount = Object.values(khatmaDone ?? {}).filter(Boolean).length;
        return (
          <button
            type="button"
            onClick={() => navigate("/quran-plans")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.99]"
            style={{ background: "color-mix(in srgb, var(--accent) 5%, var(--card))", borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
            aria-label="ختمة القرآن"
          >
            <span className="text-base shrink-0" aria-hidden="true">������</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>ختمة القرآن</span>
                <span className="text-xs tabular-nums opacity-70">تبقى {daysLeft.toLocaleString("ar-EG")} يوم · {doneCount.toLocaleString("ar-EG")}س/{khatmaDays.toLocaleString("ar-EG")}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--accent)" }} />
              </div>
            </div>
            <span className="text-[10px] opacity-30 shrink-0">❮</span>
          </button>
        );
      })()}

      {/* ── مكتبة المحتوى ── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base" aria-hidden="true">📚</span>
          <div className="text-sm font-semibold">مكتبة المحتوى</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: "✨", label: "أسماء الله", route: "/asma" },
            { icon: "🤲", label: "الأدعية", route: "/duas" },
            { icon: "📖", label: "مفردات القرآن", route: "/quran-vocab" },
            { icon: "🕌", label: "قصص الأنبياء", route: "/stories" },
            { icon: "🧎", label: "كيفية الصلاة", route: "/prayer-guide" },
            { icon: "💧", label: "الوضوء", route: "/wudu" },
            { icon: "🌟", label: "الصحابة", route: "/companions" },
            { icon: "📜", label: "الرقية الشرعية", route: "/ruqyah" },
            { icon: "🗓", label: "السيرة النبوية", route: "/seerah" },
            { icon: "📚", label: "الأحاديث", route: "/hadith" },
            { icon: "🏅", label: "حفظ الحديث", route: "/hadith/memo" },
            { icon: "📊", label: "الإحصاءات", route: "/insights" },
          ].map(({ icon, label, route }) => (
            <button type="button"
              key={route}
              onClick={() => navigate(route)}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 transition active:scale-95"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)", color: "var(--fg)" }}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-[11px] font-medium text-center leading-4 opacity-80">{label}</span>
            </button>
          ))}
        </div>
      </Card>

    </div>
  );
}

function HomeQuickMenuAction(props: { label: string; hint?: string; onSelect: () => void }) {
  return (
    <Dropdown.Item
      onSelect={() => props.onSelect()}
      className="rounded-2xl px-3 py-2.5 outline-none transition cursor-pointer data-[highlighted]:bg-[var(--card)]"
    >
      <div className="text-sm font-medium">{props.label}</div>
      {props.hint ? <div className="mt-0.5 text-[11px] opacity-55 leading-5">{props.hint}</div> : null}
    </Dropdown.Item>
  );
}

