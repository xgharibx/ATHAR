const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 5 * 60_000;

/** Capped exponential retry delay with equal jitter to spread clients after outages. */
export function getLeaderboardNetworkRetryDelayMs(attempt: number, random: () => number = Math.random) {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  const ceiling = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.min(normalizedAttempt, 20));
  const value = random();
  const sample = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
  return Math.round(ceiling * (0.5 + sample * 0.5));
}
