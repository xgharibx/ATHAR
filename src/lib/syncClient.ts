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
import { accountScopedDatabaseName } from "@/lib/accountStorageScope";
import { getSupabase, getSession } from "@/lib/authClient";
import { adoptLeaderboardIdentity, exportLeaderboardIdentity } from "@/lib/leaderboard";
import { adoptDataPacks, exportDataPacks } from "@/data/packs";
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
const PENDING_KEY = "pending";
const DEVICE_KEY = "athar_device_id_v1";
const MAX_CONFLICT_ATTEMPTS = 4;
const SYNC_REQUEST_TIMEOUT_MS = 15_000;
const SYNC_REQUEST_TIMEOUT_MESSAGE = "انتهت مهلة المزامنة. تحقق من اتصالك ثم أعد المحاولة.";
const MAX_SYNC_DOCUMENT_BYTES = 4 * 1024 * 1024;
const MAX_SYNC_BATCH_BYTES = 5 * 1024 * 1024;
const SYNC_PAYLOAD_TOO_LARGE_MESSAGE = "بياناتك أكبر من حد المزامنة؛ بقيت محفوظة على هذا الجهاز.";

async function withSyncTimeout<T>(request: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(SYNC_REQUEST_TIMEOUT_MESSAGE)), SYNC_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

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
  /** Per-document server versions at the common base. Older clients lack this. */
  serverRevisions?: Partial<Record<SyncKind, number>>;
};

type SyncWrite = {
  kind: SyncKind;
  expected_revision: number | null;
  payload: SyncBlob;
};

class SyncPayloadTooLargeError extends Error {
  constructor() {
    super(SYNC_PAYLOAD_TOO_LARGE_MESSAGE);
    this.name = "SyncPayloadTooLargeError";
  }
}

function assertSyncPayloadWithinLimits(writes: SyncWrite[]): void {
  const encoder = new TextEncoder();
  const serializedWrites = JSON.stringify(writes);
  if (!serializedWrites || encoder.encode(serializedWrites).byteLength > MAX_SYNC_BATCH_BYTES) {
    throw new SyncPayloadTooLargeError();
  }
  if (writes.some((write) => {
    const serializedPayload = JSON.stringify(write.payload);
    return !serializedPayload || encoder.encode(serializedPayload).byteLength > MAX_SYNC_DOCUMENT_BYTES;
  })) {
    throw new SyncPayloadTooLargeError();
  }
}

type PendingCommit = {
  userId: string;
  requestId: string;
  deviceId: string;
  mode: "rpc" | "local";
  state: "prepared" | "committed" | "applying" | "applied";
  writes: SyncWrite[];
  /** Local snapshot used as the common ancestor for this attempt. */
  sourceBuckets: SyncBuckets;
  /** Set after the server has accepted the request (or for local-only reconcile). */
  serverBuckets?: SyncBuckets;
  /** Per-document server versions used as this commit's merge base. */
  serverRevisions?: Partial<Record<SyncKind, number>>;
  targetBlob?: SyncBlob;
  preApplyBlob?: SyncBlob;
  lastSyncedAt?: number;
};

type CommitReply = {
  status: "committed" | "conflict" | "replayed" | "pending_ack";
  revisions?: Record<string, number>;
};

interface Row {
  key: string;
  value: unknown;
}

class SyncDexie extends Dexie {
  kv!: Table<Row, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ kv: "key" });
  }
}

const _dbs = new Map<string, SyncDexie>();
function db(): SyncDexie {
  const name = accountScopedDatabaseName(DB_NAME);
  let instance = _dbs.get(name);
  if (!instance) {
    instance = new SyncDexie(name);
    _dbs.set(name, instance);
  }
  return instance;
}

async function kvGet<T>(key: string): Promise<T | null> {
  return ((await db().kv.get(key))?.value as T) ?? null;
}

async function kvDel(key: string): Promise<void> {
  try {
    await db().kv.delete(key);
  } catch {
    /* non-fatal */
  }
}

async function inKvTransaction<T>(work: (table: Table<Row, string>) => Promise<T>): Promise<T> {
  const database = db();
  return database.transaction("rw", database.kv, () => work(database.kv));
}

