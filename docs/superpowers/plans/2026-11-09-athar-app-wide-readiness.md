# Athar App-Wide Quality and Store Readiness Plan

> **For agentic workers:** Execute section by section in the current release worktree. Use read-only parallel reviews for independent areas, then one owner for each change, a focused regression test, peer review, and full verification before each release checkpoint.

**Goal:** Audit and harden every ATHAR app section and shared service until repository, backend, Android, and iOS readiness are supported by direct evidence.

**Architecture:** Inventory route-backed features, shared state and offline data, external APIs, Supabase functions/schema, and native platform integration. Review one cohesive product area at a time; fix demonstrated defects without changing the user's design or removing core features; retain an evidence table for each completed phase.

**Tech Stack:** React 18, TypeScript, Vite/PWA, Zustand, Capacitor 6, Android Gradle, Xcode project/Fastlane, Supabase Postgres and Edge Functions.

**Spec:** User-provided app-wide release-readiness objective; use `AUDIT_REPORT_2026-10-02.md` and `FEATURE_ROADMAP_2026-10-17.md` only as historical leads, not as current proof.

## Global Constraints

- Current repository release identity is `1.2.88` / Android versionCode `101` / iOS build `101`; check both stores before increasing or reusing it.
- Android currently targets API 36; iOS project deployment target is 13.0; Capacitor native packages are 6.2.3. Change floors only with compatibility evidence.
- Preserve core offline worship use, current user-approved design, local data, and account deletion semantics.
- Do not upgrade Supabase billing or create a paid database branch; do not expose credentials or personal account data.
- Never describe CI/build output as a signed release, physical-device validation, store acceptance, or publication.
- Do not publish or submit a store release; leave the final store action to the owner.
- After each area, record before/after, evidence, unresolved limits, and the next priority in a concise table.

## Review Focus

- Offline start and core reading/counting must remain usable with no network.
- Quran, hadith, and adhkar content and attribution must remain complete and traceable after cache or migration changes.
- Account sync, ownership, deletion, and leaderboard scoring must not lose user data or allow identity reassignment.
- Permission-denied, revoked, stale-location, schedule, timezone, and notification-sound paths must fail clearly and recover.
- Arabic RTL, keyboard, screen-reader, reduced-motion, small-screen, and older supported iOS/Android paths must be considered in each section.

---

## Current inventory baseline (2026-11-09)

Verified from the current `codex/cross-store-release-polish` checkout and read-only production inspection. The route inventory is unchanged from `ff2d846`; recent source commits add offline prayer resolution, older-WebView ID compatibility, Search recovery for saved custom adhkar, and Home resumption for local custom packs.

| Area | Current inventory |
|---|---|
| App routes | 65 React Router declarations; 43 modules in `src/pages/` and 9 Ijaz modules in `src/ijaz/pages/`. |
| Daily worship | Home, adhkar categories/readers, custom adhkar, favorites, search, quick tasbeeh, Sebha, daily Wird, Qadaa, Muhasaba, reminders, and Insights. |
| Quran and study | Quran landing, Mushaf, translation, tafsir, plans/khatma, vocabulary/word-by-word, Tasmee, Ijaz (home, miracles/details, categories, journey, refutation, timeline, verse explorer, search), hadith books/reader/memorization/sharh. |
| Prayer and reflection | Prayer times, Qibla, nearby mosques, prayer and wudu guides, prayer widgets, and notification/reminder scheduling. |
| Knowledge and media | Duas, Asma al-Husna, prophet stories, companions, Seerah, Islamic knowledge topics, library/item reader, Ruqyah, Shorts, and video library. |
| Accounts and shared services | Settings, onboarding, local/cloud sync, account import/deletion, leaderboard, Companion AI, source/import tools, offline cache, theme/background, navigation, accessibility/dialog primitives. |
| External integrations | Supabase Auth/PostgREST/Edge Functions; AlAdhan; Quran.com/Quran Foundation compatibility; HadeethEnc; Dorar; MiniMax through Companion; EveryAyah audio; OpenStreetMap Overpass; YouTube and RadioJar; browser geolocation, speech recognition, service worker/notifications, IndexedDB, and Capacitor local notifications/preferences. |
| Backend | Five local/deployed Edge Functions (`companion`, `delete-account`, `dorar`, `leaderboard`, `quran-translations`); 34 migrations through `20261109073146`. Current production reports 23,358,611 database bytes (~22.3 MiB), 1,343 leaderboard event rows, 7,112 rollups, 1,537 leaderboard profiles, and 282 sync rows across 47 accounts. |
| Native platforms | Android app with native local notifications and AppWidget providers. iOS Xcode project declares only the App target; WidgetKit source exists under `ios/WidgetExtension/` but is not integrated and its README still requires manual target setup. |
| Quality and release | Full verification reports 234 test files / 1,790 tests; lint has 0 errors and 93 warnings. `npm run android:sync`, `assembleDebug`, and `bundleRelease` pass on the current worktree; `jarsigner -verify` confirms the release AAB is unsigned. GitHub returned no status checks for `df26128` and `d34e856`; earlier Android and iOS CI builds passed for `7df92e6`. No signed iOS build, physical-device run, or store submission is evidenced. |

