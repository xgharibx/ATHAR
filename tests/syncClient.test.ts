/**
 * @vitest-environment jsdom
 *
 * Integration tests for the sync reconcile loop.
 *
 * The merge rules are covered exhaustively in syncMerge.test.ts; what's tested
 * here is the wiring around them, where the genuinely catastrophic bugs live:
 * pushing an empty cloud over real local data, or reusing one account's base
 * snapshot for another account (which would make the merge read every one of
 * the new user's local keys as a deletion).
 */
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";

type Row = { user_id: string; kind: string; payload: unknown; updated_at: string; device_id?: string; revision?: number };
type RpcWrite = { kind: string; expected_revision: number | null; payload: unknown };
type ServerHooks = {
  userId?: string;
  onSelect?: () => void;
  hangRead?: boolean;
  beforeUpsert?: (batch: Row[]) => Promise<void>;
  beforeRpc?: (name: string, args: Record<string, unknown>) => Promise<void>;
  rpcError?: (name: string, args: Record<string, unknown>) => { code: string; message: string } | null;
};

/** Shared stand-in for PostgREST, revisions, the batch RPC, and receipts. */
function makeSharedServer(rows: Row[]) {
  const store = rows.map((r) => ({ ...r, payload: structuredClone(r.payload), revision: r.revision ?? 1 }));
  const upserts: Row[][] = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const receipts = new Map<string, { requestId: string; writes: string; revisions: Record<string, number> }>();
  let loseNextCommitResponse = false;

  function createClient(hooks: ServerHooks = {}) {
    const client = {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, userId: string) {
              const snapshot = store
                .filter((r) => r.user_id === userId)
                .map((r) => ({ ...r, payload: structuredClone(r.payload) }));
              if (hooks.hangRead) return new Promise(() => {});
              // Where the user gets to act while the request is in flight.
              hooks.onSelect?.();
              return Promise.resolve({
                data: snapshot,
                error: null,
              });
            },
          };
        },
        async upsert(batch: Row[]) {
          await hooks.beforeUpsert?.(batch);
          upserts.push(batch.map((r) => ({ ...r })));
          for (const r of batch) {
            const i = store.findIndex((s) => s.user_id === r.user_id && s.kind === r.kind);
            const withStamp = {
              ...r,
              payload: structuredClone(r.payload),
              revision: i >= 0 ? (store[i].revision ?? 1) + 1 : 1,
              updated_at: new Date().toISOString(),
            };
            if (i >= 0) store[i] = withStamp;
            else store.push(withStamp);
          }
          return { error: null };
        },
      };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args: structuredClone(args) });
      await hooks.beforeRpc?.(name, args);
      const forcedError = hooks.rpcError?.(name, args);
      if (forcedError) return { data: null, error: forcedError };
      if (name === "athar_sync_ack_batch") {
        const deviceId = String(args.p_device_id);
        const receipt = receipts.get(deviceId);
        if (receipt?.requestId === String(args.p_request_id)) receipts.delete(deviceId);
        return { data: { acknowledged: true }, error: null };
      }
      if (name !== "athar_sync_commit_batch") return { data: null, error: { message: "unknown rpc" } };

      const deviceId = String(args.p_device_id);
      const requestId = String(args.p_request_id);
      const writes = args.p_writes as RpcWrite[];
      const serializedWrites = JSON.stringify(writes);
      const receipt = receipts.get(deviceId);
      if (receipt) {
        if (receipt.requestId !== requestId) return { data: { status: "pending_ack" }, error: null };
        if (receipt.writes !== serializedWrites) return { data: null, error: { message: "idempotency mismatch" } };
        return { data: { status: "replayed", revisions: receipt.revisions }, error: null };
      }

      const conflicts = writes.some((write) => {
        const row = store.find((candidate) => candidate.user_id === (hooks.userId ?? "user-a") && candidate.kind === write.kind);
        return write.expected_revision === null ? Boolean(row) : !row || row.revision !== write.expected_revision;
      });
      if (conflicts) return { data: { status: "conflict" }, error: null };

      const userId = hooks.userId ?? "user-a";
      const revisions: Record<string, number> = {};
      for (const write of writes) {
        const i = store.findIndex((row) => row.user_id === userId && row.kind === write.kind);
        const revision = i >= 0 ? (store[i].revision ?? 1) + 1 : 1;
        const row: Row = {
          user_id: userId,
          kind: write.kind,
          payload: structuredClone(write.payload),
          device_id: deviceId,
          revision,
          updated_at: new Date().toISOString(),
        };
        if (i >= 0) store[i] = row;
        else store.push(row);
        revisions[write.kind] = revision;
      }
      receipts.set(deviceId, { requestId, writes: serializedWrites, revisions });
      if (loseNextCommitResponse) {
        loseNextCommitResponse = false;
        return { data: null, error: { message: "network response lost after commit" } };
      }
      return { data: { status: "committed", revisions }, error: null };
    },
    };
    return client;
  }

  return {
    createClient,
    serverRows: store,
    upserts,
    rpcCalls,
    loseNextCommitResponse: () => { loseNextCommitResponse = true; },
  };
}

