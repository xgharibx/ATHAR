// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { validateLeaderboardAlias } from "@/lib/leaderboard";

describe("validateLeaderboardAlias", () => {
  it("rejects empty input", () => {
    expect(validateLeaderboardAlias("").ok).toBe(false);
    expect(validateLeaderboardAlias("   ").ok).toBe(false);
    expect(validateLeaderboardAlias(undefined).ok).toBe(false);
    expect(validateLeaderboardAlias(null).ok).toBe(false);
  });

  it("rejects names under 3 characters", () => {
    const r = validateLeaderboardAlias("ab");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too-short");
  });

  it("accepts a normal Arabic or Latin name", () => {
    expect(validateLeaderboardAlias("محمد الخير").ok).toBe(true);
    expect(validateLeaderboardAlias("Ahmad_99").ok).toBe(true);
  });

  it("rejects names containing links", () => {
    expect(validateLeaderboardAlias("زوروا https://evil.example").ok).toBe(false);
    expect(validateLeaderboardAlias("visit www.example.com").ok).toBe(false);
  });

  it("rejects disallowed characters (emoji, symbols)", () => {
    const r = validateLeaderboardAlias("محمد🔥🔥");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("bad-chars");
  });

  it("rejects spammy repeated-character names", () => {
    const r = validateLeaderboardAlias("aaaaaaaaaa");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("spam");
  });

  it("rejects reserved / impersonation-prone names, case-insensitively", () => {
    for (const bad of ["admin", "Admin", "ADMINISTRATOR", "support", "moderator", "owner", "system", "athar", "أثر", "مشرف", "الدعم"]) {
      const r = validateLeaderboardAlias(bad);
      expect(r.ok, `"${bad}" should be rejected as reserved`).toBe(false);
      expect(r.reason).toBe("reserved");
    }
  });

  it("strips invisible characters and collapses whitespace before validating", () => {
    const withInvisible = "محمد​​ الخير";
    const r = validateLeaderboardAlias(withInvisible);
    expect(r.ok).toBe(true);
    expect(r.value).toBe("محمد الخير");
  });

  it("truncates to the max alias length instead of rejecting", () => {
    const long = "a".repeat(4) + " " + "b".repeat(100);
    const r = validateLeaderboardAlias(long);
    expect(r.value.length).toBeLessThanOrEqual(40);
  });
});