async function readPending(): Promise<PendingCommit | null> {
  return kvGet<PendingCommit>(PENDING_KEY);
}

/** IndexedDB serializes this read+add across tabs sharing an account database. */
async function claimPending(pending: PendingCommit): Promise<{ claimed: boolean; pending: PendingCommit }> {
  return inKvTransaction(async (table) => {
    const current = (await table.get(PENDING_KEY))?.value as PendingCommit | undefined;
    if (current) return { claimed: false, pending: current };
    await table.add({ key: PENDING_KEY, value: pending });
    return { claimed: true, pending };
  });
}

async function persistNoPending(
  base: SyncBuckets,
  meta: Meta,
): Promise<{ saved: boolean; pending: PendingCommit | null }> {
  return inKvTransaction(async (table) => {
    const current = (await table.get(PENDING_KEY))?.value as PendingCommit | undefined;
    if (current) return { saved: false, pending: current };
    await table.put({ key: BASE_KEY, value: base });
    await table.put({ key: META_KEY, value: meta });
    return { saved: true, pending: null };
  });
}

async function claimLocalReconcile(
  pending: PendingCommit,
  base: SyncBuckets,
  meta: Meta,
): Promise<{ claimed: boolean; pending: PendingCommit }> {
  return inKvTransaction(async (table) => {
    const current = (await table.get(PENDING_KEY))?.value as PendingCommit | undefined;
    if (current) return { claimed: false, pending: current };
    await table.add({ key: PENDING_KEY, value: pending });
    await table.put({ key: BASE_KEY, value: base });
    await table.put({ key: META_KEY, value: meta });
    return { claimed: true, pending };
  });
}

async function markCommitted(
  pending: PendingCommit,
  targetBlob: SyncBlob,
  serverBuckets: SyncBuckets,
  meta: Meta,
): Promise<PendingCommit | null> {
  return inKvTransaction(async (table) => {
    const stored = (await table.get(PENDING_KEY))?.value as PendingCommit | undefined;
    if (!stored || stored.requestId !== pending.requestId) return stored ?? null;
    // Another tab may already have completed this exact receipt. Its durable
    // target wins; the caller will merge any newer local edits into it below.
    if (stored.state !== "prepared") return stored;
    const committed: PendingCommit = {
      ...stored,
      state: "committed",
      targetBlob,
      serverBuckets,
      serverRevisions: meta.serverRevisions,
      lastSyncedAt: meta.lastSyncedAt,
    };
    await table.put({ key: BASE_KEY, value: serverBuckets });
    await table.put({ key: META_KEY, value: meta });
    await table.put({ key: PENDING_KEY, value: committed });
    return committed;
  });
}

async function updateCommittedTarget(
  pending: PendingCommit,
  targetBlob: SyncBlob,
  meta: Meta,
): Promise<PendingCommit | null> {
  return inKvTransaction(async (table) => {
    const stored = (await table.get(PENDING_KEY))?.value as PendingCommit | undefined;
    if (!stored || stored.requestId !== pending.requestId) {
      return stored ?? null;
    }
    if (stored.state === "applied" && pending.state !== "applied") return stored;
    const updated: PendingCommit = {
      ...stored,
      state: pending.state,
      targetBlob,
      preApplyBlob: pending.state === "applying" ? pending.preApplyBlob : undefined,
      lastSyncedAt: meta.lastSyncedAt,
    };
    await table.put({ key: META_KEY, value: meta });
    await table.put({ key: PENDING_KEY, value: updated });
    return updated;
  });
}

async function clearPreparedIfMatching(requestId: string): Promise<PendingCommit | null> {
  return inKvTransaction(async (table) => {
    const stored = (await table.get(PENDING_KEY))?.value as PendingCommit | undefined;
    if (!stored) return null;
    if (stored.requestId !== requestId || stored.state !== "prepared") return stored;
    await table.delete(PENDING_KEY);
    return null;
  });
}