/** A fake noorStore whose exported blob the test controls. */
function makeStore(initial: Record<string, unknown>) {
  let state = { ...initial };
  const imported: Array<Record<string, unknown>> = [];
  const subscribers = new Set<() => void>();
  const store = {
    getState: () => ({
      exportState: () => ({ ...state }),
      importState: (blob: Record<string, unknown>) => {
        imported.push(blob);
        const { version: _v, exportedAt: _e, ...rest } = blob;
        state = rest;
      },
    }),
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  };
  return {
    store,
    imported,
    current: () => state,
    /** Simulate the user doing something while a sync is mid-flight. */
    mutate: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => {
      state = fn(state);
      for (const listener of subscribers) listener();
    },
  };
}

async function load(opts: {
  rows?: Row[];
  local: Record<string, unknown>;
  userId?: string;
  online?: boolean;
  server?: ReturnType<typeof makeSharedServer>;
  databaseNamespace?: string;
  beforeUpsert?: (batch: Row[]) => Promise<void>;
  beforeRpc?: ServerHooks["beforeRpc"];
  rpcError?: ServerHooks["rpcError"];
  onSelect?: (st: { mutate: (fn: (s: Record<string, unknown>) => Record<string, unknown>) => void }) => void;
  hangRead?: boolean;
}) {
  vi.resetModules();
  const databaseNamespace = opts.databaseNamespace ?? `sync-test-${++databaseSerial}`;
  const st = makeStore(opts.local);
  const userId = opts.userId ?? "user-a";
  const server = opts.server ?? makeSharedServer(opts.rows ?? []);
  const sb = {
    ...server,
    client: server.createClient({
      userId,
      hangRead: opts.hangRead,
      onSelect: opts.onSelect ? () => opts.onSelect!(st) : undefined,
      beforeUpsert: opts.beforeUpsert,
      beforeRpc: opts.beforeRpc,
      rpcError: opts.rpcError,
    }),
  };

  vi.doMock("@/lib/authClient", () => ({
    getSupabase: () => sb.client,
    getSession: () => Promise.resolve({ user: { id: userId } }),
  }));
  vi.doMock("@/store/noorStore", () => ({ useNoorStore: st.store }));
  vi.doMock("@/lib/accountStorageScope", () => ({
    accountScopedDatabaseName: (name: string) => `${name}::${databaseNamespace}`,
    setAccountStorageOwner: () => {},
  }));

  const { setAccountStorageOwner } = await import("@/lib/accountStorageScope");
  setAccountStorageOwner(`user:${userId}`);

  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => opts.online ?? true,
  });

  const mod = await import("@/lib/syncClient");
  return { ...sb, ...st, mod, userId };
}

let databaseSerial = 0;

