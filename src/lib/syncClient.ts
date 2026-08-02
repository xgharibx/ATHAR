/**
 * Athar cloud sync — the I/O half. Merge rules live in `syncMerge.ts`.
 *
 * Shape of the thing: sync is **full-state reconciliation**, not a log of
 * operations. Every run reads the whole local state, reads the user's six
 * server documents, three-way merges them, then writes back whatever changed.
 *
 * That choice is what makes it safe offline. There is no queue of pending
 * mutations that could be replayed out of order, lost, or grow without bound —
 * there is only a `dirty` flag. However many changes pile up while the phone is
 * in flight mode, the next successful run reconciles all of them at once, and a
 * run that fails half-way simply leaves `dirty` set for the next attempt.
 *
 * The `base` snapshot (what this device last agreed with the server) is stored
 * in IndexedDB rather than localStorage: the progress document alone can be
 * hundreds of kilobytes, and this app already had to move hadith state out of
 * localStorage once to escape the 5 MB quota.
 */
import Dexie, { type Table } from "dexie";
import { useNoorStore } from "@/store/noorStore";
import { getSupabase, getSession } from "@/lib/authClient";
import {
  SYNC_KINDS,
  bucketize,
  debucketize,
  emptyBuckets,
  mergeDoc,
  type SyncBlob,
  type SyncBuckets,
  type SyncKind,
} from "@/lib/syncMerge";

const DB_NAME = "athar-sync-v1";
const BASE_KEY = "base";
const META_KEY = "meta";
const DEVICE_KEY = "athar_device_id_v1";

/** Debounce between a local edit and the push it triggers. Long enough that
 *  counting a 33-bead tasbeeh is one upload rather than 33. */
const PUSH_DEBOUNCE_MS = 6000;
/** Background re-pull cadence while the app is open and visible. */
const POLL_MS = 5 * 60 * 1000;

type Meta = {
  userId: string;
  /** ms epoch of the last fully successful reconcile. */
  lastSyncedAt: number;
  /** Local edits exist that the server has not accepted yet. */
  dirty: boolean;
};

interface Row {
  key: string;
  value: unknown;
}

class SyncDexie extends Dexie {
  kv!: Table<Row, string>;
  constructor() {
    super(DB_NAME);
    this.version(1).stores({ kv: "key" });
  }
}

let _db: SyncDexie | null = null;
function db(): SyncDexie {
  if (!_db) _db = new SyncDexie();
  return _db;
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return ((await db().kv.get(key))?.value as T) ?? null;
  } catch {
    return null; // storage unavailable (private mode, quota) — sync degrades, app doesn't
  }
}

async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    await db().kv.put({ key, value });
  } catch {
    /* non-fatal: we just re-merge from scratch next time */
  }
}

async function kvDel(key: string): Promise<void> {
  try {
    await db().kv.delete(key);
  } catch {
    /* non-fatal */
  }
}

/** Stable per-install id, so the server row can say which device wrote last. */
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "d_unknown";
  }
}

// ————————————————————————————————————————————————————————————————
// observable status (for the account panel)
// ————————————————————————————————————————————————————————————————

export type SyncPhase = "idle" | "syncing" | "error" | "offline";

export type SyncStatus = {
  phase: SyncPhase;
  lastSyncedAt: number | null;
  /** Arabic, ready to render. */
  error: string | null;
  pending: boolean;
};

let current: SyncStatus = { phase: "idle", lastSyncedAt: null, error: null, pending: false };
const listeners = new Set<(s: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return current;
}

export function subscribeSyncStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setStatus(patch: Partial<SyncStatus>): void {
  current = { ...current, ...patch };
  for (const cb of listeners) {
    try {
      cb(current);
    } catch {
      /* a broken subscriber must not break sync */
    }
  }
}

// ————————————————————————————————————————————————————————————————
// the reconcile
// ————————————————————————————————————————————————————————————————

type ServerRow = { kind: string; payload: unknown; updated_at: string };

let inFlight: Promise<boolean> | null = null;

/**
 * Reconcile local state with the server exactly once.
 *
 * Returns true when the round-trip completed. Safe to call concurrently — the
 * second caller joins the run already in progress rather than racing it, which
 * matters because two overlapping reconciles could each write a merge that
 * omits the other's changes.
 */
