import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { isDailySection } from "@/lib/dailySections";
import { getIbadahDateKey, getLocalDateKey } from "@/lib/dayBoundaries";

export type NoorTheme =
  | "system"
  | "dark"
  | "light"
  | "noor"
  | "midnight"
  | "forest"
  | "bees"
  | "roses"
  | "sapphire"
  | "violet"
  | "sunset"
  | "mist";

export type ReminderSoundProfile = "birds_dawn" | "rain_calm";
export type PrayerSoundProfile =
  | "adhan_haram"
  | "adhan_fajr"
  | "iqama_soft"
  | "aladhan_adhan_3"
  | "aladhan_adhan_4"
  | "aladhan_adhan_7";
export type PrayerAlertPrayer = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
export type PrayerAlertPreferences = Record<PrayerAlertPrayer, boolean>;
export type HomeWidgetKey = "prayer" | "wisdom" | "smart" | "checklist" | "dailyStep" | "tasbeeh" | "dailyWird";

export type Preferences = {
  theme: NoorTheme;
  fontScale: number; // 0.9 - 1.6
  lineHeight: number; // 1.6 - 2.4
  quranFontScale: number; // 0.9 - 1.6
  quranLineHeight: number; // 1.8 - 3.0
  quranPageSize: number; // ayahs per page
  quranHideMarkers: boolean;
  quranTheme: "default" | "sepia" | "midnight" | "parchment";
  quranLetterSpacing: number; // em, 0 - 0.12
  quranWordSpacing: number;   // em, 0 - 0.25
  quranScrollMode: "page" | "scroll";
  quranDailyGoal: number; // ayahs per day goal
  quranReciter: string;   // everyayah.com folder name, e.g. "Alafasy_128kbps"
  quranMushafPage?: number; // last-read mushaf page (1-604)
  mushafFontScale?: number; // mushaf reader font scale 0.7–1.6
  showBenefits: boolean;
  stripDiacritics: boolean;
  enable3D: boolean;
  enableHaptics: boolean;
  enableSounds: boolean;
  reduceMotion: boolean;
  transparentMode: boolean;
  customAccent?: string; // override --accent, e.g. "#ff5555"
  arabicFont?: "noto_naskh" | "amiri" | "hafs"; // Se1
  uiLanguage?: "ar" | "en"; // Se3
  textDir?: "auto" | "rtl" | "ltr"; // Se4
  homeWidgetsOrder?: HomeWidgetKey[]; // Se5
  biometricLock?: boolean; // Se8
  autoAdvanceDhikr: boolean; // scroll to next card on item completion
  homeWidgets: Record<HomeWidgetKey, boolean>;
  prayerCalcMethod: number; // 1-23 AlAdhan method, default 5 (Egyptian)
  asrMadhab: 0 | 1; // 0=Shafi'i, 1=Hanafi
};

export type SebhaSession = {
  dhikrKey: string;
  dhikrLabel: string;
  count: number;
  target: number | null; // null = tally mode
  timestamp: string; // ISO
};

export type Reminders = {
  enabled: boolean;
  soundProfile: ReminderSoundProfile;
  prayerSoundProfile: PrayerSoundProfile;
  prayerAlertsEnabled: boolean;
  prayerAlerts: PrayerAlertPreferences;
  morningEnabled: boolean;
  morningTime: string; // HH:MM
  eveningEnabled: boolean;
  eveningTime: string; // HH:MM
  dailyWirdEnabled: boolean;
  dailyWirdTime: string; // HH:MM
  khatmaEnabled: boolean;
  khatmaTime: string; // HH:MM
  iqamaOffsets: Record<PrayerAlertPrayer, number>; // minutes after adhan per prayer
};

// L1: Friends leaderboard
export type LocalFriend = {
  id: string;
  alias: string;
  score: number;
  dhikr: number;
  quran: number;
  prayers: number;
  addedAt: string;
};

// L2: Group khatma
export type GroupKhatmaMember = {
  memberId: string;
  name: string;
  assignedJuz: number[];
  completedJuz: number[];
};

export type GroupKhatmaState = {
  groupId: string;
  groupName: string;
  members: GroupKhatmaMember[];
  createdAt: string;
};

// L3: Weekly challenge
export type WeeklyChallengeType = "al_kahf" | "morning_adhkar_5days";

export type WeeklyChallengeState = {
  type: WeeklyChallengeType;
  weekISO: string; // ISO date of week start (Monday)
  progress: Record<string, boolean>; // dateISO -> done
  completed: boolean;
};