beforeEach(() => {
  indexedDB.deleteDatabase("athar-sync-v1");
  indexedDB.deleteDatabase("athar-sync-v1::user-a");
  indexedDB.deleteDatabase("athar-sync-v1::user-b");
  indexedDB.deleteDatabase("athar-sync-v1::sync-device-a");
  indexedDB.deleteDatabase("athar-sync-v1::sync-device-b");
  localStorage.clear();
});

afterEach(() => {
  vi.doUnmock("@/lib/authClient");
  vi.doUnmock("@/store/noorStore");
  vi.doUnmock("@/lib/accountStorageScope");
  vi.useRealTimers();
  vi.clearAllTimers();
});

describe("first sign-in", () => {
  it("keeps oversized local notes and refuses to send an oversized sync document", async () => {
    const note = "x".repeat(4 * 1024 * 1024);
    const { mod, rpcCalls, current } = await load({
      local: { quranNotes: { "1:1": note } },
    });

    expect(await mod.syncNow()).toBe(false);

    expect(mod.getSyncStatus()).toMatchObject({
      phase: "error",
      pending: true,
      error: expect.stringContaining("المزامنة"),
    });
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(0);
    expect((current().quranNotes as Record<string, string>)["1:1"]).toBe(note);
  });

  it("recovers from an oversized prepared request left by an older client after local data is trimmed", async () => {
    const namespace = "legacy-oversize-pending";
    const note = "x".repeat(4 * 1024 * 1024);
    const { mod, rpcCalls, mutate } = await load({
      local: { quranNotes: { "1:1": note }, progress: { "morning:0": 2 } },
      databaseNamespace: namespace,
    });
    const legacyDb = new Dexie(`athar-sync-v1::${namespace}`);
    legacyDb.version(1).stores({ kv: "key" });
    await legacyDb.open();
    await legacyDb.table("kv").put({
      key: "pending",
      value: {
        userId: "user-a",
        requestId: "old-oversized-request",
        deviceId: "old-device",
        mode: "rpc",
        state: "prepared",
        writes: [{ kind: "quran", expected_revision: null, payload: { quranNotes: { "1:1": note } } }],
        sourceBuckets: {},
      },
    });
    legacyDb.close();

    expect(await mod.syncNow()).toBe(false);
    expect(mod.getSyncStatus()).toMatchObject({ phase: "error", pending: true });
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(0);

    mod.startCloudSync();
    try {
      mutate(() => ({ progress: { "morning:0": 2 } }));
      expect(await mod.syncNow()).toBe(true);
      expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(1);
    } finally {
      mod.stopCloudSync();
    }
  });

  it("surfaces a server payload rejection without scheduling an automatic retry", async () => {
    const { mod, rpcCalls } = await load({
      local: { progress: { "morning:0": 2 } },
      rpcError: (name) => name === "athar_sync_commit_batch"
        ? { code: "22023", message: "SYNC_PAYLOAD_TOO_LARGE: request exceeds 5 MiB" }
        : null,
    });

    expect(await mod.syncNow()).toBe(false);
    expect(mod.getSyncStatus()).toMatchObject({
      phase: "error",
      pending: true,
      error: expect.stringContaining("بقيت محفوظة"),
    });
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(1);
  });

  it("uploads local state when the cloud is empty", async () => {
    const { mod, upserts, serverRows, current } = await load({
      local: { progress: { "morning:0": 5 }, favorites: { x: true }, prefs: { theme: "layl" } },
    });

    const synced = await mod.syncNow();
    expect(synced, JSON.stringify(mod.getSyncStatus())).toBe(true);

    // Local data survives untouched…
    expect(current().progress).toEqual({ "morning:0": 5 });
    // …and reached the server through the atomic RPC, never a table upsert.
    const progressDoc = serverRows.find((r) => r.kind === "progress")?.payload as Record<string, unknown>;
    expect(progressDoc.progress).toEqual({ "morning:0": 5 });
    expect(serverRows.find((r) => r.kind === "favorites")?.payload).toEqual({ favorites: { x: true } });
    expect(upserts).toHaveLength(0);
  });

  it("merges an existing cloud account into a device that already has data", async () => {
    const { mod, current } = await load({
      local: { progress: { a: 10 }, favorites: { local: true } },
      rows: [
        {
          user_id: "user-a",
          kind: "progress",
          payload: { progress: { a: 4, b: 7 } },
          updated_at: new Date().toISOString(),
        },
        {
          user_id: "user-a",
          kind: "favorites",
          payload: { favorites: { cloud: true } },
          updated_at: new Date().toISOString(),
        },
      ],
    });

    expect(await mod.syncNow()).toBe(true);
    // Higher local counter kept, remote-only key gained — nothing lost either way.
    expect(current().progress).toEqual({ a: 10, b: 7 });
    expect(current().favorites).toEqual({ local: true, cloud: true });
  });

  it("never lets an empty server document blank local state", async () => {
    const { mod, current } = await load({
      local: { progress: { a: 9 }, quranStreak: 12 },
      rows: [
        { user_id: "user-a", kind: "progress", payload: {}, updated_at: new Date().toISOString() },
        { user_id: "user-a", kind: "quran", payload: {}, updated_at: new Date().toISOString() },
      ],
    });

    expect(await mod.syncNow()).toBe(true);
    expect(current().progress).toEqual({ a: 9 });
    expect(current().quranStreak).toBe(12);
  });
});

