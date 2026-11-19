/**
 * رفيق أثر — the Athar AI companion.
 *
 * Powered by MiniMax M3.1 Flash exclusively. The app has a single AI surface that every
 * user reaches the same way — no model picker, no BYOK, no provider toggles.
 *
 * Data handling:
 *  - No user API keys are accepted or stored.
 *  - Prompts go through our Supabase Edge Function proxy to MiniMax; requests
 *    include at most 16 recent messages and a 48,000-character history cap.
 *    Progress, profile, inferred mood, and question memory are opt-in.
 *  - Conversation history + memory are stored on the user's device (IndexedDB
 *    + localStorage); storing them locally does not mean they stay local when
 *    the user requests an AI reply.
 *
 * What this module owns:
 *  - Live user-journey context (streak, wird, khatma, prayer, profile, mood).
 *  - The request context; the instructions themselves are owned by the server,
 *    which also verifies every verse and hadith before a reply is shown.
 *  - Streaming pipeline with structured tool calls (`next_step`, `cite`).
 *  - Retrieval block pulled from the local Islamic-library index.
 *  - Post-stream verifier that flags unverifiable Quran/hadith claims.
 */
import { BaseAnthropic } from "@anthropic-ai/sdk/client";
import { APIConnectionError, APIError, AuthenticationError, RateLimitError } from "@anthropic-ai/sdk/core/error";
import { Messages, type Tool, type WebSearchTool20250305 } from "@anthropic-ai/sdk/resources/messages/messages";
import { getSession } from "@/lib/authClient";
import { accountScopedLocalStorage } from "@/lib/accountStorageScope";

import { useNoorStore } from "@/store/noorStore";
import { DAILY_HADITH_FAJR_PHRASES } from "@/lib/reminders";
import { arNum } from "@/lib/formatNumber";

import {
  buildCompanionProfileContext,
  loadProfile,
} from "@/lib/companionProfile";
import { createCompanionStreamSanitizer } from "@/lib/companionSanitize";
import {
  detectMood,
  retrieveUserRemindersAsPassages,
  verifyAnswerAsync,
} from "@/lib/companionKnowledge";
import { forHijri } from "@/lib/hijri";

/* ─── Locked model + transport ───────────────────────────────────────────── */

const MODEL = "MiniMax-M3.1-Flash";

/* Default proxy endpoint — the canonical Supabase Edge Function URL for
   this project. We hardcode it as a fallback so deployed builds that
   forgot to wire up the env var still work. If you need to point at a
   different deployment, set VITE_COMPANION_PROXY_URL at build time. */
const DEFAULT_PROXY_URL = "https://ojstudhmcypoqfnwugbf.functions.supabase.co/companion";
const PROXY_URL: string =
  ((import.meta.env.VITE_COMPANION_PROXY_URL as string | undefined) ?? "").trim()
  || DEFAULT_PROXY_URL;

/* The public project key identifies this Supabase project at the gateway;
   authenticated AI requests also carry the user's session JWT in Authorization.
   The fallback must match the project used by the proxy and account config. */
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qc3R1ZGhtY3lwb3Fmbnd1Z2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNzc1NTMsImV4cCI6MjA4NjY1MzU1M30.s6f0TKx4TVjtqUw7ezCuYJ0WATgMF_bahJ1Jgh4vyEs";
const SUPABASE_ANON_KEY: string =
  ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_LEADERBOARD_ANON_KEY as string | undefined) ?? "").trim()
  || DEFAULT_SUPABASE_ANON_KEY;


export const COMPANION_MODEL = MODEL;
export const COMPANION_DISPLAY_NAME = "أثر";
export const COMPANION_PROXY_URL = PROXY_URL;

/** True when the proxy URL is configured. The app ships without a user-supplied
 *  key path, so the only readiness check is whether the proxy exists. */
export function isCompanionReady(): boolean {
  return !!PROXY_URL;
}

/** Check sign-in before the composer clears or stores a guest's attempted message. */
export async function hasCompanionSession(): Promise<boolean> {
  try {
    return Boolean((await getSession())?.access_token);
  } catch {
    return false;
  }
}

export type CompanionReadiness = {
  ready: boolean;
  reason?: "missing-proxy" | "missing-key";
  proxyUrl: string | null;
};

/** Detailed readiness surface for the in-app status chip. Tells the user
 *  — and the in-app admin — *why* the AI isn't available (if it isn't). */
export function getCompanionReadiness(): CompanionReadiness {
  if (!PROXY_URL) return { ready: false, reason: "missing-proxy", proxyUrl: null };
  return { ready: true, proxyUrl: PROXY_URL };
}

/* `process.env.NODE_ENV === 'production'` is set by Vite at build time and
   baked into the bundle. A non-production means a debug-friendly bundle that
   can safely print diagnostics. We also expose this through a watcher for
   the admin panel. */
export const IS_PROD_BUILD = (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD === true;


/* ─── Public types ───────────────────────────────────────────────────────── */

export type CompanionProvider = "minimax";
export type CompanionMessage = { role: "user" | "assistant"; content: string };

const MAX_OUTBOUND_MESSAGES = 16;
const MAX_OUTBOUND_HISTORY_CHARS = 48_000;
const MAX_CURRENT_USER_MESSAGE_CHARS = 8_000;

export type OutboundMessagesResult =
  | { ok: true; messages: CompanionMessage[] }
  | { ok: false; reason: "user-message-too-long" };

/** Keep provider requests bounded while preserving the latest user message
 *  and a valid user-first conversation suffix. The full history remains local. */
export function buildOutboundMessages(history: CompanionMessage[]): OutboundMessagesResult {
  let lastUserIndex = -1;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.role === "user") {
      lastUserIndex = index;
      break;
    }
  }
  const currentUserMessage = lastUserIndex >= 0 ? history[lastUserIndex] : undefined;
  if (currentUserMessage && currentUserMessage.content.length > MAX_CURRENT_USER_MESSAGE_CHARS) {
    return { ok: false, reason: "user-message-too-long" };
  }

  let messages = history.slice(-MAX_OUTBOUND_MESSAGES);
  while (messages[0]?.role === "assistant") messages = messages.slice(1);
  while (messages.reduce((total, message) => total + message.content.length, 0) > MAX_OUTBOUND_HISTORY_CHARS) {
    messages = messages.slice(1);
    while (messages[0]?.role === "assistant") messages = messages.slice(1);
  }

  return { ok: true, messages };
}

