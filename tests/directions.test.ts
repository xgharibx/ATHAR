import { describe, expect, it } from "vitest";
import { directionsUrl, mapsAppLabel, webMapsUrl } from "@/lib/directions";

const mosque = { lat: 30.0444, lng: 31.2357, name: "مسجد الحسين" };

describe("directions in the phone's maps app", () => {
  it("opens Apple Maps on iPhone with the mosque as the destination", () => {
    expect(directionsUrl(mosque, "ios")).toBe(`https://maps.apple.com/?daddr=30.0444,31.2357&q=${encodeURIComponent("مسجد الحسين")}`);
    expect(mapsAppLabel("ios")).toBe("خرائط Apple");
  });

  it("uses a geo: link on Android so any maps app (Google, Waze, Petal) can answer", () => {
    expect(directionsUrl(mosque, "android")).toBe(`geo:0,0?q=30.0444,31.2357(${encodeURIComponent("مسجد الحسين")})`);
  });

  it("keeps Google Maps on the web, and for shared links", () => {
    expect(directionsUrl(mosque, "web")).toBe(webMapsUrl(mosque));
    expect(webMapsUrl(mosque)).toBe("https://www.google.com/maps/search/?api=1&query=30.0444,31.2357");
  });
});
