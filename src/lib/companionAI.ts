/**
 * رفيق أثر — the Athar AI companion.
 *
 * Powered by MiniMax M3 exclusively. The app has a single AI surface that every
 * user reaches the same way — no model picker, no BYOK, no provider toggles.
 *
 * Privacy:
 *  - No user API keys are accepted or stored.
 *  - The request goes through our Supabase Edge Function proxy which injects
 *    the server-side MiniMax key.
 *  - Conversation history + memory live only on the user's device (IndexedDB
 *    + localStorage).
 *
 * What this module owns:
 *  - Live user-journey context (streak, wird, khatma, prayer, profile, mood).
 *  - System prompt grounded in Athar's content (no fabricated sources).
 *  - Streaming pipeline with structured tool calls (`next_step`, `cite`).
 *  - Retrieval block pulled from the local Islamic-library index.
 *  - Post-stream verifier that flags unverifiable Quran/hadith claims.
 */
import Anthropic from "@anthropic-ai/sdk";

import { useNoorStore } from "@/store/noorStore";
import { DAILY_HADITH_FAJR_PHRASES } from "@/lib/reminders";
import {
  buildCompanionProfileContext,
  loadProfile,
} from "@/lib/companionProfile";
import {
  detectMood,
  retrievePassages,
  verifyAnswer,
} from "@/lib/companionKnowledge";

/* ─── Locked model + transport ───────────────────────────────────────────── */

const MODEL = "MiniMax-M3";
const PROXY_URL: string =
  (import.meta.env.VITE_COMPANION_PROXY_URL as string | undefined) ?? "";

const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_LEADERBOARD_ANON_KEY as string | undefined) ?? "";

export const COMPANION_MODEL = MODEL;
export const COMPANION_DISPLAY_NAME = "أثر";

/** True when the proxy URL is configured. The app ships without a user-supplied
 *  key path, so the only readiness check is whether the proxy exists. */
export function isCompanionReady(): boolean {
  return !!PROXY_URL;
}

/* ─── Public types ───────────────────────────────────────────────────────── */

export type CompanionProvider = "minimax";
export type CompanionMessage = { role: "user" | "assistant"; content: string };

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
    }).formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
    return { day: get("day"), month: get("month"), year: get("year") };
  } catch {
    return { day: 0, month: 0, year: 0 };
  }
}

function hijriToday(): string {
  const p = parseHijriParts();
  if (!p.month) return "";
  return `${p.day.toLocaleString("ar-EG")} ${HIJRI_MONTHS_AR[p.month]} ${p.year.toLocaleString("ar-EG")} هـ`;
}

function computeTimePhase(hour: number): TimePhase {
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
    const raw = localStorage.getItem("noor_widget_prayer_v2");
    if (raw) {
      const p = JSON.parse(raw) as { nextPrayer?: { nameAr?: string; time?: string } | null };
      if (p?.nextPrayer?.nameAr && p.nextPrayer.time) {
        nextPrayer = { nameAr: p.nextPrayer.nameAr, time: p.nextPrayer.time };
      }
    }
  } catch { /* no prayer cache */ }

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
          .formatToParts(t);
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
  if (!sleepDone && hour >= 21) remainingTodayHints.push("أذكار النوم لم تُقرأ بعد");
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
    timePhase: computeTimePhase(hour),
    hoursToNextPrayer: nextPrayer ? hoursUntilTodayAt(nextPrayer.time) : null,
    adherenceWeek,
    khatma,
    remainingTodayHints,
  };
}

/* ─── System prompt ──────────────────────────────────────────────────────── */

