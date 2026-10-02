# Account data isolation implementation plan

**Spec:** `docs/superpowers/specs/2026-10-02-account-data-isolation-design.md`
**Base:** `8680cc00964427f4f38297615213ad8eae24724e`
**Goal:** prevent authenticated accounts that share one installation from seeing, prompting with, or uploading another account's local data while preserving signed-out offline data.

## Global constraints

- Keep the existing visual design and navigation. Add only a clear, accessible first-import decision in the existing account/settings flow.
- Treat legacy unscoped records as local-only; do not silently assign them to the first account.
- Keep public Quran, hadith, and provider-response caches shared. Partition personal, account-linked, and Companion data.
- Do not read credentials, create real accounts, access production user data, or write to Supabase. Use synthetic sessions and mocked server rows.
- Keep local copies during migration. A failed scope change must block account UI and sync rather than expose the previous scope.
- Run TDD for each behavior, full `npm run verify`, Android sync/build/lint, and browser account-switch checks before the final account-isolation phase is reported complete.

## Tasks

1. **Owner scope and persisted Zustand state**
   - Add a tested owner-scope/key utility with `local` and `user:<id>` scopes.
   - Route the persisted Zustand store through owner-scoped storage; map the old `noor_store_v1` key only to `local`.
   - Add an atomic scope-switch operation that suspends writes, resets to store defaults, rehydrates the target scope, and reports failures.
   - Verify local → A → B → A snapshots stay distinct and a fresh B partition never reads A's favorites/progress.

2. **Auth transition gate and sync ownership**
   - Hydrate the target scope before rendering personal routes or starting sync; stop stale generations during transitions.
   - Namespace sync base/meta by user ID and remove the current cross-account union behavior.
   - Replace the existing test that expects A's data to upload to B with same-device A→sign-out→B, B→sign-out→A, offline, and rapid-switch tests.
   - Make sign-out communicate a failed flush and leave it retryable instead of claiming that cloud changes were saved.

3. **Secondary personal storage**
   - Scope Hadith user tables and custom-reminder persistence by owner while leaving public Hadith packs/search indexes shared.
   - Scope custom adhkar packs and leaderboard identity/queue/history/rate-limit state.
   - Preserve old unscoped data under `local` and verify idempotent migration.

4. **Companion privacy**
   - Partition conversations, profile, saved replies, partial-stream recovery, and Companion memory by active owner.
   - Ensure history/profile/memory reads used to build prompts come only from the active owner.
   - Test legacy data remains local and A's content is absent from B's history and outgoing prompt context.

5. **Explicit local-data import and owner-bound surfaces**
   - Add a one-time per-account choice to copy/merge the existing local app snapshot into that account or keep it local-only; default to keeping local data separate.
   - Keep the local source copy recoverable and make the decision available later from account settings.
   - On owner changes, cancel/rebuild reminders, refresh widget payloads, and select the correct location cache before revealing routes.
   - Verify keyboard/screen-reader access and existing design consistency.

6. **Cross-platform verification and report**
   - Run synthetic web/browser account-switch flows with visible UI and inspect outgoing sync payloads.
   - Run full web verification and Android debug sync/build/lint; add iOS source/build checks where available.
   - Update `AUDIT_REPORT_2026-10-02.md` with exact coverage, remaining device/backend gates, and the completed checklist items.

## Review focus

- No stale state can render or enter a network request while the active session and hydrated storage owner differ.
- A migration or IndexedDB failure leaves the previous owner intact and blocks sync.
- Public caches do not get duplicated per account; private caches do not leak between accounts.
- Switching quickly A→B→A cannot allow an old async hydration or sync to write into the current owner.
- Legacy data, first-import decline, offline edits, and failed flushes remain recoverable.
