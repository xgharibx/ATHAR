# Cross-Device Sync Integrity Design

## Goal

Prevent concurrent devices and retrying clients from silently overwriting another device's changes, while retaining intentional per-key deletions, additive activity counters, account isolation, and offline-first local use.

## Constraints and invariants

- Keep the existing visual design. Do not promise an update action in old binaries; a store release and staged cutoff are handled as rollout work.
- Local data remains usable and is never cleared when cloud sync is unavailable or a client version is retired from cloud writes.
- Only an authenticated user may write that user's `athar_sync` documents. The server derives the owner from `auth.uid()`; clients never choose a target user ID.
- All documents in one sync commit succeed together or none do. A conflict must cause a fresh read and re-merge, not a partial write.
- Keep the current merge semantics for intentional deletions, concurrent counter increments, positions, and settings.
- Replaying a request after an uncertain network outcome or process restart must not apply it twice.
- Do not disable legacy direct writes until updated web, Android, and iOS clients are available and the cutover is deliberately applied.

## Original failure and current deployment status

At discovery, `src/lib/syncClient.ts` wrote changed rows unconditionally, so two installations could replace one another's whole JSON payloads after reading the same state. The client now uses a revision-checked atomic batch RPC, durable pending records, idempotent receipts, and a rebase for edits made during a request.

The additive database migration is applied in production as `20261003132940_athar_sync_revision_protocol`. Catalog and grant checks confirm the revision column, RPCs, receipt table, and their intended access controls. Direct `authenticated` INSERT, UPDATE, and DELETE grants remain enabled for the compatibility rollout. Staging pgTAP and signed-in multi-device round-trips have not been verified because database branching is unavailable on the current Supabase plan and no local PostgreSQL runtime is installed.

## Architecture

### Revision-checked batch RPC

Add a `revision bigint not null default 1` column to `public.athar_sync`. The existing touch trigger also sets `revision = old.revision + 1` for every UPDATE, including updates from legacy clients during the transition period. Inserts start at revision 1.

Add a public `SECURITY INVOKER` RPC named `public.athar_sync_commit_batch(p_request_id uuid, p_device_id text, p_writes jsonb)` that delegates to an authenticated `private.athar_sync_commit_batch` implementation. The private function derives the owner from `auth.uid()`, sets an empty `search_path`, fully qualifies database objects, validates the allowed document kinds and JSON shapes, and serializes writes for that account with a transaction-scoped advisory lock. It accepts only expected revisions and document payloads; an expected revision of JSON null means the row must not exist.

The function locks and checks every requested row before changing any row. If one expected revision differs, it returns a conflict and the latest revisions without writing any document. If all revisions match, it inserts or updates the complete batch in one transaction and returns the resulting revisions. An insert race with a legacy writer also aborts the entire batch and is reported as a conflict. The function accepts no `user_id` parameter and is executable by `authenticated` only; `anon` and `PUBLIC` execution are revoked.

### Idempotent commit receipts

Create `private.athar_sync_commit_receipts` with one outstanding receipt per `(user_id, device_id)`. It stores the request UUID, SHA-256 request hash, and small commit-result metadata; it does not copy synced payloads. The commit RPC returns the stored result when the same request and hash are replayed, rejects a different request while the prior receipt remains unacknowledged, and records a new receipt atomically with a successful batch.

Expose `public.athar_sync_ack_batch(p_request_id uuid, p_device_id text)` as a `SECURITY INVOKER` wrapper over `private.athar_sync_ack_batch`. The private function verifies `auth.uid()` and removes only the matching receipt. A repeated acknowledgement is harmless. The receipt table has RLS enabled and no direct `anon` or `authenticated` table grants; only authenticated callers can execute the private implementations, and the private schema is not an exposed Data API schema. Auth-user deletion cascades the receipt row.

### Client reconciliation and recovery

`syncClient.ts` reads `revision` with each server document. Before sending a batch it stores one account-scoped pending record in the existing sync IndexedDB database. The record contains the request UUID, device ID, changed documents with expected revisions, and the local snapshot used to construct the batch. The pending write must fail closed: if IndexedDB cannot persist it, the client sends no cloud write.

An IndexedDB `add` on the single pending key arbitrates concurrent tabs sharing one account database. A losing tab resumes the existing pending request instead of creating a competing request. Every pending-record update or deletion checks that the request UUID still matches inside the same IndexedDB transaction, so a late tab cannot clear a newer request. The server receipt serializes requests across installations and makes retries safe.

