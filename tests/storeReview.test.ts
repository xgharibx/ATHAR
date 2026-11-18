// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ platform: "ios", request: vi.fn(async () => ({ requested: true })) }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.platform !== "web", getPlatform: () => native.platform },
  registerPlugin: () => ({ request: native.request }),
}));

import { useNoorStore } from "@/store/noorStore";
import {
  REVIEW_MIN_GAP_MS,
  noteCelebration,
  resetStoreReviewSessionForTest,
  shouldAskForReview,
} from "@/lib/storeReview";

const activeDays = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`2026-10-${String(i + 1).padStart(2, "0")}`, 3]));

describe("store rating prompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    native.platform = "ios";
    native.request.mockClear();
    resetStoreReviewSessionForTest();
    useNoorStore.setState({ activity: activeDays(6) });
  });
  afterEach(() => vi.useRealTimers());

  it("asks only regular users, rarely, and never twice in a session", () => {
    const now = Date.now();
    const fresh = { attempts: 0, lastAt: 0 };
    expect(shouldAskForReview({ activeDays: 4, state: fresh, now, askedThisSession: false })).toBe(false);
    expect(shouldAskForReview({ activeDays: 5, state: fresh, now, askedThisSession: false })).toBe(true);
    expect(shouldAskForReview({ activeDays: 9, state: fresh, now, askedThisSession: true })).toBe(false);
    expect(shouldAskForReview({ activeDays: 9, state: { attempts: 1, lastAt: now - REVIEW_MIN_GAP_MS + 1000 }, now, askedThisSession: false })).toBe(false);
    expect(shouldAskForReview({ activeDays: 9, state: { attempts: 1, lastAt: now - REVIEW_MIN_GAP_MS }, now, askedThisSession: false })).toBe(true);
    expect(shouldAskForReview({ activeDays: 9, state: { attempts: 3, lastAt: 0 }, now, askedThisSession: false })).toBe(false);
  });

  it("asks after a celebration has landed, then records it", async () => {
    noteCelebration();
    expect(native.request).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2600);
    expect(native.request).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem("athar_review_prompt_v1")!)).toMatchObject({ attempts: 1 });
    noteCelebration();
    await vi.advanceTimersByTimeAsync(2600);
    expect(native.request).toHaveBeenCalledOnce();
  });

  it("does not ask new users or on the web", async () => {
    useNoorStore.setState({ activity: activeDays(2) });
    noteCelebration();
    await vi.advanceTimersByTimeAsync(2600);
    expect(native.request).not.toHaveBeenCalled();

    resetStoreReviewSessionForTest();
    useNoorStore.setState({ activity: activeDays(10) });
    native.platform = "web";
    noteCelebration();
    await vi.advanceTimersByTimeAsync(2600);
    expect(native.request).not.toHaveBeenCalled();
  });
});