/** Structured tool call emitted by the assistant mid-stream. The companion
 *  UI dispatches these to the corresponding store actions (e.g. create_reminder
 *  → useNoorStore.addCustomReminder). Persisted in the assistant message
 *  content as `:::reminder\n{json}\n:::` so reloading the conversation
 *  re-runs the side effect. */
export type PersistedToolCall = {
  name: "create_reminder";
  input: Record<string, unknown>;
};

/* ─── Live user context ──────────────────────────────────────────────────── */

export type CompanionContext = {
  streakDays: number;
  totalScore: number;
  morningDone: boolean;
  eveningDone: boolean;
  sleepDone: boolean;
  prayerDone: boolean;
  ayahsReadToday: number;
  dailyGoal: number;
  lastSurahId: number | null;
  tasbeehToday: number;
  nextPrayer: { nameAr: string; time: string } | null;
  hijriDate: string;
  hijriDay: number;
  hijriMonth: number;
  hijriMonthName: string;
  weekdayAr: string;
  weekdayTomorrowAr: string;
  isFriday: boolean;
  isTomorrowFriday: boolean;
  isThursday: boolean;
  isRamadan: boolean;
  isLastTenNights: boolean;
  daysToRamadan: number | null;
  daysToFriday: number;
  timePhase: TimePhase;
  hoursToNextPrayer: number | null;
  adherenceWeek: Array<{ dateISO: string; weekdayAr: string; score: number }>;
  khatma: { day: number; totalDays: number; onTrack: boolean } | null;
  remainingTodayHints: string[];
};

export type TimePhase =
  | "fajr-pre"
  | "fajr"
  | "duha"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "late-night"
  | "qiyam";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const WEEKDAYS_AR_LONG = [
  "يوم الأحد", "يوم الإثنين", "يوم الثلاثاء", "يوم الأربعاء", "يوم الخميس", "يوم الجمعة", "يوم السبت",
];

const HIJRI_MONTHS_AR = [
  "", "محرَّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
];

function parseHijriParts(): { day: number; month: number; year: number } {
  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric",
    }).formatToParts(forHijri(new Date()));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
    return { day: get("day"), month: get("month"), year: get("year") };
  } catch {
    return { day: 0, month: 0, year: 0 };
  }
}

function hijriToday(): string {
  const p = parseHijriParts();
  if (!p.month) return "";
  return `${arNum(p.day)} ${HIJRI_MONTHS_AR[p.month]} ${arNum(p.year)} هـ`;
}

/**
 * Fixed clock-hour boundaries can't track when Maghrib/Isha actually happen
 * (they shift with season and location), so a wall-clock-only phase can
 * mislabel "before Maghrib" as "isha" and greet the user with sleep-adhkar
 * copy hours too early. When we know the real next prayer, derive the phase
 * from it instead — it's already location-correct — and only fall back to
 * the fixed-hour heuristic when no prayer-time data is available yet.
 */
function computeTimePhase(hour: number, nextPrayerNameAr?: string | null, hoursToNext?: number | null): TimePhase {
  if (nextPrayerNameAr) {
    switch (nextPrayerNameAr) {
      case "الفجر":
        // Spans Isha through pre-Fajr — sub-distinguish by the clock since
        // prayer data alone can't tell "just had Isha" from "middle of the night".
        if (hour >= 19 || hour < 1) return "isha";
        if (hour < 4) return "qiyam";
        return "fajr-pre";
      case "الظهر":
        return hour < 9 ? "fajr" : "duha";
      case "العصر":
        return hoursToNext != null && hoursToNext < 1.5 ? "asr" : "dhuhr";
      case "المغرب":
        // Still daytime — Maghrib hasn't happened, so never the sleep phase.
        return "asr";
      case "العشاء":
        return "maghrib";
    }
  }
  if (hour < 4) return "qiyam";
  if (hour < 6) return "fajr-pre";
  if (hour < 9) return "fajr";
  if (hour < 11) return "duha";
  if (hour < 15) return "dhuhr";
  if (hour < 17) return "asr";
  if (hour < 19) return "maghrib";
  if (hour < 22) return "isha";
  return "late-night";
}

/** Exposed for tests only. */
export const __test__ = { computeTimePhase };

function hoursUntilTodayAt(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  const diffH = (target.getTime() - now.getTime()) / 3_600_000;
  if (diffH < -2) return diffH + 24;
  return diffH;
}

