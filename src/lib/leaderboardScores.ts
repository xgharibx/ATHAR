import { coerceCount, type Section } from "@/data/types";

const DAILY_TASBEEH_POOL: Array<{ key: string; label: string }> = [
  { key: "subhanallah", label: "سُبْحَانَ الله" },
  { key: "alhamdulillah", label: "الْحَمْدُ لِلَّه" },
  { key: "la_ilaha_illallah", label: "لا إِلَهَ إِلَّا الله" },
  { key: "allahu_akbar", label: "اللهُ أَكْبَر" }
];

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getDailyTasbeeh(todayISO: string) {
  const hash = hashString(todayISO);
  const item = DAILY_TASBEEH_POOL[hash % DAILY_TASBEEH_POOL.length];
  const target = 100 + (hash % 5) * 50;
  return { ...item, target };
}

export function buildLeaderboardScoreStats(input: {
  sections: Section[];
  progress: Record<string, number>;
  quranAyahIndex: number;
  prayersDone: Record<string, boolean>;
  quickTasbeeh: Record<string, number>;
  todayISO: string;
}) {
  const sectionScores: Record<string, number> = {};
  for (const section of input.sections) {
    let score = 0;
    section.content.forEach((item, index) => {
      const target = coerceCount(item.count);
      const key = `${section.id}:${index}`;
      const current = Math.min(target, Math.max(0, Number(input.progress[key]) || 0));
      score += current;
    });
    sectionScores[section.id] = score;
  }

  const dailyTasbeeh = getDailyTasbeeh(input.todayISO);
  const rawTasbeeh = Number(input.quickTasbeeh[dailyTasbeeh.key] ?? 0) || 0;
  const tasbeehDailyScore = Math.max(0, Math.min(rawTasbeeh, dailyTasbeeh.target));
  const dhikr = Object.values(input.progress).reduce((total, value) => total + (Number(value) || 0), 0);
  const quran = Math.max(0, input.quranAyahIndex || 0);
  const prayers = Object.keys(input.prayersDone).filter((key) => input.prayersDone[key]).length;
  const global = dhikr + quran * 3 + prayers * 40 + tasbeehDailyScore;

  return {
    global,
    dhikr,
    quran,
    prayers,
    tasbeehDailyLabel: dailyTasbeeh.label,
    tasbeehDailyTarget: dailyTasbeeh.target,
    tasbeehDailyScore,
    sectionScores,
    scores: {
      global,
      dhikr,
      quran,
      prayers,
      tasbeehDaily: tasbeehDailyScore,
      sections: sectionScores
    }
  };
}