import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  platform: "ios",
  sync: vi.fn(async () => ({ active: true })),
  end: vi.fn(async () => {}),
  status: vi.fn(async () => ({ enabled: true, active: false })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => native.platform, isNativePlatform: () => native.platform !== "web" },
  registerPlugin: () => ({ sync: native.sync, end: native.end, status: native.status }),
}));

import {
  LIVE_ACTIVITY_MAX_LEAD_MS,
  buildPrayerActivityRequest,
  prayerMoments,
  resetPrayerLiveActivityCache,
  syncPrayerLiveActivity,
} from "@/lib/prayerLiveActivity";

const today = {
  dateISO: "2026-11-17",
  timings: { Fajr: "04:52", Sunrise: "06:20", Dhuhr: "11:41", Asr: "14:38 (EET)", Maghrib: "16:59", Isha: "18:18" },
};
const tomorrow = {
  dateISO: "2026-11-18",
  timings: { Fajr: "04:53", Sunrise: "06:21", Dhuhr: "11:41", Asr: "14:38", Maghrib: "16:59", Isha: "18:18" },
};

const at = (dateISO: string, hhmm: string) => {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(y!, m! - 1, d!, h, min).getTime();
};

describe("next-prayer Live Activity", () => {
  it("lists the five prayers of each day in order, skipping sunrise", () => {
    const moments = prayerMoments([tomorrow, today]);
    expect(moments.map((m) => m.key)).toEqual([
      "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha",
      "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha",
    ]);
    expect(moments[2]!.at.getTime()).toBe(at(today.dateISO, "14:38"));
  });

  it("counts down from the previous prayer to the next, naming the one after", () => {
    const request = buildPrayerActivityRequest(new Date(at(today.dateISO, "13:00")), [today, tomorrow]);
    expect(request).toEqual({
      prayerKey: "Asr",
      nameAr: "العصر",
      at: at(today.dateISO, "14:38"),
      startAt: at(today.dateISO, "11:41"),
      followingNameAr: "المغرب",
      followingAt: at(today.dateISO, "16:59"),
    });
  });

  it("crosses midnight from Isha to tomorrow's Fajr", () => {
    const request = buildPrayerActivityRequest(new Date(at(today.dateISO, "22:00")), [today, tomorrow]);
    expect(request?.prayerKey).toBe("Fajr");
    expect(request?.at).toBe(at(tomorrow.dateISO, "04:53"));
    expect(request?.startAt).toBe(at(today.dateISO, "18:18"));
    expect(request?.followingNameAr).toBe("الظهر");
  });

  it("starts the countdown now when the previous prayer is unknown", () => {
    const now = new Date(at(today.dateISO, "02:00"));
    const request = buildPrayerActivityRequest(now, [today]);
    expect(request?.prayerKey).toBe("Fajr");
    expect(request?.startAt).toBe(now.getTime());
  });

  it("starts nothing when the next prayer is too far away to stay on screen", () => {
    const now = new Date(at(today.dateISO, "19:00"));
    expect(buildPrayerActivityRequest(now, [today])).toBeNull();
    const farDay = { dateISO: "2026-11-19", timings: { Fajr: "04:53" } };
    const request = buildPrayerActivityRequest(now, [today, farDay]);
    expect(request).toBeNull();
    expect(at(farDay.dateISO, "04:53") - now.getTime()).toBeGreaterThan(LIVE_ACTIVITY_MAX_LEAD_MS);
  });

  it("ignores missing days and unreadable times", () => {
    const broken = { dateISO: "2026-11-17", timings: { Fajr: "soon", Dhuhr: "", Asr: "14:38" } };
    expect(prayerMoments([broken, { dateISO: "bad", timings: today.timings }, { dateISO: "2026-11-18", timings: null }])
      .map((m) => m.key)).toEqual(["Asr"]);
  });

  describe("native bridge", () => {
    beforeEach(() => {
      native.platform = "ios";
      native.sync.mockClear();
      native.end.mockClear();
      resetPrayerLiveActivityCache();
    });

    it("sends each change once and ends the countdown when there is nothing to show", async () => {
      const request = buildPrayerActivityRequest(new Date(at(today.dateISO, "13:00")), [today, tomorrow]);
      await syncPrayerLiveActivity(request);
      await syncPrayerLiveActivity(request);
      expect(native.sync).toHaveBeenCalledTimes(1);
      await syncPrayerLiveActivity(null);
      expect(native.end).toHaveBeenCalledTimes(1);
    });

    it("retries after a failure", async () => {
      native.sync.mockRejectedValueOnce(new Error("not in the foreground"));
      const request = buildPrayerActivityRequest(new Date(at(today.dateISO, "13:00")), [today]);
      await syncPrayerLiveActivity(request);
      await syncPrayerLiveActivity(request);
      expect(native.sync).toHaveBeenCalledTimes(2);
    });

    it("drives the Android countdown the same way, and does nothing on the web", async () => {
      native.platform = "android";
      const request = buildPrayerActivityRequest(new Date(at(today.dateISO, "13:00")), [today, tomorrow]);
      await syncPrayerLiveActivity(request);
      expect(native.sync).toHaveBeenCalledWith(request);
      resetPrayerLiveActivityCache();
      native.platform = "web";
      native.sync.mockClear();
      await syncPrayerLiveActivity(request);
      await syncPrayerLiveActivity(null);
      expect(native.sync).not.toHaveBeenCalled();
      expect(native.end).not.toHaveBeenCalled();
    });
  });
});