describe("steady state", () => {
  it("reports a stalled server read instead of leaving the account panel spinning", async () => {
    vi.useFakeTimers();
    const { mod } = await load({ local: {}, hangRead: true });

    void mod.syncNow();
    await vi.advanceTimersByTimeAsync(16_000);

    expect(mod.getSyncStatus()).toMatchObject({
      phase: "error",
      pending: true,
      error: expect.stringMatching(/مهلة|الوقت/),
    });
    mod.stopCloudSync();
  });

  it("writes nothing on a second run with no changes", async () => {
    const { mod, rpcCalls } = await load({ local: { progress: { a: 1 } } });

    await mod.syncNow();
    const afterFirst = rpcCalls.filter((call) => call.name === "athar_sync_commit_batch").length;
    expect(afterFirst).toBeGreaterThan(0);

    await mod.syncNow();
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(afterFirst);
  });

  it("propagates a deletion made on another device", async () => {
    const { mod, serverRows, current } = await load({
      local: { favorites: { x: true, y: true } },
    });
    await mod.syncNow(); // establishes the base

    // Another device removes "x".
    const row = serverRows.find((r) => r.kind === "favorites")!;
    row.payload = { favorites: { y: true } };
    row.updated_at = new Date(Date.now() + 60_000).toISOString();

    await mod.syncNow();
    expect(current().favorites).toEqual({ y: true });
  });
});

describe("account switching", () => {
  it("keeps the previous account's base and local snapshot out of the next account", async () => {
    const first = await load({ local: { favorites: { aOnly: true } }, userId: "user-a" });
    await first.mod.syncNow();

    // Same installation, different owner and independently hydrated local state.
    const second = await load({ local: { favorites: { bOnly: true } }, userId: "user-b" });
    expect(await second.mod.syncNow()).toBe(true);

    expect(second.current().favorites).toEqual({ bOnly: true });
    const sent = second.serverRows.find((r) => r.kind === "favorites");
    expect(sent?.payload).toEqual({ favorites: { bOnly: true } });
    expect(sent?.user_id).toBe("user-b");
  });
});

describe("offline", () => {
  it("reports offline and keeps local state intact", async () => {
    const { mod, rpcCalls, current } = await load({
      local: { progress: { a: 3 } },
      online: false,
    });

    expect(await mod.syncNow()).toBe(false);
    expect(await mod.flushCloudSync()).toBe(false);
    expect(mod.getSyncStatus().phase).toBe("offline");
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(0);
    expect(current().progress).toEqual({ a: 3 });
  });

  it("uploads once back online", async () => {
    const { mod, rpcCalls } = await load({ local: { progress: { a: 3 } }, online: false });
    await mod.syncNow();
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(0);

    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    expect(await mod.syncNow()).toBe(true);
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch").length).toBeGreaterThan(0);
    expect(mod.getSyncStatus().phase).toBe("idle");
  });
});

