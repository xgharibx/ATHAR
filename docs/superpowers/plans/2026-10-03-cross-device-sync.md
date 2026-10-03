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

- Simultaneous inserts when a document does not exist: unique-key races must abort/retry the whole batch; pin in Task 1's database test and Task 2's client test.
- One stale revision among several changed documents: no document may be partially committed; pin in Task 1's atomic-batch test and Task 2's client test.
- The server commits but the response is lost: the same request must replay without duplicating an additive counter; pin in Task 1's receipt replay test and Task 2's recovery test.
- The user edits while a server merge is in flight: the rebase must preserve that edit and any remote-only field without double counting; pin in Task 2's rebase tests.
- A sign-out/account switch or unavailable IndexedDB interrupts a pending commit: no account may receive another account's base, and no write may be sent without durable pending state; pin in Task 2's lifecycle and storage-failure tests.

---

### Task 1: Add the revisioned atomic Supabase protocol

**Files:**
- Create: `supabase/migrations/20261003132940_athar_sync_revision_protocol.sql`
- Create: `supabase/tests/athar_sync_revision_protocol.sql`

**Interfaces:**
- Consumes: `public.athar_sync`, its owner RLS policy, `extensions.digest`, and the six allowed sync kinds.
- Produces: authenticated `SECURITY INVOKER` wrappers at `public.athar_sync_commit_batch(uuid, text, jsonb)` and `public.athar_sync_ack_batch(uuid, text)`, backed by owner-checked `SECURITY DEFINER` implementations in the non-exposed `private` schema; commit results identify `committed`, `conflict`, `replayed`, or `pending_ack` and return current/result revisions.

- [ ] **Step 1: Write pgTAP assertions** for revision increments, owner-scoped successful commits, conflict-with-zero-writes, duplicate request replay, hash mismatch, pending receipt protection, and acknowledgement ownership; run them against the disposable database and confirm they fail before the migration.
- [x] **Step 2: Add `athar_sync.revision` and update `athar_sync_touch()`** so every UPDATE advances the old revision by exactly one and INSERT starts at one.
- [x] **Step 3: Add the RLS-protected receipt table** keyed by account/device, storing only request ID, SHA-256 hash, and revision result metadata; grant no direct `anon` or `authenticated` table access.
- [x] **Step 4: Implement the private SECURITY DEFINER batch function and public invoker wrapper** with empty search path, fully qualified objects, `auth.uid()` ownership, strict kind/payload/batch validation, per-user transaction lock, whole-batch revision check, conflict return, atomic insert/update, and receipt creation.
- [x] **Step 5: Implement idempotent receipt acknowledgement** restricted to the authenticated account, device, and request ID.
- [ ] **Step 6: Re-run pgTAP** and inspect `pg_policies`, table grants, function owners, `proconfig`, and execute grants; expect public wrappers to be invoker-only, private implementations to be SECURITY DEFINER with a pinned empty search path, authenticated-only execute, no public/anon execute, and no direct receipt-table grants. Production catalog/grant checks passed after deployment, but pgTAP remains unverified because this Supabase plan does not support branching and no local PostgreSQL runtime is installed.
- [x] **Step 7: Commit** as `feat: add atomic revisioned sync RPC`.

### Task 2: Route client writes through durable compare-and-swap commits and rebase in-flight edits

**Files:**
- Modify: `src/lib/syncClient.ts`
- Modify: `tests/syncClient.test.ts`
- Modify: `tests/syncClientLifecycle.test.ts`
- Modify: `tests/syncMerge.test.ts` only if the rebase uses a new merge helper

**Interfaces:**
- Consumes: Task 1's RPC result and existing `SYNC_KINDS` merge behavior.
- Produces: a durable pending-commit record with `prepared`, `committed`, `applying`, and `applied` recovery states; revision-aware batch requests; bounded conflict retry (4 attempts).