export type ExportBlobV1 = {
  version: 1;
  exportedAt: string;
  prefs: Preferences;
  reminders?: Reminders;
  progress: Record<string, number>;
  favorites: Record<string, boolean>;
  activity: Record<string, number>;
  quickTasbeeh?: Record<string, number>;
  sebhaSessions?: SebhaSession[];
  sebhaCustom?: { phrase: string; target: number } | null;
  prayerLog?: Record<string, Record<string, boolean>>;
  favoriteCities?: Array<{ id: string; city: string; country: string; label: string }>;
  quranBookmarks?: Record<string, boolean>;
  quranLastRead?: { surahId: number; ayahIndex: number } | null;
  quranNotes?: Record<string, string>;
  quranHighlights?: Record<string, string>; // key: `${surahId}:${ayahIndex}` → "gold"|"green"|"blue"|"red"
  quranReadingHistory?: Record<string, number>;
  quranStreak?: number;
  quranLastReadDate?: string | null;
  quranDailyAyahs?: Record<string, number>;
  sectionItemOrder?: Record<string, number[]>;
  dailyWirdDone?: Record<string, boolean>;
  dailyWirdStartISO?: string | null;
  khatmaStartISO?: string | null;
  khatmaDays?: number | null;
  khatmaDone?: Record<string, boolean>;
  lastDailyResetISO?: string | null;
  lastCivilResetISO?: string | null;
  lastIbadahResetISO?: string | null;
  dailyChecklist?: Record<string, Record<string, boolean>>;
  dailyBetterStepDone?: Record<string, boolean>;
};

type NoorState = {
  prefs: Preferences;
  reminders: Reminders;
  progress: Record<string, number>; // key: `${sectionId}:${index}`
  favorites: Record<string, boolean>;
  activity: Record<string, number>; // dateISO -> actions count
  sectionItemOrder: Record<string, number[]>; // sectionId -> ordered original indexes
  lastCivilResetISO: string | null;
  lastIbadahResetISO: string | null;

  // Home quick tasbeeh
  quickTasbeeh: Record<string, number>; // key: string -> count
  incQuickTasbeeh: (key: string, target?: number) => number;
  resetQuickTasbeeh: (key: string) => void;
  resetAllQuickTasbeeh: () => void;

  // Sebha sessions history
  sebhaSessions: SebhaSession[];
  addSebhaSession: (s: SebhaSession) => void;
  clearSebhaSessions: () => void;

  // Sebha custom dhikr
  sebhaCustom: { phrase: string; target: number } | null;
  setSebhaCustom: (v: { phrase: string; target: number } | null) => void;

  // Prayer log (P9)
  prayerLog: Record<string, Record<string, boolean>>; // dateISO -> prayerName -> prayed
  setPrayerLogged: (dateISO: string, prayer: string, done: boolean) => void;
  clearPrayerLog: () => void;

  // Favorite cities (P2)
  favoriteCities: Array<{ id: string; city: string; country: string; label: string }>;
  addFavoriteCity: (c: { id: string; city: string; country: string; label: string }) => void;
  removeFavoriteCity: (id: string) => void;

  // Custom adhan ringtone base64 (P4)
  customAdhanBase64: string | null;
  setCustomAdhanBase64: (v: string | null) => void;

  // Quran
  quranBookmarks: Record<string, boolean>; // key: `${surahId}:${ayahIndex}`
  toggleQuranBookmark: (surahId: number, ayahIndex: number) => void;
  quranLastRead: { surahId: number; ayahIndex: number } | null;
  setQuranLastRead: (surahId: number, ayahIndex: number) => void;

  quranNotes: Record<string, string>; // key: `${surahId}:${ayahIndex}`
  setQuranNote: (surahId: number, ayahIndex: number, note: string) => void;
  clearQuranNote: (surahId: number, ayahIndex: number) => void;

  quranHighlights: Record<string, string>; // key: `${surahId}:${ayahIndex}` → "gold"|"green"|"blue"|"red"
  setQuranHighlight: (surahId: number, ayahIndex: number, color: string | null) => void;

  // Tracks furthest ayah reached per surah (surahId string -> max ayahIndex)
  quranReadingHistory: Record<string, number>;

  // Quran reading streak
  quranStreak: number;
  quranLastReadDate: string | null; // ISO date
  quranDailyAyahs: Record<string, number>; // dateISO -> ayahs read that day
  recordQuranRead: (count?: number) => void;

  // Daily Wird
  dailyWirdDone: Record<string, boolean>; // dateISO -> done
  setDailyWirdDone: (dateISO: string, done: boolean) => void;
  dailyWirdStartISO: string | null;
  setDailyWirdStartISO: (dateISO: string) => void;

  // Daily Muslim checklist and growth step
  dailyChecklist: Record<string, Record<string, boolean>>; // dateISO -> itemId -> done
  toggleDailyChecklist: (dateISO: string, itemId: string, done?: boolean) => void;
  resetDailyChecklist: (dateISO: string) => void;
  dailyBetterStepDone: Record<string, boolean>; // dateISO -> done
  setDailyBetterStepDone: (dateISO: string, done: boolean) => void;

  // Khatma plan
  khatmaStartISO: string | null;
  khatmaDays: number | null;
  khatmaDone: Record<string, boolean>; // dateISO -> done
  setKhatmaPlan: (opts: { startISO: string; days: number }) => void;
  setKhatmaDone: (dateISO: string, done: boolean) => void;
  resetKhatma: () => void;

  setPrefs: (partial: Partial<Preferences>) => void;
  setReminders: (partial: Partial<Reminders>) => void;

  increment: (opts: { sectionId: string; index: number; target: number }) => number;
  decrement: (opts: { sectionId: string; index: number; target?: number }) => number;
  resetItem: (sectionId: string, index: number, target?: number) => void;
  resetSection: (sectionId: string) => void;

  toggleFavorite: (sectionId: string, index: number) => void;
  moveSectionItem: (sectionId: string, fromDisplayIndex: number, toDisplayIndex: number, itemCount: number) => void;
  resetSectionItemOrder: (sectionId: string) => void;

  bumpActivityToday: () => void;
  ensureDailyResets: (fajrTime?: string | null) => void;

  exportState: () => ExportBlobV1;
  importState: (blob: ExportBlobV1) => void;

  // Targeted resets (Phase 37)
  resetAdhkarProgress: () => void;
  resetQuranData: () => void;
  resetPrefs: () => void; // Se6

  // L1: Local friends leaderboard
  localFriends: LocalFriend[];
  addLocalFriend: (f: LocalFriend) => void;
  removeLocalFriend: (id: string) => void;

  // L2: Group khatma
  groupKhatma: GroupKhatmaState | null;
  setGroupKhatma: (g: GroupKhatmaState | null) => void;
  toggleGroupKhatmaJuz: (memberId: string, juzNum: number) => void;

  // L3: Weekly challenge
  weeklyChallenge: WeeklyChallengeState | null;
  setWeeklyChallenge: (c: WeeklyChallengeState | null) => void;
  toggleWeeklyChallengeDay: (dateISO: string) => void;

  // I7: Weekly report notification
  weeklyReportSentISO: string | null;
  setWeeklyReportSentISO: (iso: string) => void;

  // De4: Onboarding
  onboardingDone: boolean;
  setOnboardingDone: (done: boolean) => void;

  // UX-only
  lastCelebrationAt: number;
  setLastCelebrationAt: (ts: number) => void;

  lastVisitedSectionId: string | null;
  setLastVisitedSectionId: (sectionId: string | null) => void;
};