const SYSTEM_CORE = `أنت «أثر»، رفيقٌ إيمانيٌّ ذكيٌّ ودافئ داخل تطبيق أثر للأذكار والقرآن. اسمك «أثر»، وأنت لست موسوعة جامدة بل صاحبٌ يمشي مع المستخدم في رحلته إلى الله: تعرف حاله، تفرح لتقدُّمه، وتأخذ بيده إلى خطوته التالية برفق. غايتك أن تتترك في قلبه «أثرًا» طيّبًا بعد كل محادثة — علمًا صحيحًا، وطمأنينة، وخطوة عملية واحدة.

### هويتك ونبرتك
- تحدَّث كصديقٍ مؤمنٍ ناضج: قريبٌ صادقٌ غير متكلَّف. لا واعظ متعالٍ ولا آلة باردة.
- كن مختصرًا: جملة أو ثلاث للأسئلة العابرة، وأطول قليلًا حين يُطلب الشرح. لا تُطِل لمجرد الإحاطة.
- في الأسئلة الشخصية أو التي فيها هَمٌّ، ابدأ بلمسة إنسانية دافئة قبل العلم. وفي الأسئلة العلمية المباشرة، ابدأ بالجواب فورًا دون مقدمات.
- شجِّع ولا تُشعِر بالذنب أبدًا: التيسير لا التعسير، والبُشرى لا التنفير.

### اللغة — لا استثناءات
- كل حرفٍ تردُّه للمستخدم يجب أن يكون بالعربية. هذا ليس تفضيلًا، بل قاعدة لا تُكسر.
- يُسمح فقط: الحروف العربية، الأرقام العربية ٠-٩، علامات الترقيم، الرموز التعبيرية، الفراغات.
- لا تكتب كلمة واحدة بالإنجليزية أو الفرنسية أو الإسبانية أو غيرها. إن كان لا بد من مصطلح أجنبي فاكتبه بأحرف عربية بين قوسين أو اشرحه بالعربية فورًا.
- إن انزلقت ولحظة واحدة ردَّدتَ كلمة غير عربية، صحِّح نفسك فورًا: «أعذر، أكمل بالعربية…» ثم تابعت بالعربية.
- لا تبدأ بسؤال «هلاً سألت بالعربية؟» ولا تطلب من المستخدم صياغة سؤاله بلغة أخرى.

### المرجعية العلمية — خطوطك الحمراء
- منهجك أهل السنَّة والجماعة المعتدل: الكتاب، والسنة الصحيحة، وفهم سلف الأمة، بلا تعصُّب مذهبي. عند الخلاف الفقهي اذكر الخلاف بإنصاف.
- **لا تختلق أبدًا آية ولا حديثًا ولا درجةً**. إن لم تكن واثقًا تمامًا فقل «لست متأكدًا من صحة نسبة هذا، فتحقَّق منه».
- عند الاستشهاد بآيةٍ اذكر اسم السورة ورقمها ولا تتصرَّف في نصِّها. عند الاستشهاد بحديث اذكر مصدره ودرجته.
- للتوثيق الدقيق استخدم أداة "cite" في كل آيةٍ وحديثٍ تُوردهما — ستُحقن لك مقاطع من الموسوعة ليتسنَّى لك الاستشهاد الدقيق.
- لا تُفتِ في النوازل الدقيقة (طلاق، ميراث، معاملات مالية حديثة، دماء)؛ اعرض المشهور بإيجاز ثم أحِل لعالمٍ موثوق.
- لا تشخيص أو علاج طبي أو نفسي؛ شجِّع على استشارة المختص.
- عند الانتهاء من إجابة طويلة اختم باقتراحٍ عمليٍّ واحد قابلٍ للتنفيذ الآن لا قائمة نصائح.

### أدواتك
لديك ثلاث أدوات تستخدمها متى لزم:
- "next_step" حين تنتهي من إجابة تطلب فيها من المستخدم فعلًا (افتح أذكار الصباح، اقرأ وردي، ادعُ بهذا…). لا تستعملها في الكلام الترحيبي أو في الإجابات القصيرة.
- "cite" حين تريد الاستشهاد بآية أو حديث فعلًا — سيُحقن لك المقتطف ومصدره. لا تستعمل صياغات مثل «رواه البخاري» دون أن تمرر المصدر عبر الأداة أولًا.
- "search_library" حين يطلب المستخدم موضوعًا لم تحفظه، أو تريد الاستشهاد الموسوعي.

### بناء الإجابة: syntax خاص بك
لاحظ أن الواجهة تفهم تنسيقات خاصّة، فاستخدمها بدل النص الجامد:

**كتل CTA قابلة للنقر (action blocks):**
حين تريد من المستخدم أن يفعل شيئًا الآن، لا تكتب «افتح أذكار الصباح» نصًّا عاديًّا. اكتبها بهذا الشكل بالضبط ليظهر زرٌّ قابل للنقر في الواجهة (لاحظ الأسهم الطويلة «→» والمسافة قبلها وبعدها، ولا تضع أي نص بين القوسين سوى التسمية والمسار):

[action:افتح أذكار الصباح →/c/morning]
[action:اقرأ وردي اليومي →/quran]
[action:افتح السبحة →/sebha]
[action:مواقيت الصلاة →/prayer-times]
[action:خطة الختمة →/quran/plans]
[action:اسأل أثر سؤالًا جديدًا →/companion]

ضع زرًّا واحدًا أو اثنين بعد كل إجابة عملية، لا أكثر.

**كتل الاقتباس (callouts):**
ضع الآيات في بلوك «آية» (يفتح ويغلق بالسطور ::: على سطر مستقل):

:::verse
﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾ — سورة البقرة ٢٥٥
:::

والأحاديث في بلوك «حديث» مع ذكر المصدر والدرجة:

:::hadith
«إنما الأعمال بالنيات» — متفق عليه (البخاري ١، مسلم ١٩٠٧)
:::

والأدعية في بلوك «دعاء»:

:::dua
اللهم أعنّي على ذكرك وشكرك وحسن عبادتك
:::

والنصائح العملية في بلوك «نصيحة» (نقطة عملية واحدة فقط في نهاية الإجابة، لا قائمة طويلة):

:::tip
ابدأ بآية الكرسي كل صباح بعد الفجر؛ دقيقة واحدة تكفيك.
:::

**قواعد صارمة للكتل:**
- السطور ::: تفتح وتغلق البلوك — يجب أن تكون على سطر مستقل (لا تلصقها بنص).
- داخل البلوك ضع النص العادي دون أي تنسيق خاص.
- لا تستخدم أي تنسيق خاص آخر مثل ### أو --- داخل البلوك.
- لا تكتب النص الذي تعتزم وضعه في بلوك كنص عادي قبله؛ اكتبه داخل البلوك مباشرة.

### الوعي بالوقت واليوم (مهم جدًا — خط أحمر)
في بداية كل محادثة ستحصل على كتلة «سياق» فيها:
- اسم اليوم بالأحرف العربية (مثال: «يوم الأربعاء») واسم الغد (مثال: «يوم الخميس»).
- التاريخ الهجري باليوم والشهر والسنة.
- هل اليوم جمعة؟ هل الغد جمعة؟ كم يومًا تفصلنا عن الجمعة القادمة؟
- هل نحن في رمضان؟ هل نحن في العشر الأواخر؟
- ما الذي أنجزه المستخدم اليوم فعلًا وما الذي تبقّى.
- خريطة أيام الأسبوع السبعة بنقاط نشاطه.

**قواعد صارمة:**
1. لا تدَّعِ أن يومًا ما هو يومٌ آخر. إن كان السياق يقول «يوم الأربعاء»، فلا تقل «غدًا جمعة» — بل قل «الغد يوم الخميس، ويوم الجمعة بعد غدٍ». احسب الفرق بنفسك من «كم يومًا تفصلنا عن الجمعة».
2. عند السؤال عن «الغد»: اقرأ weekdayTomorrowAr من السياق ولا تخمّن.
3. لا تخلط «يوم الجمعة» بـ«يوم الخميس» (خميس يعني ليلة الجمعة القادمة، وهو يوم صيام مستحب).
4. إن كانت ليلة الجمعة (مساء الخميس) فأرشد لآداب ليلة الجمعة، لا لآداب يوم الجمعة نفسها.
5. إن كانت ليلة ٢٧ من رمضان فذكِّر بليلة القدر بقدر رفيق لا واعظ.
6. إن كان الباقي اليوم متضمَّنًا في «remainingTodayHints»، فابدأ به قبل أي نصيحة عامة.
7. لا تذكر رقم آية أو حديث وأنت غير متأكد. عند الشك، اكتب «أفتح لك الموسوعة لتتأكد» واتركه للمستخدم.

### التنسيق
- لا تبدأ بعنوان (#). العناوين فقط في الإجابات الطويلة فعلًا (## ووحيدة غالبًا).
- الفقرات القصيرة والنقاط أفضل من الجداول.
- **الغامق** بندرة لكلمة مفتاحية لا لجُملٍ كاملة.
- أجب بقدر ما يحتاجه السؤال حقًّا — المباشرة أبلغ من الإسهاب.
`;

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
    lines.push(`ما تبقَّى اليوم: ${ctx.remainingTodayHints.join(" • ")}.`);
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

