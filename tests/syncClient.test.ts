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

type Row = { user_id: string; kind: string; payload: unknown; updated_at: string; device_id?: string };

/** Minimal stand-in for the PostgREST calls syncClient makes. */
function makeSupabase(rows: Row[]) {
  const store = [...rows];
  const upserts: Row[][] = [];
  const client = {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, userId: string) {
              return Promise.resolve({
                data: store.filter((r) => r.user_id === userId),
                error: null,
              });
            },
          };
        },
        upsert(batch: Row[]) {
          upserts.push(batch.map((r) => ({ ...r })));
          for (const r of batch) {
            const i = store.findIndex((s) => s.user_id === r.user_id && s.kind === r.kind);
            const withStamp = { ...r, updated_at: new Date().toISOString() };
            if (i >= 0) store[i] = withStamp;
            else store.push(withStamp);
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client, serverRows: store, upserts };
}

/** A fake noorStore whose exported blob the test controls. */
function makeStore(initial: Record<string, unknown>) {
  let state = { ...initial };
  const imported: Array<Record<string, unknown>> = [];
  const store = {
    getState: () => ({
      exportState: () => ({ ...state }),
      importState: (blob: Record<string, unknown>) => {
        imported.push(blob);
        const { version: _v, exportedAt: _e, ...rest } = blob;
        state = rest;
      },
    }),
    subscribe: () => () => {},
  };
  return { store, imported, current: () => state };
}

async function load(opts: {
  rows?: Row[];
  local: Record<string, unknown>;
  userId?: string;
  online?: boolean;
}) {
  vi.resetModules();
  const sb = makeSupabase(opts.rows ?? []);
  const st = makeStore(opts.local);
  const userId = opts.userId ?? "user-a";

  vi.doMock("@/lib/authClient", () => ({
    getSupabase: () => sb.client,
    getSession: () => Promise.resolve({ user: { id: userId } }),
  }));
  vi.doMock("@/store/noorStore", () => ({ useNoorStore: st.store }));

  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => opts.online ?? true,
  });

  const mod = await import("@/lib/syncClient");
  return { ...sb, ...st, mod, userId };
}

beforeEach(() => {
  indexedDB.deleteDatabase("athar-sync-v1");
  localStorage.clear();
});

afterEach(() => {
  vi.doUnmock("@/lib/authClient");
  vi.doUnmock("@/store/noorStore");
});

describe("first sign-in", () => {
  it("uploads local state when the cloud is empty", async () => {
    const { mod, upserts, current } = await load({
      local: { progress: { "morning:0": 5 }, favorites: { x: true }, prefs: { theme: "layl" } },
    });

    expect(await mod.syncNow()).toBe(true);

    // Local data survives untouched…
    expect(current().progress).toEqual({ "morning:0": 5 });
    // …and reached the server.
    const sent = upserts.flat();
    const progressDoc = sent.find((r) => r.kind === "progress")?.payload as Record<string, unknown>;
    expect(progressDoc.progress).toEqual({ "morning:0": 5 });
    expect(sent.find((r) => r.kind === "favorites")?.payload).toEqual({ favorites: { x: true } });
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
  it("writes nothing on a second run with no changes", async () => {
    const { mod, upserts } = await load({ local: { progress: { a: 1 } } });

    await mod.syncNow();
    const afterFirst = upserts.length;
    expect(afterFirst).toBeGreaterThan(0);

    await mod.syncNow();
    expect(upserts.length).toBe(afterFirst); // no redundant upload
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
  it("discards the previous account's base instead of treating local data as deleted", async () => {
    // This is the bug that would wipe a device: user A's base lists every key,
    // user B's cloud is empty, so a reused base makes every local key look like
    // a deletion.
    const first = await load({ local: { favorites: { x: true, y: true } }, userId: "user-a" });
    await first.mod.syncNow();

    // Same device, same IndexedDB, different account and an empty cloud.
    const second = await load({ local: { favorites: { x: true, y: true } }, userId: "user-b" });
    expect(await second.mod.syncNow()).toBe(true);

    expect(second.current().favorites).toEqual({ x: true, y: true });
    const sent = second.upserts.flat().find((r) => r.kind === "favorites");
    expect(sent?.payload).toEqual({ favorites: { x: true, y: true } });
    expect(sent?.user_id).toBe("user-b");
  });
});

describe("offline", () => {
  it("reports offline and keeps local state intact", async () => {
    const { mod, upserts, current } = await load({
      local: { progress: { a: 3 } },
      online: false,
    });

    expect(await mod.syncNow()).toBe(false);
    expect(mod.getSyncStatus().phase).toBe("offline");
    expect(upserts).toHaveLength(0);
    expect(current().progress).toEqual({ a: 3 });
  });

  it("uploads once back online", async () => {
    const { mod, upserts } = await load({ local: { progress: { a: 3 } }, online: false });
    await mod.syncNow();
    expect(upserts).toHaveLength(0);

    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    expect(await mod.syncNow()).toBe(true);
    expect(upserts.flat().length).toBeGreaterThan(0);
    expect(mod.getSyncStatus().phase).toBe("idle");
  });
});

describe("concurrency", () => {
  it("joins an in-flight run rather than racing it", async () => {
    const { mod, upserts } = await load({ local: { progress: { a: 1 } } });
    const [a, b] = await Promise.all([mod.syncNow(), mod.syncNow()]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(upserts).toHaveLength(1); // one reconcile, not two
  });
});
