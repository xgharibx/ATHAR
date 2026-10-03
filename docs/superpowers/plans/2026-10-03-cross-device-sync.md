# Cross-Device Sync Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cloud sync reject stale writes, retry merges without losing intentional deletions, and safely recover a commit whose response was lost.

**Architecture:** Add a revisioned, owner-checked, atomic database batch RPC with one idempotency receipt per device. Refactor the client to persist and replay pending commits, rebase edits made during network calls, and switch to RPC-only writes after updated clients are released. Apply the legacy-write cutoff separately after web, Android, and iOS builds are available.

**Tech Stack:** React/TypeScript, Vitest, Dexie/IndexedDB, Supabase Postgres, RLS, Postgres RPC, pgcrypto.

**Spec:** `docs/superpowers/specs/2026-10-03-cross-device-sync-design.md`

## Global Constraints

- Keep the existing visual design. The account panel may add a clear sync-update state; this is a reliability message, not a redesign.
- Local data remains usable and is never cleared when cloud sync is unavailable or a client version is retired from cloud writes.
- Only an authenticated user may write that user's `athar_sync` documents. The server derives the owner from `auth.uid()`; clients never choose a target user ID.
- All documents in one sync commit succeed together or none do. A conflict must cause a fresh read and re-merge, not a partial write.
- Keep the current merge semantics for intentional deletions, concurrent counter increments, positions, and settings.
- Replaying a request after an uncertain network outcome or process restart must not apply it twice.
- Do not disable legacy direct writes until updated web, Android, and iOS clients are available and the cutover is deliberately applied.

## Review Focus

- Simultaneous inserts when a document does not exist: unique-key races must abort/retry the whole batch; pin in Task 1's missing-row race test and Task 2's database test.
- One stale revision among several changed documents: no document may be partially committed; pin in Task 1's atomic-batch test and Task 2's RPC test.
- The server commits but the response is lost: the same request must replay without duplicating an additive counter; pin in Task 1's receipt replay test and Task 3's recovery test.
- The user edits while a server merge is in flight: the rebase must preserve that edit and any remote-only field without double counting; pin in Task 1's mid-flight counter test and Task 4's rebase test.
- A sign-out/account switch or unavailable IndexedDB interrupts a pending commit: no account may receive another account's base, and no write may be sent without durable pending state; pin in Task 3's lifecycle and storage-failure tests.

---

### Task 1: Reproduce the lost-update and retry failures

**Files:**
- Modify: `tests/syncClient.test.ts`
- Modify: `tests/syncMerge.test.ts`

**Interfaces:**
- Consumes: current `syncNow()`, `mergeDoc()`, and existing fake Supabase harness.
- Produces: deterministic regression cases that fail before the protocol change.

- [ ] **Step 1: Add a shared-server interleaving test** in which client A and client B both read the same favorites revision, B commits a different favorite, then A attempts its stale write. Assert the final row contains both additions and neither client treats the other's key as a deletion.
- [ ] **Step 2: Run `npm run test -- tests/syncClient.test.ts`** and confirm the new race test fails because current code uses unconditional upsert.
- [ ] **Step 3: Add an atomicity case** where a multi-document batch has one stale revision. Assert that none of the batch's documents change.
- [ ] **Step 4: Add a tap-during-sync case** with additive counter value 10, in-flight local value 11, a second local tap to 12, and a concurrent remote increment of 2. Assert the eventual local and server value is 14, with no dropped or duplicated increment.
- [ ] **Step 5: Add a lost-response replay case** that commits on the fake server then rejects the first response. Assert replay of the exact request leaves all counter values unchanged from the single-commit result.
- [ ] **Step 6: Re-run the focused test command** and record each expected failure before implementation.
- [ ] **Step 7: Commit** as `test: reproduce concurrent cloud sync failures`.

### Task 2: Add the revisioned atomic Supabase protocol

**Files:**
- Create: `supabase/migrations/20261003061000_athar_sync_revision_protocol.sql`
- Create: `supabase/tests/athar_sync_revision_protocol.sql`

**Interfaces:**
- Consumes: `public.athar_sync`, its owner RLS policy, `extensions.digest`, and the six allowed sync kinds.
- Produces: `public.athar_sync_commit_batch(uuid, text, jsonb)` and `public.athar_sync_ack_batch(uuid, text)`; the commit result identifies `committed`, `conflict`, `replayed`, or `pending_ack` and returns current/result revisions.

