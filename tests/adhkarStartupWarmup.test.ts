/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("@/data/packs");
  vi.resetModules();
  localStorage.clear();
});

describe("bundled adhkar startup warming", () => {
  it("reuses the public fetch while reading packs only for the owner at load time", async () => {
    const mergeWithPacks = vi.fn((db) => db);
    vi.doMock("@/data/packs", () => ({ mergeWithPacks, MY_ADHKAR_SECTION_ID: "my_adhkar", MY_ADHKAR_TITLE: "أذكاري" }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ sections: [] }) }));
    vi.stubGlobal("fetch", fetchMock);
    const load = await import("@/data/load");
    expect(load).toHaveProperty("warmBundledAdhkar");
    await load.warmBundledAdhkar();
    expect(mergeWithPacks).not.toHaveBeenCalled();
    await load.loadAdhkarDB();
    await load.loadAdhkarDB();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mergeWithPacks).toHaveBeenCalledTimes(2);
  });

  it("allows the normal loader to retry after a failed warm fetch", async () => {
    vi.doUnmock("@/data/packs");
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true, json: async () => ({ sections: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const load = await import("@/data/load");
    expect(load).toHaveProperty("warmBundledAdhkar");
    await expect(load.warmBundledAdhkar()).rejects.toThrow("offline");
    await expect(load.loadAdhkarDB()).resolves.toHaveProperty("db");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("merges only the account selected after the public warmup", async () => {
    const { setAccountStorageOwner } = await import("@/lib/accountStorageScope");
    const { savePacks } = await import("@/data/packs");
    const pack = (id: string) => [{ packId: id, name: id, importedAt: "2026-10-07", sections: [{ id, title: id, content: [] }] }];
    setAccountStorageOwner("first");
    savePacks(pack("first-private-section"));
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ sections: [] }) })));
    const { warmBundledAdhkar, loadAdhkarDB } = await import("@/data/load");
    await warmBundledAdhkar();
    setAccountStorageOwner("second");
    savePacks(pack("second-private-section"));
    const { db } = await loadAdhkarDB();
    expect(db.sections.map((section) => section.id)).toContain("second-private-section");
    expect(db.sections.map((section) => section.id)).not.toContain("first-private-section");
    setAccountStorageOwner("local");
  });
});
