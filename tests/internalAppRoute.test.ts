import { afterEach, describe, expect, it, vi } from "vitest";
import { getInternalAppRoute } from "../src/lib/internalAppRoute";

describe("internal app route validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps ordinary same-origin app paths, search parameters, and fragments", () => {
    expect(getInternalAppRoute("/quran?juz=2#ayah-18")).toBe("/quran?juz=2#ayah-18");
  });

  it("keeps rooted app paths on an ordinary web origin", () => {
    vi.stubGlobal("window", { location: { origin: "https://app.athar.example" } });

    expect(getInternalAppRoute("/settings?tab=privacy")).toBe("/settings?tab=privacy");
  });

  it("keeps internal paths when Capacitor uses its opaque custom-scheme origin", () => {
    vi.stubGlobal("window", { location: { origin: "capacitor://localhost" } });

    expect(getInternalAppRoute("/settings?tab=privacy#policy")).toBe("/settings?tab=privacy#policy");
  });

  it.each([
    "https://attacker.example/",
    "//attacker.example/",
    "/\\\\attacker.example/",
    "\\\\attacker.example/",
    "/quran\n//attacker.example/",
  ])("rejects unsafe or malformed destinations: %s", (route) => {
    expect(getInternalAppRoute(route)).toBeNull();
  });

  it("rejects non-string and empty destinations", () => {
    expect(getInternalAppRoute(undefined)).toBeNull();
    expect(getInternalAppRoute(null)).toBeNull();
    expect(getInternalAppRoute(12)).toBeNull();
    expect(getInternalAppRoute("")).toBeNull();
  });
});