export function buildCompanionContext(): CompanionContext {
  const s = useNoorStore.getState() as unknown as {
    activity?: Record<string, number>;
    score?: number;
    sectionCompletions?: Record<string, string[]>;
    quranDailyAyahs?: Record<string, number>;
    prefs?: { quranDailyGoal?: number };
    quranLastRead?: { surahId: number } | null;
    tasbeehDailyLog?: Record<string, Record<string, number>>;
    khatmaStartISO?: string | null;
    khatmaDays?: number | null;
    khatmaDone?: Record<string, boolean>;
  };
  const today = todayISO();

  const activity: Record<string, number> = s.activity ?? {};
  let streakDays = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if ((activity[key] ?? 0) > 0) { streakDays++; d.setDate(d.getDate() - 1); }
    else if (i === 0) { d.setDate(d.getDate() - 1); }
    else break;
  }

  const dayLog = s.tasbeehDailyLog?.[today] ?? {};
  const tasbeehToday = Object.values(dayLog).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);

  let nextPrayer: CompanionContext["nextPrayer"] = null;
  try {
    const raw = accountScopedLocalStorage.getItem("noor_widget_prayer_v2");
    if (raw) {
      const p = JSON.parse(raw) as { nextPrayer?: { nameAr?: string; time?: string } | null };
      if (p?.nextPrayer?.nameAr && p.nextPrayer.time) {
        nextPrayer = { nameAr: p.nextPrayer.nameAr, time: p.nextPrayer.time };
      }
    }
  } catch { /* no prayer cache */ }
  const hoursToNextPrayer = nextPrayer ? hoursUntilTodayAt(nextPrayer.time) : null;

  let khatma: CompanionContext["khatma"] = null;
  try {
    const start = s.khatmaStartISO;
    const totalDays = s.khatmaDays;
    const doneMap = s.khatmaDone ?? {};
    if (start && totalDays) {
      const elapsed = Math.floor((Date.now() - new Date(start + "T00:00:00").getTime()) / 86_400_000) + 1;
      if (elapsed >= 1 && elapsed <= totalDays) {
        const doneCount = Object.values(doneMap).filter(Boolean).length;
        khatma = { day: elapsed, totalDays, onTrack: doneCount >= elapsed - 1 };
      }
    }
  } catch { /* no khatma context */ }

  const hijri = parseHijriParts();
  const isRamadan = hijri.month === 9;
  const isLastTenNights = isRamadan && hijri.day >= 21;
  let daysToRamadan: number | null = null;
  if (!isRamadan && hijri.month && hijri.year) {
    const now = new Date();
    let nextRamadanStart = new Date(now.getFullYear(), 2, 1); // rough — March; Hijri shifts ~11d/year
    try {
      for (let d2 = 0; d2 < 380; d2++) {
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d2);
        const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { month: "numeric" })
          .formatToParts(forHijri(t));
        const m = Number(parts.find((p) => p.type === "month")?.value ?? "0");
        if (m === 9) { daysToRamadan = d2; break; }
      }
    } catch { /* ignore */ }
    void nextRamadanStart;
  }

  const now = new Date();
  const weekdayIdx = now.getDay();
  const tomorrowIdx = (weekdayIdx + 1) % 7;
  const daysToFriday = (5 - weekdayIdx + 7) % 7;

  // 7-day adherence map (oldest → today)
  const adherenceWeek: Array<{ dateISO: string; weekdayAr: string; score: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(now);
    dd.setDate(now.getDate() - i);
    const iso = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
    adherenceWeek.push({
      dateISO: iso,
      weekdayAr: WEEKDAYS_AR[dd.getDay()],
      score: activity[iso] ?? 0,
    });
  }

  // What's left today
  const remainingTodayHints: string[] = [];
  const completions = s.sectionCompletions ?? {};
  const morningDone = (completions["morning"] ?? []).includes(today);
  const eveningDone = (completions["evening"] ?? []).includes(today);
  const sleepDone = (completions["sleep"] ?? []).includes(today);
  const prayerDone = (completions["prayer"] ?? []).includes(today);
  const ayahsToday = (s.quranDailyAyahs ?? {})[today] ?? 0;
  const dailyGoal = s.prefs?.quranDailyGoal ?? 10;
  const hour = now.getHours();
  if (!morningDone && hour < 11) remainingTodayHints.push("أذكار الصباح لم تُنجز بعد");
  if (!eveningDone && hour >= 15) remainingTodayHints.push("أذكار المساء بانتظارك");
  // Prefer the real next-prayer signal over a fixed hour — "الفجر" as the
  // next prayer means Isha has actually passed, which is what "bedtime"
  // really means; hour>=21 alone can fire before Isha on long-Isha days
  // (same class of bug as the old computeTimePhase heuristic).
  const ishaHasPassed = nextPrayer ? nextPrayer.nameAr === "الفجر" : hour >= 21;
  if (!sleepDone && ishaHasPassed) remainingTodayHints.push("أذكار النوم لم تُقرأ بعد");
  if (ayahsToday < dailyGoal) remainingTodayHints.push(`ورد القرآن: ${ayahsToday}/${dailyGoal} آية`);
  if (tasbeehToday === 0 && hour >= 6) remainingTodayHints.push("لم تسبّح اليوم");

  return {
    streakDays: Math.max(1, streakDays),
    totalScore: s.score ?? 0,
    morningDone,
    eveningDone,
    sleepDone,
    prayerDone,
    ayahsReadToday: ayahsToday,
    dailyGoal,
    lastSurahId: s.quranLastRead?.surahId ?? null,
    tasbeehToday,
    nextPrayer,
    hijriDate: hijriToday(),
    hijriDay: hijri.day,
    hijriMonth: hijri.month,
    hijriMonthName: HIJRI_MONTHS_AR[hijri.month] ?? "",
    weekdayAr: WEEKDAYS_AR_LONG[weekdayIdx],
    weekdayTomorrowAr: WEEKDAYS_AR_LONG[tomorrowIdx],
    isFriday: weekdayIdx === 5,
    isTomorrowFriday: tomorrowIdx === 5,
    isThursday: weekdayIdx === 4,
    isRamadan,
    isLastTenNights,
    daysToRamadan,
    daysToFriday,
    timePhase: computeTimePhase(hour, nextPrayer?.nameAr ?? null, hoursToNextPrayer),
    hoursToNextPrayer,
    adherenceWeek,
    khatma,
    remainingTodayHints,
  };
}

/* ─── System prompt ──────────────────────────────────────────────────────── */

/* The assistant's full instructions live on the server
   (supabase/functions/companion/prompt.ts), which replaces this base text, so
   every installed version of the app runs the same rules. This short form is
   what a request carries; the opening words are how the server recognises it. */
const SYSTEM_CORE = `أنت «أثر»، رفيق إيماني داخل تطبيق أثر للأذكار والقرآن. أجب بالعربية الفصحى الواضحة، ولا تورد آية أو حديثًا إلا موثَّقًا.`;

