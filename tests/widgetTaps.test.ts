import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const java = (name: string) => read(`android/app/src/main/java/com/athar/adhkar/${name}.java`);

describe("tapping the Android widgets", () => {
  it("opens a closed app straight on the widget's page, with no home screen first", () => {
    const activity = java("AtharActivity");
    expect(activity).toContain('addJavascriptInterface(new LaunchRoute(launchRoute), "AtharLaunch")');
    expect(activity).toContain("protected void load()");
    expect(activity.indexOf("addJavascriptInterface")).toBeLessThan(activity.indexOf("super.load()"));
    const main = read("src/main.tsx");
    expect(main).toContain("AtharLaunch?.take()");
    // Read before the router is created.
    expect(main.indexOf("AtharLaunch?.take()")).toBeLessThan(main.indexOf("<BrowserRouter"));
  });

  it("opens the adhkar of the moment: morning until Asr, evening after", () => {
    expect(java("NoorAdhkarWidgetProvider")).toContain("WidgetRoutes.ADHKAR_NOW");
    const routes = java("WidgetRoutes");
    expect(routes).toContain('"/c/evening" : "/c/morning"');
    expect(routes).toContain("minutes >= asr || minutes < fajr");
    expect(java("AtharActivity")).toContain("WidgetRoutes.resolve(this, route)");
  });

  it("opens each part of the dashboard on its own screen, and the wird on the Mushaf page last read", () => {
    const dashboard = java("NoorDashboardWidgetProvider");
    for (const route of ['"/prayer-times"', '"/c/morning"', '"/c/evening"', '"/mushaf"']) expect(dashboard).toContain(route);
    expect(java("NoorWirdWidgetProvider")).toContain('openApp(context, appWidgetId * 21, "/mushaf")');
  });
});
