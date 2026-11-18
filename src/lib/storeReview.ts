/**
 * Ask for a store rating at a good moment, the way the stores intend.
 *
 * The App Store and Google Play each show their own rating sheet and limit how
 * often it may appear (iOS: three times a year). Both ask apps not to prompt at
 * random or behind a "do you like the app?" question. So Athar asks only:
 *   - right after something worth celebrating (a finished dhikr section, the
 *     tasbeeh goal, a completed surah or khatma: everything that goes through
 *     celebrate()),
 *   - in the store apps, not the web (and not on Huawei, which has no Play Store),
 *   - from someone who has used Athar on at least five days,
 *   - at most once every four months, three times in all, once per session.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

const STATE_KEY = "athar_review_prompt_v1";
export const REVIEW_MIN_ACTIVE_DAYS = 5;
export const REVIEW_MIN_GAP_MS = 120 * 24 * 60 * 60 * 1000;
export const REVIEW_MAX_ATTEMPTS = 3;
/** Let the celebration land before the sheet slides up. */
const DELAY_AFTER_CELEBRATION_MS = 2500;

type ReviewState = { attempts: number; lastAt: number };

function readState(): ReviewState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null") as Partial<ReviewState> | null;
    return {
      attempts: Number.isFinite(parsed?.attempts) ? Number(parsed!.attempts) : 0,
      lastAt: Number.isFinite(parsed?.lastAt) ? Number(parsed!.lastAt) : 0,
    };
  } catch {
    return { attempts: 0, lastAt: 0 };
  }
}

function writeState(state: ReviewState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Without storage the session limit still applies.
  }
}

/** Whether this moment qualifies, given how the app has been used. */
export function shouldAskForReview(options: {
  activeDays: number;
  state: ReviewState;
  now: number;
  askedThisSession: boolean;
}): boolean {
  if (options.askedThisSession) return false;
  if (options.activeDays < REVIEW_MIN_ACTIVE_DAYS) return false;
  if (options.state.attempts >= REVIEW_MAX_ATTEMPTS) return false;
  return options.now - options.state.lastAt >= REVIEW_MIN_GAP_MS;
}

type StoreReviewPlugin = { request(): Promise<{ requested: boolean }> };
let plugin: StoreReviewPlugin | null = null;
let askedThisSession = false;
let pending: ReturnType<typeof setTimeout> | null = null;

async function countActiveDays(): Promise<number> {
  const { useNoorStore } = await import("@/store/noorStore");
  const activity = useNoorStore.getState().activity ?? {};
  return Object.values(activity).filter((count) => (Number(count) || 0) > 0).length;
}

/** Called after a celebration; asks for a rating if the moment qualifies. */
export function noteCelebration(): void {
  if (!Capacitor.isNativePlatform() || askedThisSession || pending) return;
  pending = setTimeout(() => {
    pending = null;
    void (async () => {
      const state = readState();
      const now = Date.now();
      if (!shouldAskForReview({ activeDays: await countActiveDays(), state, now, askedThisSession })) return;
      askedThisSession = true;
      plugin ??= registerPlugin<StoreReviewPlugin>("StoreReview");
      try {
        const { requested } = await plugin.request();
        if (requested) writeState({ attempts: state.attempts + 1, lastAt: now });
      } catch {
        // An app build without the plugin.
      }
    })();
  }, DELAY_AFTER_CELEBRATION_MS);
}

export function resetStoreReviewSessionForTest(): void {
  askedThisSession = false;
  if (pending) clearTimeout(pending);
  pending = null;
}
