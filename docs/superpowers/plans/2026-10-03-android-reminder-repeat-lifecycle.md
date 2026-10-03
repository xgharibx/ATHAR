# Android Reminder Repeat Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Android recurring reminders at their intended local time, preserve them after delivery and reboot, and discard missed one-shot alerts without replay bursts.

**Architecture:** Keep app-owned daily reminders on local calendar triggers using the configured, canonical `HH:mm` so a Date normalized through a daylight-saving gap cannot alter later deliveries. Patch Capacitor's matcher to reapply explicit clock fields after it advances a date, so a nonexistent spring-gap time cannot carry its normalized hour into the next day. For completed-today daily `at + repeats` reminders, Android schedules the first occurrence at its existing deferred time and carries the configured local clock into subsequent delivery; persisted repeat records survive delivery. Boot recovery converts expired daily records using the configured local clock and advances other supported repeat intervals into the future. The iOS API's current single repeating time-interval trigger cannot defer only the first occurrence and then switch to a local calendar repeat; retain the existing completion skip behavior and track its time-drift edge separately.

**Tech Stack:** Capacitor Local Notifications 6.1.3, Android Java, TypeScript, Vitest, npm postinstall source patch.

**Spec:** User request in this task and `AUDIT_REPORT_2026-10-02.md`; notification-lifecycle findings from the review of Capacitor 6.1.3.

## Global Constraints

- Apply Capacitor source changes through `tools/scripts/patch-capacitor-plugins.mjs`; do not edit the shared `node_modules` junction.
- Keep the user's completed-today skip behavior and avoid replaying expired one-shot notifications after boot.
- Keep the installer repeatable and fail clearly if installed Capacitor source anchors change.

## Review Focus

- Daily reminder fires for the first time after completion, then survives delivery and reboot at local wall-clock time.
- Configured reminder `HH:mm` survives a daylight-saving gap, including Android's deferred first delivery and boot conversion.
- Execute the installed `DateMatch` class against Cairo's 2026 spring-forward gap and verify it returns the next day at the requested clock.
- A device booted after a daily trigger converts to the next local daily occurrence without an immediate catch-up burst.
- Expired weekly/hourly repeat triggers advance by whole repeat intervals and are not deleted.
- Expired one-shot reminders are removed without being replayed.
- Re-running postinstall leaves patched sources unchanged.
- iOS completed-before-time reminders keep the current skip-today behavior; their time-interval drift remains recorded as a platform limitation for follow-up.

---

### Task 1: Repair Android recurring notification lifecycle

**Files:**
- Modify: `tools/scripts/patch-capacitor-plugins.mjs`
- Modify: `tests/capacitorProguardPostinstall.test.mjs`
- Test: `tests/notificationSilentSound.test.ts`
- Modify: `src/lib/reminders.ts`
- Modify: `AUDIT_REPORT_2026-10-02.md`

**Interfaces:**
- Consumes: Capacitor 6.1.3 `LocalNotificationSchedule`, `DateMatch`, `NotificationStorage`, and `TimedNotificationPublisher` APIs.
- Produces: an idempotent postinstall patch that schedules initial daily `at + repeat` alarms with a calendar recurrence, retains repeating records after delivery, and updates stale persisted dates during boot recovery.

- [x] **Step 1: Add failing fixture assertions** for calendar continuation on the first daily repeat, storage retention after repeat delivery, advancement of expired explicit repeat intervals, preservation of unsupported repeating records, and deletion of expired one-shots.
- [x] **Step 2: Run** `npm test -- --run tests/capacitorProguardPostinstall.test.mjs tests/notificationSilentSound.test.ts` and confirm failure on the missing native lifecycle behavior.
- [x] **Step 3: Extend the postinstall patch** to carry a local calendar match after the first daily `at` delivery, keep repeat records in notification storage, advance supported expired interval schedules to their next future occurrence, and delete only expired one-shots.
- [x] **Step 4: Run the focused tests** and verify both fresh patching and idempotent re-runs pass.
- [x] **Step 5: Run** `npm run verify`, `npm run android:sync`, and `android/gradlew.bat :app:assembleDebug :app:lintDebug`; restore only generated changes identified by the Android sync. (Local Gradle build used the existing unpatched node_modules junction; the fresh CI job must compile the patched sources.)
- [x] **Step 6: Update the audit report** after fresh CI validates the patched Capacitor source. Android, iOS, and Pages workflows passed on `09ca247`; Android CI compiled and linted the postinstall-patched plugin.