- [ ] **Step 1: Write pgTAP assertions** for revision increments, owner-scoped successful commits, conflict-with-zero-writes, duplicate request replay, hash mismatch, pending receipt protection, and acknowledgement ownership; run them against the disposable database and confirm they fail before the migration.
- [ ] **Step 2: Add `athar_sync.revision` and update `athar_sync_touch()`** so every UPDATE advances the old revision by exactly one and INSERT starts at one.
- [ ] **Step 3: Add the RLS-protected receipt table** keyed by account/device, storing only request ID, SHA-256 hash, and revision result metadata; grant no direct `anon` or `authenticated` table access.
- [ ] **Step 4: Implement the SECURITY DEFINER batch RPC** with fixed search path, fully qualified objects, `auth.uid()` ownership, strict kind/payload/batch validation, per-user transaction lock, whole-batch revision check, conflict return, atomic insert/update, and receipt creation.
- [ ] **Step 5: Implement idempotent receipt acknowledgement** restricted to the authenticated account, device, and request ID.
- [ ] **Step 6: Re-run pgTAP** and inspect `pg_policies`, table grants, function owners, `proconfig`, and execute grants; expect authenticated execute only, no public/anon execute, and no direct receipt-table grants.
- [ ] **Step 7: Commit** as `feat: add atomic revisioned sync RPC`.

### Task 3: Route client writes through durable compare-and-swap commits

**Files:**
- Modify: `src/lib/syncClient.ts`
- Modify: `tests/syncClient.test.ts`
- Modify: `tests/syncClientLifecycle.test.ts`

**Interfaces:**
- Consumes: Task 2's RPC result and existing `SYNC_KINDS` merge behavior.
- Produces: a durable pending-commit record with `prepared` and `committed` states; revision-aware batch requests; bounded conflict retry (4 attempts).

- [ ] **Step 1: Extend the shared-server fake** with row revisions, atomic batch CAS, receipt replay, ack, and a controllable response-loss hook; keep each client’s account-scoped IndexedDB isolated.
- [ ] **Step 2: Assert first-sign-in, no-op, account-switch, retry, and offline tests** still pass against RPC-based writes; the client must no longer call `.upsert()` on `athar_sync`.
- [ ] **Step 3: Add strict IndexedDB operations** for atomically claiming the single pending key, updating/deleting only when the request UUID still matches, and persisting base/meta/pending state together. If pending persistence fails, assert the RPC is never called.
- [ ] **Step 4: Implement recovery** so `prepared` replays the exact request UUID and payload, `committed` only retries acknowledgement, and a different request cannot replace an unacknowledged receipt.
- [ ] **Step 5: Implement the revision retry loop**: on conflict, clear only the matching prepared request, fetch all current documents, re-merge, and retry up to four attempts; after exhaustion preserve dirty local state and schedule existing backoff.
- [ ] **Step 6: Implement request replay and lifecycle tests** for response loss after server commit, duplicate calls from two tabs, sign-out during a request, same-account resume, and account A/B separation.
- [ ] **Step 7: Re-run `npm run test -- tests/syncClient.test.ts tests/syncClientLifecycle.test.ts`** and confirm all sync/client lifecycle tests pass.
- [ ] **Step 8: Commit** as `fix: make cloud sync writes conflict safe`.

### Task 4: Rebase edits made while sync is in flight

**Files:**
- Modify: `src/lib/syncClient.ts`
- Modify: `tests/syncClient.test.ts`
- Modify: `tests/syncMerge.test.ts`

**Interfaces:**
- Consumes: a confirmed committed batch, its in-flight local snapshot, and the fresh current server snapshot.
- Produces: a locally applied rebase plus a merge base equal to the server snapshot that was actually read.

