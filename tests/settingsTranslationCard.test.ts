// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Settings page exposes the new translation card", () => {
  it("Settings.tsx contains the new translation card title", () => {
    // We can't render the full page easily without a testing-library; instead
    // we assert the source file contains the card the user sees.
    const file = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/Settings.tsx"),
      "utf8",
    );
    expect(file).toContain("ترجمة القرآن");
    expect(file).toContain("<TranslationSettingsCard />");
    expect(file).toContain("id=\"settings-translation\"");
  });

  it("TranslationPicker renders the master switch and the three sources", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { TranslationPicker } = await import("@/components/quran/TranslationPicker");

    const html = renderToString(
      React.createElement(TranslationPicker, {
        enabled: true,
        value: "saheeh",
        onEnabledChange: () => {},
        onChange: () => {},
      }),
    );

    expect(html).toContain("الترجمة أسفل الآية");
    expect(html).toContain("Saheeh International");
    expect(html).toContain("Yusuf Ali");
    expect(html).toContain("Jalandhry");
    // Each source is a radiogroup item with role="radio"
    expect((html.match(/role="radio"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
