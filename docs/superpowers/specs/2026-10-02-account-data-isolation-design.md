# Account data isolation design

**Status:** Draft for review. No application code is changed by this document.

## Problem

Athar currently persists user activity in one device-wide Zustand store (`noor_store_v1`). When a different Supabase user signs in, the sync engine discards the former user's merge base but builds the next upload from that same global store. The existing account-switch test expects this transfer. Companion conversations use one IndexedDB database with no owner field, and the Companion profile, pins, and partial reply are stored under global localStorage keys. As a result, account B can encounter account A's device state, and sync can upload it to B's cloud account without an explicit choice.

## Goal

Keep every signed-in account's device state isolated from other accounts while preserving existing local data and offline use. A user must explicitly choose before pre-existing local-only data is imported into an account. The current default design and navigation remain unchanged; this work adds only the account-switch and first-import controls needed to explain and operate the separation.

## Recommended design

Give persisted state a stable owner scope:

- `local` contains data created while signed out or before an account has claimed it.
- `user:<Supabase user ID>` contains device state belonging to that signed-in account.
- Auth loading does not activate either scope until the current session is known and that scope has hydrated successfully.

On sign-in, load only that account's local partition before starting cloud sync. If it has no local partition, begin from defaults and reconcile only against that account's server rows. On sign-out, save the account partition and return to the `local` partition. Signing back into the same account restores its previous state. Switching A → B never exposes A's in-memory state to B's view or sync request.

The first time a signed-in account is opened while non-default `local` data exists, show a clear, one-time choice:

1. **Copy and merge this device's data into this account.** This explicitly permits upload of the categories listed below. Keep the `local` copy intact as a recovery path; future edits are separate per scope.
2. **Keep it on this device only.** Load the account's own local/cloud state without merging the anonymous data. The user can make the import choice later in account settings.

Explain that Companion history/profile is copied only into that account's local partition on this installation; it is not part of the cloud sync upload. A separate, unchecked choice may be offered if the user wants to associate those local conversations/profile with the account on this device. Never silently upload full conversation history or profile data as part of the import. Do not repeat the choice after it is recorded for that account. If storage migration or account hydration fails, fail closed: keep cloud sync stopped, preserve old data, and show a recoverable error rather than falling back to the previous account's snapshot.

## Data scope

The account partition covers the current sync export: spiritual progress and streaks, favorites, bookmarks, Quran reading and annotations, Hadith progress/notes/memo cards, prayer logs and favorite cities, reminders, custom packs, settings, and onboarding state. It also covers the separately stored custom adhkar packs and the leaderboard identity/secret and related account-bound client state, since these are carried with the sync snapshot today. Audit all localStorage, IndexedDB, Capacitor Preferences, widget, location, and notification state for user-entered, activity, location, or account-linked data before implementation; partition it by owner or clear/rebuild it at an owner transition. Keep per-install technical identifiers only where they contain no account/user data.

Companion conversations, profile, saved replies, pins, and partial-stream recovery remain device-local but are partitioned by the same owner scope. The active Companion view and prompt context may read only the current scope. The user-facing import choice must explain that copying a local profile or conversation history into an account does not make it cloud-synced; Companion requests still send selected conversation/context/profile content through Athar's server proxy to its AI provider as currently disclosed.

The same owner transition must cancel the outgoing scope's pending reminders/notifications, refresh widget payloads, and load only the incoming scope's location cache where those features consume user-specific values. Static data and provider-response caches remain shared only when they contain public content.

The `local` partition remains a shared on-device space for use without an account; the app cannot distinguish multiple human users who use the same installation while signed out. Make that device-local behavior clear. The isolation guarantee applies to distinct authenticated user IDs and to the transitions between them.

Static content and public reading caches are not account-owned and remain shared/cacheable. Do not add private activity or Companion text to service-worker caches.

## Storage and compatibility rules

- Treat the existing unscoped `noor_store_v1` as `local`, never as the newly authenticated user's data by default.
- Treat old unscoped Companion rows, profile, pins, and partial-stream recovery as `local`; preserve them during migration.
- Move the existing sync `meta` and `base` to the owner named by the old `meta.userId`, if present. They describe that account's server merge history, not ownership of the current global store. Keep the old records until the new owner-scoped records have been read back successfully.
- Namespace per-owner local snapshots, sync metadata/base, custom-pack state, leaderboard credentials, and Companion keys/queries. Include a schema version and make each migration idempotent.
- Keep server rows under their existing `auth.uid()`/`user_id` ownership model; this design requires no production schema change. Existing cloud data is not deleted or rewritten by sign-in, sign-out, or a skipped import.
- Do not erase legacy keys or databases until their replacement has been verified. If a client cannot complete an IndexedDB/localStorage migration, it must continue to expose the legacy local data safely and block account sync until recovery.

## Account and Companion behavior

The owner context is the single source of truth for sync, Companion history/profile, custom packs, and leaderboard identity. Auth changes must invalidate pending work, flush the outgoing owner's permitted writes, persist that owner's local snapshot, switch scopes, hydrate the next scope, then start sync. No network read/write or Companion prompt may begin until the new scope is active. Existing generation checks remain in place to prevent an old in-flight sync from applying after an account switch.

Update the account panel's disclosure to name the synced categories and explain the first-import choice. Correct sign-out copy so it says account data stays on the device and returns when that same account signs in again, while the signed-out local-only scope stays available; do not imply the account data is deleted or still shown after sign-out. Use the existing account panel and current visual language; do not replace the app's design or add a new navigation system. The choice should be keyboard- and screen-reader-accessible, state that skipping preserves local data, and remain available from account settings.

## Verification requirements

Automated tests must prove:

- A → sign-out → B cannot display A's progress, notes, custom packs, leaderboard credential, Companion conversations/profile/pins, or upload A's data to B.
- B → sign-out → A restores A's local state and sync base; B's cloud rows never alter A's partition.
- A first local-only user can explicitly copy data into an account, and can instead skip without data loss or network transfer. The choice is per destination account and survives restart.
- Account B can load and sync its own cloud data while local-only data remains preserved and separate.
- Auth loading, rapid account changes, offline operation, concurrent edits, storage quota/errors, and failed migrations never start sync with the wrong owner.
- Old `noor_store_v1`, Companion IndexedDB, profile, pin, partial-stream, data-pack, leaderboard, and sync metadata formats migrate without dropping records.
- Companion prompts and background/partial-stream recovery use only the active owner's history and profile.

Run the full web test/build gate, then verify web/PWA and native Capacitor storage behavior on Android and iOS. Exercise account switching on one browser profile/device with synthetic accounts and inspect outgoing sync payloads; no real account or production data is needed. Verify that the web UI still works signed out and offline. Backend live tests remain separate because the current Supabase project has returned HTTP 402.

## Risks and limits

The store currently uses Zustand persistence with a fixed storage key and many features read the store synchronously. Owner switching must be atomic from the UI's perspective; a partially hydrated or stale render is a data leak even if uploads are blocked. The change also touches a wide set of localStorage adapters, so the migration must be idempotent and leave the previous records recoverable until verification.

This design isolates accounts that use the same app installation. It does not encrypt local databases against someone with access to an unlocked device, change the AI provider's retention terms, or resolve the separate account-deletion scope for leaderboard records. Those remain distinct privacy/release work.