export const DEFAULT_HOME_WIDGETS_ORDER: HomeWidgetKey[] = ["prayer", "wisdom", "smart", "checklist", "dailyStep", "tasbeeh", "dailyWird"];

const DEFAULT_PREFS: Preferences = {
  theme: "forest",
  fontScale: 1.05,
  lineHeight: 1.95,
  quranFontScale: 1.1,
  quranLineHeight: 2.55,
  quranPageSize: 12,
  quranHideMarkers: false,
  quranTheme: "default" as const,
  quranLetterSpacing: 0,
  quranWordSpacing: 0,
  quranScrollMode: "page" as const,
  quranDailyGoal: 10,
  quranReciter: "Alafasy_128kbps",
  showBenefits: true,
  stripDiacritics: false,
  enable3D: true,
  enableHaptics: true,
  enableSounds: false,
  reduceMotion: false,
  transparentMode: true,
  customAccent: undefined,
  arabicFont: "noto_naskh",
  uiLanguage: "ar",
  textDir: "auto",
  homeWidgetsOrder: [...DEFAULT_HOME_WIDGETS_ORDER],
  biometricLock: false,
  autoAdvanceDhikr: true,
  prayerCalcMethod: 5,
  asrMadhab: 0,
  homeWidgets: {
    prayer: true,
    wisdom: true,
    smart: true,
    checklist: true,
    dailyStep: true,
    tasbeeh: true,
    dailyWird: true,
  },
};

function normalizeHomeWidgetsOrder(value: unknown): HomeWidgetKey[] {
  const VALID_KEYS: HomeWidgetKey[] = [...DEFAULT_HOME_WIDGETS_ORDER];
  if (!Array.isArray(value)) return [...VALID_KEYS];
  const seen = new Set<HomeWidgetKey>();
  const result: HomeWidgetKey[] = [];
  for (const v of value) {
    if (VALID_KEYS.includes(v as HomeWidgetKey) && !seen.has(v as HomeWidgetKey)) {
      seen.add(v as HomeWidgetKey);
      result.push(v as HomeWidgetKey);
    }
  }
  for (const k of VALID_KEYS) {
    if (!seen.has(k)) result.push(k);
  }
  return result;
}