function timePhaseLabel(p: TimePhase): string {
  switch (p) {
    case "qiyam": return "ساعات السَّحَر (وقت قيام الليل)";
    case "fajr-pre": return "قبل الفجر";
    case "fajr": return "وقت الفجر";
    case "duha": return "وقت الضحى";
    case "dhuhr": return "وقت الظهر";
    case "asr": return "وقت العصر";
    case "maghrib": return "وقت المغرب";
    case "isha": return "وقت العشاء";
    case "late-night": return "آخر الليل";
  }
}

/* ─── Routes the next_step tool may target ──────────────────────────────── */

export const ROUTE_LABELS: Record<string, string> = {
  "/c/morning": "أذكار الصباح",
  "/c/evening": "أذكار المساء",
  "/quran": "القرآن",
  "/quran/plans": "خطة الختمة",
  "/sebha": "السبحة",
  "/prayer-times": "مواقيت الصلاة",
  "/duas": "الأدعية",
  "/asma": "أسماء الله الحسنى",
  "/prayer-guide": "طريقة الصلاة",
  "/library": "المكتبة",
  "/library/sharh": "الموسوعة الحديثية",
  "/companion": "اسأل أثر",
};

function buildRouteLabelsBlock(): string {
  const lines = Object.entries(ROUTE_LABELS).map(([route, label]) => `- ${route} → ${label}`);
  return "المسارات الصالحة في التطبيق (استخدم هذه بالضبط في أداة next_step وفي بلوكات [action:label →/route]):\n" + lines.join("\n");
}

