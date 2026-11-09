import { describe, expect, it } from "vitest";
import type { Section } from "@/data/types";
import { buildLeaderboardScoreStatsForDay } from "@/lib/leaderboardScores";

describe("buildLeaderboardScoreStatsForDay", () => {
  it("scores the requested worship day using logged prayers, checklist tasks, and every tasbeeh tap", () => {
    const stats = buildLeaderboardScoreStatsForDay({
      sections: [{ id: "morning", title: "الصباح", content: [{ text: "ذكر", count: 10 }] }] as Section[],
      progress: { "morning:0": 4 },
      quranDailyAyahs: { "2026-11-08": 80, "2026-11-09": 7 },
      dailyChecklist: {
        "2026-11-08": { oldTask: true },
        "2026-11-09": { quran: true, charity: true },
      },
      prayerLog: {
        "2026-11-08": { Fajr: true },
        "2026-11-09": { Fajr: true, Dhuhr: true, Isha: true },
      },
      quickTasbeeh: { subhanallah: 33, alhamdulillah: 33 },
      tasbeehDayTotals: { "2026-11-08": 900, "2026-11-09": 140 },
      todayISO: "2026-11-09",
    });

    expect(stats.scores).toEqual({
      global: 301,
      dhikr: 4,
      quran: 7,
      prayers: 3,
      tasks: 2,
      tasbeehDaily: 140,
      sections: { morning: 4 },
    });
    expect(stats.metrics).toMatchObject({
      quranAyahs: 7,
      prayersLogged: 3,
      tasksDone: 2,
      tasbeehTaps: 140,
    });
  });

  it("includes calendar-date prayer logs before the Fajr worship-day rollover", () => {
    const stats = buildLeaderboardScoreStatsForDay({
      sections: [],
      progress: {},
      quranDailyAyahs: { "2026-11-08": 0 },
      dailyChecklist: { "2026-11-08": {} },
      prayerLog: {
        "2026-11-08": { Fajr: true, Dhuhr: true },
        "2026-11-09": { Asr: true },
      },
      quickTasbeeh: {},
      tasbeehDayTotals: { "2026-11-08": 0 },
      todayISO: "2026-11-08",
      civilTodayISO: "2026-11-09",
    });

    expect(stats.prayers).toBe(3);
    expect(stats.metrics.prayersLogged).toBe(3);
  });
});
