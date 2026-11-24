/**
 * «القرآن ٢» — the memory model: FSRS 4.5 (Free Spaced Repetition Scheduler,
 * open-spaced-repetition), with its published default parameters.
 *
 * Each memorised page has a stability S (days until the chance of recalling it
 * falls to 90 %) and a difficulty D (1–10). After each revision you grade how it
 * went, and the model moves the next revision to when recall would fall to the
 * target. retrievability() tells, for any day, how likely you are to remember it.
 */

export type Grade = 1 | 2 | 3 | 4; // نسيتها · بصعوبة · جيد · متقنة

export type CardState = {
  /** Stability, in days. */
  s: number;
  /** Difficulty, 1–10. */
  d: number;
  /** Last revision (ms). */
  last: number;
  /** Next revision (ms). */
  due: number;
  reps: number;
  lapses: number;
};

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755] as const;
const DECAY = -0.5;
const FACTOR = 19 / 81;
const DAY = 86_400_000;
export const TARGET_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 365;

const clampD = (d: number) => Math.min(10, Math.max(1, d));

/** The chance (0–1) of recalling a page t days after its last revision. */
export function recall(stabilityDays: number, elapsedDays: number): number {
  return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / stabilityDays, DECAY);
}

export function retrievability(card: CardState, now = Date.now()): number {
  return recall(card.s, (now - card.last) / DAY);
}

/** Days until recall falls to the target. */
export function intervalDays(stability: number, retention = TARGET_RETENTION): number {
  const days = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

const initialD = (g: Grade) => clampD(W[4] - (g - 3) * W[5]);

function nextD(d: number, g: Grade): number {
  const moved = d - W[6] * (g - 3);
  return clampD(W[7] * initialD(4) + (1 - W[7]) * moved);
}

function recallStability(d: number, s: number, r: number, g: Grade): number {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
}

function forgetStability(d: number, s: number, r: number): number {
  return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
}

/** The page's memory after a revision graded g (a first grade starts it). */
export function review(card: CardState | null, g: Grade, now = Date.now()): CardState {
  let s: number;
  let d: number;
  if (!card) {
    s = W[g - 1]!;
    d = initialD(g);
  } else {
    const r = retrievability(card, now);
    d = nextD(card.d, g);
    s = g === 1 ? Math.min(card.s, forgetStability(card.d, card.s, r)) : recallStability(card.d, card.s, r, g);
  }
  s = Math.max(0.1, s);
  const days = g === 1 ? 1 : intervalDays(s);
  return {
    s,
    d,
    last: now,
    due: now + days * DAY,
    reps: (card?.reps ?? 0) + 1,
    lapses: (card?.lapses ?? 0) + (g === 1 && card ? 1 : 0),
  };
}

/** What each grade would do, for showing on the buttons. */
export function preview(card: CardState | null, now = Date.now()): Record<Grade, number> {
  const out = {} as Record<Grade, number>;
  for (const g of [1, 2, 3, 4] as Grade[]) out[g] = Math.round((review(card, g, now).due - now) / DAY);
  return out;
}
