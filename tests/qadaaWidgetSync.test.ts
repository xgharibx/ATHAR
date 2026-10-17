import { describe, expect, it } from "vitest";
import { diffLedger } from "@/lib/qadaaWidgetSync";

describe("diffLedger", () => {
  it("reports the net of plus and minus taps since the last read", () => {
    const { net, next } = diffLedger({ "p:fajr": { i: 3, d: 1 }, "p:asr": { i: 1 } }, {});
    expect(net).toEqual({ "p:fajr": 2, "p:asr": 1 });
    expect(next["p:fajr"]).toEqual({ i: 3, d: 1 });
  });

  it("does not count the same taps twice", () => {
    const first = diffLedger({ "p:fajr": { i: 2, d: 0 } }, {});
    const second = diffLedger({ "p:fajr": { i: 2, d: 0 } }, first.next);
    expect(second.net).toEqual({});
  });

  it("only applies what is new on a later read", () => {
    const first = diffLedger({ "p:fajr": { i: 2, d: 0 } }, {});
    const second = diffLedger({ "p:fajr": { i: 5, d: 1 } }, first.next);
    expect(second.net).toEqual({ "p:fajr": 2 });
  });

  it("keeps the high-water mark if the widget's counters go backwards", () => {
    const first = diffLedger({ "p:fajr": { i: 4, d: 0 } }, {});
    const reset = diffLedger({ "p:fajr": { i: 1, d: 0 } }, first.next);
    expect(reset.net).toEqual({});
    expect(reset.next["p:fajr"]).toEqual({ i: 4, d: 0 });
  });

  it("ignores keys that are not prayers and junk values", () => {
    const { net } = diffLedger(
      { "f:1447": { i: 9 }, "p:bogus": { i: 9 }, "p:isha": { i: -3, d: "x" } },
      {},
    );
    expect(net).toEqual({});
  });
});
