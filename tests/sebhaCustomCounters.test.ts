/**
 * Each dhikr counts for itself.
 *
 * Every custom dhikr and every quick phrase used to write into the single key
 * "custom": pick a different phrase and it showed the previous one's count,
 * and tapping any of them moved the same total. For a counting app that is
 * about as wrong as it gets — the number is the whole product.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { customCounterKey } from "@/pages/Sebha";
import { useNoorStore } from "@/store/noorStore";

describe("the counter key", () => {
  it("gives different phrases different keys", () => {
    expect(customCounterKey("سبحان الله")).not.toBe(customCounterKey("الحمد لله"));
  });

  it("gives the same phrase the same key, whitespace aside", () => {
    // The same dhikr typed with a stray space is the same dhikr, not a second
    // counter that silently starts at zero.
    expect(customCounterKey("سبحان  الله ")).toBe(customCounterKey("سبحان الله"));
  });

  it("never collides with a built-in key", () => {
    expect(customCounterKey("subhanallah")).not.toBe("subhanallah");
    expect(customCounterKey("سبحان الله").startsWith("custom:")).toBe(true);
  });

  it("falls back to the old key only when there is no phrase at all", () => {
    expect(customCounterKey("")).toBe("custom");
    expect(customCounterKey(null)).toBe("custom");
    expect(customCounterKey(undefined)).toBe("custom");
  });
});

describe("counting one phrase leaves the others alone", () => {
  beforeEach(() => {
    useNoorStore.setState({ quickTasbeeh: {}, tasbeehLifetime: {} });
  });

  it("keeps two custom adhkar on separate totals", () => {
    const a = customCounterKey("اللهم صل على محمد");
    const b = customCounterKey("أستغفر الله");

    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 7; i += 1) inc(a, 100);
    for (let i = 0; i < 3; i += 1) inc(b, 100);

    const counts = useNoorStore.getState().quickTasbeeh;
    expect(counts[a]).toBe(7);
    expect(counts[b]).toBe(3);
    // And nothing landed in the old shared bucket.
    expect(counts.custom ?? 0).toBe(0);
  });

  it("still feeds one combined daily total, which is what the board scores", () => {
    // Per-phrase counters must not fragment the leaderboard: the tasbeeh board
    // scores every tap made today, whatever was being counted.
    const before = useNoorStore.getState().tasbeehDayTotals ?? {};
    const beforeTotal = Object.values(before).reduce((s, v) => s + (v ?? 0), 0);

    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 4; i += 1) inc(customCounterKey("ذكر أول"), 100);
    for (let i = 0; i < 6; i += 1) inc(customCounterKey("ذكر ثانٍ"), 100);

    const after = useNoorStore.getState().tasbeehDayTotals ?? {};
    const afterTotal = Object.values(after).reduce((s, v) => s + (v ?? 0), 0);
    expect(afterTotal - beforeTotal).toBe(10);
  });
});
