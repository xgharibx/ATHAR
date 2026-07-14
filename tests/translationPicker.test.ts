// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { TranslationPicker } from "@/components/quran/TranslationPicker";
import { TRANSLATION_SOURCES } from "@/lib/quranTranslations";

describe("TranslationPicker", () => {
  it("renders the master toggle and the three documented source labels", () => {
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
    expect(html).toContain("الأجرومية");
    expect(html).toContain("الألبيرية");
    expect(html).toContain("الأرضية");
  });

  it("renders one radio per TRANSLATION_SOURCES entry", () => {
    const html = renderToString(
      React.createElement(TranslationPicker, {
        enabled: true,
        value: "yusuf_ali",
        onEnabledChange: () => {},
        onChange: () => {},
      }),
    );

    const radioCount = (html.match(/role="radio"/g) ?? []).length;
    expect(radioCount).toBe(TRANSLATION_SOURCES.length);
  });

  it("hides the source pills when the master toggle is off", () => {
    const html = renderToString(
      React.createElement(TranslationPicker, {
        enabled: false,
        value: "saheeh",
        onEnabledChange: () => {},
        onChange: () => {},
      }),
    );

    // Still shows the heading label.
    expect(html).toContain("الترجمة أسفل الآية");
    // But no radiogroup items in the markup when disabled.
    expect((html.match(/role="radio"/g) ?? []).length).toBe(0);
  });
});
