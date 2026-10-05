// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { DhikrCard } from "@/components/dhikr/DhikrCard";
import { useNoorStore } from "@/store/noorStore";

describe("DhikrCard virtue and source placement", () => {
  beforeEach(() => {
    useNoorStore.setState((state) => ({
      ...state,
      prefs: { ...state.prefs, showBenefits: true },
    }));
  });

  it("shows a documented virtue below the dhikr text", () => {
    const html = renderToStaticMarkup(
      React.createElement(DhikrCard, {
        sectionId: "morning",
        index: 0,
        item: {
          text: "نص الذكر الطويل",
          benefit: "فضل الذكر من الحديث الصحيح",
          source: "رواه مسلم",
          source_label: "",
          source_url: "",
          count: 1,
          count_description: "",
          minimal: false,
        },
      }),
    );

    expect(html.indexOf("فضل الذكر من الحديث الصحيح")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("فضل الذكر من الحديث الصحيح")).toBeGreaterThan(html.indexOf("نص الذكر الطويل"));
  });
});
