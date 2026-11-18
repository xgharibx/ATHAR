import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPrayerActivityRequest, RAMADAN_HEADLINE } from "@/lib/prayerLiveActivity";

const TIMES = { Fajr: "04:30", Sunrise: "06:00", Dhuhr: "12:00", Asr: "15:20", Maghrib: "18:05", Isha: "19:30" };
const days = [
  { dateISO: "2027-02-20", timings: TIMES },
  { dateISO: "2027-02-21", timings: TIMES },
];
const always = () => true;

describe("Ramadan: the countdown is to iftar and the end of suhoor", () => {
  it("counts down to iftar through the fasting day", () => {
    const request = buildPrayerActivityRequest(new Date(2027, 1, 20, 13, 0), days, { isRamadanDay: always });
    expect(request).toMatchObject({
      prayerKey: "Maghrib",
      nameAr: "الإفطار",
      headline: RAMADAN_HEADLINE,
      eventLabel: "أذان المغرب",
      followingNameAr: "الإمساك",
    });
    // The bar runs from the end of suhoor, not from Dhuhr or Asr.
    expect(request!.startAt).toBe(new Date(2027, 1, 20, 4, 30).getTime());
  });

  it("after iftar, counts down to the end of suhoor", () => {
    const request = buildPrayerActivityRequest(new Date(2027, 1, 20, 22, 0), days, { isRamadanDay: always });
    expect(request).toMatchObject({ prayerKey: "Fajr", nameAr: "الإمساك", eventLabel: "أذان الفجر" });
  });

  it("is the normal prayer countdown outside Ramadan or when turned off", () => {
    const request = buildPrayerActivityRequest(new Date(2027, 1, 20, 13, 0), days);
    expect(request).toMatchObject({ prayerKey: "Asr", nameAr: "العصر" });
    expect(request).not.toHaveProperty("headline");
    const notRamadan = buildPrayerActivityRequest(new Date(2027, 1, 20, 13, 0), days, { isRamadanDay: () => false });
    expect(notRamadan).toMatchObject({ prayerKey: "Asr" });
  });

  it("shows the Ramadan headline on both phones", () => {
    expect(fs.readFileSync("ios/App/Shared/PrayerActivityAttributes.swift", "utf8")).toContain("var headline: String?");
    expect(fs.readFileSync("ios/App/App/PrayerActivityPlugin.swift", "utf8")).toContain('headline: call.getString("headline")');
    expect(fs.readFileSync("android/app/src/main/java/com/athar/adhkar/PrayerActivityPlugin.java", "utf8")).toContain('call.getString("headline")');
    expect(fs.readFileSync("android/app/src/main/java/com/athar/adhkar/PrayerCountdownReceiver.java", "utf8")).toContain("EXTRA_HEADLINE");
  });
});