The lockfile mismatch is fixed and pushed in `3377391`: package, lockfile root, Android, and iOS version metadata are aligned at `1.2.88` / build `101`. The version tool checks and updates both lockfile root fields on future bumps; `version:check` passed. The current Android release build is unsigned by design. Production advisories currently include leaked-password protection disabled, 14 RLS-enabled tables with no policies (some are intentionally RPC-only and still need privilege review), and two indexes reported unused. Recent Quran Foundation proxy requests return service unavailable because `QF_CLIENT_ID` and `QF_CLIENT_SECRET` are not configured; the owner has no credentials available. An independent iOS release review also found that the current store screenshots are resized Android captures, App Store privacy/age/content-rights declarations remain manual, no reviewer sign-in route is documented, the iOS checklist has a stale version, the WidgetKit target is not in the Xcode project, and no signed TestFlight/device evidence exists. These are audit inputs, not automatic permission to change production or publish a release.

## Verified progress log — 2026-11-09

| Area | Before | After | Evidence / remaining limit |
|---|---|---|---|
| Prayer notification refresh | A refresh supplying only today's times canceled already scheduled alarms for tomorrow. | Refreshes replace today's slots while preserving tomorrow's existing prayer, follow-up, and Ramadan alarms until new tomorrow timings are available. | `notificationSilentSound.test.ts`, `prayerTimesPrivacy.test.tsx`, and `prayerNotificationHorizon.test.ts`; included in full verification. Physical Android/iOS notification behavior is still unverified. |
| Prayer follow-up after resume | Reconciliation after the Adhan discarded the 30-minute follow-up even when it was still upcoming. | Reconciliation restores only a still-pending silent follow-up and suppresses it when that date/prayer is recorded complete. | Date-specific notification and store integration tests; included in full verification. Real lock-screen/action behavior still needs devices. |
| Offline prayer times | React Query could pause uncached today/tomorrow queries before the local calculator ran when the app was offline. | Prayer queries run their cache/local fallback while offline, avoid network requests when the browser reports offline, and do not request GPS. | `prayerOfflineQueryIntegration.test.tsx` uses a real `QueryClientProvider` and offline `onlineManager`; covered by the current full `npm run verify` (228 files / 1,762 tests). Offline behavior was simulated, not checked on physical devices. |
| Older iOS WebView IDs | Custom adhkar, imported packs, and group khatma creation called `crypto.randomUUID()` directly, which may be absent in older supported WebViews. | All app ID creation uses a shared helper that prefers `randomUUID`, falls back to `getRandomValues`, then to a non-secret local ID fallback. | `randomId.test.ts`, `dataPacksItemIdentity.test.ts`, and `customAdhkarIdCompatibility.test.tsx`; no direct `crypto.randomUUID()` references remain in `src`. Full verification passed; physical iOS behavior still needs device validation. |
| Sync endpoint evidence | Owner could not confirm if cloud sync had resumed after quota recovery. | In the latest inspected 60-minute window, 16 `athar_sync` reads and 7 each of `athar_sync_commit_batch` and `athar_sync_ack_batch` returned HTTP 200. Production currently contains 282 sync rows across 47 accounts, with the latest row update at `2026-11-09 13:54:07 UTC`. | Confirms successful observed endpoint operations and non-empty server state, not a signed-in two-device data round-trip or the owner's account behavior; that device-level scenario remains unverified. |
| Leaderboard storage | Owner asked whether clearing leaderboard data prevents another quota overrun. | In the latest inspected 60-minute window, all 21 `/leaderboard` requests returned HTTP 200. Per-identity event/section caps and scheduled pruning/rollup jobs are active. Current database size is 23,358,611 bytes; leaderboard tables contain 1,343 events, 7,112 rollups, and 1,537 profiles. | There is no hard project-wide database size cap, and identities/profiles/current-year rollups can continue to accumulate. A future quota overrun cannot be ruled out; no paid upgrade or branch was created. |
| Search recovery and custom adhkar | Search treated an unavailable adhkar catalog like a successful empty search, and did not include locally saved custom packs. Copy controls were hidden until hover and nested inside a navigation button. | Search now shows the shared catalog retry state, indexes saved custom packs offline, distinguishes repeated item IDs by section position, and provides independent keyboard/touch-visible copy and navigation controls. | `tests/searchAdhkarRecovery.test.tsx` (4 cases), full `npm run verify`, and mobile browser render check. Current full suite: 234 files / 1,790 tests; browser console had no errors or warnings. |
| Home resume for custom packs | The “تابع آخر قسم” action searched only bundled sections, so it disappeared after visiting a saved custom pack. | Home now resolves the saved last-visited ID against bundled sections and local custom packs; the action opens `/c/custom_trip` in the regression test. | `tests/homeCustomLastSection.test.tsx` reproduces and verifies the route; current full `npm run verify` passes (234 files / 1,790 tests), targeted ESLint passes, and Android sync/debug/release builds pass. |
| Home time-aware prompts and prayer context | Time-based Home suggestions were memoized by date or prayer data alone, so morning/evening CTAs and prayer-driven missions could remain stale through hour, prayer, or background-resume transitions. Web could reuse today's timings for tomorrow Fajr. | The Home clock refreshes at hour boundaries and on resume. Prayer context refreshes at its 45-minute, 30-minute, and prayer-time boundaries; tomorrow timings use the native query or the existing local calculator on web. No per-minute render loop is used. | `homeTimeActions.test.ts`, `useCurrentHour.test.tsx`, `homePrayerContext.test.ts`, `useHomePrayerClock.test.tsx`, and Home integration tests cover hour changes, prayer transitions, resume, and the web tomorrow-date calculation. Independent review found no remaining issue. Full verification: 234 files / 1,790 tests; lint 0 errors; Android sync/debug/release builds pass. |
| Favorites offline recovery | When the adhkar catalog was loading, offline, stale, or failed to refresh, saved favorites could be mistaken for an empty list; a recovery notice could also hide favorites that did resolve. | Favorites now distinguishes true empty state from unresolved saved keys, offers retry/loading feedback, retains cached and custom-pack favorites, and shows missing-item feedback alongside resolved favorites. | `tests/favoritesOfflineCatalog.test.tsx` (7 cases) covers first load, network error, cached refresh error, custom-only offline, stale missing, successful missing, and mixed resolved/missing data. Full verification: 234 files / 1,790 tests. Independent review found no remaining issue; Android sync/debug/release builds pass. |
| Quran Juz boundaries and progress | Surah filtering and completion totals assigned a surah entirely to the Juz where it starts, excluding cross-boundary surahs from later Juz and misattributing their read ayahs. | Filters include surahs in every Juz they span; progress is calculated by ayah boundary; opening a filtered surah jumps to its first ayah in that Juz, and its page label and accessible name match the destination. Hizb completion markers now read Hizb progress. | `tests/quranJuz.test.ts` (4 cases) covers Al-Baqarah crossing Juz 1–3, actual per-Juz progress, Juz entry ayahs, and Hizb progress. Independent review rechecked the fix. Full verification: 234 files / 1,790 tests. Android sync/debug/release builds pass; no device runtime check was performed. |
| Custom Sebha deletion | Deleting a saved custom dhikr removed a counter under its list ID, although the counter is keyed by normalized phrase; the active custom dhikr could remain selected after deletion. | Delete now uses the shared phrase key, removes the count and selection only when no saved duplicate or quick shortcut still uses that phrase, and falls back to the default dhikr when the final reference is removed. The quick-shortcut list and store now share one source. | `tests/sebhaImprovements.test.ts` covers deletion, duplicate saved phrases, and overlap with the real quick-shortcut list; `tests/sebhaCustomCounters.test.ts` and `tests/sebhaCounter.test.ts` also pass. Independent review found no remaining issue. Full verification: 234 files / 1,790 tests; Android sync/debug/release builds pass. |
| Android packaging | Latest JavaScript fixes had not been packaged by Android Gradle. | Built the current web assets, debug APK, and release AAB successfully; release AAB is unsigned for owner signing. | `npm run android:sync`, `gradlew.bat assembleDebug bundleRelease`, and `jarsigner -verify`. No installed-emulator launch or Play Console upload is evidenced. |

