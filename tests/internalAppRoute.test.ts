import { describe, expect, it } from "vitest";
import { getInternalAppRoute } from "../src/lib/internalAppRoute";

describe("internal app route validation", () => {
  it("keeps ordinary same-origin app paths, search parameters, and fragments", () => {
    expect(getInternalAppRoute("/quran?juz=2#ayah-18")).toBe("/quran?juz=2#ayah-18");
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
