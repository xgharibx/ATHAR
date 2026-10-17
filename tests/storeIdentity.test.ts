/**
 * Which store a user is told to update from.
 *
 * Athar ships to Google Play and Huawei AppGallery from one codebase. A Huawei
 * phone has no Play Store, so the one way this goes wrong is a Huawei user being
 * sent to Play — a link with nothing behind it, forwarded onward to everyone
 * they share with. These pin the routing.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const platform = { current: "android" };
const storeReply = { current: "huawei" as string | Error };

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => platform.current,
    isNativePlatform: () => platform.current !== "web",
  },
  registerPlugin: () => ({
    get: async () => {
      if (storeReply.current instanceof Error) throw storeReply.current;
      return { store: storeReply.current };
    },
    open: async () => undefined,
  }),
}));

let mod: typeof import("@/lib/storeIdentity");

beforeEach(async () => {
  vi.resetModules();
  platform.current = "android";
  storeReply.current = "huawei";
  mod = await import("@/lib/storeIdentity");
});

describe("which store this install came from", () => {
  it("reports Huawei when the build says so", async () => {
    expect(await mod.loadStoreIdentity()).toBe("huawei");
    expect(mod.currentStore()).toBe("huawei");
  });

  it("reports Play for a normal Android build", async () => {
    storeReply.current = "play";
    expect(await mod.loadStoreIdentity()).toBe("play");
  });

  it("treats a build without the plugin as a Play build", async () => {
    // Every build before this existed was a Play build.
    storeReply.current = new Error("not implemented");
    expect(await mod.loadStoreIdentity()).toBe("play");
  });

  it("never asks a phone's native layer on iOS or the web", async () => {
    platform.current = "ios";
    expect(await mod.loadStoreIdentity()).toBe("ios");
    vi.resetModules();
    platform.current = "web";
    const fresh = await import("@/lib/storeIdentity");
    expect(await fresh.loadStoreIdentity()).toBe("web");
  });

  it("assumes Play for Android until the native side has answered", () => {
    expect(mod.currentStore()).toBe("play");
  });
});

describe("where each store sends people", () => {
  it("sends Play users to Play", () => {
    expect(mod.storeListingUrl("play")).toContain("play.google.com");
  });

  it("never sends a Huawei user to Play", () => {
    expect(mod.storeListingUrl("huawei")).not.toContain("play.google.com");
  });

  it("falls back to the website until the AppGallery id is known", () => {
    // A working page beats a store link with no listing behind it.
    expect(mod.HUAWEI_APPGALLERY_APP_ID).toBe("");
    expect(mod.storeListingUrl("huawei")).toBe(mod.WEB_URL);
  });

  it("sends iOS and the web to the website", () => {
    expect(mod.storeListingUrl("ios")).toBe(mod.WEB_URL);
    expect(mod.storeListingUrl("web")).toBe(mod.WEB_URL);
  });

  it("recognises every link it might have appended, so none is added twice", () => {
    const links = mod.allKnownStoreLinks();
    expect(links).toContain(mod.PLAY_LISTING_URL);
    expect(links).toContain(mod.WEB_URL);
  });
});
