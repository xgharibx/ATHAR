# Android Tasbeeh widget history design

**Status:** Draft for review. No application code is changed by this document.

## Problem

The full Tasbeeh and compact Dhikr widgets call `NoorTasbeehWidgetProvider.bumpDailyTotal`, which writes all widget taps to one Capacitor Preferences value containing a single civil date and that date's phrase counts. On the first tap after midnight, the method replaces that value with an empty snapshot for the new day. The app only imports widget totals on startup or foreground; if it was not opened before that tap, the preceding day's widget-only counts are lost. The web bridge also keeps one last-merged date/count snapshot in a separate localStorage key, so a delayed merge across multiple dates cannot be idempotent.

## Goal and constraints

Preserve every Android widget tap until the app has durably merged it into the user's local statistics. A merge must be safe to repeat after a crash, and a widget tap arriving while a merge is in progress must remain pending. Keep the current visual design, widget layouts, default behavior, phrase selection, and tap interactions unchanged. Do not modify or invoke the “مسح جميع البيانات” flow.

## Recommended design

Replace the single rolling snapshot with one pending SharedPreferences entry per date in a small dedicated `AtharWidgetLedger` file. A key uses a namespaced prefix and an ISO local date, and its value contains versioned, validated non-negative phrase counts. Keeping pending history outside the app's large `CapacitorStorage` file avoids rewriting user settings and activity state on every widget tap. Both widget providers continue to call one shared ledger helper. The helper synchronizes record, migration, and acknowledgement operations with a shared lock. Widget taps use asynchronous SharedPreferences persistence so they do not block the broadcast thread; native app acknowledgements use a background executor and wait for disk persistence before reporting success.

Register a small Android `TasbeehWidgetSync` Capacitor plugin. Its `getPendingTotals` method returns a snapshot of all pending date entries, migrating the existing `noor_widget_tasbeeh_totals_v1` value from `CapacitorStorage` without discarding its counts. Its `acknowledgeTotals` method accepts that exact snapshot and removes a date key only when the persisted counts still match the values the app read. If a widget tap increments a date after the read, the values differ and the updated entry remains pending. Invalid or unknown ledger data fails closed and is not deleted. A legacy value is removed only after its counts have been copied to the dedicated ledger; copy the new entry durably before removing the old value, and merge overlapping monotonic counts by per-phrase maximum if a prior migration was interrupted. Acknowledgement removes the dedicated entry and legacy key durably before the app releases its checkpoint; partial native failure leaves the checkpoint intact so a later sync can safely retry.

Make app-side merging idempotent in the Zustand-persisted store. Add a per-date checkpoint of the highest widget counts already applied. A single store action computes only positive deltas, updates the checkpoint together with daily log, lifetime totals, and activity, and persists those values in the same `noor_store_v1` write. Keep the checkpoint local to this installation: exclude it from backup export and the cloud-sync payload, since it is an import cursor rather than user activity. After the store write succeeds, acknowledge the exact native snapshot. If the app stops before acknowledgement, a repeat merge sees the checkpoint and adds no duplicate counts; if the native entry has changed, the compare-before-ack leaves it pending for the next foreground sync. Remove checkpoints only after native acknowledgement succeeds, and prune any leftover checkpoint whose date is no longer present after a successful pending-ledger read. This keeps the app store bounded without risking re-import when acknowledgement failed.

On first use after upgrade, convert the legacy single-date value to its per-day entry under the same native lock. Preserve its date and phrase totals. Do not reset any widget's visible counter as part of this migration. Keep daily-log retention behavior consistent with the existing store; lifetime totals still receive all pending deltas, including delayed dates.

Migrate the current `noor_widget_tasbeeh_merged_v1` localStorage marker into the new Zustand checkpoint before processing the corresponding pending date. The marker records counts that the old app already added to statistics, so importing it as a baseline is necessary to avoid counting the same legacy snapshot again. Persist the new checkpoint before removing the old marker; if the app stops between those operations, taking the per-phrase maximum makes the migration safe to repeat.

## Approaches considered

1. **Keep one rolling snapshot and sync more often.** This cannot protect a day when the app stays closed across midnight, because the widget itself overwrites the previous day's record before the app runs.
2. **Store all dates in one versioned JSON preference.** This preserves dates, but every tap rewrites an ever-growing value and compare-before-ack must rewrite the whole ledger; the update surface and race window grow with time.
3. **Store one date per preference entry with native compare-and-ack (recommended).** This isolates each day's counts, keeps normal taps small, and lets the app remove a snapshot only if that date was not incremented since it was read. A local persisted checkpoint handles app crashes between merge and acknowledgement without introducing a database dependency.

A Room database would provide stronger query and transaction capabilities, but it adds a database, migration, and backup surface for a small append-by-day counter. The per-date SharedPreferences design fits the existing Android integration and is the least complex option that satisfies the identified rollover and retry cases.

## Error handling and compatibility

- A native snapshot read failure, malformed date/count, local-store persistence error, or native acknowledgement failure leaves the affected source data pending.
- Acknowledgement is conditional on exact date/count equality; it never clears a newer count.
- Repeated startup/foreground calls and concurrent JS sync calls must not double-count because the store checkpoint and statistics change in one persisted state update.
- Successful acknowledgements release their local checkpoints; failed or partial acknowledgements retain the checkpoint for every date still pending.
- Legacy v1 data is imported once and never deleted before it is represented by the new per-day ledger. Migration is idempotent across app restarts.
- The plugin is Android-only. Web and iOS behavior is unchanged, and no new user-facing UI or permission is added.

## Verification

Automated tests must cover:

- Multiple unmerged dates surviving a midnight rollover and merging into their original date buckets.
- Re-running a merge after local persistence but before native acknowledgement does not increase lifetime or daily totals twice.
- A same-date tap arriving after snapshot read but before acknowledgement remains pending and merges as a positive delta on the next run.
- Legacy v1 conversion preserves all counts and is safe to repeat.
- The old one-date merge marker is imported as a checkpoint so an already-merged legacy snapshot is not added to lifetime or daily totals a second time.
- Malformed entries are retained rather than silently cleared, and unrelated Capacitor Preferences keys are untouched.
- The local checkpoint is not included in cloud-sync or user backup exports.

Run the focused Vitest suite, full `npm run verify`, Android unit tests, and Android `assembleDebug lintDebug`. Review the resulting Android data handling for compatibility; do not run instrumentation that uninstalls the installed app or destroys emulator-local state. Physical widget taps across midnight remain a device verification item.

## Scope limits

This design addresses only loss and duplicate-import risks in Tasbeeh widget history. It does not redesign widgets, change the current app theme, change the account-switch data policy, or claim that widget history has been verified on a physical device. The existing Android OS backup policy has not been decided; verification must check whether the pending ledger and Zustand statistics/checkpoint are restored consistently, without changing backup scope in this phase.