async function clearPendingIfMatching(requestId: string): Promise<boolean> {
  return inKvTransaction(async (table) => {
    const stored = (await table.get(PENDING_KEY))?.value as PendingCommit | undefined;
    if (!stored) return true; // a concurrent tab already finalized it
    if (stored.requestId !== requestId) return false;
    await table.delete(PENDING_KEY);
    return true;
  });
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
let payloadTooLargeBlocked = false;
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

type ServerRow = { kind: SyncKind; payload: unknown; updated_at: string; revision: number };
type ServerSnapshot = { rows: Map<SyncKind, ServerRow>; buckets: SyncBuckets };

function revisionsFromRows(rows: Map<SyncKind, ServerRow>): Partial<Record<SyncKind, number>> {
  const revisions: Partial<Record<SyncKind, number>> = {};
  for (const [kind, row] of rows) revisions[kind] = row.revision;
  return revisions;
}

let inFlight: Promise<boolean> | null = null;
let syncGeneration = 0;
let flightGeneration = -1;

/** Export envelopes describe the act of exporting, not an edit to user data. */
function withoutExportMetadata(blob: SyncBlob): SyncBlob {
  const { version: _version, exportedAt: _exportedAt, ...state } = blob;
  return state;
}

function localSnapshot(): SyncBlob {
  return {
    ...withoutExportMetadata(useNoorStore.getState().exportState() as unknown as SyncBlob),
    leaderboardIdentity: exportLeaderboardIdentity(),
    dataPacks: exportDataPacks(),
  };
}

async function readServerSnapshot(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  isCurrent: () => boolean,
): Promise<ServerSnapshot | null> {
  const { data, error } = await withSyncTimeout(supabase
    .from("athar_sync")
    .select("kind, payload, updated_at, revision")
    .eq("user_id", userId));
  if (!isCurrent()) return null;
  if (error) throw new Error(error.message);

  const rows = new Map<SyncKind, ServerRow>();
  const buckets = emptyBuckets();
  for (const candidate of (data ?? []) as Array<{
    kind: string;
    payload: unknown;
    updated_at: string;
    revision: number;
  }>) {
    if (!SYNC_KINDS.includes(candidate.kind as SyncKind)) continue;
    const kind = candidate.kind as SyncKind;
    const row: ServerRow = { ...candidate, kind };
    rows.set(kind, row);
    buckets[kind] = withoutExportMetadata(
      typeof candidate.payload === "object" && candidate.payload !== null && !Array.isArray(candidate.payload)
        ? candidate.payload as SyncBlob
        : {},
    );
  }
  return { rows, buckets };
}

function mergeBuckets(
  local: SyncBuckets,
  remote: SyncBuckets,
  base: Partial<SyncBuckets> | null,
  rows: Map<SyncKind, ServerRow> | null,
  lastSyncedAt: number,
  preferLocalScalars = false,
  baseRevisions?: Partial<Record<SyncKind, number>>,
): SyncBuckets {
  const merged = emptyBuckets();
  for (const kind of SYNC_KINDS) {
    const row = rows?.get(kind);
    const stamp = row?.updated_at;
    const parsedStamp = stamp ? Date.parse(stamp) : 0;
    const remoteChangedSinceBase = baseRevisions
      ? (row?.revision ?? 0) > (baseRevisions[kind] ?? 0)
      : Number.isFinite(parsedStamp) && parsedStamp > lastSyncedAt;
    merged[kind] = mergeDoc(local[kind], remote[kind], {
      remoteNewer: !preferLocalScalars && remoteChangedSinceBase,
      base: base?.[kind] ?? null,
    });
  }
  return merged;
}

function bucketsDiffer(a: SyncBuckets, b: SyncBuckets): boolean {
  return SYNC_KINDS.some((kind) => !sameDoc(a[kind], b[kind]));
}

function makeWrites(merged: SyncBuckets, server: ServerSnapshot): SyncWrite[] {
  const writes: SyncWrite[] = [];
  for (const kind of SYNC_KINDS) {
    if (!server.rows.has(kind) || !sameDoc(merged[kind], server.buckets[kind])) {
      writes.push({
        kind,
        expected_revision: server.rows.get(kind)?.revision ?? null,
        payload: merged[kind],
      });
    }
  }
  return writes;
}

function newRequestId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function dispatchDataChange(eventName: string): void {
  try {
    window.dispatchEvent(new CustomEvent(eventName));
  } catch {
    /* non-DOM environment */
  }
}

async function applyBlob(blob: SyncBlob, isCurrent: () => boolean): Promise<boolean> {
  const { leaderboardIdentity, dataPacks, ...targetStoreBlob } = blob;
  const currentBlob = localSnapshot();
  const { leaderboardIdentity: _identity, dataPacks: _packs, ...currentStoreBlob } = currentBlob;

  applyingRemote = true;
  try {
    let importResult: unknown;
    if (!sameDoc(targetStoreBlob, currentStoreBlob)) {
      importResult = useNoorStore.getState().importState({
        version: 1,
        exportedAt: new Date().toISOString(),
        // Whole-field removal is not a user action; per-key deletions still apply.
        ...currentStoreBlob,
        ...targetStoreBlob,
      } as never);
    }

    if (dataPacks && adoptDataPacks(dataPacks)) dispatchDataChange("athar-data-packs-changed");
    if (leaderboardIdentity && adoptLeaderboardIdentity(leaderboardIdentity)) {
      dispatchDataChange("athar-leaderboard-identity-changed");
    }

    const appliedImmediately = localSnapshot();
    await importResult;
    if (!isCurrent()) return false;
    return sameDoc(localSnapshot(), appliedImmediately);
  } finally {
    applyingRemote = false;
  }
}

async function storeCommittedTarget(
  pending: PendingCommit,
  targetBlob: SyncBlob,
  serverBuckets: SyncBuckets,
  lastSyncedAt: number,
  serverRevisions: Partial<Record<SyncKind, number>>,
): Promise<PendingCommit | null> {
  const dirty = bucketsDiffer(bucketize(targetBlob), serverBuckets);
  return markCommitted(
    pending,
    targetBlob,
    serverBuckets,
    { userId: pending.userId, lastSyncedAt, dirty, serverRevisions },
  );
}

async function finishCommitted(
  pendingRecord: PendingCommit,
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  isCurrent: () => boolean,
): Promise<boolean> {
  let pending = pendingRecord;

  if (pending.state === "prepared") {
    if (pending.mode !== "rpc") throw new Error("حالة المزامنة المحلية غير صحيحة");
    const server = await readServerSnapshot(supabase, pending.userId, isCurrent);
    if (!server || !isCurrent()) return false;
    const latestBuckets = bucketize(localSnapshot());
    const target = mergeBuckets(latestBuckets, server.buckets, pending.sourceBuckets, null, 0, true);
    const stored = await storeCommittedTarget(
      pending,
      debucketize(target),
      server.buckets,
      Date.now(),
      revisionsFromRows(server.rows),
    );
    if (!isCurrent()) return false;
    if (!stored) return true; // another tab already acknowledged and cleared it
    if (stored.requestId !== pending.requestId) return false;
    pending = stored;
  }

  if (pending.state === "prepared" || !pending.targetBlob! || !pending.serverBuckets!) {
    throw new Error("تعذّر استعادة عملية المزامنة المحفوظة");
  }

  const lastSyncedAt = pending.lastSyncedAt ?? Date.now();
  let stable = false;
  for (let attempt = 0; attempt < 7 && isCurrent(); attempt += 1) {
    const currentBlob = localSnapshot();
    const targetBuckets = bucketize(pending.targetBlob!);

    if (pending.state === "committed") {
      // The local import has not started yet. Rebase the latest app state on
      // the exact server snapshot using the attempt snapshot as its ancestor.
      const rebased = mergeBuckets(
        bucketize(currentBlob),
        pending.serverBuckets!,
        pending.sourceBuckets,
        null,
        0,
        true,
      );
      const targetBlob = debucketize(rebased);
      const updated = await updateCommittedTarget(
        { ...pending, state: "applying", preApplyBlob: currentBlob },
        targetBlob,
        {
          userId: pending.userId,
          lastSyncedAt,
          dirty: bucketsDiffer(rebased, pending.serverBuckets!),
          serverRevisions: pending.serverRevisions,
        },
      );
      if (!isCurrent()) return false;
      if (!updated || updated.requestId !== pending.requestId) return false;
      pending = updated;
      continue;
    }

    if (pending.state === "applying") {
      if (pending.preApplyBlob && sameDoc(currentBlob, pending.preApplyBlob)) {
        // Durable intent is written before import. If the process died before
        // touching app storage, restore the exact target without re-merging it.
        if (!sameDoc(currentBlob, pending.targetBlob!)) {
          await applyBlob(pending.targetBlob!, isCurrent);
          if (!isCurrent()) return false;
        }
        const afterImport = localSnapshot();
        const adjusted = mergeBuckets(
          bucketize(afterImport),
          targetBuckets,
          targetBuckets,
          null,
          0,
          true,
        );
        const updated = await updateCommittedTarget(
          { ...pending, state: "applied", preApplyBlob: undefined },
          debucketize(adjusted),
          {
            userId: pending.userId,
            lastSyncedAt,
            dirty: bucketsDiffer(adjusted, pending.serverBuckets!),
            serverRevisions: pending.serverRevisions,
          },
        );
        if (!isCurrent()) return false;
        if (!updated || updated.requestId !== pending.requestId) return false;
        pending = updated;
        continue;
      }

      // A changed local snapshot means the import had started before a crash or
      // a user edited after it. Treat the durable target as the common ancestor.
      const adjusted = mergeBuckets(
        bucketize(currentBlob),
        targetBuckets,
        targetBuckets,
        null,
        0,
        true,
      );
      const updated = await updateCommittedTarget(
        { ...pending, state: "applied", preApplyBlob: undefined },
        debucketize(adjusted),
        {
          userId: pending.userId,
          lastSyncedAt,
          dirty: bucketsDiffer(adjusted, pending.serverBuckets!),
          serverRevisions: pending.serverRevisions,
        },
      );
      if (!isCurrent()) return false;
      if (!updated || updated.requestId !== pending.requestId) return false;
      pending = updated;
      continue;
    }

    // Once applied, edits made afterward are rebased against the exact target
    // that was persisted, so replaying a receipt cannot add its deltas again.
    const adjusted = mergeBuckets(
      bucketize(currentBlob),
      targetBuckets,
      targetBuckets,
      null,
      0,
      true,
    );
    const adjustedBlob = debucketize(adjusted);
    if (!sameDoc(adjustedBlob, pending.targetBlob!)) {
      const updated = await updateCommittedTarget(
        { ...pending, state: "applied", preApplyBlob: undefined },
        adjustedBlob,
        {
          userId: pending.userId,
          lastSyncedAt,
          dirty: bucketsDiffer(adjusted, pending.serverBuckets!),
          serverRevisions: pending.serverRevisions,
        },
      );
      if (!isCurrent()) return false;
      if (!updated || updated.requestId !== pending.requestId) return false;
      pending = updated;
      continue;
    }

    if (!sameDoc(currentBlob, pending.targetBlob!)) {
      await applyBlob(pending.targetBlob!, isCurrent);
      if (!isCurrent()) return false;
      const afterImport = localSnapshot();
      if (!sameDoc(afterImport, pending.targetBlob!)) {
        const postImport = mergeBuckets(
          bucketize(afterImport),
          targetBuckets,
          targetBuckets,
          null,
          0,
          true,
        );
        const updated = await updateCommittedTarget(
          { ...pending, state: "applied", preApplyBlob: undefined },
          debucketize(postImport),
          {
            userId: pending.userId,
            lastSyncedAt,
            dirty: bucketsDiffer(postImport, pending.serverBuckets!),
            serverRevisions: pending.serverRevisions,
          },
        );
        if (!isCurrent()) return false;
        if (!updated || updated.requestId !== pending.requestId) return false;
        pending = updated;
        continue;
      }
    }

    stable = true;
    break;
  }

  if (!stable || !isCurrent()) {
    setStatus({ phase: "idle", lastSyncedAt, pending: true });
    scheduleFollowUp();
    return false;
  }

  if (pending.mode === "rpc") {
    const { data, error } = await withSyncTimeout(supabase.rpc("athar_sync_ack_batch", {
      p_request_id: pending.requestId,
      p_device_id: pending.deviceId,
    }));
    if (!isCurrent()) return false;
    if (error) throw new Error(error.message);
    if ((data as { acknowledged?: unknown } | null)?.acknowledged !== true) {
      throw new Error("تعذّر تأكيد اكتمال المزامنة");
    }
  }

  const cleared = await clearPendingIfMatching(pending.requestId);
  if (!isCurrent()) return false;
  if (!cleared) {
    setStatus({ phase: "idle", lastSyncedAt, pending: true });
    scheduleFollowUp();
    return false;
  }

  const dirty = bucketsDiffer(bucketize(pending.targetBlob!), pending.serverBuckets!);
  failures = 0;
  setStatus({ phase: "idle", lastSyncedAt, error: null, pending: dirty });
  if (dirty) scheduleFollowUp();
  return !dirty;
}

async function recoverFromOversizedPreparedRequest(
  pending: PendingCommit,
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  isCurrent: () => boolean,
): Promise<"done" | "again" | "stale"> {
  const stillPending = await readPending();
  if (!isCurrent()) return "stale";
  if (!stillPending || stillPending.requestId !== pending.requestId) return "again";

  // Reconcile against the server before acknowledging the old request. It may
  // already have committed on an older client and be waiting on its receipt;
  // finishing it also safely handles the case where it never reached the RPC.
  const completed = await finishCommitted(stillPending, supabase, isCurrent);
  if (!isCurrent()) return "stale";
  if (!completed && getSyncStatus().pending) {
    if (followUpTimer) {
      clearTimeout(followUpTimer);
      followUpTimer = null;
    }
    payloadTooLargeBlocked = true;
    setStatus({
      phase: "error",
      error: SYNC_PAYLOAD_TOO_LARGE_MESSAGE,
      pending: true,
    });
    return "done";
  }
  return completed ? "done" : "again";
}

async function processPending(
  pending: PendingCommit,
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  isCurrent: () => boolean,
): Promise<"done" | "conflict" | "again" | "stale"> {
  if (pending.state !== "prepared") {
    const completed = await finishCommitted(pending, supabase, isCurrent);
    if (!isCurrent()) return "stale";
    return !completed && !getSyncStatus().pending ? "again" : "done";
  }

  if (pending.mode !== "rpc") throw new Error("عملية المزامنة المحفوظة غير صالحة");
  try {
    assertSyncPayloadWithinLimits(pending.writes);
  } catch (error) {
    if (!(error instanceof SyncPayloadTooLargeError)) throw error;
    return recoverFromOversizedPreparedRequest(pending, supabase, isCurrent);
  }
  const { data, error } = await withSyncTimeout(supabase.rpc("athar_sync_commit_batch", {
    p_request_id: pending.requestId,
    p_device_id: pending.deviceId,
    p_writes: pending.writes,
  }));
  if (!isCurrent()) return "stale";
  if (error) {
    if (
      (error.code === "22023" && error.message.includes("SYNC_PAYLOAD_TOO_LARGE")) ||
      (error.code === "23514" && error.message.includes("athar_sync_payload_max_4mib"))
    ) {
      return recoverFromOversizedPreparedRequest(pending, supabase, isCurrent);
    }
    throw new Error(error.message);
  }

  const reply = data as CommitReply | null;
  if (reply?.status === "conflict") {
    const stillPending = await clearPreparedIfMatching(pending.requestId);
    if (!isCurrent()) return "stale";
    if (stillPending?.state === "committed") {
      const completed = await finishCommitted(stillPending, supabase, isCurrent);
      if (!isCurrent()) return "stale";
      return !completed && !getSyncStatus().pending ? "again" : "done";
    }
    return stillPending ? "again" : "conflict";
  }
  if (reply?.status === "pending_ack") {
    throw new Error("توجد مزامنة سابقة تنتظر التأكيد؛ سنحاول استعادتها تلقائيًا");
  }
  if (reply?.status !== "committed" && reply?.status !== "replayed") {
    throw new Error("استجابة المزامنة غير مفهومة");
  }

  const completed = await finishCommitted(pending, supabase, isCurrent);
  if (!isCurrent()) return "stale";
  return !completed && !getSyncStatus().pending ? "again" : "done";
}

/**
 * Reconcile local state with revision-checked, idempotent server commits.
 * IndexedDB owns one durable pending request per account across tabs. A
 * prepared request is replayed exactly; only a server conflict permits a
 * fresh merge.
 */
export function syncNow(): Promise<boolean> {
  const generation = syncGeneration;
  if (inFlight && flightGeneration === generation) return inFlight;
  const run = runSync(generation).finally(() => {
    if (inFlight === run) inFlight = null;
  });
  flightGeneration = generation;
  inFlight = run;
  return run;
}

async function runSync(generation: number): Promise<boolean> {
  const isCurrent = () => generation === syncGeneration;
  const supabase = getSupabase();
  if (!supabase) return false;

  const sessionRead = await readSessionForSync();
  if (!isCurrent()) return false;
  if (sessionRead.status !== "resolved") {
    setStatus({ phase: "error", error: "تعذّر التحقق من جلسة الحساب", pending: false });
    return false;
  }
  const session = sessionRead.session;
  const userId = session?.user?.id;
  if (!userId) return false;
  if (payloadTooLargeBlocked) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus({ phase: "offline" });
    return false;
  }

  setStatus({ phase: "syncing", error: null });
  try {
    let conflicts = 0;
    let passes = 0;
    while (conflicts < MAX_CONFLICT_ATTEMPTS && passes < MAX_CONFLICT_ATTEMPTS + 8) {
      passes += 1;
      if (!isCurrent()) return false;

      const storedPending = await readPending();
      if (!isCurrent()) return false;
      if (storedPending) {
        if (storedPending.userId !== userId) throw new Error("بيانات المزامنة تخص حسابًا آخر");
        const result = await processPending(storedPending, supabase, isCurrent);
        if (!isCurrent() || result === "stale") return false;
        if (result === "again") continue;
        if (result === "conflict") {
          conflicts += 1;
          if (conflicts >= MAX_CONFLICT_ATTEMPTS) break;
          continue;
        }
        if (getSyncStatus().pending) return false;
        return true;
      }

      const storedMeta = await kvGet<Meta>(META_KEY);
      const meta = storedMeta?.userId === userId ? storedMeta : null;
      const base = meta ? await kvGet<Partial<SyncBuckets>>(BASE_KEY) : null;
      if (!isCurrent()) return false;
      const lastSyncedAt = meta?.lastSyncedAt ?? 0;
      const localBlob = localSnapshot();
      const localBuckets = bucketize(localBlob);
      const server = await readServerSnapshot(supabase, userId, isCurrent);
      if (!server || !isCurrent()) return false;

      const merged = mergeBuckets(
        localBuckets,
        server.buckets,
        base,
        server.rows,
        lastSyncedAt,
        false,
        meta?.serverRevisions,
      );
      const writes = makeWrites(merged, server);
      const now = Date.now();
      const dirty = bucketsDiffer(merged, server.buckets);

      if (writes.length > 0) {
        assertSyncPayloadWithinLimits(writes);
        const pending: PendingCommit = {
          userId,
          requestId: newRequestId(),
          deviceId: deviceId(),
          mode: "rpc",
          state: "prepared",
          writes,
          sourceBuckets: localBuckets,
        };
        const claim = await claimPending(pending);
        if (!isCurrent()) return false;
        if (!claim.claimed) continue;
        const result = await processPending(claim.pending, supabase, isCurrent);
        if (!isCurrent() || result === "stale") return false;
        if (result === "again") continue;
        if (result === "conflict") {
          conflicts += 1;
          continue;
        }
        if (getSyncStatus().pending) return false;
        return true;
      }

      // A user edit during the read makes this snapshot stale. Re-read before
      // applying remote data or advancing the common merge base.
      if (!sameDoc(localSnapshot(), localBlob)) {
        setStatus({ phase: "idle", lastSyncedAt, pending: true });
        scheduleFollowUp();
        return false;
      }

      const targetBlob = debucketize(merged);
      if (!sameDoc(targetBlob, localBlob)) {
        const pending: PendingCommit = {
          userId,
          requestId: newRequestId(),
          deviceId: deviceId(),
          mode: "local",
          state: "committed",
          writes: [],
          sourceBuckets: localBuckets,
          serverBuckets: server.buckets,
          serverRevisions: revisionsFromRows(server.rows),
          targetBlob,
          lastSyncedAt: now,
        };
        const claim = await claimLocalReconcile(
          pending,
          server.buckets,
          { userId, lastSyncedAt: now, dirty, serverRevisions: pending.serverRevisions },
        );
        if (!isCurrent()) return false;
        if (!claim.claimed) continue;
        return finishCommitted(claim.pending, supabase, isCurrent);
      }

      const saved = await persistNoPending(
        server.buckets,
        { userId, lastSyncedAt: now, dirty: false, serverRevisions: revisionsFromRows(server.rows) },
      );
      if (!isCurrent()) return false;
      if (!saved.saved) continue;
      if (!sameDoc(localSnapshot(), localBlob)) {
        setStatus({ phase: "idle", lastSyncedAt: now, pending: true });
        scheduleFollowUp();
        return false;
      }

      failures = 0;
      setStatus({ phase: "idle", lastSyncedAt: now, error: null, pending: false });
      return true;
    }

    throw new Error("تغيّرت البيانات على جهاز آخر؛ سنعيد المحاولة تلقائيًا");
  } catch (e) {
    if (!isCurrent()) return false;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const payloadTooLarge = e instanceof SyncPayloadTooLargeError;
    payloadTooLargeBlocked = payloadTooLarge;
    setStatus({
      phase: offline ? "offline" : "error",
      error: offline ? null : e instanceof Error ? e.message : "تعذّرت المزامنة",
      pending: true,
    });
    if (!payloadTooLarge) scheduleRetry();
    return false;
  }
}