export function buildContextBlock(ctx: CompanionContext): string {
  const today = todayISO();
  const lines = [
    `اليوم: ${ctx.weekdayAr} (${today})${ctx.hijriDate ? ` | ${ctx.hijriDate}` : ""}`,
    `الغد: ${ctx.weekdayTomorrowAr} | الجمعة القادمة بعد ${ctx.daysToFriday === 0 ? "اليوم نفسه" : `${ctx.daysToFriday} يوم`}.`,
    `الوقت: ${timePhaseLabel(ctx.timePhase)}.`,
  ];
  if (ctx.hoursToNextPrayer !== null && ctx.nextPrayer) {
    lines.push(`الصلاة القادمة: ${ctx.nextPrayer.nameAr} في ${ctx.nextPrayer.time} (بعد ${ctx.hoursToNextPrayer.toFixed(1)} ساعة تقريبًا).`);
  }

  lines.push(`إنجازات اليوم: أذكار الصباح ${ctx.morningDone ? "✓" : "✗"} | أذكار المساء ${ctx.eveningDone ? "✓" : "✗"} | أذكار النوم ${ctx.sleepDone ? "✓" : "✗"} | أذكار الصلاة ${ctx.prayerDone ? "✓" : "✗"} | تسبيح ${ctx.tasbeehToday} مرة | ورد قرآن ${ctx.ayahsReadToday}/${ctx.dailyGoal} آية.`);
  if (ctx.remainingTodayHints.length > 0) {
    lines.push(`ما تبقَّى اليوم: ${ctx.remainingTodayHints.join("، ")}.`);
  }
  if (ctx.streakDays > 1) lines.push(`السلسلة الحالية: ${ctx.streakDays} يومًا متواصلًا.`);
  if (ctx.lastSurahId) lines.push(`آخر موضع قرأه: سورة رقم ${ctx.lastSurahId}.`);
  if (ctx.khatma) {
    lines.push(`الختمة: اليوم ${ctx.khatma.day} من ${ctx.khatma.totalDays}${ctx.khatma.onTrack ? " — متابع" : " — متأخر قليلًا (شجِّعه)"}.`);
  }

  // Tomorrow-aware nudges
  if (ctx.isTomorrowFriday) {
    lines.push(`غدًا الجمعة: فرصة لقراءة سورة الكهف، والصلاة على النبي ﷺ، والدعاء في ساعة الإجابة.`);
  } else if (ctx.isThursday) {
    lines.push(`اليوم الخميس: صيامه مستحب (أبو أيوب الأنصاري رضي الله عنه).`);
  }
  if (ctx.isLastTenNights) {
    lines.push(`العشر الأواخر من رمضان: ليلة القدر خير من ألف شهر — احرص على إحيائها.`);
  } else if (ctx.isRamadan) {
    lines.push(`رمضان: روحانية عالية — اقترح الورد والأدعية المناسبة.`);
  } else if (ctx.daysToRamadan !== null && ctx.daysToRamadan <= 60) {
    lines.push(`رمضان بعد ${ctx.daysToRamadan} يومًا — إن أراد المستخدم خطة استعدادية فاقترح.`);
  }

  // 7-day adherence (compact, oldest → newest)
  lines.push(`خريطة الأسبوع (الأقدم → الأحدث): ${ctx.adherenceWeek.map((d) => `${d.weekdayAr}:${d.score}`).join(" | ")}.`);
  return lines.join("\n");
}

function buildMinimalContextBlock(ctx: CompanionContext): string {
  return [
    `اليوم: ${ctx.weekdayAr} (${todayISO()})${ctx.hijriDate ? ` | ${ctx.hijriDate}` : ""}`,
    `الغد: ${ctx.weekdayTomorrowAr}.`,
    `الوقت التقريبي: ${timePhaseLabel(ctx.timePhase)}.`,
  ].join("\n");
}

function timePhaseLabel(p: TimePhase): string {
  switch (p) {
    case "qiyam": return "ساعات السَّحَر (وقت قيام الليل)";
    case "fajr-pre": return "قبل الفجر";
    case "fajr": return "وقت الفجر";
    case "duha": return "وقت الضحى";
    case "dhuhr": return "وقت الظهر";
    case "asr": return "بعد العصر، قبل المغرب";
    case "maghrib": return "بعد المغرب، قبل العشاء (ليس وقت نوم بعد)";
    case "isha": return "بعد العشاء — وقت أذكار النوم";
    case "late-night": return "آخر الليل";
  }
}

/* ─── Routes the next_step tool may target ──────────────────────────────── */

export const ROUTE_LABELS: Record<string, string> = {
  "/c/morning": "أذكار الصباح",
  "/c/evening": "أذكار المساء",
  "/quran": "القرآن",
  "/quran/plans": "خطة الختمة",
  "/mushaf": "المصحف",
  "/sebha": "السبحة",
  "/prayer-times": "مواقيت الصلاة",
  "/duas": "الأدعية",
  "/asma": "أسماء الله الحسنى",
  "/prayer-guide": "طريقة الصلاة",
  "/library": "المكتبة",
  "/library/sharh": "الموسوعة الحديثية",
  "/companion": "اسأل أثر",
};

/* ─── Tool schema exposed to the model ─────────────────────────────────── */

/** Naming the search tool opts this request in to web search. The server
 *  replaces the definition with its own, which fixes the allowed sources. */
const WEB_SEARCH_TOOL: WebSearchTool20250305 = { type: "web_search_20250305", name: "web_search" };

