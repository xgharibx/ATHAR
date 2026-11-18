// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Settings offers the Quran translation again", () => {
  it("shows the translation picker on the Quran settings page", () => {
    const file = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/settings/groups/QuranGroup.tsx"),
      "utf8",
    );
    expect(file).toContain("ترجمة القرآن");
    expect(file).toContain("<TranslationPicker");
    expect(file).toContain('id="translation"');
  });

  it("names the reminder switch and sound by what they control", () => {
    const file = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/settings/groups/RemindersGroup.tsx"),
      "utf8",
    );
    expect(file).toContain('title="التذكيرات اليومية"');
    expect(file).toContain("صوت التذكير");
    expect(file).toContain("تنبيهات الأذان مستقلة عن هذه التذكيرات");
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