const SESSION_READ_TIMEOUT_MS = 5_000;

async function readSessionForSync(): Promise<
  | { status: "resolved"; session: Awaited<ReturnType<typeof getSession>> }
  | { status: "timeout" | "error" }
> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const session = await Promise.race([
      getSession().then((value) => ({ status: "resolved" as const, session: value })),
      new Promise<{ status: "timeout" }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ status: "timeout" }), SESSION_READ_TIMEOUT_MS);
      }),
    ]);
    return session;
  } catch {
    return { status: "error" };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

let followUpTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFollowUp(): void {
  if (typeof window === "undefined" || followUpTimer) return;
  followUpTimer = setTimeout(() => {
    followUpTimer = null;
    void syncNow();
  }, 1200);
}

/** Consecutive failures, for the retry backoff. Reset by a successful run. */
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRetry(): void {
  if (typeof window === "undefined") return;
  if (retryTimer) return;
  failures = Math.min(failures + 1, 6);
  // 5s, 10s, 20s… capped at ~5 min, so a brief blip recovers almost at once
  // while a sustained outage doesn't hammer the server or the battery.
  const delay = Math.min(5000 * 2 ** (failures - 1), 5 * 60 * 1000);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void syncNow();
  }, delay);
}

function sameDoc(a: unknown, b: unknown): boolean {
  return stableString(a) === stableString(b);
}