export function syncNow(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return false;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus({ phase: "offline" });
    return false;
  }

  setStatus({ phase: "syncing", error: null });

  try {
    let meta = await kvGet<Meta>(META_KEY);
    // A different account on this device: the previous base describes someone
    // else's data and must not be used to compute deletions against it.
    if (meta && meta.userId !== userId) {
      await kvDel(BASE_KEY);
      meta = null;
    }

    const base = (await kvGet<Partial<SyncBuckets>>(BASE_KEY)) ?? null;
    const lastSyncedAt = meta?.lastSyncedAt ?? 0;

    const localBlob = useNoorStore.getState().exportState() as unknown as SyncBlob;
    const localBuckets = bucketize(localBlob);

    const { data, error } = await supabase
      .from("athar_sync")
      .select("kind, payload, updated_at")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const rows = new Map<string, ServerRow>();
    for (const r of (data ?? []) as ServerRow[]) rows.set(r.kind, r);

    const mergedBuckets = emptyBuckets();
    const toWrite: Array<{ user_id: string; kind: SyncKind; payload: SyncBlob; device_id: string }> = [];

    for (const kind of SYNC_KINDS) {
      const localDoc = localBuckets[kind];
      const row = rows.get(kind);
      const remoteDoc = (row && typeof row.payload === "object" && row.payload !== null
        ? (row.payload as SyncBlob)
        : {}) as SyncBlob;

      const remoteStamp = row ? Date.parse(row.updated_at) : 0;
      // Only relevant for opaque settings-style values; counters and sets
      // resolve without needing to know who wrote last.
      const remoteNewer = Number.isFinite(remoteStamp) && remoteStamp > lastSyncedAt;

      const merged = mergeDoc(localDoc, remoteDoc, {
        remoteNewer,
        base: base?.[kind] ?? null,
      });
      mergedBuckets[kind] = merged;

      // Skip the write when the server already holds exactly this — most runs
      // change one document, not six.
      if (!row || !sameDoc(merged, remoteDoc)) {
        toWrite.push({ user_id: userId, kind, payload: merged, device_id: deviceId() });
      }
    }

    if (toWrite.length > 0) {
      const { error: upsertError } = await supabase
        .from("athar_sync")
        .upsert(toWrite, { onConflict: "user_id,kind" });
      if (upsertError) throw new Error(upsertError.message);
    }

    // Apply back to the app only when the merge actually changed something,
    // so a no-op sync never churns React or re-triggers the dirty flag.
    const mergedBlob = debucketize(mergedBuckets);
    if (!sameDoc(mergedBlob, localBlob)) {
      applyingRemote = true;
      try {
        useNoorStore.getState().importState({
          version: 1,
          exportedAt: new Date().toISOString(),
          // Whole-field removal is never a user action (the user deletes
          // items, not entire collections), so fall back to local for any
          // field the merge dropped. Per-key deletions still apply.
          ...localBlob,
          ...mergedBlob,
        } as never);
      } finally {
        applyingRemote = false;
      }
    }

    await kvSet(BASE_KEY, mergedBuckets);
    const now = Date.now();
    await kvSet(META_KEY, { userId, lastSyncedAt: now, dirty: false } satisfies Meta);

    setStatus({ phase: "idle", lastSyncedAt: now, error: null, pending: false });
    return true;
  } catch (e) {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    setStatus({
      phase: offline ? "offline" : "error",
      error: offline ? null : e instanceof Error ? e.message : "تعذّرت المزامنة",
      pending: true,
    });
    return false;
  }
}

function sameDoc(a: unknown, b: unknown): boolean {
  return stableString(a) === stableString(b);
}

function stableString(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableString).join(",")}]`;
  const keys = Object.keys(v as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableString((v as SyncBlob)[k])}`).join(",")}}`;
}

// ————————————————————————————————————————————————————————————————
// lifecycle
// ————————————————————————————————————————————————————————————————

/** True while we are writing merged server state into the store, so the store
 *  subscription doesn't mistake our own write for a user edit and loop. */
let applyingRemote = false;

let stopFns: Array<() => void> = [];
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  setStatus({ pending: true });
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void syncNow();
  }, PUSH_DEBOUNCE_MS);
}

/**
 * Begin syncing for the signed-in user. Idempotent; calling it twice does not
 * install two sets of listeners.
 */
export function startCloudSync(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  started = true;

  // Reconcile immediately — this is the first-sign-in merge.
  void syncNow();

  const unsubStore = useNoorStore.subscribe(() => {
    if (applyingRemote) return;
    schedulePush();
  });
  stopFns.push(unsubStore);

  const onOnline = () => void syncNow();
  window.addEventListener("online", onOnline);
  stopFns.push(() => window.removeEventListener("online", onOnline));

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void syncNow();
    } else if (pushTimer) {
      // Heading to the background with edits still debounced — flush now
      // rather than lose the timer to a suspended tab.
      clearTimeout(pushTimer);
      pushTimer = null;
      void syncNow();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  stopFns.push(() => document.removeEventListener("visibilitychange", onVisibility));

  pollTimer = setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, POLL_MS);
}

/** Stop syncing (sign-out). Optionally forget this device's cloud footprint. */
export function stopCloudSync(opts?: { forget?: boolean }): void {
  started = false;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  for (const fn of stopFns) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
  stopFns = [];
  setStatus({ phase: "idle", pending: false, error: null });

  if (opts?.forget) {
    // The base belongs to the account that just left. Keeping it would make the
    // next account's first merge compute deletions against a stranger's data.
    void kvDel(BASE_KEY);
    void kvDel(META_KEY);
    setStatus({ lastSyncedAt: null });
  }
}

/** Push any outstanding edits right now (used before sign-out). */
export async function flushCloudSync(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await syncNow();
}
