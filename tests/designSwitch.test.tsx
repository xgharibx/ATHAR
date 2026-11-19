// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { DesignSwitch } from "@/components/layout/DesignSwitch";
import { useNoorStore } from "@/store/noorStore";
import { resolveUfuqPalette } from "@/lib/design";
import { durationLabel, phaseTargetLabel } from "@/components/ufuq/ufuqTime";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("the design switch", () => {
  it("names where it takes you and switches with one tap", async () => {
    useNoorStore.getState().setPrefs({ designMode: "classic" });
    const box = document.createElement("div");
    document.body.appendChild(box);
    const root = createRoot(box);
    await act(async () => root.render(<DesignSwitch />));
    const sw = box.querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(sw.textContent).toContain("أفق");
    // Without View Transitions (as here) the change fades in after a moment.
    const tap = async () => act(async () => {
      sw.click();
      await new Promise((r) => setTimeout(r, 320));
    });
    await tap();
    expect(useNoorStore.getState().prefs.designMode).toBe("ufuq");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(sw.textContent).toContain("كلاسيكي");
    await tap();
    expect(useNoorStore.getState().prefs.designMode).toBe("classic");
    await act(async () => root.unmount());
    box.remove();
  });

  it("sits in the middle of both top bars", () => {
    expect(read("src/components/layout/AppShell.tsx")).toContain("<DesignSwitch />");
    expect(read("src/components/ufuq/UfuqShell.tsx")).toContain("<DesignSwitch />");
  });

  it("opens «أفق» at night when no palette was ever chosen", () => {
    expect(resolveUfuqPalette(undefined, false)).toBe("night");
  });
});

describe("the classic design's logo", () => {
  it("is Athar's real mark, not a drawing", () => {
    const shell = read("src/components/layout/AppShell.tsx");
    expect(shell).toContain("<AtharLogo");
    expect(shell).not.toContain("LogoMark");
    expect(read("src/components/brand/AtharLogo.tsx")).toContain("brand/athar-print.png");
  });
});

describe("the sky's countdowns", () => {
  it("says what a moment between prayers is", () => {
    expect(phaseTargetLabel("tahajjud", "التهجد")).toBe("التهجد");
    expect(phaseTargetLabel("duha", "الضحى")).toBe("الضحى");
    expect(phaseTargetLabel("forbidden-sunrise", "بعد الفجر")).toBe("الشروق");
    expect(durationLabel(56 * 60)).toBe("٥٦ دقيقة");
    expect(read("src/components/ufuq/UfuqHome.tsx")).toContain("حتى {phaseTargetLabel(moment.id, moment.label)}");
  });
});