const COMPANION_TOOLS: Tool[] = [
  {
    name: "next_step",
    description: "اقتراح خطوة عملية واحدة على المستخدم (مثلاً «افتح أذكار الصباح» أو «اقرأ وردي»). استخدم route من قائمة المسارات الصالحة فقط. اكتب description قصيرًا وواضحًا بالعربية.",
    input_schema: {
      type: "object",
      properties: {
        route: {
          type: "string",
          description: "المسار الداخلي للتطبيق، مثال: /c/morning",
          enum: Object.keys(ROUTE_LABELS),
        },
        description: {
          type: "string",
          description: "وصف قصير بالعربية لِما سيفعله المستخدم، مثال: «افتح أذكار الصباح»",
        },
      },
      required: ["route", "description"],
    },
  },
  {
    name: "create_reminder",
    description:
      "أنشئ تذكيرًا شخصيًا للمستخدم من حوارك معه. استخدمها حصرًا حين يطلب المستخدم صراحةً جدولة شيء أو تذكيره به (مثل «ذكّرني بـ…»، «كل جمعة أريد…»، «اجعلني أذكر…»). استدعِ هذه الأداة فعليًا — لا يكفي وصف ما ستفعله. الفئات المتاحة: adhkar, quran, dua, fasting, general. التكرار: once, daily, weekly, monthly (تكرار ثابت بوقتٍ محدد)، أو prayer_aligned/sunnah_aligned (مرتبط بوقت صلاة أو عبادة سنّية عبر anchorKey، يُعاد حسابه يوميًا فعليًا لا بوقتٍ ثابت). atTimeOfDay بصيغة HH:MM (٢٤ ساعة) — مطلوب لـ once/daily/weekly/monthly، اختياري كوقتٍ احتياطي مع anchorKey. لتكرار weekly حدِّد dayOfWeek (اسم اليوم بالإنجليزية)، ولتكرار monthly حدِّد dayOfMonth (١-٣١) — بدونهما لن يُحسب أي موعد فعلي للتذكير. anchorKey يربط التذكير بصلاة أو عبادة سنّية (fajr, dhuhr, asr, maghrib, isha, sunrise, tahajjud, duha, witr) مع anchorOffsetMinutes بالدقائق (سالب = قبل، موجب = بعد) — استخدمه فقط مع repeat=prayer_aligned أو sunnah_aligned، ولا تستخدمه أبدًا لـ«يوم الجمعة» (استخدم weekly + dayOfWeek=friday بدلًا من ذلك، فلا وجود لمفهوم «anchor على الجمعة»). description اختياري. deeplink مسار داخل التطبيق (مثال: /c/morning) ليُفتح عند نقر التذكير. suggestion اختياري وهو اقتراح قصير يظهر للمستخدم. عند استدعاء هذه الأداة، أرسل مع الرد نصًّا قصيرًا بالعربية فقط يخبر المستخدم بأنك أضفت التذكير، ولا تذكر JSON أو تفاصيل تقنية.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["adhkar", "quran", "dua", "fasting", "general"],
          description: "فئة التذكير.",
        },
        title: {
          type: "string",
          description: "عنوان التذكير المختصر بالعربية، مثال: «قراءة سورة الكهف» أو «أذكار الصباح».",
        },
        description: {
          type: "string",
          description: "وصف قصير اختياري بالعربية.",
        },
        repeat: {
          type: "string",
          enum: ["once", "daily", "weekly", "monthly", "prayer_aligned", "sunnah_aligned"],
          description: "تكرار التذكير. استخدم prayer_aligned/sunnah_aligned فقط مع anchorKey.",
        },
        atTimeOfDay: {
          type: "string",
          description: "وقت التذكير بصيغة HH:MM (٢٤ ساعة). مطلوب لـ once/daily/weekly/monthly.",
        },
        dayOfWeek: {
          type: "string",
          enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
          description: "يوم الأسبوع — مطلوب فقط حين repeat=weekly (مثال: الجمعة → friday).",
        },
        dayOfMonth: {
          type: "number",
          description: "يوم الشهر من ١ إلى ٣١ — مطلوب فقط حين repeat=monthly.",
        },
        anchorKey: {
          type: "string",
          enum: ["fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise", "tahajjud", "duha", "witr"],
          description: "ربط التذكير بصلاة أو عبادة سنّية — استخدم فقط مع repeat=prayer_aligned أو sunnah_aligned.",
        },
        anchorOffsetMinutes: {
          type: "number",
          description: "فارق الدقائق قبل/بعد anchorKey (سالب = قبل).",
        },
        deeplink: {
          type: "string",
          description: "مسار داخلي للتطبيق يُفتح عند نقر التذكير، مثال: /c/morning.",
        },
        suggestion: {
          type: "string",
          description: "اقتراح قصير مرافق.",
        },
      },
      required: ["category", "title", "repeat"],
    },
  },
];

/* ─── Compact on-device memory ────────────────────────────────────────────── */

const MEMORY_KEY = "noor_companion_memory_v1";
const MEMORY_MAX = 14;

type MemoryEntry = { q: string; d: string };