function normalizeHomeWidgets(value: unknown): Record<HomeWidgetKey, boolean> {
  const source = value && typeof value === "object" ? value as Partial<Record<HomeWidgetKey, unknown>> : {};
  return {
    prayer: typeof source.prayer === "boolean" ? source.prayer : DEFAULT_PREFS.homeWidgets.prayer,
    wisdom: typeof source.wisdom === "boolean" ? source.wisdom : DEFAULT_PREFS.homeWidgets.wisdom,
    smart: typeof source.smart === "boolean" ? source.smart : DEFAULT_PREFS.homeWidgets.smart,
    checklist: typeof source.checklist === "boolean" ? source.checklist : DEFAULT_PREFS.homeWidgets.checklist,
    dailyStep: typeof source.dailyStep === "boolean" ? source.dailyStep : DEFAULT_PREFS.homeWidgets.dailyStep,
    tasbeeh: typeof source.tasbeeh === "boolean" ? source.tasbeeh : DEFAULT_PREFS.homeWidgets.tasbeeh,
    dailyWird: typeof source.dailyWird === "boolean" ? source.dailyWird : DEFAULT_PREFS.homeWidgets.dailyWird,
  };
}

function normalizePrefs(value: unknown): Preferences {
  const source = value && typeof value === "object" ? value as Partial<Preferences> : {};
  return {
    ...DEFAULT_PREFS,
    ...source,
    homeWidgets: normalizeHomeWidgets(source.homeWidgets),
    homeWidgetsOrder: normalizeHomeWidgetsOrder(source.homeWidgetsOrder),
  };
}

const DEFAULT_REMINDERS: Reminders = {
  enabled: false,
  soundProfile: "birds_dawn",
  prayerSoundProfile: "aladhan_adhan_3",
  prayerAlertsEnabled: true,
  prayerAlerts: {
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true,
  },
  morningEnabled: true,
  morningTime: "07:00",
  eveningEnabled: true,
  eveningTime: "18:00",
  dailyWirdEnabled: true,
  dailyWirdTime: "21:00",
  khatmaEnabled: false,
  khatmaTime: "21:15",
  iqamaOffsets: { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 }
};

function normalizeReminderSoundProfile(value: unknown): ReminderSoundProfile {
  if (typeof value !== "string") {
    return DEFAULT_REMINDERS.soundProfile;
  }

  switch (value.trim()) {
    case "birds_dawn":
      return "birds_dawn";
    case "rain_calm":
      return "rain_calm";
    default:
      return DEFAULT_REMINDERS.soundProfile;
  }
}

function sanitizeOrderMap(input: unknown) {
  const src = (input ?? {}) as Record<string, unknown>;
  const out: Record<string, number[]> = {};
  for (const [sectionId, rawOrder] of Object.entries(src)) {
    if (!sectionId || !Array.isArray(rawOrder)) continue;
    const seen = new Set<number>();
    const order: number[] = [];
    for (const value of rawOrder) {
      const index = Number(value);
      if (!Number.isInteger(index) || index < 0 || seen.has(index)) continue;
      seen.add(index);
      order.push(index);
    }
    if (order.length > 0) out[sectionId] = order;
  }
  return out;
}

function normalizeSectionOrder(savedOrder: number[] | undefined, itemCount: number) {
  const seen = new Set<number>();
  const order: number[] = [];
  for (const value of savedOrder ?? []) {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= itemCount || seen.has(index)) continue;
    seen.add(index);
    order.push(index);
  }
  for (let index = 0; index < itemCount; index += 1) {
    if (!seen.has(index)) order.push(index);
  }
  return order;
}

function normalizePrayerSoundProfile(value: unknown): PrayerSoundProfile {
  if (typeof value !== "string") {
    return DEFAULT_REMINDERS.prayerSoundProfile;
  }

  switch (value.trim()) {
    case "adhan_haram":
      return "adhan_haram";
    case "adhan_fajr":
      return "adhan_fajr";
    case "iqama_soft":
      return "iqama_soft";
    case "aladhan_adhan_3":
      return "aladhan_adhan_3";
    case "aladhan_adhan_4":
      return "aladhan_adhan_4";
    case "aladhan_adhan_7":
      return "aladhan_adhan_7";
    default:
      return DEFAULT_REMINDERS.prayerSoundProfile;
  }
}

function normalizePrayerAlerts(value: unknown): PrayerAlertPreferences {
  const source = value && typeof value === "object" ? value as Partial<Record<PrayerAlertPrayer, unknown>> : {};
  return {
    Fajr: typeof source.Fajr === "boolean" ? source.Fajr : DEFAULT_REMINDERS.prayerAlerts.Fajr,
    Dhuhr: typeof source.Dhuhr === "boolean" ? source.Dhuhr : DEFAULT_REMINDERS.prayerAlerts.Dhuhr,
    Asr: typeof source.Asr === "boolean" ? source.Asr : DEFAULT_REMINDERS.prayerAlerts.Asr,
    Maghrib: typeof source.Maghrib === "boolean" ? source.Maghrib : DEFAULT_REMINDERS.prayerAlerts.Maghrib,
    Isha: typeof source.Isha === "boolean" ? source.Isha : DEFAULT_REMINDERS.prayerAlerts.Isha,
  };
}

function todayISO() {
  return getLocalDateKey();
}