- On a revision conflict, the RPC made no changes. The client discards that prepared record only after receiving the conflict, re-reads server documents, and re-runs the existing three-way merge. Retry a bounded number of times; after that, keep local changes dirty and use the existing backoff.
- On a timeout or other ambiguous outcome, retain and replay the exact same pending request. Never generate a new request UUID until the previous receipt has been acknowledged.
- After confirmed commit, read the current server snapshot and rebase the latest local state onto it using the in-flight local snapshot as the common base. This preserves post-snapshot edits without double-counting and incorporates remote-only updates. Persist the server snapshot as the merge base, `dirty` metadata, the exact target state, and a `committed` pending marker atomically. Move the marker to `applying` with the pre-import local snapshot before importing; mark it `applied` after local persistence settles. Only then acknowledge and remove the server receipt and local pending record.
- On restart, a `prepared` record is replayed; a `committed` record resumes target preparation; an `applying` record distinguishes an import that had not started from an import interrupted by a process exit; an `applied` record only retries acknowledgement. The normal sync then handles changes made after the saved server base.
- A failed commit, merge, import, or local persistence leaves local data intact and does not advance the base. Account switches continue to use the existing per-account database partition.

The bounded conflict retry limit is 4 attempts. Exhaustion leaves the latest local state dirty, reports a retryable sync error, and schedules the existing exponential backoff. The app must not silently claim that data reached the cloud.

### Legacy-client rollout

Use two separate database migrations:

1. Add revision tracking, receipt storage, and the authenticated RPCs while retaining current table grants. Ship the new client on the web, Android, and iOS. During this bridge period, new clients protect new-client races, but a legacy direct write can still bypass the protocol; do not describe the bridge as full protection.
2. Only after the replacement builds are available and the rollout has been checked, revoke direct INSERT, UPDATE, and DELETE from `anon` and `authenticated` on `athar_sync`; retain authenticated SELECT under the existing RLS policy. New clients write only through the RPC. This cutoff is a separate, deliberate production operation and is not automatically bundled into the initial app release.

Old binaries cannot render UI added in a later build. After the cutoff, their direct table writes fail and their local data remains usable and intact; they may show only the generic sync failure already present in that binary. Do not promise a new in-app update action on an old build. Communicate the required release through web delivery and the relevant stores, and postpone the cutoff until supported platform builds are available and rollout has been checked. If an iOS store build cannot be released, retain legacy direct writes so those users are not stranded from cloud sync.

## Security

- RLS stays enabled on `athar_sync`; authenticated SELECT remains owner-scoped.
- The exposed public RPC wrappers are `SECURITY INVOKER`; the narrowly granted SECURITY DEFINER implementations live in the non-exposed `private` schema, use `search_path = ''`, fully qualify objects, and explicitly check `auth.uid()`. They reject unauthenticated calls, unsupported kinds, duplicate kinds, more than six writes in a batch, invalid revisions, and non-object payloads. This protocol change does not introduce a document byte limit.
- Commit receipts cannot be read or written through PostgREST table access. The RPC stores an `extensions.digest(..., 'sha256')` hash of canonical JSONB request content to reject request-ID reuse with different data.
- Staging verifies same-user success, cross-user denial, anonymous denial, direct-write denial after cutoff, and retained authenticated SELECT.

## Verification

Automated source tests use two independent sync clients over a barrier-controlled shared server. They cover concurrent additions to separate documents, the same-document conflict/retry, intentional deletion during a race, additive counters, an ambiguous success replayed after a simulated timeout/restart, no partial batch on conflict, local edits during the round-trip, same-origin concurrent tabs, bounded retry exhaustion, account switching, and offline/local-storage failure.

Database verification runs the migration chain on a disposable Supabase/Postgres test database, inspects function/table grants and RLS, and tests concurrent RPC calls. Staging checks use dedicated synthetic accounts only; no customer account is created or modified for validation. Web/PWA, Android, and iOS builds must pass before the legacy-write cutoff. After cutover, verify that the new RPC syncs and direct authenticated writes are denied. Do not submit a store release or apply the destructive-looking privilege cutoff unless all three replacement clients have been published or the affected platform is confirmed unused.

## Non-goals

- Redesigning the current interface or removing its current theme.
- Changing what data synchronizes or adding a server-side merge that guesses whether a missing JSON key was intentional.
- Deleting app data, auth accounts, or user sync rows.
- Applying the direct-write cutoff during the initial compatibility migration.
- Solving the separate migration-chain bootstrap, cloud payload-limit, or provider-cost-monitoring findings from the broader audit.
