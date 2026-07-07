/**
 * Widget Data Bridge
 *
 * Syncs app state to native SharedPreferences so Android home-screen widgets
 * can display live data without opening the app.
 *
 * Keys written (all stored via @capacitor/preferences → CapacitorStorage):
 *   noor_widget_adhkar_v1    — morning / evening adhkar progress
 *   noor_widget_wird_v1      — quran wird reading stats
 *   noor_widget_dashboard_v1 — streak days + score + level (for Dashboard widget)
 *
 * (Prayer data is written separately by prayerWidget.ts)
 */

import { Capacitor } from "@capacitor/core";
import { useNoorStore, type Preferences } from "@/store/noorStore";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Surah names (Arabic) — ordered by surah id 1-114 ────────────────────────
const SURAH_NAMES: string[] = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة",
  "يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];

// ─── Adhkar section totals (from public/data/adhkar.json) ────────────────────
const MORNING_TOTAL = 31;
const EVENING_TOTAL = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdhkarWidgetPayload = {
  morning: { done: number; total: number };
  evening: { done: number; total: number };
  updatedAt: string;
};

export type WirdWidgetPayload = {
  ayahsRead: number;
  dailyGoal: number;
  currentSurah: string;
  currentAyah: number;
  updatedAt: string;
};

export type DashboardWidgetPayload = {
  streakDays: number;
  totalScore: number;
  levelAr: string;
  levelEmoji: string;
  updatedAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Write a key-value pair via Capacitor Preferences (→ SharedPreferences on Android). */
async function nativeSet(key: string, value: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  } catch {
    // Plugin not available — silently degrade
  }
}

/**
 * Count how many adhkar items have been started in a section.
 * Key format in noorStore.progress: "${sectionId}:${originalIndex}"
 * An item counts as "done" if its progress value is > 0.
 */
function countSectionItemsDone(
  progress: Record<string, number>,
  sectionId: string,
): number {
  let done = 0;
  for (const key of Object.keys(progress)) {
    if (key.startsWith(`${sectionId}:`)) {
      const val = progress[key];
      if (typeof val === "number" && val > 0) done++;
    }
  }
  return done;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Sync morning + evening adhkar progress to the native widget.
 * Call this whenever the app comes to foreground or after the user reads adhkar.
 */
export async function syncAdhkarWidget(): Promise<void> {
  const KEY = "noor_widget_adhkar_v1";
  const state = useNoorStore.getState();
  const progress = state.progress ?? {};
  const sectionCompletions = state.sectionCompletions ?? {};
  const today = todayISO();

  // Use sectionCompletions as an upper bound: if section is completed today → 100%
  const morningCompleted = (sectionCompletions["morning"] ?? []).includes(today);
  const eveningCompleted = (sectionCompletions["evening"] ?? []).includes(today);

  const morningDone = morningCompleted
    ? MORNING_TOTAL
    : countSectionItemsDone(progress, "morning");

  const eveningDone = eveningCompleted
    ? EVENING_TOTAL
    : countSectionItemsDone(progress, "evening");

  const payload: AdhkarWidgetPayload = {
    morning: { done: morningDone,  total: MORNING_TOTAL },
    evening: { done: eveningDone,  total: EVENING_TOTAL },
    updatedAt: new Date().toISOString(),
  };

  const value = JSON.stringify(payload);

  // Always write to localStorage for PWA / debug
  try { localStorage.setItem(KEY, value); } catch { /* ignore */ }

  await nativeSet(KEY, value);
}

/**
 * Sync quran wird progress to the native widget.
 * Call this whenever the app comes to foreground or after reading.
 */
export async function syncWirdWidget(): Promise<void> {
  const KEY = "noor_widget_wird_v1";
  const state = useNoorStore.getState();
  const today = todayISO();

  const ayahsRead   = (state.quranDailyAyahs ?? {})[today] ?? 0;
  const dailyGoal   = (state.prefs as Preferences).quranDailyGoal ?? 10;
  const lastRead    = state.quranLastRead;
  const surahId     = lastRead?.surahId ?? 1;
  const ayahIndex   = lastRead?.ayahIndex ?? 1;
  const currentSurah = SURAH_NAMES[surahId - 1] ?? "";

  const payload: WirdWidgetPayload = {
    ayahsRead,
    dailyGoal,
    currentSurah,
    currentAyah: ayahIndex,
    updatedAt: new Date().toISOString(),
  };

  const value = JSON.stringify(payload);

  // Always write to localStorage for PWA / debug
  try { localStorage.setItem(KEY, value); } catch { /* ignore */ }

  await nativeSet(KEY, value);
}

/**
 * Sync streak + score + level to the native Dashboard widget.
 * Call this alongside the other sync functions on app foreground.
 */
export async function syncDashboardWidget(): Promise<void> {
  const KEY = "noor_widget_dashboard_v1";
  const state = useNoorStore.getState();
  const activity: Record<string, number> = (state as { activity?: Record<string, number> }).activity ?? {};

  // Compute current streak — count backwards from today through consecutive active days
  const today = todayISO();
  let streakDays = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if ((activity[key] ?? 0) > 0) {
      streakDays++;
      d.setDate(d.getDate() - 1);
    } else if (i === 0) {
      // Today has no activity yet — still count yesterday's streak as active
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  const totalScore: number = (state as { score?: number }).score ?? 0;

  // Resolve level label + emoji from score thresholds (mirrors Insights.tsx)
  const levelInfo = resolveLevelFromScore(totalScore);

  const payload: DashboardWidgetPayload = {
    streakDays: Math.max(1, streakDays),
    totalScore,
    levelAr: levelInfo.ar,
    levelEmoji: levelInfo.emoji,
    updatedAt: today,
  };

  const value = JSON.stringify(payload);
  try { localStorage.setItem(KEY, value); } catch { /* ignore */ }
  await nativeSet(KEY, value);
}

/** Map a total score to a level name + emoji (mirrors the tier list in Insights.tsx). */
function resolveLevelFromScore(score: number): { ar: string; emoji: string } {
  if (score >= 10000) return { ar: "إمام",    emoji: "💎" };
  if (score >= 2000)  return { ar: "حافظ",    emoji: "🏆" };
  if (score >= 500)   return { ar: "مواظب",   emoji: "⭐" };
  if (score >= 100)   return { ar: "ناشئ",    emoji: "🌿" };
  return                     { ar: "مبتدئ",   emoji: "🌱" };
}

/**
 * Sync all widget data in one call.
 * Call this on app foreground and after significant state changes.
 */
export async function syncAllWidgets(): Promise<void> {
  await Promise.allSettled([
    syncAdhkarWidget(),
    syncWirdWidget(),
    syncDashboardWidget(),
  ]);
  // Repaint home-screen widgets immediately with the data we just wrote.
  const { refreshHomeWidgets } = await import("@/lib/widgetRefresh");
  await refreshHomeWidgets();
}