- [ ] **Step 1: Add tests** for remote-only additions plus a local tap during flight, independent additive counter increments on two devices, a deletion during flight, and a scalar setting changed locally after the request began.
- [ ] **Step 2: Rebase with the attempt's local snapshot as the common ancestor** and prefer the post-snapshot local side for true scalar conflicts; preserve the existing deletion and counter rules for other fields.
- [ ] **Step 3: Apply the rebase before atomically saving the server base, dirty metadata, and committed pending marker**; if import/persistence fails, retain the prepared receipt and do not claim success.
- [ ] **Step 4: Verify the tap case ends at 14 locally and on the server** and that the next follow-up sync does not add the same delta again.
- [ ] **Step 5: Re-run focused sync tests** and commit as `fix: rebase local edits after sync commits`.

### Task 5: Explain the sync protocol update in the existing account panel

**Files:**
- Modify: `src/lib/syncClient.ts`
- Modify: `src/components/account/AccountPanel.tsx`
- Create or modify: `tests/AccountPanelSyncStatus.test.tsx`

**Interfaces:**
- Consumes: direct-write permission errors from the post-cutoff backend.
- Produces: `SyncPhase` value `update-required` with an Arabic explanation and an update action using the existing platform update destination.

- [ ] **Step 1: Add a rendered test** for the update-required label and button, plus a test that ordinary network failures keep their current retry message.
- [ ] **Step 2: Map only the recognized direct-write permission response** to `update-required`; unknown server errors remain retryable errors.
- [ ] **Step 3: Add the account-panel copy/action** without moving or restyling the existing account UI.
- [ ] **Step 4: Run the focused panel and sync tests** and commit as `feat: explain required sync updates`.

### Task 6: Prepare a separate legacy-write cutoff and update operator documentation

**Files:**
- Create: `supabase/migrations/20261003061100_athar_sync_write_cutoff.sql`
- Modify: `docs/ACCOUNTS_SETUP.md`
- Modify: `AUDIT_REPORT_2026-10-02.md`

**Interfaces:**
- Consumes: Task 2's RPC and Task 5's app status.
- Produces: an explicit, separate migration that revokes direct `anon`/`authenticated` DML while retaining authenticated SELECT and RLS.

- [ ] **Step 1: Add SQL assertions** proving direct anon/authenticated writes fail, own-row SELECT still succeeds, cross-account reads fail, and RPC writes succeed.
- [ ] **Step 2: Create the cutoff migration** with an explicit release-gate comment and least-privilege grants; do not apply it during initial protocol deployment.
- [ ] **Step 3: Update account setup documentation** to replace the old one-file SQL instruction with the migration order, client rollout bridge, and delayed cutoff requirements.
- [ ] **Step 4: Update the audit report/checklist** with implementation state, release evidence, and any remaining store/cutover checks.
- [ ] **Step 5: Review migration, docs, and report together** and commit as `docs: stage sync protocol rollout safely`.

### Task 7: Verify, stage, and release in safe order

**Files:**
- Read: `.github/workflows/deploy-pages.yml`
- Read: `.github/workflows/android-validate.yml`
- Read: `.github/workflows/ios-build.yml`
- Use: `docs/ACCOUNTS_SETUP.md` and both sync migrations

**Interfaces:**
- Consumes: all preceding tasks.
- Produces: release evidence for web, Android, iOS, staging RPC tests, and an explicit decision whether the legacy cutoff is safe to apply.

- [ ] **Step 1: Run `npm run verify`**; require TypeScript, lint, all tests, and production/PWA build to pass.
- [ ] **Step 2: Run Android sync/build/lint** with `npm run android:sync` and `android\\gradlew.bat :app:assembleDebug :app:lintDebug`.
- [ ] **Step 3: Run the iOS CI build** and confirm an App Store/TestFlight upload path is available before treating iOS as released.
- [ ] **Step 4: Apply only the additive protocol migration** to a staging project and test two authenticated synthetic users, two-device races, retries, receipt recovery, and RLS. Do not use a customer account or invoke unrelated paid providers.
- [ ] **Step 5: Publish the web and store builds** through the already configured release paths; verify GitHub checks and the served app/version metadata.
- [ ] **Step 6: Leave the cutoff unapplied** until all supported client builds are available and the bridge rollout has been checked. If the iOS store path is unavailable, document the blocker and retain legacy direct writes.
- [ ] **Step 7: When the cutoff gate is met, apply its migration as a separate operation** and verify RPC success plus denied direct writes on staging before production.
- [ ] **Step 8: Re-run advisor, sync, and release verification** and record the production commit/migration/version evidence in the audit report.