- [x] **Step 1: Keep the new tests in `tests/syncClient.test.ts` red**: independent-device favorite race, stale-revision reread, local tap after snapshot with additive counter value 14, and commit-success/response-loss replay. The observed failures are part of the test-first evidence; do not commit a failing-only intermediate state.
- [x] **Step 2: Extend the shared-server fake** with row revisions, atomic batch CAS, receipt replay, acknowledgement, independent device databases, and a controllable response-loss hook.
- [x] **Step 3: Add strict IndexedDB operations** for atomically claiming the single pending key, updating/deleting only when the request UUID still matches, and persisting base/meta/pending state together. If pending persistence fails, assert the RPC is never called.
- [x] **Step 4: Implement recovery and compare-and-swap retries**: `prepared` replays the exact request UUID and payload; `committed` durably prepares the rebase target; `applying` resumes the local import safely; `applied` only retries acknowledgement. Conflicts re-read and re-merge up to four attempts, and no new request can replace an unacknowledged receipt.
- [x] **Step 5: Rebase the latest local state onto the fresh server snapshot using the attempt's local snapshot as common ancestor**; keep deletion and additive-counter semantics, and prefer post-snapshot local edits for scalar conflicts.
- [x] **Step 6: Test response loss, duplicate tabs, sign-out during a request, same-account resume, A/B account isolation, IndexedDB write failure, atomic conflict/no-partial-batch, and bounded retry exhaustion.**
- [x] **Step 7: Run `npm run test -- tests/syncClient.test.ts tests/syncClientLifecycle.test.ts`** and require all tests in both files to pass; confirm `syncClient.ts` no longer calls `.upsert()` on `athar_sync`.
- [x] **Step 8: Commit** as `fix: make cloud sync writes conflict safe`.

### Task 3: Prepare a separate legacy-write cutoff and update operator documentation

**Files:**
- Create: `supabase/release-gates/20261003061100_athar_sync_write_cutoff.sql`
- Modify: `docs/ACCOUNTS_SETUP.md`
- Modify: `AUDIT_REPORT_2026-10-02.md`

**Interfaces:**
- Consumes: Task 1's RPC and Task 2's RPC-only client.
- Produces: a release-gated SQL migration outside `supabase/migrations`, so routine `supabase db push` cannot apply it before the client rollout. It revokes direct `anon`/`authenticated` DML while retaining authenticated SELECT and RLS.

- [x] **Step 1: Add SQL assertions** proving direct anon/authenticated writes fail, own-row SELECT still succeeds, cross-account reads fail, and RPC writes succeed.
- [x] **Step 2: Stage the cutoff SQL outside `supabase/migrations`** with an explicit release-gate comment and least-privilege grants. Supabase `db push` applies every pending migration file, so a comment or separate timestamp alone does not defer it.
- [x] **Step 3: Update account setup documentation** to replace the old one-file SQL instruction with the migration order, client rollout bridge, and delayed cutoff requirements.
- [x] **Step 4: Update the audit report/checklist** with implementation state, release evidence, and any remaining store/cutover checks.
- [x] **Step 5: Review migration, docs, and report together** and commit as `docs: stage sync protocol rollout safely`.

### Task 4: Verify, stage, and release in safe order

**Files:**
- Read: `.github/workflows/deploy-pages.yml`
- Read: `.github/workflows/android-validate.yml`
- Read: `.github/workflows/ios-build.yml`
- Use: `docs/ACCOUNTS_SETUP.md` and both sync migrations

**Interfaces:**
- Consumes: all preceding tasks.
- Produces: release evidence for web, Android, iOS, staging RPC tests, and an explicit decision whether the legacy cutoff is safe to apply.

- [x] **Step 1: Run `npm run verify`**; require TypeScript, lint, all tests, and production/PWA build to pass.
- [x] **Step 2: Run Android sync/build/lint** with `npm run android:sync` and `android\\gradlew.bat :app:assembleDebug :app:lintDebug`.
- [ ] **Step 3: Run the iOS CI build** and confirm an App Store/TestFlight upload path is available before treating iOS as released.
- [ ] **Step 4: Apply only the additive protocol migration** to a staging project and test two authenticated synthetic users, two-device races, retries, receipt recovery, and RLS. Do not use a customer account or invoke unrelated paid providers.
- [ ] **Step 5: Publish the web and store builds** through the already configured release paths; verify GitHub checks and the served app/version metadata.
- [ ] **Step 6: Leave the cutoff in `supabase/release-gates/`** until all supported client builds are available and the bridge rollout has been checked. If the iOS store path is unavailable, document the blocker and retain legacy direct writes.
- [ ] **Step 7: When the cutoff gate is met, promote the SQL into `supabase/migrations` with a fresh timestamp after other pending migrations**, inspect `supabase db push --dry-run`, and apply it as a separate operation. Verify RPC success plus denied direct writes on staging before production.
- [ ] **Step 8: Re-run advisor, sync, and release verification** and record the production commit/migration/version evidence in the audit report.
