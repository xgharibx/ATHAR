import type { LeaderboardBoard, LeaderboardScoreBundle, LeaderboardSubmitPayload } from "@/lib/leaderboard";

export const LEADERBOARD_POLICY = {
  MAX_QUEUE_SIZE: 20,
  MAX_ALIAS_LENGTH: 40,
  MAX_SECTION_SLOTS: 64,
  MAX_SCORE_PER_METRIC: 200_000,
  MAX_TOTAL_GLOBAL: 1_000_000,
  MAX_DAYS_SKEW: 3
} as const;

const VALID_BOARDS: LeaderboardBoard[] = [
  "global",
  "dhikr",
  "quran",
  "prayers",
  "section",
  "tasbeeh_daily"
];

function isValidDayISO(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function dayDiffFromToday(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const a = new Date(y, m - 1, d);
  const b = new Date();
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / ms);
}

function clampInt(n: unknown, max: number = LEADERBOARD_POLICY.MAX_SCORE_PER_METRIC) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, Math.floor(v)));
}

export function sanitizeScores(scores: LeaderboardScoreBundle): LeaderboardScoreBundle {
  const sectionsEntries = Object.entries(scores.sections ?? {})
    .slice(0, LEADERBOARD_POLICY.MAX_SECTION_SLOTS)
    .map(([key, value]) => [key, clampInt(value)] as const);

  return {
    global: clampInt(scores.global, LEADERBOARD_POLICY.MAX_TOTAL_GLOBAL),
    dhikr: clampInt(scores.dhikr),
    quran: clampInt(scores.quran),
    prayers: clampInt(scores.prayers),
    tasbeehDaily: clampInt(scores.tasbeehDaily),
    sections: Object.fromEntries(sectionsEntries)
  };
}

export function validateSubmitPayload(payload: LeaderboardSubmitPayload) {
  if (!payload || payload.v !== 1) return { ok: false as const, reason: "bad-version" };
  if (!payload.identity?.id || !payload.identity?.fingerprint) return { ok: false as const, reason: "bad-identity" };
  if (!payload.identity?.alias || payload.identity.alias.length > LEADERBOARD_POLICY.MAX_ALIAS_LENGTH) {
    return { ok: false as const, reason: "bad-alias" };
  }
  if (!isValidDayISO(payload.day)) return { ok: false as const, reason: "bad-day" };
  if (Math.abs(dayDiffFromToday(payload.day)) > LEADERBOARD_POLICY.MAX_DAYS_SKEW) {
    return { ok: false as const, reason: "day-skew" };
  }

  return { ok: true as const };
}

export function sanitizeBoardName(board: string): LeaderboardBoard {
  return VALID_BOARDS.includes(board as LeaderboardBoard) ? (board as LeaderboardBoard) : "global";
}
