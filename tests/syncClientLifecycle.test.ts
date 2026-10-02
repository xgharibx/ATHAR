// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const io = vi.hoisted(() => ({ kv: new Map<string, unknown>() }));
vi.mock("dexie", () => ({
  default: class {
    version() {
      return { stores: () => {
        Object.assign(this, { kv: {
          get: async (key: string) => io.kv.get(key),
          put: async (row: { key: string; value: unknown }) => io.kv.set(row.key, row),
          delete: async (key: string) => io.kv.delete(key),
        } });
      } };
    }
  },
}));

async function setup(options?: { metadata?: boolean }) {
  vi.resetModules();
  let state: Record<string, unknown> = { progress: { a: 1 } };
  let packs = [{ packId: "my_adhkar_pack", name: "Mine", sections: [{ id: "my_adhkar", content: [{ text: "original", count: 1 }] }] }];
  let identity = { id: "synthetic-a", secret: "synthetic-only", joinedAt: "2026-01-01" };
  let sessionUser = "synthetic-a";
  let exportNumber = 0;
  let onSelect: (() => void | Promise<void>) | undefined;
  const writes: Array<Array<{ user_id: string; kind: string; payload: Record<string, unknown> }>> = [];
  const rows = [{ kind: "progress", payload: { progress: { a: 1, remote: 9 } }, updated_at: new Date().toISOString() }];
  vi.doMock("@/lib/authClient", () => ({
    getSession: async () => ({ user: { id: sessionUser } }),
    getSupabase: () => ({ from: () => ({
      select: () => ({ eq: async () => { await onSelect?.(); return { data: rows, error: null }; } }),
      upsert: async (batch: typeof writes[number]) => { writes.push(batch); return { error: null }; },
    }) }),
  }));
  vi.doMock("@/store/noorStore", () => ({ useNoorStore: {
    getState: () => ({
      exportState: () => ({ ...structuredClone(state), ...(options?.metadata ? { version: 1, exportedAt: new Date(1700000000000 + exportNumber++).toISOString() } : {}) }),
      importState: (blob: Record<string, unknown>) => { const { version: _version, exportedAt: _at, ...rest } = blob; state = rest; },
    }),
    subscribe: () => () => {},
  } }));
  vi.doMock("@/data/packs", () => ({
    exportDataPacks: () => structuredClone(packs),
    adoptDataPacks: (next: typeof packs) => { packs = structuredClone(next); return true; },
  }));
  vi.doMock("@/lib/leaderboard", () => ({
    exportLeaderboardIdentity: () => ({ ...identity }),
    adoptLeaderboardIdentity: (next: typeof identity) => { identity = next; return true; },
  }));
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  const mod = await import("@/lib/syncClient");
  return {
    mod, writes, state: () => state, packs: () => packs, identity: () => identity,
    onSelect: (fn: () => void | Promise<void>) => { onSelect = fn; },
    addPackItem: () => packs[0].sections[0].content.push({ text: "new while pending", count: 1 }),
    changeIdentity: () => { identity = { ...identity, id: "synthetic-older", joinedAt: "2025-01-01" }; },
    setSession: (id: string) => { sessionUser = id; },
  };
}

beforeEach(() => { io.kv.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("cloud sync snapshot and lifecycle", () => {
  it("finishes an unchanged round-trip despite export timestamp changes", async () => {
    const s = await setup({ metadata: true });
    expect(await s.mod.syncNow()).toBe(true);
    expect(s.state().progress).toEqual({ a: 1, remote: 9 });
    const settings = s.writes.flat().find(row => row.kind === "settings")?.payload;
    expect(settings).not.toHaveProperty("version");
    expect(settings).not.toHaveProperty("exportedAt");
  });

  it("keeps custom adhkar added while the remote fetch is pending", async () => {
    const s = await setup();
    s.onSelect(s.addPackItem);
    expect(await s.mod.syncNow()).toBe(false);
    expect(s.packs()[0].sections[0].content.map(item => item.text)).toEqual(["original", "new while pending"]);
    expect(s.mod.getSyncStatus().pending).toBe(true);
  });

  it("keeps an identity adopted while the remote fetch is pending", async () => {
    const s = await setup();
    s.onSelect(s.changeIdentity);
    await s.mod.syncNow();
    expect(s.identity().id).toBe("synthetic-older");
  });

  it("cancels a stopped account's reconcile before uploads or imports", async () => {
    const s = await setup();
    s.onSelect(() => s.mod.stopCloudSync({ forget: true }));
    expect(await s.mod.syncNow()).toBe(false);
    expect(s.writes).toEqual([]);
    expect(s.state().progress).toEqual({ a: 1 });
    expect(io.kv.has("base")).toBe(false);
    expect(io.kv.has("meta")).toBe(false);
    expect(s.mod.getSyncStatus().pending).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts the next account without joining an invalidated request", async () => {
    const s = await setup();
    let release: (() => void) | undefined;
    let firstSelect: (() => void) | undefined;
    const selected = new Promise<void>(resolve => { firstSelect = resolve; });
    s.onSelect(() => { firstSelect?.(); return new Promise<void>(resolve => { release = resolve; }); });
    const oldRun = s.mod.syncNow();
    await selected;
    s.mod.stopCloudSync();
    s.setSession("synthetic-b");
    s.onSelect(() => {});
    const newRun = s.mod.syncNow();
    expect(newRun).not.toBe(oldRun);
    release?.();
    expect(await oldRun).toBe(false);
    expect(await newRun).toBe(true);
    expect(s.writes.flat().every(row => row.user_id === "synthetic-b")).toBe(true);
  });
});