function toSafeInt(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function sanitizeNumberMap(input: unknown) {
  const src = (input ?? {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const key of Object.keys(src)) {
    const value = toSafeInt(src[key]);
    if (value > 0) out[key] = value;
  }
  return out;
}

export const useNoorStore = create<NoorState>()(
  persist(
    (set, get) => ({
      prefs: DEFAULT_PREFS,
      reminders: DEFAULT_REMINDERS,
      progress: {},
      favorites: {},
      activity: {},
      sectionItemOrder: {},
      lastCivilResetISO: null,
      lastIbadahResetISO: null,

      quickTasbeeh: {},
      incQuickTasbeeh: (key, target = 100) => {
        get().ensureDailyResets();
        const current = toSafeInt(get().quickTasbeeh[key]);
        if (current >= target) return current;
        const next = current + 1;
        set((s) => ({ quickTasbeeh: { ...s.quickTasbeeh, [key]: next } }));
        get().bumpActivityToday();
        return next;
      },
      resetQuickTasbeeh: (key) =>
        set((s) => {
          const next = { ...s.quickTasbeeh };
          delete next[key];
          return { quickTasbeeh: next };
        }),
      resetAllQuickTasbeeh: () => set({ quickTasbeeh: {} }),

      sebhaSessions: [],
      addSebhaSession: (s) => set((st) => ({ sebhaSessions: [s, ...st.sebhaSessions].slice(0, 100) })),
      clearSebhaSessions: () => set({ sebhaSessions: [] }),

      sebhaCustom: null,
      setSebhaCustom: (v) => set({ sebhaCustom: v }),

      prayerLog: {},
      setPrayerLogged: (dateISO, prayer, done) =>
        set((s) => ({
          prayerLog: {
            ...s.prayerLog,
            [dateISO]: { ...(s.prayerLog[dateISO] ?? {}), [prayer]: done },
          },
        })),
      clearPrayerLog: () => set({ prayerLog: {} }),

      favoriteCities: [],
      addFavoriteCity: (c) =>
        set((s) => ({ favoriteCities: [...s.favoriteCities.filter((x) => x.id !== c.id), c] })),
      removeFavoriteCity: (id) =>
        set((s) => ({ favoriteCities: s.favoriteCities.filter((x) => x.id !== id) })),

      customAdhanBase64: null,
      setCustomAdhanBase64: (v) => set({ customAdhanBase64: v }),

      quranBookmarks: {},
      toggleQuranBookmark: (surahId, ayahIndex) => {
        const key = `${surahId}:${ayahIndex}`;
        set((s) => ({ quranBookmarks: { ...s.quranBookmarks, [key]: !s.quranBookmarks[key] } }));
      },
      quranLastRead: null,
      setQuranLastRead: (surahId, ayahIndex) => set((s) => {
        const histKey = String(surahId);
        const prevMax = s.quranReadingHistory[histKey] ?? 0;
        const newHistory = ayahIndex > prevMax
          ? { ...s.quranReadingHistory, [histKey]: ayahIndex }
          : s.quranReadingHistory;
        return { quranLastRead: { surahId, ayahIndex }, quranReadingHistory: newHistory };
      }),

      quranNotes: {},
      quranHighlights: {},

      quranReadingHistory: {},

      quranStreak: 0,
      quranLastReadDate: null,
      quranDailyAyahs: {},
      recordQuranRead: (count = 1) => {
        const today = todayISO();
        set((s) => {
          const prevDate = s.quranLastReadDate;
          const dayBefore = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          })();
          const newStreak =
            prevDate === today ? s.quranStreak
            : prevDate === dayBefore ? s.quranStreak + 1
            : 1;
          const todayCount = (s.quranDailyAyahs[today] ?? 0) + count;
          return {
            quranLastReadDate: today,
            quranStreak: newStreak,
            quranDailyAyahs: { ...s.quranDailyAyahs, [today]: todayCount },
          };
        });
      },

      setQuranNote: (surahId, ayahIndex, note) => {
        const key = `${surahId}:${ayahIndex}`;
        const clean = (note ?? "").trim();
        set((s) => ({ quranNotes: { ...s.quranNotes, [key]: clean } }));
      },
      clearQuranNote: (surahId, ayahIndex) => {
        const key = `${surahId}:${ayahIndex}`;
        set((s) => {
          const next = { ...s.quranNotes };
          delete next[key];
          return { quranNotes: next };
        });
      },

      setQuranHighlight: (surahId, ayahIndex, color) => {
        const key = `${surahId}:${ayahIndex}`;
        set((s) => {
          if (!color) {
            const next = { ...s.quranHighlights };
            delete next[key];
            return { quranHighlights: next };
          }
          return { quranHighlights: { ...s.quranHighlights, [key]: color } };
        });
      },

      dailyWirdDone: {},
      setDailyWirdDone: (dateISO, done) =>
        set((s) => ({ dailyWirdDone: { ...s.dailyWirdDone, [dateISO]: !!done } })),

      dailyWirdStartISO: null,
      setDailyWirdStartISO: (dateISO) => set({ dailyWirdStartISO: dateISO }),

      dailyChecklist: {},
      toggleDailyChecklist: (dateISO, itemId, done) =>
        set((s) => {
          const day = { ...(s.dailyChecklist[dateISO] ?? {}) };
          const next = done ?? !day[itemId];
          day[itemId] = !!next;
          return { dailyChecklist: { ...s.dailyChecklist, [dateISO]: day } };
        }),
      resetDailyChecklist: (dateISO) =>
        set((s) => {
          const next = { ...s.dailyChecklist };
          delete next[dateISO];
          return { dailyChecklist: next };
        }),

      dailyBetterStepDone: {},
      setDailyBetterStepDone: (dateISO, done) =>
        set((s) => ({ dailyBetterStepDone: { ...s.dailyBetterStepDone, [dateISO]: !!done } })),

      khatmaStartISO: null,
      khatmaDays: null,
      khatmaDone: {},
      setKhatmaPlan: ({ startISO, days }) =>
        set({ khatmaStartISO: startISO, khatmaDays: days, khatmaDone: {} }),
      setKhatmaDone: (dateISO, done) =>
        set((s) => ({ khatmaDone: { ...s.khatmaDone, [dateISO]: !!done } })),
      resetKhatma: () => set({ khatmaStartISO: null, khatmaDays: null, khatmaDone: {} }),

      setPrefs: (partial) =>
        set((s) => ({
          prefs: {
            ...s.prefs,
            ...partial,
            // Always-on immersive mode
            transparentMode: true
          }
        })),

      setReminders: (partial) =>
        set((s) => ({
          reminders: {
            ...s.reminders,
            ...partial
          }
        })),

      increment: ({ sectionId, index, target }) => {
        get().ensureDailyResets();
        const key = `${sectionId}:${index}`;
        const current = toSafeInt(get().progress[key]);
        if (current >= target) return current;
        const next = current + 1;

        set((s) => ({ progress: { ...s.progress, [key]: next } }));

        // Activity tracking (for streaks / insights)
        get().bumpActivityToday();

        return next;
      },

      decrement: ({ sectionId, index, target }) => {
        get().ensureDailyResets();
        const key = `${sectionId}:${index}`;
        const current = toSafeInt(get().progress[key]);

        if (isDailySection(sectionId) && target && current >= target) {
          return current;
        }

        const next = Math.max(0, current - 1);
        set((s) => ({ progress: { ...s.progress, [key]: next } }));
        return next;
      },

      resetItem: (sectionId, index, target) => {
        get().ensureDailyResets();
        const key = `${sectionId}:${index}`;

        if (isDailySection(sectionId) && target) {
          const current = toSafeInt(get().progress[key]);
          if (current >= target) return;
        }

        set((s) => {
          const next = { ...s.progress };
          delete next[key];
          return { progress: next };
        });
      },

      resetSection: (sectionId) => {
        get().ensureDailyResets();
        if (isDailySection(sectionId)) return;

        set((s) => {
          const next = { ...s.progress };
          for (const k of Object.keys(next)) {
            if (k.startsWith(sectionId + ":")) delete next[k];
          }
          return { progress: next };
        });
      },

      toggleFavorite: (sectionId, index) => {
        const key = `${sectionId}:${index}`;
        set((s) => ({ favorites: { ...s.favorites, [key]: !s.favorites[key] } }));
      },

      moveSectionItem: (sectionId, fromDisplayIndex, toDisplayIndex, itemCount) => {
        set((s) => {
          const order = normalizeSectionOrder(s.sectionItemOrder[sectionId], itemCount);
          if (fromDisplayIndex < 0 || fromDisplayIndex >= order.length) return {};
          const targetIndex = Math.max(0, Math.min(order.length - 1, toDisplayIndex));
          if (targetIndex === fromDisplayIndex) return {};
          const [moved] = order.splice(fromDisplayIndex, 1);
          if (moved == null) return {};
          order.splice(targetIndex, 0, moved);
          return { sectionItemOrder: { ...s.sectionItemOrder, [sectionId]: order } };
        });
      },

      resetSectionItemOrder: (sectionId) =>
        set((s) => {
          const next = { ...s.sectionItemOrder };
          delete next[sectionId];
          return { sectionItemOrder: next };
        }),

      bumpActivityToday: () => {
        const key = todayISO();
        set((s) => ({ activity: { ...s.activity, [key]: (s.activity[key] ?? 0) + 1 } }));
      },

      ensureDailyResets: (fajrTime) => {
        const civilToday = todayISO();
        const ibadahToday = fajrTime ? getIbadahDateKey(new Date(), fajrTime) : null;
        const lastCivilResetISO = get().lastCivilResetISO;
        const lastIbadahResetISO = get().lastIbadahResetISO;

        const nextState: Partial<NoorState> = {};

        if (lastCivilResetISO !== civilToday) {
          nextState.lastCivilResetISO = civilToday;
        }

        if (ibadahToday && lastIbadahResetISO !== ibadahToday) {
          const currentProgress = get().progress;
          const nextProgress = { ...currentProgress };

          for (const key of Object.keys(nextProgress)) {
            const sectionId = key.split(":")[0] ?? "";
            if (isDailySection(sectionId)) {
              delete nextProgress[key];
            }
          }

          nextState.progress = nextProgress;
          nextState.quickTasbeeh = {};
          nextState.lastIbadahResetISO = ibadahToday;
        }

        if (Object.keys(nextState).length > 0) {
          set(nextState);
        }
      },

      exportState: () => {
        const s = get();
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          prefs: s.prefs,
          reminders: s.reminders,
          progress: s.progress,
          favorites: s.favorites,
          activity: s.activity,
          sectionItemOrder: s.sectionItemOrder,
          quickTasbeeh: s.quickTasbeeh,
          quranBookmarks: s.quranBookmarks,
          quranLastRead: s.quranLastRead,
          quranNotes: s.quranNotes,
          quranHighlights: s.quranHighlights,
          quranReadingHistory: s.quranReadingHistory,
          quranStreak: s.quranStreak,
          quranLastReadDate: s.quranLastReadDate,
          quranDailyAyahs: s.quranDailyAyahs,
          dailyWirdDone: s.dailyWirdDone,
          dailyWirdStartISO: s.dailyWirdStartISO,
          khatmaStartISO: s.khatmaStartISO,
          khatmaDays: s.khatmaDays,
          khatmaDone: s.khatmaDone,
          lastDailyResetISO: s.lastCivilResetISO,
          lastCivilResetISO: s.lastCivilResetISO,
          lastIbadahResetISO: s.lastIbadahResetISO,
          dailyChecklist: s.dailyChecklist,
          dailyBetterStepDone: s.dailyBetterStepDone,
          sebhaSessions: s.sebhaSessions,
          sebhaCustom: s.sebhaCustom,
          prayerLog: s.prayerLog,
          favoriteCities: s.favoriteCities,
        };
      },

      importState: (blob) => {
        if (blob?.version !== 1) return;
        const importedReminders = blob.reminders
          ? { ...DEFAULT_REMINDERS, ...blob.reminders }
          : DEFAULT_REMINDERS;
        set({
          prefs: normalizePrefs(blob.prefs),
          reminders: {
            ...importedReminders,
            soundProfile: normalizeReminderSoundProfile(importedReminders.soundProfile),
            prayerSoundProfile: normalizePrayerSoundProfile(importedReminders.prayerSoundProfile),
            prayerAlerts: normalizePrayerAlerts(importedReminders.prayerAlerts),
          },
          progress: sanitizeNumberMap(blob.progress),
          favorites: blob.favorites ?? {},
          activity: blob.activity ?? {},
          sectionItemOrder: sanitizeOrderMap(blob.sectionItemOrder),
          quickTasbeeh: sanitizeNumberMap(blob.quickTasbeeh),
          quranBookmarks: blob.quranBookmarks ?? {},
          quranLastRead: blob.quranLastRead ?? null,
          quranNotes: blob.quranNotes ?? {},
          quranHighlights: blob.quranHighlights ?? {},
          quranReadingHistory: sanitizeNumberMap(blob.quranReadingHistory),
          quranStreak: blob.quranStreak ?? 0,
          quranLastReadDate: blob.quranLastReadDate ?? null,
          quranDailyAyahs: sanitizeNumberMap(blob.quranDailyAyahs),
          dailyWirdDone: blob.dailyWirdDone ?? {},
          dailyWirdStartISO: blob.dailyWirdStartISO ?? null,
          khatmaStartISO: blob.khatmaStartISO ?? null,
          khatmaDays: blob.khatmaDays ?? null,
          khatmaDone: blob.khatmaDone ?? {},
          lastCivilResetISO: blob.lastCivilResetISO ?? blob.lastDailyResetISO ?? null,
          lastIbadahResetISO: blob.lastIbadahResetISO ?? blob.lastDailyResetISO ?? null,
          dailyChecklist: blob.dailyChecklist ?? {},
          dailyBetterStepDone: blob.dailyBetterStepDone ?? {},
          sebhaSessions: Array.isArray(blob.sebhaSessions) ? blob.sebhaSessions : [],
          sebhaCustom: blob.sebhaCustom ?? null,
          prayerLog: blob.prayerLog ?? {},
          favoriteCities: Array.isArray(blob.favoriteCities) ? blob.favoriteCities : [],
        });
      },

      // Se6: Restore preference defaults without clearing progress data
      resetPrefs: () => set({ prefs: { ...DEFAULT_PREFS } }),

      // Targeted resets (Phase 37)
      resetAdhkarProgress: () => set({
        progress: {},
        favorites: {},
        activity: {},
        quickTasbeeh: {},
        sectionItemOrder: {},
        dailyChecklist: {},
        dailyBetterStepDone: {},
        lastCivilResetISO: null,
        lastIbadahResetISO: null,
      }),
      resetQuranData: () => set({
        quranBookmarks: {},
        quranNotes: {},
        quranHighlights: {},
        quranReadingHistory: {},
        quranLastRead: null,
        quranDailyAyahs: {},
        quranStreak: 0,
        quranLastReadDate: null,
        dailyWirdDone: {},
        dailyWirdStartISO: null,
        khatmaStartISO: null,
        khatmaDays: null,
        khatmaDone: {},
      }),

      lastCelebrationAt: 0,
      setLastCelebrationAt: (ts) => set({ lastCelebrationAt: ts }),

      lastVisitedSectionId: null,
      setLastVisitedSectionId: (sectionId) => set({ lastVisitedSectionId: sectionId }),

      localFriends: [],
      addLocalFriend: (f) =>
        set((s) => ({ localFriends: [...s.localFriends.filter((x) => x.id !== f.id), f] })),
      removeLocalFriend: (id) =>
        set((s) => ({ localFriends: s.localFriends.filter((x) => x.id !== id) })),

      groupKhatma: null,
      setGroupKhatma: (g) => set({ groupKhatma: g }),
      toggleGroupKhatmaJuz: (memberId, juzNum) =>
        set((s) => {
          if (!s.groupKhatma) return {};
          return {
            groupKhatma: {
              ...s.groupKhatma,
              members: s.groupKhatma.members.map((m) => {
                if (m.memberId !== memberId) return m;
                const has = m.completedJuz.includes(juzNum);
                return {
                  ...m,
                  completedJuz: has
                    ? m.completedJuz.filter((j) => j !== juzNum)
                    : [...m.completedJuz, juzNum],
                };
              }),
            },
          };
        }),

      weeklyChallenge: null,
      setWeeklyChallenge: (c) => set({ weeklyChallenge: c }),
      toggleWeeklyChallengeDay: (dateISO) =>
        set((s) => {
          if (!s.weeklyChallenge) return {};
          const done = !s.weeklyChallenge.progress[dateISO];
          const nextProgress = { ...s.weeklyChallenge.progress, [dateISO]: done };
          const completedCount = Object.values(nextProgress).filter(Boolean).length;
          return {
            weeklyChallenge: {
              ...s.weeklyChallenge,
              progress: nextProgress,
              completed:
                s.weeklyChallenge.type === "morning_adhkar_5days"
                  ? completedCount >= 5
                  : completedCount >= 1,
            },
          };
        }),

      weeklyReportSentISO: null,
      setWeeklyReportSentISO: (iso) => set({ weeklyReportSentISO: iso }),

      onboardingDone: false,
      setOnboardingDone: (done) => set({ onboardingDone: done }),
    }),
    {
      name: "noor_store_v1",
      storage: createJSONStorage(() => localStorage),
      version: 16,
      migrate: (persisted: unknown) => {
        const state = (persisted ?? {}) as Partial<NoorState> & { lastDailyResetISO?: string | null };
        const persistedPrefs = state.prefs && typeof state.prefs === "object" ? state.prefs : undefined;
        const persistedReminders =
          state.reminders && typeof state.reminders === "object" ? state.reminders : undefined;
        const mergedReminders = { ...DEFAULT_REMINDERS, ...persistedReminders };
        return {
          ...state,
          prefs: normalizePrefs(persistedPrefs),
          reminders: {
            ...mergedReminders,
            soundProfile: normalizeReminderSoundProfile(mergedReminders.soundProfile),
            prayerSoundProfile: normalizePrayerSoundProfile(mergedReminders.prayerSoundProfile),
            prayerAlerts: normalizePrayerAlerts(mergedReminders.prayerAlerts),
          },
          progress: sanitizeNumberMap(state.progress),
          quickTasbeeh: sanitizeNumberMap(state.quickTasbeeh),
          sectionItemOrder: sanitizeOrderMap(state.sectionItemOrder),
          lastCivilResetISO: state.lastCivilResetISO ?? state.lastDailyResetISO ?? null,
          lastIbadahResetISO: state.lastIbadahResetISO ?? state.lastDailyResetISO ?? null,
          dailyChecklist: state.dailyChecklist ?? {},
          dailyBetterStepDone: state.dailyBetterStepDone ?? {},
          prayerLog: (state as Partial<NoorState>).prayerLog ?? {},
          favoriteCities: Array.isArray((state as Partial<NoorState>).favoriteCities) ? (state as Partial<NoorState>).favoriteCities! : [],
          customAdhanBase64: (state as Partial<NoorState>).customAdhanBase64 ?? null,
          localFriends: Array.isArray((state as Partial<NoorState>).localFriends) ? (state as Partial<NoorState>).localFriends! : [],
          groupKhatma: (state as Partial<NoorState>).groupKhatma ?? null,
          weeklyChallenge: (state as Partial<NoorState>).weeklyChallenge ?? null,
          weeklyReportSentISO: (state as Partial<NoorState>).weeklyReportSentISO ?? null,
          onboardingDone: (state as Partial<NoorState>).onboardingDone ?? false,
        } as NoorState;
      }
    }
  )
);
