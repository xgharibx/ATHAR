import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PWA offline asset policy", () => {
  it("pre-caches core reading data without pre-downloading large optional libraries", () => {
    const config = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");

    expect(config).toContain('"data/adhkar.json"');
    expect(config).toContain('"data/quran.json"');
    expect(config).toContain('"data/quran_page_map.json"');
    expect(config).toContain('"data/quran-en-sahih.json"');
    expect(config).toContain('"data/hadith/index.json"');
    expect(config).not.toContain('"data/*"');
    expect(config).not.toContain('"data/**/*"');
  });

  it("keeps larger first-use data packs in a bounded runtime cache", () => {
    const worker = readFileSync(resolve(process.cwd(), "src/sw.ts"), "utf8");
    const contentPacksRoute = worker.split('cacheName: "athar-content-packs"')[1]?.split("registerRoute(")[0] ?? "";

    expect(worker).toContain("athar-content-packs");
    expect(contentPacksRoute).toMatch(/maxEntries:\s*4/);
    expect(worker).toContain("url.origin === self.location.origin");
    expect(worker).toContain("(?!hadith");
    expect(contentPacksRoute).toContain("createMaxResponseSizePlugin(CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES)");
    expect(contentPacksRoute).toContain("maxAgeSeconds: 60 * 60 * 24 * 90");
  });

  it("prunes legacy oversized content packs during worker activation", () => {
    const worker = readFileSync(resolve(process.cwd(), "src/sw.ts"), "utf8");
    const activationHandler = worker.split('self.addEventListener("activate"')[1]?.split("// SPA fallback")[0] ?? "";

    expect(activationHandler).toContain('caches.open("athar-content-packs")');
    expect(activationHandler).toContain("pruneOversizedCacheEntries(cache, CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES)");
    expect(activationHandler).toContain("event.waitUntil");
  });

  it("keeps the Hadith runtime cache to one response within the 10 MiB entry budget", () => {
    const worker = readFileSync(resolve(process.cwd(), "src/sw.ts"), "utf8");
    const hadithRoute = worker.split('cacheName: "athar-hadith-packs"')[1]?.split("registerRoute(")[0] ?? "";

    expect(hadithRoute).toContain("createMaxResponseSizePlugin(HADITH_RUNTIME_CACHE_MAX_BYTES)");
    expect(hadithRoute).toMatch(/maxEntries:\s*1/);
    expect(hadithRoute).toContain("maxAgeSeconds: 60 * 60 * 24 * 30");
  });

  it("limits Quran.com word-by-word responses to seven days and removes the legacy year-long cache", () => {
    const worker = readFileSync(resolve(process.cwd(), "src/sw.ts"), "utf8");
    const wbwRoute = worker.split('cacheName: "wbw-api-v2-7d"')[1]?.split("registerRoute(")[0] ?? "";
    const activationHandler = worker.split('self.addEventListener("activate"')[1]?.split("// SPA fallback")[0] ?? "";

    expect(wbwRoute).toContain("maxAgeSeconds: 60 * 60 * 24 * 7");
    expect(activationHandler).toContain('caches.delete("wbw-api-v1")');
  });

  it("bounds cached navigation HTML while retaining the precached offline shell", () => {
    const worker = readFileSync(resolve(process.cwd(), "src/sw.ts"), "utf8");
    const navigationRoute = worker.split('cacheName: "athar-html"')[1]?.split("const navigationRoute")[0] ?? "";

    expect(navigationRoute).toMatch(/maxEntries:\s*1/);
    expect(navigationRoute).toContain("maxAgeSeconds: 60 * 60 * 24 * 30");
    expect(worker).toContain('matchPrecache("/index.html")');
    expect(worker).toContain('caches.delete("athar-html")');
  });
});
