// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const io = vi.hoisted(() => ({ kv: new Map<string, unknown>(), failAddKey: null as string | null }));
vi.mock("dexie", () => ({
  default: class {
    transaction(_mode: string, _table: unknown, work: () => Promise<unknown>) {
      return work();
    }
    version() {
      return { stores: () => {
        Object.assign(this, { kv: {
          get: async (key: string) => io.kv.get(key),
          put: async (row: { key: string; value: unknown }) => io.kv.set(row.key, row),
          add: async (row: { key: string; value: unknown }) => {
            if (io.failAddKey === row.key) throw new DOMException("Storage unavailable", "QuotaExceededError");
            if (io.kv.has(row.key)) throw new DOMException("Key exists", "ConstraintError");
            io.kv.set(row.key, row);
          },
          delete: async (key: string) => io.kv.delete(key),
        } });
      } };
    }
  },
}));

async function setup(options?: { metadata?: boolean; initialState?: Record<string, unknown> }) {
  vi.resetModules();
  let state: Record<string, unknown> = options?.initialState ?? { progress: { a: 1 } };
  let packs = [{ packId: "my_adhkar_pack", name: "Mine", sections: [{ id: "my_adhkar", content: [{ text: "original", count: 1 }] }] }];
  let identity = { id: "synthetic-a", secret: "synthetic-only", joinedAt: "2026-01-01" };
  let sessionUser = "synthetic-a";
  let exportNumber = 0;
  let onSelect: (() => void | Promise<void>) | undefined;
  const writes: Array<Array<{ kind: string; expected_revision: number | null; payload: Record<string, unknown> }>> = [];
  const writeOwners: string[] = [];
  const rows = [{ user_id: "synthetic-a", kind: "progress", payload: { progress: { a: 1, remote: 9 } }, updated_at: new Date().toISOString(), revision: 1 }];
  const receipts = new Map<string, { requestId: string; writes: string; revisions: Record<string, number> }>();
  vi.doMock("@/lib/authClient", () => ({
    getSession: async () => ({ user: { id: sessionUser } }),
    getSupabase: () => ({ from: () => ({
      select: () => ({ eq: async (_key: string, userId: string) => {
        const snapshot = rows.filter((row) => row.user_id === userId).map((row) => structuredClone(row));
        await onSelect?.();
        return { data: snapshot, error: null };
      } }),
    }), rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === "athar_sync_ack_batch") {
        const deviceId = String(args.p_device_id);
        const receipt = receipts.get(`${sessionUser}:${deviceId}`);
        if (receipt?.requestId === String(args.p_request_id)) receipts.delete(`${sessionUser}:${deviceId}`);
        return { data: { acknowledged: true }, error: null };
      }
      if (name !== "athar_sync_commit_batch") return { data: null, error: { message: "unknown rpc" } };
      const batch = args.p_writes as typeof writes[number];
      const requestId = String(args.p_request_id);
      const deviceId = String(args.p_device_id);
      const key = `${sessionUser}:${deviceId}`;
      const serialized = JSON.stringify(batch);
      const previous = receipts.get(key);
      if (previous) {
        if (previous.requestId !== requestId) return { data: { status: "pending_ack" }, error: null };
        if (previous.writes !== serialized) return { data: null, error: { message: "idempotency mismatch" } };
        return { data: { status: "replayed", revisions: previous.revisions }, error: null };
      }
      const conflict = batch.some((write) => {
        const row = rows.find((item) => item.user_id === sessionUser && item.kind === write.kind);
        return write.expected_revision === null ? Boolean(row) : !row || row.revision !== write.expected_revision;
      });
      if (conflict) return { data: { status: "conflict" }, error: null };
      const revisions: Record<string, number> = {};
      for (const write of batch) {
        const row = rows.find((item) => item.user_id === sessionUser && item.kind === write.kind);
        const revision = row ? row.revision + 1 : 1;
        const jsonPayload = JSON.parse(JSON.stringify(write.payload)) as Record<string, unknown>;
        if (row) Object.assign(row, { payload: jsonPayload, revision, updated_at: new Date().toISOString() });
        else rows.push({ user_id: sessionUser, kind: write.kind, payload: jsonPayload, revision, updated_at: new Date().toISOString() });
        revisions[write.kind] = revision;
      }
      writes.push(structuredClone(batch));
      writeOwners.push(sessionUser);
      receipts.set(key, { requestId, writes: serialized, revisions });
      return { data: { status: "committed", revisions }, error: null };
    } }),
  }));
  vi.doMock("@/store/noorStore", () => ({ useNoorStore: {
    getState: () => ({
      exportState: () => ({ ...structuredClone(state), ...(options?.metadata ? { version: 1, exportedAt: new Date(1700000000000 + exportNumber++).toISOString() } : {}) }),
      importState: (blob: Record<string, unknown>) => {
        const { version: _version, exportedAt: _at, ...rest } = blob;
        // Match the real preference normalizer, which restores optional defaults
        // such as customAccent: undefined after every account-state import.
        state = {
          ...rest,
          ...(rest.prefs && typeof rest.prefs === "object"
            ? { prefs: { customAccent: undefined, ...(rest.prefs as Record<string, unknown>) } }
            : {}),
        };
      },
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
    mod, writes, writeOwners, state: () => state, packs: () => packs, identity: () => identity,
    failPendingWrite: () => { io.failAddKey = "pending"; },
    onSelect: (fn: () => void | Promise<void>) => { onSelect = fn; },
    addPackItem: () => packs[0].sections[0].content.push({ text: "new while pending", count: 1 }),
    changeIdentity: () => { identity = { ...identity, id: "synthetic-older", joinedAt: "2025-01-01" }; },
    setSession: (id: string) => { sessionUser = id; },
  };
}

beforeEach(() => { io.kv.clear(); io.failAddKey = null; vi.useFakeTimers(); });
afterEach(() => { io.failAddKey = null; vi.clearAllTimers(); vi.useRealTimers(); });

describe("cloud sync snapshot and lifecycle", () => {
  it("finishes an unchanged round-trip despite export timestamp changes", async () => {
    const s = await setup({ metadata: true });
    expect(await s.mod.syncNow()).toBe(true);
    expect(s.state().progress).toEqual({ a: 1, remote: 9 });
    const settings = s.writes.flat().find(row => row.kind === "settings")?.payload;
    expect(settings).not.toHaveProperty("version");
    expect(settings).not.toHaveProperty("exportedAt");
  });

  it("does not re-upload unchanged preferences omitted by JSON serialization", async () => {
    const s = await setup({
      initialState: {
        progress: { a: 1, remote: 9 },
        prefs: { customAccent: undefined },
      },
    });

    expect(await s.mod.syncNow()).toBe(true);
    expect(s.mod.getSyncStatus().pending).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(s.writes.flat().filter((write) => write.kind === "settings")).toHaveLength(1);
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

  it("fails closed when IndexedDB cannot persist a pending request", async () => {
    const s = await setup();
    s.failPendingWrite();

    expect(await s.mod.syncNow()).toBe(false);
    expect(s.writes).toEqual([]);
    expect(io.kv.has("pending")).toBe(false);
    expect(s.state().progress).toEqual({ a: 1 });
    expect(s.mod.getSyncStatus().phase).toBe("error");
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
    expect(s.writeOwners.every((owner) => owner === "synthetic-b")).toBe(true);
  });
});
