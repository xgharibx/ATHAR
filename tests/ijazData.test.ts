// @vitest-environment jsdom
/**
 * Regression coverage for the Ijaz (Scientific Miracles) data layer.
 *
 * Directly guards against the class of bug found in the 2026-07-19 audit:
 * IjazJourney's `linkSlug` values had drifted out of sync with the real
 * slugs in miracles.ts, so 4 of 7 "read more" links silently fell back to
 * the generic list instead of the intended miracle. Nothing caught that
 * because the two files were never checked against each other.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { miracles, getMiracleBySlug } from "@/ijaz/data/miracles";
import { categories, getCategoryById } from "@/ijaz/data/categories";
import type { journeySteps as JourneySteps } from "@/ijaz/pages/IjazJourney";

// IjazJourney.tsx transitively imports ScrollAnimations.tsx, which registers
// a GSAP ScrollTrigger plugin at module-load time — that call needs
// `window.matchMedia`, which jsdom doesn't implement. A dynamic import
// (evaluated only once this stub is in place, unlike a static import which
// ES modules hoist above everything else in the file) sidesteps it without
// needing a global test-setup file this project doesn't otherwise use.
let journeySteps: typeof JourneySteps;
beforeAll(async () => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  ({ journeySteps } = await import("@/ijaz/pages/IjazJourney"));
});

describe("Ijaz miracles data", () => {
  it("has no duplicate slugs", () => {
    const slugs = miracles.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every miracle's category exists in the categories list", () => {
    const validIds = new Set(categories.map((c) => c.id));
    for (const m of miracles) {
      expect(validIds.has(m.category)).toBe(true);
    }
  });
});

describe("Ijaz categories data", () => {
  it("has exactly the 5 documented categories", () => {
    expect(categories.map((c) => c.id).sort()).toEqual(
      ["biological", "cosmological", "earth-sciences", "logical-philosophical", "prophecies"].sort(),
    );
  });

  it("miracleCount matches the real count of miracles in that category", () => {
    for (const c of categories) {
      const real = miracles.filter((m) => m.category === c.id).length;
      expect(c.miracleCount).toBe(real);
    }
  });

  it("getCategoryById resolves every declared category id", () => {
    for (const c of categories) {
      expect(getCategoryById(c.id)?.id).toBe(c.id);
    }
  });
});

describe("IjazJourney linkSlug integrity (regression guard)", () => {
  it("every journey step's linkSlug resolves to a real miracle", () => {
    const stepsWithLinks = journeySteps.filter((s) => s.linkSlug);
    expect(stepsWithLinks.length).toBeGreaterThan(0);
    for (const step of stepsWithLinks) {
      const found = getMiracleBySlug(step.linkSlug!);
      expect(found, `journey step ${step.id} ("${step.titleEn}") linkSlug "${step.linkSlug}" should resolve to a real miracle`).toBeDefined();
    }
  });
});