/* ─── Tool schema exposed to the model ─────────────────────────────────── */

const COMPANION_TOOLS: Anthropic.Tool[] = [
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
    name: "cite",
    description: "استشهد بآية أو حديث من مقتطفات الموسوعة الداخلية. استخدم هذا بدل كتابة «رواه البخاري» أو نسب الآيات دون التحقق.",
    input_schema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "مفتاح المصدر من كتلة السياق (مثال: sharh:1، أو searchidx:Bukhari:1:0).",
        },
        excerpt: {
          type: "string",
          description: "المقتطف المقصود من المصدر (انسخه حرفيًا من كتلة سياق الاسترجاع).",
        },
      },
      required: ["source", "excerpt"],
    },
  },
  {
    name: "search_library",
    description: "اطلب من المحرّك بحثًا في الموسوعة الداخلية حول موضوع معيّن (مثلاً «قيام الليل»، «آداب الجمعة»). سيُحقن لك مقتطفات موثوقة قبل أن تجيب.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "استعلام قصير بالعربية، مثال: «آداب يوم الجمعة».",
        },
      },
      required: ["query"],
    },
  },
];

/* ─── Compact on-device memory ────────────────────────────────────────────── */

const MEMORY_KEY = "noor_companion_memory_v1";
const MEMORY_MAX = 14;

type MemoryEntry = { q: string; d: string };

export function getMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
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
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch { /* best-effort */ }
}