## Phases

### Phase 0: Inventory and release baseline

- [x] Capture route/page, native, backend-function, test, and current version inventory.
- [x] Confirm current branch/worktree, pushed remote commit, package lock, Android/iOS version parity, CI gate visibility, live service configuration, and artifact signing state. (The branch was synchronized at `468c941` before this Home change; no current GitHub status check was recorded for that base commit; the Android release AAB is unsigned.)
- [ ] Convert all historical audit findings into verified / fixed / open / unverifiable status.

### Phase 1: Daily use and navigation

Scope: startup, background/theme, home, adhkar categories and reader, custom adhkar, quick tasbeeh/sebha, search, favorites, and navigation.

- [ ] Audit interaction, offline/error recovery, persistence, data deletion/reordering, scoring side effects, RTL, accessibility, and low-end performance.
- [ ] Fix only reproducible defects; add focused regression coverage and inspect rendered behavior.
- [ ] Publish before/after evidence table.

Completed slices: Search recovers from adhkar catalog failures and includes local custom packs; Home resumes local custom packs and refreshes time-sensitive suggestions; Favorites preserves and recovers saved items across catalog loading, failure, and stale-cache states; Sebha custom deletion now clears only truly orphaned counters and preserves overlapping shortcuts. See the corresponding progress rows above; the remainder of the Daily Use phase is still open.