describe("concurrency", () => {
  it("joins an in-flight run rather than racing it", async () => {
    const { mod, rpcCalls } = await load({ local: { progress: { a: 1 } } });
    const [a, b] = await Promise.all([mod.syncNow(), mod.syncNow()]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(1);
  });

  it("shares one durable pending request across same-account tabs", async () => {
    let pauseNextCommit = false;
    let enteredCommit!: () => void;
    let releaseCommit!: () => void;
    const commitStarted = new Promise<void>((resolve) => { enteredCommit = resolve; });
    const holdCommit = new Promise<void>((resolve) => { releaseCommit = resolve; });
    const server = makeSharedServer([]);
    const a = await load({
      local: { progress: { beads: 1 } },
      server,
      databaseNamespace: "same-account-tabs",
      beforeRpc: async (name) => {
        if (pauseNextCommit && name === "athar_sync_commit_batch") {
          pauseNextCommit = false;
          enteredCommit();
          await holdCommit;
        }
      },
    });
    expect(await a.mod.syncNow()).toBe(true);

    const b = await load({
      local: { progress: { beads: 1 } },
      server,
      databaseNamespace: "same-account-tabs",
    });
    expect(await b.mod.syncNow()).toBe(true);
    a.mutate((state) => ({ ...state, progress: { beads: 2 } }));
    b.mutate((state) => ({ ...state, progress: { beads: 2 } }));

    pauseNextCommit = true;
    const aRun = a.mod.syncNow();
    await commitStarted;
    const bRun = b.mod.syncNow();
    expect(await bRun).toBe(true);
    releaseCommit();
    expect(await aRun).toBe(true);
    expect(server.serverRows.find((row) => row.kind === "progress")?.payload)
      .toEqual({ progress: { beads: 2 } });
  });

  it("re-reads and preserves additions when two independent devices race", async () => {
    let pauseA = false;
    let enteredA!: () => void;
    let releaseA!: () => void;
    const atAWrite = new Promise<void>((resolve) => { enteredA = resolve; });
    const holdA = new Promise<void>((resolve) => { releaseA = resolve; });
    const server = makeSharedServer([]);

    localStorage.setItem("athar_device_id_v1", "device-a");
    const a = await load({
      local: { favorites: { shared: true } },
      databaseNamespace: "sync-device-a",
      server,
      beforeRpc: async (name) => {
        if (pauseA && name === "athar_sync_commit_batch") {
          pauseA = false;
          enteredA();
          await holdA;
        }
      },
    });
    expect(await a.mod.syncNow()).toBe(true);

    localStorage.setItem("athar_device_id_v1", "device-b");
    const b = await load({
      local: { favorites: { shared: true } },
      databaseNamespace: "sync-device-b",
      server,
    });
    expect(await b.mod.syncNow()).toBe(true);

    a.mutate((state) => ({ ...state, favorites: { shared: true, fromA: true } }));
    b.mutate((state) => ({ ...state, favorites: { shared: true, fromB: true } }));

    pauseA = true;
    localStorage.setItem("athar_device_id_v1", "device-a");
    const aRun = a.mod.syncNow();
    const reachedAWrite = await Promise.race([atAWrite.then(() => true), aRun.then(() => false)]);
    expect(reachedAWrite).toBe(true);

    localStorage.setItem("athar_device_id_v1", "device-b");
    expect(await b.mod.syncNow()).toBe(true);
    releaseA();
    expect(await aRun).toBe(true);
    expect(await b.mod.syncNow()).toBe(true);

    expect(a.serverRows.find((row) => row.kind === "favorites")?.payload)
      .toEqual({ favorites: { shared: true, fromA: true, fromB: true } });
    expect(a.current().favorites).toEqual({ shared: true, fromA: true, fromB: true });
    expect(b.current().favorites).toEqual({ shared: true, fromA: true, fromB: true });
  });

  it("retries a stale deletion without erasing a concurrent reminder edit", async () => {
    let pauseA = false;
    let enteredA!: () => void;
    let releaseA!: () => void;
    const atAWrite = new Promise<void>((resolve) => { enteredA = resolve; });
    const holdA = new Promise<void>((resolve) => { releaseA = resolve; });
    const server = makeSharedServer([]);
    const original = { id: "r1", title: "Old", updatedAt: 100 };
    const edited = { id: "r1", title: "Edited", updatedAt: 200 };

    localStorage.setItem("athar_device_id_v1", "device-a");
    const a = await load({
      local: { customReminders: [original] },
      databaseNamespace: "sync-device-a",
      server,
      beforeRpc: async (name) => {
        if (pauseA && name === "athar_sync_commit_batch") {
          pauseA = false;
          enteredA();
          await holdA;
        }
      },
    });
    expect(await a.mod.syncNow()).toBe(true);

    localStorage.setItem("athar_device_id_v1", "device-b");
    const b = await load({
      local: { customReminders: [original] },
      databaseNamespace: "sync-device-b",
      server,
    });
    expect(await b.mod.syncNow()).toBe(true);

    a.mutate((state) => ({ ...state, customReminders: [] }));
    b.mutate((state) => ({ ...state, customReminders: [edited] }));

    pauseA = true;
    localStorage.setItem("athar_device_id_v1", "device-a");
    const aRun = a.mod.syncNow();
    const reachedAWrite = await Promise.race([atAWrite.then(() => true), aRun.then(() => false)]);
    expect(reachedAWrite).toBe(true);

    localStorage.setItem("athar_device_id_v1", "device-b");
    expect(await b.mod.syncNow()).toBe(true);
    releaseA();
    expect(await aRun).toBe(true);
    expect(await b.mod.syncNow()).toBe(true);

    expect(server.serverRows.find((row) => row.kind === "reminders")?.payload)
      .toEqual({ customReminders: [edited] });
    expect(a.current().customReminders).toEqual([edited]);
    expect(b.current().customReminders).toEqual([edited]);
    expect(server.rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(3);
  });

  it("retries a stale multi-document batch without partially applying it", async () => {
    const server = makeSharedServer([]);
    let injectRemoteChange = false;
    const a = await load({
      local: { favorites: { base: true }, prefs: { theme: "light" } },
      server,
      beforeRpc: async (name) => {
        if (!injectRemoteChange || name !== "athar_sync_commit_batch") return;
        injectRemoteChange = false;
        const row = server.serverRows.find((candidate) => candidate.kind === "favorites")!;
        row.payload = { favorites: { base: true, remote: true } };
        row.revision = (row.revision ?? 1) + 1;
        row.updated_at = new Date(Date.now() + 60_000).toISOString();
      },
    });
    expect(await a.mod.syncNow()).toBe(true);

    a.mutate((state) => ({
      ...state,
      favorites: { base: true, local: true },
      prefs: { theme: "dark" },
    }));
    injectRemoteChange = true;
    expect(await a.mod.syncNow()).toBe(true);

    expect(server.serverRows.find((row) => row.kind === "favorites")?.payload)
      .toEqual({ favorites: { base: true, local: true, remote: true } });
    expect(server.serverRows.find((row) => row.kind === "settings")?.revision).toBe(2);
    expect(server.rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(3);
  });

  it("keeps local data dirty after four consecutive revision conflicts", async () => {
    const server = makeSharedServer([]);
    let conflicts = 0;
    let injectConflicts = false;
    const client = await load({
      local: { favorites: { local: true } },
      server,
      beforeRpc: async (name) => {
        if (!injectConflicts || name !== "athar_sync_commit_batch" || conflicts >= 4) return;
        conflicts += 1;
        const row = server.serverRows.find((candidate) => candidate.kind === "favorites")!;
        row.payload = { favorites: { ...(row.payload as { favorites: Record<string, boolean> }).favorites, [`remote${conflicts}`]: true } };
        row.revision = (row.revision ?? 1) + 1;
      },
    });
    expect(await client.mod.syncNow()).toBe(true);
    client.mutate((state) => ({ ...state, favorites: { local: true, pending: true } }));
    injectConflicts = true;
    expect(await client.mod.syncNow()).toBe(false);
    expect(conflicts).toBe(4);
    expect(server.rpcCalls.filter((call) => call.name === "athar_sync_commit_batch")).toHaveLength(5);
    expect(client.current().favorites).toEqual({ local: true, pending: true });
    expect(client.mod.getSyncStatus().phase).toBe("error");
    expect(client.mod.getSyncStatus().pending).toBe(true);
  });

  it("replays a committed request after a lost response without adding counters twice", async () => {
    const server = makeSharedServer([
      { user_id: "user-a", kind: "progress", payload: { progress: { beads: 10 } }, updated_at: new Date().toISOString(), revision: 1 },
    ]);
    const { mod, current, mutate } = await load({
      local: { progress: { beads: 10 } },
      server,
    });
    expect(await mod.syncNow()).toBe(true);
    mutate((state) => ({ ...state, progress: { beads: 11 } }));

    server.loseNextCommitResponse();
    expect(await mod.syncNow()).toBe(false);
    const isProgressWrite = (call: { args: Record<string, unknown> }) =>
      (call.args.p_writes as RpcWrite[]).some((write) => write.kind === "progress");
    const firstRequest = server.rpcCalls
      .filter((call) => call.name === "athar_sync_commit_batch" && isProgressWrite(call))[0]?.args.p_request_id;
    expect(server.serverRows.find((row) => row.kind === "progress")?.payload).toEqual({ progress: { beads: 11 } });

    mod.stopCloudSync(); // cancel the automatic retry; exercise recovery explicitly
    expect(await mod.syncNow()).toBe(true);
    const requestIds = server.rpcCalls
      .filter((call) => call.name === "athar_sync_commit_batch" && isProgressWrite(call))
      .map((call) => call.args.p_request_id);
    expect(firstRequest).toBeTruthy();
    expect(requestIds.slice(-2)).toEqual([firstRequest, firstRequest]);
    expect(server.serverRows.find((row) => row.kind === "progress")?.payload).toEqual({ progress: { beads: 11 } });
  });
});

describe("revision-aware conflict ordering", () => {
  it("honors a server edit made after the common base when its clock trails the device clock", async () => {
    const baseStamp = new Date(Date.now() - 120_000).toISOString();
    const server = makeSharedServer([
      {
        user_id: "user-a",
        kind: "settings",
        payload: { prefs: { theme: "base" } },
        updated_at: baseStamp,
        revision: 3,
      },
    ]);
    const { mod, current, mutate, serverRows } = await load({
      local: { prefs: { theme: "base" } },
      server,
    });

    expect(await mod.syncNow()).toBe(true);
    mutate((state) => ({ ...state, prefs: { theme: "local" } }));

    const remote = serverRows.find((row) => row.kind === "settings")!;
    remote.payload = {
      ...(remote.payload as Record<string, unknown>),
      prefs: { theme: "remote" },
    };
    remote.revision = (remote.revision ?? 1) + 1;
    remote.updated_at = new Date(Date.now() - 60_000).toISOString();

    const synced = await mod.syncNow();
    expect(synced).toBe(true);
    expect(mod.getSyncStatus().pending).toBe(false);
    expect(current().prefs).toEqual({ theme: "remote" });
    expect((serverRows.find((row) => row.kind === "settings")?.payload as Record<string, unknown>).prefs)
      .toEqual({ theme: "remote" });
  });
});

describe("a tap during the round-trip", () => {
  it("does not double-count the first local increment after a concurrent remote increment", async () => {
    let pauseNextCommit = false;
    let enteredCommit!: () => void;
    let releaseCommit!: () => void;
    const commitStarted = new Promise<void>((resolve) => { enteredCommit = resolve; });
    const holdCommit = new Promise<void>((resolve) => { releaseCommit = resolve; });
    const { mod, serverRows, current, mutate } = await load({
      local: { progress: { beads: 10 } },
      rows: [
        {
          user_id: "user-a",
          kind: "progress",
          payload: { progress: { beads: 10 } },
          updated_at: new Date().toISOString(),
        },
      ],
      beforeRpc: async (name) => {
        if (pauseNextCommit && name === "athar_sync_commit_batch") {
          pauseNextCommit = false;
          enteredCommit();
          await holdCommit;
        }
      },
    });
    expect(await mod.syncNow()).toBe(true);

    mutate((state) => ({ ...state, progress: { beads: 11 } }));
    const remote = serverRows.find((row) => row.kind === "progress")!;
    remote.payload = { progress: { beads: 12 } }; // another device added two from the base of ten
    remote.revision = (remote.revision ?? 1) + 1;
    remote.updated_at = new Date(Date.now() + 60_000).toISOString();
    pauseNextCommit = true;

    const firstRun = mod.syncNow();
    await commitStarted;
    mutate((state) => ({ ...state, progress: { beads: 12 } })); // the user taps after our payload snapshot
    releaseCommit();
    expect(await firstRun).toBe(false);
    expect(current().progress).toEqual({ beads: 14 });
    expect(serverRows.find((row) => row.kind === "progress")?.payload).toEqual({ progress: { beads: 13 } });

    mod.stopCloudSync(); // cancel the scheduled follow-up; run it deterministically below
    expect(await mod.syncNow()).toBe(true);
    expect(current().progress).toEqual({ beads: 14 });
    expect(serverRows.find((row) => row.kind === "progress")?.payload).toEqual({ progress: { beads: 14 } });
  });

  it("never writes the pre-tap value back over it", async () => {
    // The reconcile reads local state, talks to the server, then applies the
    // merge. Anything counted in between is in neither — so applying that
    // merge put the old number back, and a count that had just gone 5 -> 6
    // dropped to 5 on its own a moment later.
    // The remote carries something the local copy lacks, so the merge really
    // does differ from the snapshot and the apply genuinely runs. With
    // identical sides the apply is skipped and the race never shows.
    let tapped = false;
    const { mod, current } = await load({
      local: { progress: { "morning:0": 5 } },
      rows: [
        {
          user_id: "user-a",
          kind: "progress",
          payload: { progress: { "morning:0": 5, "evening:2": 9 } },
          updated_at: new Date().toISOString(),
        },
      ],
      onSelect: (st) => {
        if (tapped) return;
        tapped = true;
        st.mutate((s) => ({ ...s, progress: { "morning:0": 6 } }));
      },
    });

    await mod.syncNow();

    expect(tapped).toBe(true);
    expect(current().progress).toEqual({ "morning:0": 6, "evening:2": 9 });
  });

  it("reports itself unfinished, so the tap still reaches the server", async () => {
    let tapped = false;
    const { mod } = await load({
      local: { progress: { a: 1 } },
      rows: [
        {
          user_id: "user-a",
          kind: "progress",
          payload: { progress: { a: 1 } },
          updated_at: new Date(Date.now() - 60_000).toISOString(),
        },
      ],
      onSelect: (st) => {
        if (tapped) return;
        tapped = true;
        st.mutate((s) => ({ ...s, progress: { a: 2 } }));
      },
    });

    // Not a success: this pass was overtaken, and another has to follow.
    expect(await mod.syncNow()).toBe(false);
  });

  it("still applies the merge when nothing moved", async () => {
    const { mod, current } = await load({
      local: { progress: { a: 1 } },
      rows: [
        {
          user_id: "user-a",
          kind: "progress",
          payload: { progress: { a: 1, b: 9 } },
          updated_at: new Date().toISOString(),
        },
      ],
    });

    expect(await mod.syncNow()).toBe(true);
    expect(current().progress).toEqual({ a: 1, b: 9 });
  });
});