export function clearMemory(): void {
  try { localStorage.removeItem(MEMORY_KEY); } catch { /* ignore */ }
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

/** Strip any non-Arabic runs (Latin, CJK, Cyrillic, etc.) — we only allow:
 *  Arabic letters + diacritics, ASCII digits, common punctuation, emoji,
 *  and whitespace. Everything else (including stray Latin words the model
 *  emits in an otherwise-Arabic reply) is removed as a safety net. */
const NON_ARABIC_RE = /[A-Za-zÀ-ÿĀ-ſƀ-ɏЀ-ӿ぀-ヿ㐀-䶿一-鿿가-힯]+\s*/g;
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
function stripNonArabic(text: string): string {
  if (!NON_ARABIC_RE.test(text)) return text;
  const cleaned = text.replace(NON_ARABIC_RE, " ");
  return cleaned.replace(/\s{2,}/g, " ");
}

export type CompanionError = { kind: "auth" | "rate" | "network" | "blocked" | "other"; message: string };

export function describeError(err: unknown): CompanionError {
  if (err instanceof Anthropic.AuthenticationError) {
    return { kind: "auth", message: "تعذَّر الوصول إلى خادم الذكاء. أعد المحاولة لاحقًا." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { kind: "rate", message: "كثرة الطلبات الآن — انتظر قليلًا ثم أعد المحاولة." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { kind: "network", message: "تعذَّر الاتصال — تحقَّق من اتصالك بالإنترنت." };
  }
  if (err instanceof Anthropic.APIError) {
    return { kind: "other", message: `خطأ في الخدمة (${err.status ?? "?"}) — أعد المحاولة.` };
  }
  return { kind: "other", message: "حدث خطأ غير متوقع — أعد المحاولة." };
}

function createClient(): Anthropic {
  if (!PROXY_URL) throw new Error("no-proxy-configured");
  return new Anthropic({
    apiKey: "proxy",
    baseURL: PROXY_URL,
    dangerouslyAllowBrowser: true,
    defaultHeaders: SUPABASE_ANON_KEY
      ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      : undefined,
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
};

/** Build the supplemental retrieval block for the user's last message.
 *  Pulled from local library index — no network round-trip. */
function buildRetrievalBlock(lastUserText: string): string {
  const passages = retrievePassages(lastUserText, 5);
  if (passages.length === 0) return "";
  const lines = passages.map(
    (p, i) => `${i + 1}. [مصدر: ${p.sourceLabel}] ${p.text}`,
  );
  return "مقاطع من الموسوعة الداخلية للتطبيق قد تفيدك في الاستشهاد (لا تقتبس نصًّا خارجها دون التحقق):\n" + lines.join("\n");
}

export async function streamCompanionReply(
  history: CompanionMessage[],
  cb: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  const client = createClient();
  const ctx = buildCompanionContext();
  const mood = detectMood(history[history.length - 1]?.content ?? "");
  const profile = loadProfile();
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (lastUser) recordMemory(lastUser.content);
  const retrieval = buildRetrievalBlock(lastUser?.content ?? "");

  const dynamicContext = [
    buildContextBlock(ctx),
    mood ? `حالة المستخدم الآن: ${mood} (اضبط نبرتك وفقًا لها — لا تبالغ).` : "",
    buildCompanionProfileContext(profile),
    buildMemoryBlock(),
    buildRouteLabelsBlock(),
    retrieval,
  ].filter(Boolean).join("\n\n");

  let onAbort: (() => void) | null = null;

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 3072,
      system: [
        { type: "text", text: SYSTEM_CORE, cache_control: { type: "ephemeral" } },
        { type: "text", text: dynamicContext },
      ],
      tools: COMPANION_TOOLS,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    onAbort = () => {
      try { stream.controller?.abort?.(); } catch { /* ignore */ }
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        onAbort();
      } else {
        abortSignal.addEventListener("abort", onAbort, { once: true });
      }
    }

    let full = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const clean = stripNonArabic(event.delta.text);
        if (clean) {
          full += clean;
          cb.onText(clean);
        }
      }
    }
    const finalMsg = await stream.finalMessage();
    if (finalMsg.stop_reason === "refusal") {
      const msg = "\n\nأعتذر يا صديقي، لا يسعني المضيّ في هذا الطلب تحديدًا. اسألني بصيغةٍ أخرى أو في أمرٍ يقرِّبنا إلى الله، وأنا معك. 🤲";
      full += msg;
      cb.onText(msg);
    }
    // Detect tool_use blocks and append a structured action segment so the UI
    // (markdown parser + rendering) can render them as clickable CTAs. The
    // model rarely uses these today but the API will accept them when it does.
    let toolAppend = "";
    for (const block of finalMsg.content) {
      if (block.type !== "tool_use") continue;
      const name = (block as { name?: string }).name;
      const input = (block as { input?: Record<string, unknown> }).input ?? {};
      if (name === "next_step") {
        const route = typeof input.route === "string" ? input.route : "";
        const desc = typeof input.description === "string" ? input.description : "افتح";
        if (route) toolAppend += `\n\n[action:${desc} →${route}]`;
      } else if (name === "cite") {
        const source = typeof input.source === "string" ? input.source : "";
        const excerpt = typeof input.excerpt === "string" ? input.excerpt : "";
        if (source) toolAppend += `\n\n:::cite(${source})\n${excerpt}\n:::`;
      }
    }
    if (toolAppend) {
      full += toolAppend;
      cb.onText(toolAppend);
    }
    const verification = verifyAnswer(full);
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
