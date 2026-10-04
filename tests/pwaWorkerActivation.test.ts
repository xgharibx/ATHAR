import { afterEach, describe, expect, it, vi } from "vitest";

// Network/cache routing is outside the activation policy under test. Keep the
// real worker's event handlers while replacing its browser-specific routing.
vi.mock("workbox-precaching", () => ({
  precacheAndRoute: () => {}, cleanupOutdatedCaches: () => {}, matchPrecache: () => {},
}));
vi.mock("workbox-routing", () => ({
  registerRoute: () => {}, setCatchHandler: () => {}, NavigationRoute: class {},
}));
vi.mock("workbox-strategies", () => ({
  NetworkFirst: class {}, NetworkOnly: class {}, CacheFirst: class {}, StaleWhileRevalidate: class {},
}));
vi.mock("workbox-expiration", () => ({ ExpirationPlugin: class {} }));
vi.mock("workbox-cacheable-response", () => ({ CacheableResponsePlugin: class {} }));

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("PWA worker activation policy", () => {
  it("stays waiting until an explicit SKIP_WAITING message and ignores unrelated messages", async () => {
    const worker = Object.assign(new EventTarget(), {
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      location: new URL("https://www.athark.org/sw.js"),
      __WB_MANIFEST: [],
    });
    vi.stubGlobal("self", worker);
    vi.stubGlobal("caches", { open: async () => ({ match: async () => undefined }) });
    await import("@/sw");
    expect(worker.skipWaiting).not.toHaveBeenCalled();

    const lifetime: Promise<unknown>[] = [];
    const message = (data: unknown) => worker.dispatchEvent(Object.assign(new MessageEvent("message", { data }), {
      waitUntil: (promise: Promise<unknown>) => { lifetime.push(promise); },
    }));
    message(null);
    message({ type: "SOME_OTHER_MESSAGE" });
    expect(worker.skipWaiting).not.toHaveBeenCalled();
    message({ type: "SKIP_WAITING" });
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
    expect(lifetime).toHaveLength(1);
    await Promise.all(lifetime);
  });
});
