import fs from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error — a plain .mjs build script without types.
import { buildCatalog } from "../tools/scripts/generate-car-catalog.mjs";
import { QURAN_RECITERS } from "@/lib/quranReciters";
import { QURAN_RADIO_STATIONS } from "@/lib/radioPlayer";

const catalog = JSON.parse(fs.readFileSync("android/app/src/main/assets/car_catalog.json", "utf8"));

describe("Android Auto: Athar's Quran in the car", () => {
  it("shows exactly the app's reciters, radio stations and surahs", () => {
    expect(catalog).toEqual(buildCatalog());
    expect(catalog.reciters.map((r: { id: string }) => r.id)).toEqual(QURAN_RECITERS.map((r) => r.id));
    expect(catalog.radios.map((r: { url: string }) => r.url)).toEqual(QURAN_RADIO_STATIONS.map((s) => s.url));
    expect(catalog.surahs).toHaveLength(114);
    expect(catalog.surahs[0]).toEqual({ name: "الفاتحة", ayahs: 7 });
    expect(catalog.surahs[1].ayahs).toBe(286);
  });


  it("is a media library the car can browse", () => {
    expect(fs.readFileSync("android/app/src/main/java/com/athar/adhkar/RecitationService.java", "utf8"))
      .toContain("public class RecitationService extends MediaLibraryService");
    const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    expect(manifest).toContain('<action android:name="androidx.media3.session.MediaLibraryService" />');
    expect(manifest).toContain('<action android:name="android.media.browse.MediaBrowserService" />');
    expect(manifest).toContain('android:name="com.google.android.gms.car.application"');
    expect(fs.readFileSync("android/app/src/main/res/xml/automotive_app_desc.xml", "utf8")).toContain('<uses name="media" />');
  });

  it("answers voice search: «play Surat Al-Kahf on Athar»", () => {
    const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    expect(manifest).toContain('<action android:name="android.media.action.MEDIA_PLAY_FROM_SEARCH" />');
    const library = fs.readFileSync("android/app/src/main/java/com/athar/adhkar/CarLibrary.java", "utf8");
    expect(library).toContain("onSearch(");
    expect(library).toContain("onGetSearchResult(");
    expect(library).toContain("item.requestMetadata.searchQuery");
  });
});
