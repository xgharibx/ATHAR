// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { addDays, localTodayISO } from "@/lib/qadaa";

const store = () => useNoorStore.getState();

beforeEach(() => {
  useNoorStore.setState({
    khatmaStartISO: null,
    khatmaDays: null,
    khatmaScheduleVersion: null,
    khatmaDone: {},
  });
});

describe("Khatma plan persistence and logging", () => {
  it("marks newly created plans with the balanced schedule version", () => {
    store().setKhatmaPlan({ startISO: "2026-01-01", days: 30 });

    expect(store().khatmaScheduleVersion).toBe(2);
    expect(store().exportState().khatmaScheduleVersion).toBe(2);
  });

  it("does not rewrite legacy plans when their progress is logged", () => {
    useNoorStore.setState({
      khatmaStartISO: "2026-01-01",
      khatmaDays: 3,
      khatmaDone: {},
    });

    store().setKhatmaDone("2026-01-02", true);

    expect(store().khatmaScheduleVersion).toBeNull();
    expect(store().khatmaDone["2026-01-02"]).toBe(true);
  });

  it("rejects completion logs outside the planned dates", () => {
    store().setKhatmaPlan({ startISO: "2026-01-01", days: 2 });

    store().setKhatmaDone("2026-01-03", true);
    expect(store().khatmaDone).toEqual({});

    store().setKhatmaDone("2026-01-02", true);
    expect(store().khatmaDone).toEqual({ "2026-01-02": true });
  });

  it("does not let a scheduled plan log today before its start date", () => {
    const today = localTodayISO();
    store().setKhatmaPlan({ startISO: addDays(today, 1), days: 30 });

    store().setKhatmaDone(today, true);

    expect(store().khatmaDone).toEqual({});
  });
});
