/**
 * Version comparison for the "a new version is out" pill.
 *
 * The pill is the only thing in the app that asks the user to go somewhere
 * else, so it has to be right: telling someone to update when they are already
 * current is the fastest way to make them stop believing it.
 */
import { describe, expect, it } from "vitest";
import { isNewer } from "@/hooks/useUpdateAvailable";

describe("isNewer", () => {
  it("sees a newer patch, minor and major", () => {
    expect(isNewer("1.2.53", "1.2.52")).toBe(true);
    expect(isNewer("1.3.0", "1.2.99")).toBe(true);
    expect(isNewer("2.0.0", "1.9.9")).toBe(true);
  });

  it("says nothing when current or ahead", () => {
    expect(isNewer("1.2.52", "1.2.52")).toBe(false);
    expect(isNewer("1.2.51", "1.2.52")).toBe(false);
    // A dev build ahead of the store must not be told to downgrade.
    expect(isNewer("1.2.52", "1.3.0")).toBe(false);
  });

  it("compares numerically, not as text", () => {
    // The bug this guards: "1.2.9" > "1.2.10" as strings.
    expect(isNewer("1.2.10", "1.2.9")).toBe(true);
    expect(isNewer("1.2.9", "1.2.10")).toBe(false);
  });

  it("treats missing segments as zero", () => {
    expect(isNewer("1.3", "1.2.9")).toBe(true);
    expect(isNewer("1.2", "1.2.0")).toBe(false);
  });

  it("never claims an update from junk", () => {
    expect(isNewer("", "1.2.52")).toBe(false);
    expect(isNewer("not-a-version", "1.2.52")).toBe(false);
  });
});
