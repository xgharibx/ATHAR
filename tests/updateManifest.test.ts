/**
 * Which version each platform is told about.
 *
 * The prompt sends people to a store. If it names a version the store does not
 * have yet, they arrive to find nothing, and the next prompt is one they
 * ignore — so the rule that matters is not "notice new versions" but "never
 * claim one that cannot be installed".
 */
import { describe, expect, it } from "vitest";
import { availableVersionFor } from "@/hooks/useUpdateAvailable";
import { extractPlayVersion, isNewer as scraperIsNewer } from "../tools/scripts/sync-store-version.mjs";

const manifest = {
  version: "1.2.57",   // the web build — deployed, therefore installable
  android: "1.2.54",   // what Play is serving
  ios: null,           // nothing published yet
};

describe("which version a platform is offered", () => {
  it("gives a phone the store's version, not the web build", () => {
    // The whole point: 1.2.57 is on the site, but Play still has 1.2.54, so an
    // Android user must never be told about 1.2.57.
    expect(availableVersionFor(manifest, "android")).toBe("1.2.54");
  });

  it("gives the web the deployed build, because deploying IS releasing there", () => {
    expect(availableVersionFor(manifest, "web")).toBe("1.2.57");
  });

  it("says nothing for a platform with nothing published", () => {
    expect(availableVersionFor(manifest, "ios")).toBeNull();
  });

  it("says nothing rather than guessing, on junk or absence", () => {
    expect(availableVersionFor(null, "android")).toBeNull();
    expect(availableVersionFor(undefined, "android")).toBeNull();
    expect(availableVersionFor({}, "android")).toBeNull();
    expect(availableVersionFor({ android: 42 } as never, "android")).toBeNull();
    expect(availableVersionFor({ android: "   " }, "android")).toBeNull();
  });

  it("does not fall back to the web build when the store value is missing", () => {
    // Falling back would be the bug: it would send phone users to a listing
    // that has not caught up.
    expect(availableVersionFor({ version: "1.2.57" }, "android")).toBeNull();
    expect(availableVersionFor({ version: "1.2.57" }, "ios")).toBeNull();
  });
});

describe("reading the version off the Play listing", () => {
  it("finds the version in the page's data blob", () => {
    const html = 'collection"]]],1],null,null,null,[[["1.2.54"]],[[[36]],[[[22,"x"]]],"1.2.32",null';
    // The page carries other version-shaped strings; the bracket shape is what
    // distinguishes the real one.
    expect(extractPlayVersion(html)).toBe("1.2.54");
  });

  it("returns nothing when the markup changes, rather than a wrong number", () => {
    expect(extractPlayVersion("<html>no data blob here 1.2.99</html>")).toBeNull();
    expect(extractPlayVersion("")).toBeNull();
    expect(extractPlayVersion(null)).toBeNull();
  });

  it("compares versions numerically", () => {
    expect(scraperIsNewer("1.2.10", "1.2.9")).toBe(true);
    expect(scraperIsNewer("1.2.9", "1.2.10")).toBe(false);
    expect(scraperIsNewer("1.2.54", "1.2.54")).toBe(false);
  });
});
