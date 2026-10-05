// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { DhikrCard } from "@/components/dhikr/DhikrCard";
import { useNoorStore } from "@/store/noorStore";

describe("DhikrCard virtue and source placement", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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

  it("keeps the collapsed action menu from adding vertical space above the dhikr", () => {
    const html = renderToStaticMarkup(
      React.createElement(DhikrCard, {
        sectionId: "morning",
        index: 0,
        item: {
          text: "نص الذكر",
          benefit: "فضل الذكر",
          source: "رواه مسلم",
          source_label: "",
          source_url: "",
          count: 1,
          count_description: "",
          minimal: false,
        },
      }),
    );

    expect(html).toContain('aria-hidden="true"><div class="flex flex-nowrap items-center gap-1 pr-1">');
  });

  it("keeps the action menu on one row while it opens", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(DhikrCard, {
          sectionId: "morning",
          index: 0,
          item: {
            text: "نص الذكر",
            benefit: "فضل الذكر",
            source: "رواه مسلم",
            source_label: "",
            source_url: "",
            count: 1,
            count_description: "",
            minimal: false,
          },
        }),
      );
    });

    const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="إظهار الأدوات"]');
    expect(toggle).not.toBeNull();

    await act(async () => {
      toggle?.click();
    });

    const actionRow = container.querySelector('[aria-hidden="false"] > div');
    expect(actionRow?.className).toContain("flex-nowrap");
    expect(container.querySelector<HTMLElement>('[aria-hidden="false"]')?.style.overflowX).toBe("auto");
    expect(toggle?.parentElement?.parentElement?.className).toContain("flex-nowrap");

    await act(async () => root.unmount());
  });
});
