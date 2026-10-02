import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manifest = readFileSync(resolve(root, "android/app/src/main/AndroidManifest.xml"), "utf8");
const compactProvider = readFileSync(
  resolve(root, "android/app/src/main/java/com/athar/adhkar/NoorCompactWidgetProvider.java"),
  "utf8",
);
const tasbeehProvider = readFileSync(
  resolve(root, "android/app/src/main/java/com/athar/adhkar/NoorTasbeehWidgetProvider.java"),
  "utf8",
);

function receiver(name: string) {
  const document = new JSDOM(manifest, { contentType: "text/xml" }).window.document;
  return [...document.getElementsByTagName("receiver")].find(
    (entry) => entry.getAttribute("android:name") === name,
  );
}

describe("Android widget action boundary", () => {
  it("keeps counter mutations behind a non-exported receiver", () => {
    const actionReceiver = receiver(".WidgetActionReceiver");

    expect(actionReceiver?.getAttribute("android:exported")).toBe("false");
    expect(actionReceiver?.getElementsByTagName("intent-filter").length).toBe(0);
    expect(compactProvider).toContain("new Intent(context, WidgetActionReceiver.class)");
    expect(tasbeehProvider.match(/new Intent\(context, WidgetActionReceiver\.class\)/g)).toHaveLength(3);
  });

  it("does not expose counter actions through exported widget providers", () => {
    for (const providerName of [".NoorCompactWidgetProvider", ".NoorTasbeehWidgetProvider"]) {
      const widgetProvider = receiver(providerName);
      const actions = [...(widgetProvider?.getElementsByTagName("action") ?? [])].map((action) =>
        action.getAttribute("android:name"),
      );

      expect(widgetProvider?.getAttribute("android:exported")).toBe("true");
      expect(actions).toEqual(["android.appwidget.action.APPWIDGET_UPDATE"]);
    }
  });
});
