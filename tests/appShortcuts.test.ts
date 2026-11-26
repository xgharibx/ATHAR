import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(file, "utf8");
const androidShortcuts = read("android/app/src/main/res/xml/shortcuts.xml");
const infoPlist = read("ios/App/App/Info.plist");
const appRoutes = read("src/App.tsx");

const androidRoutes = [...androidShortcuts.matchAll(/android:name="athar_route" android:value="([^"]+)"/g)].map((m) => m[1]);
const iosRoutes = [...infoPlist.matchAll(/<key>route<\/key>\s*<string>([^<]+)<\/string>/g)].map((m) => m[1]);

describe("app-icon shortcuts", () => {
  it("offers the same four screens on Android and iPhone", () => {
    expect(androidRoutes).toEqual(["/prayer-times", "/qibla", "/sebha", "/quran/page"]);
    expect(iosRoutes).toEqual(androidRoutes);
  });

  it("only opens routes the app has", () => {
    for (const route of androidRoutes) {
      const segment = route.slice(1);
      expect(appRoutes).toMatch(new RegExp(`path="${segment}(/:[a-z]+\\??)?"`));
    }
  });

  it("uses the extra MainActivity reads, and is registered on the launcher activity", () => {
    const provider = read("android/app/src/main/java/com/athar/adhkar/AtharWidgetProvider.java");
    expect(provider).toContain('EXTRA_ROUTE = "athar_route"');
    expect(read("android/app/src/main/AndroidManifest.xml")).toContain('android:resource="@xml/shortcuts"');
  });

  it("has an icon and labels in English and Arabic for each shortcut", () => {
    const english = read("android/app/src/main/res/values/strings.xml");
    const arabic = read("android/app/src/main/res/values-ar/strings.xml");
    for (const icon of androidShortcuts.matchAll(/@drawable\/(ic_shortcut_\w+)/g)) {
      expect(fs.existsSync(`android/app/src/main/res/drawable/${icon[1]}.xml`)).toBe(true);
      expect(fs.existsSync(`android/app/src/main/res/drawable-anydpi-v26/${icon[1]}.xml`)).toBe(true);
    }
    for (const label of androidShortcuts.matchAll(/@string\/(shortcut_\w+)/g)) {
      expect(english).toContain(`name="${label[1]}"`);
      expect(arabic).toContain(`name="${label[1]}"`);
    }
    const iosArabic = read("ios/App/App/ar.lproj/InfoPlist.strings");
    for (const title of infoPlist.matchAll(/<key>UIApplicationShortcutItemTitle<\/key>\s*<string>([^<]+)<\/string>/g)) {
      expect(iosArabic).toContain(`"${title[1]}" =`);
    }
  });
});