### Phase 2: Quran and memorization

Scope: Quran landing page, Mushaf, translation/tafsir, Quran plans/khatma, vocabulary/WBW, Tasmee, and Ijaz routes.

- [ ] Audit Quran text/source integrity, page/ayah mapping, caching/offline retry, audio, memorization controls, navigation, and external API handling.
- [ ] Verify Arabic shaping and supported iOS WebKit behavior.
- [ ] Publish before/after evidence table.

Completed slice: Quran Juz filtering, ayah-level progress, filtered navigation/page labels, and Hizb completion indicators now follow the actual Mushaf boundaries. The rest of the Quran/memorization audit remains open; see the progress row above.

### Phase 3: Prayer and reflection

Scope: prayer times, Qibla, nearby mosques, reminders/adhan, prayer and wudu guides, Qadaa, Wird, Muhasaba, Insights, and prayer widgets.

- [ ] Audit calculation inputs, location choice/privacy, timezone/DST, notification lifecycle/sounds, background execution, widget freshness, and recovery states.
- [ ] Run deterministic schedule/widget tests; record which OS/device cases still need physical testing.
- [ ] Publish before/after evidence table.

### Phase 4: Knowledge and media

Scope: hadith books/reader/sharh/memorization, duas, Asma al-Husna, stories, companions, seerah, knowledge sections, library, Ruqyah, Shorts, and video library.

- [ ] Audit content sources, search/filter behavior, licensing/attribution, download/cache limits, media playback, offline mode, and accessibility.
- [ ] Verify representative user flows and dataset integrity.
- [ ] Publish before/after evidence table.

### Phase 5: Accounts, sync, AI, APIs, and database

Scope: local/cloud sync, account linking/deletion, leaderboard, Companion AI, Quran translation proxy, Dorar, Supabase migrations/RLS/quotas/cron/storage.

- [ ] Audit auth/session recovery, merge/deletion safety, API validation and rate limits, data minimization, spend and growth bounds, and live deployment parity.
- [ ] Use only aggregate/read-only production checks unless a user-approved safe action is necessary; never expose secrets or personal rows.
- [ ] Publish before/after evidence table including what live API evidence can and cannot prove.

### Phase 6: Shared quality, accessibility, performance, and dependencies

Scope: design system, dialogs/focus, localization/RTL, motion, offline/PWA cache, startup/route loading, logs, dead code/tooling, dependency health, security, CI coverage.

- [ ] Measure bundle and startup hotspots before optimizing; update dependencies only with compatibility and migration checks.
- [ ] Audit keyboard/screen-reader/reduced-motion/text-size behavior and install/offline update flows.
- [ ] Publish before/after evidence table with measured results and remaining warnings.

### Phase 7: Android and iOS release audit

- [ ] Verify permissions, deep links, lifecycle/back navigation, notification sound resources, widgets/targets, backup, sign-in, review account, privacy declarations, and store screenshots/metadata against actual behavior.
- [ ] Run Android build/tests and available macOS CI. Distinguish CI from emulator/device testing; obtain real iOS device/TestFlight evidence before claiming full iOS readiness.
- [ ] Check signed AAB/IPA availability, version parity, and final owner-held submission steps.
- [ ] Publish final cross-store readiness table; do not mark complete while any required item is unverified or blocked.