function stableString(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableString).join(",")}]`;
  // Match JSON/PostgREST persistence: undefined object properties are omitted
  // by JSON.stringify. Keeping them here made default optional preferences
  // look dirty forever after each cloud write, causing a rapid sync loop.
  const keys = Object.keys(v as object)
    .filter((key) => (v as Record<string, unknown>)[key] !== undefined)
    .sort();
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
  payloadTooLargeBlocked = false;
  setStatus({ phase: "idle", error: null, pending: true });
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

  // iOS Safari and the Android WebView can kill a backgrounded page without
  // ever firing visibilitychange, so pagehide is the last reliable moment to
  // push. Without it, closing the app right after a session of dhikr loses it.
  const onPageHide = () => {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
      void syncNow();
    }
  };
  window.addEventListener("pagehide", onPageHide);
  stopFns.push(() => window.removeEventListener("pagehide", onPageHide));

  pollTimer = setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, POLL_MS);
}

/** Stop syncing (sign-out). Optionally forget this device's cloud footprint. */
export function stopCloudSync(opts?: { forget?: boolean }): void {
  // Invalidate every pending await before another account can start syncing.
  syncGeneration += 1;
  started = false;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (followUpTimer) {
    clearTimeout(followUpTimer);
    followUpTimer = null;
  }
  failures = 0;
  payloadTooLargeBlocked = false;
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
export async function flushCloudSync(): Promise<boolean> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  return syncNow();
}