export function getMemory(): MemoryEntry[] {
  try {
    const raw = accountScopedLocalStorage.getItem(MEMORY_KEY);
    const arr = raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function recordMemory(question: string): void {
  try {
    const entry: MemoryEntry = { q: question.replace(/\s+/g, " ").trim().slice(0, 140), d: todayISO() };
    const next = [...getMemory(), entry].slice(-MEMORY_MAX);
    accountScopedLocalStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch { /* best-effort */ }
}

export function clearMemory(): void {
  try { accountScopedLocalStorage.removeItem(MEMORY_KEY); } catch { /* ignore */ }
}

function buildMemoryBlock(): string {
  const mem = getMemory();
  if (mem.length === 0) return "";
  const lines = mem.slice(-8).map((m) => `- (${m.d}) ${m.q}`);
  return "ذاكرة محادثات سابقة مع هذا المستخدم (استعن بها، ولا تسردها عليه):\n" + lines.join("\n");
}

/* ─── Friday reflection ─────────────────────────────────────────────────── */

export function buildWeeklyReflectionPrompt(): string {
  const s = useNoorStore.getState() as unknown as {
    activity?: Record<string, number>;
    quranDailyAyahs?: Record<string, number>;
    tasbeehDailyLog?: Record<string, Record<string, number>>;
    sectionCompletions?: Record<string, string[]>;
    quranLastRead?: { surahId: number } | null;
  };
  const activity: Record<string, number> = s.activity ?? {};
  const dailyAyahs: Record<string, number> = s.quranDailyAyahs ?? {};
  const tasbeehLog = s.tasbeehDailyLog ?? {};
  const completions = s.sectionCompletions ?? {};

  let activeDays = 0, ayahs = 0, tasbeeh = 0, morningDays = 0, eveningDays = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if ((activity[key] ?? 0) > 0) activeDays++;
    ayahs += dailyAyahs[key] ?? 0;
    tasbeeh += Object.values(tasbeehLog[key] ?? {}).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    if ((completions["morning"] ?? []).includes(key)) morningDays++;
    if ((completions["evening"] ?? []).includes(key)) eveningDays++;
    d.setDate(d.getDate() - 1);
  }
  const lastRead = s.quranLastRead?.surahId ? `آخر قراءة: سورة رقم ${s.quranLastRead.surahId}` : "";

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const todaysHadith = DAILY_HADITH_FAJR_PHRASES[dayIndex % DAILY_HADITH_FAJR_PHRASES.length];

  return [
    "اكتب لي «خاطرة الجمعة»: خاطرة إيمانية قصيرة (٤-٦ فقرات) مخصَّصة لي بناءً على أسبوعي الفعلي التالي، تبدأ بحمد الله، وتتضمن آية تناسب حالي، وتختم بدعاء ونصيحة عملية واحدة للأسبوع القادم:",
    `- أيام النشاط: ${activeDays} من 7`,
    `- آيات قرأتُها: ${ayahs}`,
    `- تسبيحات: ${tasbeeh}`,
    `- أذكار الصباح: ${morningDays} أيام | أذكار المساء: ${eveningDays} أيام`,
    lastRead,
    `اربط خاطرتك بهذا الحديث النبوي تحديدًا — لا تستبدله ولا تخترع حديثًا آخر ولا تُغيِّر لفظه أو معناه:\n«${todaysHadith}»`,
  ].filter(Boolean).join("\n");
}

/* ─── Streaming chat ─────────────────────────────────────────────────────── */

function isUnsupportedToolError(err: unknown): boolean {
  const candidate = err as { status?: unknown; message?: unknown };
  return candidate?.status === 400 && /unrecognized tool definition/i.test(String(candidate?.message ?? ""));
}

const EMPTY_REPLY_MESSAGE = "تعذَّر إكمال الجواب هذه المرة. أعد إرسال سؤالك أو صُغه بطريقةٍ أخرى.";

export type CompanionErrorKind =
  | "no-proxy"     // build is missing the proxy URL entirely
  | "auth"        // 401/403 from proxy or upstream
  | "rate"        // 429
  | "blocked"     // 400 content-block
  | "offline"     // network/DNS/CORS — couldn't reach proxy
  | "server"      // proxy reached but returned 5xx
  | "unavailable" // the service itself is down (its key was refused)
  | "abort"       // user cancelled
  | "other";

export type CompanionError = {
  kind: CompanionErrorKind;
  message: string;
  /** Arabic-support line for the diagnostic admin panel. */
  detail?: string;
};

function isAbort(err: unknown): boolean {
  if (!err) return false;
  const s = String((err as { message?: unknown }).message ?? err);
  return /abort(ed)?\b/i.test(s) || (err as { name?: unknown }).name === "AbortError";
}

/* The Anthropic SDK's error subclass identity check fails across realms
   (Vite's build produces a different SDK instance than the one running in
   the browser). We duck-type by name + status as the primary path so
   diagnostic errors match what the SDK throws in production. */
function classifyDuck(err: { name?: string; status?: number; message?: string }): {
  kind: CompanionErrorKind | null;
  status: number | null;
  message: string | null;
} {
  const name = err.name ?? "";
  const status = err.status ?? null;
  const message = err.message ?? null;
  if (name === "AbortError" || /abort(ed)?\b/i.test(message ?? "")) return { kind: "abort", status, message };
  if (name === "AuthenticationError") return { kind: "auth", status, message };
  if (name === "RateLimitError") return { kind: "rate", status, message };
  if (name === "APIConnectionError") return { kind: "offline", status, message };
  if (name === "APIError") {
    if (status !== null && status >= 500) return { kind: "server", status, message };
    if (status === 400) return { kind: "blocked", status, message };
    return { kind: "other", status, message };
  }
  return { kind: null, status, message };
}

/** The error type the server put in its error body, if any. */
function serverErrorType(err: unknown): string | null {
  const body = (err as { error?: { error?: { type?: unknown }; type?: unknown } } | null)?.error;
  const type = body?.error?.type ?? (typeof body?.type === "string" && body.type !== "error" ? body.type : undefined);
  return typeof type === "string" ? type : null;
}

/** Shown when the service itself is down; retrying soon will not help. */
export const SERVICE_DOWN_MESSAGE = "خدمة «اسأل أثر» متوقفة مؤقتًا من جهتنا، ونعمل على إعادتها. جرّب بعد قليل.";

export function describeError(err: unknown): CompanionError {
  if (isAbort(err)) {
    return { kind: "abort", message: "تم الإلغاء قبل أن يكتمل الرد.", detail: "user-cancelled" };
  }

  const serverType = serverErrorType(err);
  if (serverType === "service_unavailable") {
    return { kind: "unavailable", message: SERVICE_DOWN_MESSAGE, detail: "service-unavailable" };
  }
  if (serverType === "overloaded_error") {
    return { kind: "server", message: "الخدمة مشغولة الآن — أعد المحاولة بعد لحظات.", detail: "overloaded" };
  }
  if (serverType === "api_error" && !(err as { status?: number })?.status) {
    return { kind: "server", message: "تعذَّر إكمال الجواب هذه المرة — أعد المحاولة.", detail: "stream-error" };
  }

  // Try the SDK instance check first — the canonical path.
  if (err instanceof AuthenticationError) {
    return {
      kind: "auth",
      message: "تعذّر التحقق من الطلب لخدمة أثر الذكية. أعد المحاولة.",
      detail: `HTTP ${err.status ?? "?"} — ${err.message ?? ""}`,
    };
  }
  if (err instanceof RateLimitError) {
    return {
      kind: "rate",
      message: "كثرة الطلبات الآن — انتظر قليلًا ثم أعد المحاولة.",
      detail: `rate-limited HTTP ${err.status ?? "429"}`,
    };
  }
  if (err instanceof APIConnectionError) {
    return {
      kind: "offline",
      message: "تعذَّر الوصول إلى خادم الذكاء. تحقَّق من اتصالك بالإنترنت.",
      detail: `connection-failed: ${(err as Error).message ?? "unknown"}`,
    };
  }
  if (err instanceof APIError) {
    const s = err.status ?? 0;
    if (s >= 500) {
      return { kind: "server", message: "خادم الذكاء مُتعَبٌ قليلًا — أعد المحاولة.", detail: `HTTP ${s}` };
    }
    return {
      kind: s === 400 ? "blocked" : "other",
      message: s === 400
        ? "تعذَّر إكمال الطلب. حاول بصياغةٍ أخرى."
        : `خطأ في الخدمة (${s}). أعد المحاولة.`,
      detail: `HTTP ${s}`,
    };
  }

  // Duck-typed fallthrough — used when the error is serialized across the
  // bridge (e.g. when we round-trip through the proxy function).
  const duck = classifyDuck(err as { name?: string; status?: number; message?: string });
  if (duck.kind) {
    const detail = duck.status !== null ? `HTTP ${duck.status}` : (duck.message ?? "unknown");
    switch (duck.kind) {
      case "auth":
        return { kind: "auth", message: "تعذّر التحقق من الطلب لخدمة أثر الذكية. أعد المحاولة.", detail };
      case "rate":
        return { kind: "rate", message: "كثرة الطلبات الآن — انتظر قليلًا ثم أعد المحاولة.", detail: duck.message ? `rate-limited · ${duck.message}` : detail };
      case "offline":
        return { kind: "offline", message: "تعذَّر الوصول إلى خادم الذكاء. تحقَّق من اتصالك بالإنترنت.", detail: `connection-failed · ${duck.message ?? "unknown"}` };
      case "server":
        return { kind: "server", message: "خادم الذكاء مُتعَبٌ قليلًا — أعد المحاولة.", detail };
      case "blocked":
        return { kind: "blocked", message: "تعذَّر إكمال الطلب. حاول بصياغةٍ أخرى.", detail };
      case "other":
        return { kind: "other", message: duck.status ? `خطأ في الخدمة (${duck.status}). أعد المحاولة.` : "حدث خطأ غير متوقع. أعد المحاولة.", detail };
      case "abort":
        return { kind: "abort", message: "تم الإلغاء قبل أن يكتمل الرد.", detail: "user-cancelled" };
    }
  }

  if (err instanceof Error && err.message === "no-proxy-configured") {
    return {
      kind: "no-proxy",
      message: "لم يُهيَّأ خادم الذكاء في هذه النسخة.",
      detail: "no-proxy",
    };
  }
  return {
    kind: "other",
    message: "حدث خطأ غير متوقع. أعد المحاولة.",
    detail: String((err as Error)?.message ?? err),
  };
}

/* Only the Messages API is used, and every request goes through the Athar
   proxy. Building on the SDK's base client keeps the rest of the SDK (admin,
   files, batches, local credential discovery) out of the app bundle. */
class CompanionClient extends BaseAnthropic {
  messages: Messages = new Messages(this);

  /* Authentication is the proxy's job: never look for local credentials. */
  protected override _shouldResolveDefaultCredentials(): boolean {
    return false;
  }
}

async function createClient(): Promise<CompanionClient> {
  if (!PROXY_URL) throw new Error("no-proxy-configured");
  const session = await getSession().catch(() => null);
  const headers: Record<string, string> = {
    /* `anthropic-dangerous-direct-browser-access` lets the SDK run in a
       Capacitor WebView without throwing a runtime warning. */
    "anthropic-dangerous-direct-browser-access": "true",
    /* Defence against cacheable proxy responses — never keep a stream alive
       across payload rerenders. */
    "Cache-Control": "no-store",
  };
  if (SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
  }
  headers.Authorization = `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`;
  return new CompanionClient({
    apiKey: "proxy",
    baseURL: PROXY_URL,
    dangerouslyAllowBrowser: true,
    defaultHeaders: headers,
  });
}

export type VerificationReport = {
  flagged: boolean;
  notes: string[];
};

export type StreamCallbacks = {
  onText: (chunk: string) => void;
  onDone?: (fullText: string, verification: VerificationReport) => void;
  onError?: (err: CompanionError) => void;
  /** Fires once per assistant message after the stream finishes, with the
   *  structured tool_use blocks the model emitted (e.g. create_reminder).
   *  Used by the UI to dispatch store actions without parsing tool markdown. */
  onToolCalls?: (calls: PersistedToolCall[]) => void | Promise<void>;
  /** The step the server is on while it prepares the reply. */
  onStage?: (stage: CompanionStage) => void;
  /** Questions the server suggests asking next, on the same topic. */
  onFollowUps?: (items: string[]) => void;
};

/** What the server is doing while the reader waits (sent as `athar_status`). */
export type CompanionStage = "gathering" | "searching" | "writing" | "verifying";
const STAGES: readonly CompanionStage[] = ["gathering", "searching", "writing", "verifying"];

/** Build the supplemental retrieval block for the user's last message.
 *  Await the local index on a cold start so the first answer is grounded too.
 *  Also surfaces saved reminders only for an explicit personal-list request. */
type RetrievedPassage = { source: string; sourceLabel: string; text: string };
type RetrievalBlock = { text: string; passages: RetrievedPassage[] };

async function buildRetrievalBlock(lastUserText: string): Promise<RetrievalBlock> {
  // The server gathers and verifies the evidence for each question, so no
  // library excerpts are sent. Only the user's own saved reminders are, and
  // only when the question is about them.
  const userReminders = retrieveUserRemindersAsPassages(lastUserText);
  if (userReminders.length === 0) return { text: "", passages: [] };
  const lines = ["تذكيراتك المحفوظة في التطبيق (استعن بها في إجابتك):"];
  userReminders.forEach((p, i) => lines.push(`${i + 1}. ${p.text}`));
  return { text: lines.join("\n"), passages: [] };
}

function normalizeCitationExcerpt(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

export async function streamCompanionReply(
  history: CompanionMessage[],
  cb: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  let onAbort: (() => void) | null = null;

  try {
    const outbound = buildOutboundMessages(history);
    if (!outbound.ok) {
      cb.onError?.({
        kind: "other",
        message: "رسالتك طويلة جدًا. اختصرها قليلًا ثم أرسلها من جديد.",
        detail: "message-too-long",
      });
      return;
    }

    const client = await createClient();
    const ctx = buildCompanionContext();
    const mood = detectMood(history[history.length - 1]?.content ?? "");
    const profile = loadProfile();
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (lastUser) recordMemory(lastUser.content);
    const retrievalPromise = buildRetrievalBlock(lastUser?.content ?? "");
    const retrieval = await retrievalPromise;

    const dynamicContext = [
      profile.includePersonalContext ? buildContextBlock(ctx) : buildMinimalContextBlock(ctx),
      profile.includePersonalContext && mood ? `حالة المستخدم الآن: ${mood} (اضبط نبرتك وفقًا لها — لا تبالغ).` : "",
      profile.includePersonalContext ? buildCompanionProfileContext(profile) : "",
      profile.includePersonalContext ? buildMemoryBlock() : "",
      retrieval.text,
    ].filter(Boolean).join("\n\n");

    let full = "";
    const sanitizer = createCompanionStreamSanitizer();
    const emit = (clean: string) => {
      if (!clean) return;
      full += clean;
      cb.onText(clean);
    };
    let activeStream: { controller?: { abort?: () => void } } | null = null;
    onAbort = () => {
      try { activeStream?.controller?.abort?.(); } catch { /* ignore */ }
    };

    const run = async (withWebSearch: boolean) => {
      const stream = client.messages.stream({
        model: MODEL,
        // Reasoning counts toward this limit, so it is well above the length
        // of a visible reply.
        max_tokens: 8192,
        system: [
          { type: "text", text: SYSTEM_CORE, cache_control: { type: "ephemeral" } },
          { type: "text", text: dynamicContext },
        ],
        tools: withWebSearch ? [...COMPANION_TOOLS, WEB_SEARCH_TOOL] : COMPANION_TOOLS,
        messages: outbound.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      activeStream = stream;
      if (abortSignal?.aborted) onAbort?.();
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          emit(sanitizer.push(event.delta.text));
          continue;
        }
        // Athar's own events: the step being worked on, and suggested
        // follow-up questions. Older servers never send them.
        const own = event as unknown as { type?: string; stage?: unknown; items?: unknown };
        if (own.type === "athar_status" && STAGES.includes(own.stage as CompanionStage)) {
          cb.onStage?.(own.stage as CompanionStage);
        } else if (own.type === "athar_followups" && Array.isArray(own.items)) {
          const items = own.items.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3);
          if (items.length > 0) cb.onFollowUps?.(items);
        }
      }
      return stream.finalMessage();
    };

    if (abortSignal && !abortSignal.aborted) abortSignal.addEventListener("abort", onAbort, { once: true });

    let finalMsg: Awaited<ReturnType<typeof run>>;
    // The server decides when a question needs trusted sources. Naming the
    // search tool asks for them outright, when the user wants a source.
    const wantsWebSearch = /مصدر|مصادر|ابحث|تحقق|تحقّق|وثق|وثّق/.test(lastUser?.content ?? "");
    try {
      finalMsg = await run(wantsWebSearch);
    } catch (err) {
      // A server that predates web search rejects the tool before producing
      // any output; ask again without it rather than fail the question.
      if (!isUnsupportedToolError(err) || full) throw err;
      finalMsg = await run(false);
    }
    emit(sanitizer.flush());
    if (finalMsg.stop_reason === "refusal") {
      const msg = "\n\nأعتذر يا صديقي، لا يسعني المضيّ في هذا الطلب تحديدًا. اسألني بصيغةٍ أخرى أو في أمرٍ يقرِّبنا إلى الله، وأنا معك. 🤲";
      full += msg;
      cb.onText(msg);
    }
    // Detect tool_use blocks and append a structured action segment so the UI
    // (markdown parser + rendering) can render them as clickable CTAs. The
    // model rarely uses these today but the API will accept them when it does.
    let toolAppend = "";
    const unverifiedCitationNotes: string[] = [];
    const persistedToolCalls: PersistedToolCall[] = [];
    for (const block of finalMsg.content) {
      if (block.type !== "tool_use") continue;
      const name = (block as { name?: string }).name;
      const input = (block as { input?: Record<string, unknown> }).input ?? {};
      if (name === "next_step") {
        const route = typeof input.route === "string" ? input.route : "";
        const desc = typeof input.description === "string" ? input.description : "افتح";
        // The reliable multi-line ":::action(/route)\nlabel\n:::" form —
        // the tool's route is already enum-validated by the API, so this
        // can never come out malformed the way free-text brackets did.
        if (route) toolAppend += `\n\n:::action(${route})\n${desc}\n:::\n`;
      } else if (name === "cite") {
        const source = typeof input.source === "string" ? input.source : "";
        const excerpt = typeof input.excerpt === "string" ? input.excerpt : "";
        const passage = retrieval.passages.find((candidate) => candidate.source === source);
        const normalizedExcerpt = normalizeCitationExcerpt(excerpt);
        const normalizedSource = passage ? normalizeCitationExcerpt(passage.text) : "";
        if (passage && normalizedExcerpt && normalizedSource.includes(normalizedExcerpt)) {
          toolAppend += `\n\n:::cite(${source})\n${excerpt}\n:::`;
        } else {
          unverifiedCitationNotes.push("لم أتمكن من مطابقة المقتطف أو مصدره مع الموسوعة المحلية؛ لا أعرضه كاقتباس موثق.");
        }
      } else if (name === "create_reminder") {
        // Encode the structured create_reminder tool call into a callout-style
        // block so it persists in companionMessages.content (just like next_step
        // / cite) and can be parsed by the chat UI to dispatch addCustomReminder.
        const json = JSON.stringify(input);
        toolAppend += `\n\n:::reminder\n${json}\n:::`;
        persistedToolCalls.push({ name: "create_reminder", input });
      }
    }
    if (persistedToolCalls.length) {
      await cb.onToolCalls?.(persistedToolCalls);
    }
    if (!full.trim() && !toolAppend && finalMsg.stop_reason !== "refusal") {
      // The model ended its turn without any visible text (for example, it
      // spent the whole budget reasoning). Say so instead of showing nothing.
      emit(EMPTY_REPLY_MESSAGE);
    }
    if (toolAppend) {
      full += toolAppend;
      cb.onText(toolAppend);
    }
    const verification = await verifyAnswerAsync(full);
    if (unverifiedCitationNotes.length > 0) {
      verification.flagged = true;
      verification.notes = Array.from(new Set([...verification.notes, ...unverifiedCitationNotes]));
    }
    cb.onDone?.(full, verification);
  } catch (err) {
    cb.onError?.(describeError(err));
  } finally {
    // Defensive: make sure the abort listener can't leak even if `for await`
    // threw early. The { once: true } option above already covers the
    // normal-path case.
    if (abortSignal && onAbort) abortSignal.removeEventListener("abort", onAbort);
  }
}
