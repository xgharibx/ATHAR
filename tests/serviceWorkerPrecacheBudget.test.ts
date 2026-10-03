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

    expect(worker).toContain("athar-content-packs");
    expect(worker).toMatch(/maxEntries:\s*4/);
    expect(worker).toContain("url.origin === self.location.origin");
    expect(worker).toContain("(?!hadith");
  });

  it("keeps the Hadith runtime cache to one response within the 10 MiB entry budget", () => {
    const worker = readFileSync(resolve(process.cwd(), "src/sw.ts"), "utf8");
    const hadithRoute = worker.split('cacheName: "athar-hadith-packs"')[1]?.split("registerRoute(")[0] ?? "";

    expect(hadithRoute).toContain("createMaxResponseSizePlugin(HADITH_RUNTIME_CACHE_MAX_BYTES)");
    expect(hadithRoute).toMatch(/maxEntries:\s*1/);
    expect(hadithRoute).toContain("maxAgeSeconds: 60 * 60 * 24 * 30");
  });
});
