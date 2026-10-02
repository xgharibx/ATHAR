# ATHAR / Noor Adhkar — Quality, Security, and Store-Readiness Audit

**Audit date:** 2026-10-02
**Source version:** `1.2.62`
**Scope:** Web/PWA, Android Capacitor shell, iOS wrapper and iOS web use, Quran and supporting content, local persistence and backup, API integrations, Supabase functions/database integration, auth/sync, notifications/widgets, build/release configuration, dependency health, and store-readiness constraints.

This report records verified fixes in the current audit branch separately from unresolved release risks. It does not certify every device, every interactive flow, the accuracy of every religious text, or a production deployment.

## Executive assessment

The app has a substantial offline-capable feature set, and its existing visual design remains intact. This audit fixed high-impact regressions in Quran navigation, storage restore, prayer-time fallback, auth callback delivery, sync lifecycle, audio caching, and notification/widget handling. The release-verification command now completes successfully, and all tested routes render at a narrow mobile viewport.

The app is **not ready for a public store release**. The main gates are paid AI protection that has been improved in this branch but is not deployed or live-verified, a currently restricted Supabase project, unapplied leaderboard, AI, and Quran translation quota migrations, a hosted translation integration that is still unverified against its provider, and incomplete iOS native/auth/privacy preparation. Android source builds successfully, but release metadata is inconsistent and a release-signed artifact was not produced or uploaded.

## What was examined and verified

- Ran `npm run verify` on a clean isolated install after the latest changes: lint completed with **0 errors and 100 warnings**, all **846 tests in 99 files passed**, and the TypeScript plus Vite production/PWA build succeeded. The build still reports browser-externalized Anthropic SDK modules and oversized chunks.
- Parsed the actual bundled Quran and page map: **114 surahs, 6,236 ayahs, and all 604 Mushaf pages** are represented by valid JSON and page references.
- Loaded **52 valid app routes** plus one deliberate unknown route in a production preview at **390 × 844**. Routes rendered, the unknown route showed the not-found view, and targeted Home and Quran state transitions did not produce React hook-order errors. This was route and focused-interaction coverage, not a full usability pass over every control.
- Rebuilt and launched the Android debug APK on the API 36.1 emulator without a runtime crash. An earlier emulator test showed that sending an increment broadcast with a nonexistent widget ID did not create widget totals or preference state. Prayer notification scheduling is covered by tests, but the default reminder setting is off, so pending alarms were not exercised end-to-end on the emulator. No release-signed artifact was produced.
- Verified Aladhan's date-specific `timingsByCity` endpoint with a read-only Cairo request; the app now uses its date path for next-day timings and falls back to local calculation offline.
- Issued only safe `HEAD`/`GET`/`OPTIONS` checks to 10 configured Supabase endpoints. They returned HTTP **402 `exceed_db_size_quota` / project restricted**. No production database, account, or function writes were made.
- Audited the dependency tree with `npm audit`: after applying available non-breaking fixes in an isolated clone, **6 npm audit findings remain** (1 critical, 2 high, 3 moderate). The production dependency graph has **2 moderate npm audit findings** and no high or critical advisories. The lockfile root version is aligned with package version `1.2.62`.
- Could not produce an iOS/Xcode build in this Windows workspace or verify App Store Connect / Play Console configuration. No physical iPhone test was performed.

## Repairs in this phase

| Area | Repair | Verification |
|---|---|---|
| Quality gate | Scoped lint to maintained application and function sources; CI now runs the full verify command before Pages deployment. Fixed surfaced lint errors without disabling React hook checks. | `npm run verify` |
| Quran data and navigation | Removed the invalid leading byte from the shipped page map; corrected conditional hook ordering in Home and Quran. | Bundled data regression test; route/state browser checks |
| Backup and restore | Include custom data packs, restore IndexedDB-backed reminders and Hadith state, and wait for persistence work to finish. | Backup persistence tests |
| Prayer times | Bound network requests with a timeout and use newly acquired GPS coordinates for offline calculation if the API request fails. | Offline/GPS fallback tests |
| Prayer notification horizon | Fetch next-day times for the same saved location, queue date-specific prayer/follow-up/Ramadan/Hadith notifications for today and tomorrow, and cancel the matching dated follow-up when logging a prayer. | Offline location fallback and date/ID scheduling tests; Android debug launch |
| Auth and sync | Deliver native OAuth callbacks until JS is ready, validate the callback URL, share one callback listener, deduplicate code exchange, invalidate stale sync work after sign-out/account changes, and catch edits made during import. | Auth callback and sync lifecycle tests; Java compilation |
| Companion spend guard | Require and verify a signed-in Supabase user, reserve an atomic 30/day and 5/rolling-minute account quota, cap request bodies in UTF-8 bytes while streaming, allow only explicit browser request headers, and bound upstream requests to 60 seconds. The branch includes a database migration; it is not deployed. | Eleven synthetic Edge Function security tests, including CORS preflight; migration still requires a live staging run |
| Quran Foundation translations | Route both approved translation IDs through server-side OAuth; add durable atomic per-client/global token buckets and daily quotas, fail closed when the shared quota service is unavailable, bound cache life to seven days, credit the provider and edition, and render Urdu right-to-left. | Edge Function/client tests and `npm run verify`; quota migration and provider access remain unverified on live Supabase |
| Dependency hygiene | Move test-only `jsdom` to development dependencies, apply non-breaking audit fixes, align the lockfile root version, and make Quran translation tests configure a synthetic Supabase client before module import. | `npm run verify` on the isolated updated install; audit reduced from 31 to 6 overall and from 4 to 2 production advisories |
| iOS OAuth callback | Register `app.athar` in the iOS URL types so the existing AppDelegate-to-Capacitor callback can receive the redirect used by native sign-in. | XML configuration regression test; an Xcode build and physical sign-in round trip remain unavailable here |
| Reminder notifications | Cancel only the app's custom reminder notification IDs; select the Android monochrome status icon. | Notification ownership tests; Android build |
| Tasbeeh widget | Reject taps for widget IDs not registered with Android before changing counts. | API 36.1 emulator invalid-ID broadcast; no state created |
| Leaderboard identity | Add an ownership RPC check before identity mutation and include the database migration. | Edge handler ownership tests; migration remains unapplied |
| Companion readiness | Treat only successful 2xx responses as ready and time out health probes. | Health tests |
| Offline reader/audio | Add an app-shell fallback for failed navigation requests; make Mushaf downloads and the service worker use one audio cache and report partial/failed downloads honestly. | Build and tests; true airplane-mode replay still needs device verification |
| Privacy wording | Remove the false claim that Tasmee audio never leaves the device; improve Arabic diacritic/tatweel normalization. | Source/UI review and regression tests |

## Open findings, ordered by release impact

### P0 — Protect paid AI access before exposing the endpoint

The initially audited `supabase/functions/companion` accepted unauthenticated calls (`verify_jwt=false`), and a synthetic request reached MiniMax in the local source harness. The current branch now requires a bearer session, validates it with Supabase Auth, atomically reserves up to 30 requests per UTC day and 5 per rolling minute through a service-only RPC, reads request bodies with a 256 KiB UTF-8 byte cap, and bounds upstream requests to 60 seconds. Existing system/message/token caps and the per-isolate 24-requests/minute IP limiter remain. The new quota migration and function have not been deployed; live Supabase checks still return HTTP 402, so production protection is unverified and must remain a release blocker. The per-account quota also needs a provider-level/global spend cap and alerts to address account farming and total exposure.

**Release gate:** restore the Supabase project, apply the quota migration to staging, deploy the function, and verify missing/public-key-only/invalid tokens, per-minute and per-day boundaries, concurrent reservations, body caps, and provider spend alerts against the deployed endpoint. Keep paid AI disabled for public release until those checks pass. Never place provider secrets in browser build variables.

The current client sends the full conversation history and a generated context containing activity and prayer/Quran progress, profile preferences, inferred mood, local memory, and relevant local-library passages through Supabase to MiniMax when a reply is requested. The history/profile comments previously described data as device-only, which conflated local storage with model requests; those comments and the existing Companion helper text now describe the outbound flow. MiniMax's current API terms say inputs and generated content may be used to provide, maintain, develop, and improve its services; its API privacy policy says data is stored in the United States and retained as long as necessary or permitted. Confirm which terms govern Athar's account and whether an enterprise/data-processing option changes those terms before sending users' religious conversations. A repository search found no user-facing privacy-policy page or link. Add and publish a policy, and make the store data-safety declarations match the actual flow. Minimize context to what is necessary for each request and provide a clear control for users who do not want personalization data sent. See MiniMax's [Open Platform Terms](https://platform.minimax.io/protocol/terms-of-service) and [API Privacy Policy](https://platform.minimax.io/protocol/privacy-policy).

### P1 — Restore hosted backend and verify the actual database before cloud release

Supabase safe endpoint checks returned 402 project-restriction responses, so sign-in, sync, leaderboard, and deployed edge-function behavior could not be exercised. This may be a billing/quota state rather than an application defect, but it makes the cloud product unavailable in the observed environment.

The leaderboard ownership migration and Companion quota migration are local only. Until they are applied and verified against a staging database, the edge-function changes cannot be considered production-ready. Legacy leaderboard identities with missing ownership records need an explicit, reviewed backfill or recovery policy; the new check otherwise correctly fails closed. The iOS build workflow now passes the Supabase URL and public key needed for account-backed Companion access, but the hosted secret values still need verification.

**Next:** restore the project through its owner, run the schema/RLS/function test suite against a disposable staging project, apply the migration there, verify existing leaderboard rows and ownership recovery, then deploy in a controlled release. No production write was attempted in this audit.

### P1 — Configure and live-verify the Quran translation service

The client now calls a server-side `quran-translations` Edge Function using Quran Foundation's OAuth client-credentials flow and current Content API endpoint. The incorrect catalog IDs were corrected to Yusuf Ali `22` and Jalandhry `234`; invalid, incomplete, and cross-surah responses are rejected. Credentials remain server-only, and the proxy bounds requests, allowlists origins/resources, and enforces atomic shared token buckets: per-client capacity 60/refill 1 per second and a 2,000-request UTC-day cap; global capacity 1,200/refill 20 per second and a 50,000-request UTC-day cap. It fails closed if the quota service is unavailable. Memory and IndexedDB caches expire and are purged at seven days, the obsolete whole-book cache is removed, and offline failures no longer display Saheeh under another translation's label. The reader and shared verses credit Quran Foundation and name the edition; Urdu is right-to-left and browser auto-translation is disabled for Quran text.

The implementation is covered by synthetic Edge Function and client tests, including OAuth refresh, CORS, allowlisting, durable-quota decisions and failure behavior, response validation, source IDs, translation failure transparency, and cache expiry. The hosted Supabase project remains restricted (HTTP 402); the quota migration has not been applied, and no Quran Foundation credentials were inspected or configured. Set up an approved backend app, apply the migration and deploy to staging, verify quota boundaries and access to all 114 chapters and both resources, and only then enable production. See [Quran Foundation's translation endpoint](https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/translation/), [OAuth quickstart](https://api-docs.quran.com/docs/quickstart/), and [developer terms](https://api-docs.quran.foundation/legal/developer-terms/).

### P1 — Finish iOS native sign-in, privacy, and account lifecycle

The native sign-in flow already uses `app.athar://auth`, and `AppDelegate` forwards opened URLs to Capacitor; `Info.plist` was missing the `CFBundleURLTypes` registration that lets iOS route that scheme to the app. The registration is now present and covered by an XML configuration regression test. The current iOS project still needs a complete Xcode-target review for native share wiring and a bundled, accurate `PrivacyInfo.xcprivacy` manifest. A physical iPhone build and auth round trip have not been verified.

If Google or another third-party provider is used for primary account login, App Review Guideline 4.8 requires an equivalent login option meeting Apple's privacy criteria; Sign in with Apple is the usual fit. Account-creating apps also need an in-app account-deletion path that removes associated user data. Verify actual login providers, implement the compliant alternative and URL handling, audit every data/permission disclosure, add the app and required SDK privacy manifests, and exercise sign-in, sign-out, deletion, restore, links, notifications, and voice input on physical iOS hardware. Apple explains [login requirements](https://developer.apple.com/app-store/review/guidelines/uk/), [account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/), and [privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files).

### P1 — Verify prayer reminder lifecycle on device

The branch now queues today's and tomorrow's date-specific prayer alerts, follow-ups, Ramadan alerts, and daily Hadith using the selected location and method; it falls back to local calculation if the date-specific API request fails. The two-day horizon refreshes when app prayer data changes, but the app needs to reopen and refresh to extend the horizon beyond tomorrow. The source was built and launched on the API 36.1 emulator, while the default reminders are off, so actual pending alarms were not verified there. Test exact-alarm and notification permissions, Doze, DST, manual clock and time-zone changes, location changes, reboot restoration, and a multi-day closed-app interval on device.

### P1 — Correct privacy disclosures for location and network services

Prayer calculations send coordinates to Aladhan when the online service is used. The source currently has no user-facing privacy-policy page or link. Publish a policy that names this destination, purpose, and offline option, then review data flows for auth, Supabase sync, Companion prompts/audio, speech recognition, mosque lookup, and analytics/build reporting, and make the store declarations match observed behavior. The Tasmee audio disclosure was corrected locally; the remaining app-wide privacy inventory is still open.

### P1 — Reconcile Android/iOS release identity and version metadata

The checked-in package/source version is `1.2.62`, while `released.android` says `1.2.54`; an older Android output-metadata file reports version code 19 / version name 1.2.7 while current Gradle sources use version code 74 / version name 1.2.62. Confirm the intended package/bundle identifiers, signing ownership, monotonic version codes, release channel, and metadata, then generate and inspect a release-signed AAB/IPA from clean sources. The audit APK is a debug-only build and is not a store artifact.

### P1 — Complete the release account and testing path

No store account or listing was inspected. Google currently documents a one-time US$25 Play Console registration fee and identity verification. Personal Play accounts created after 2023-11-13 must complete a closed test with at least 12 continuously opted-in testers for 14 days before applying for production access. Apple's Developer Program is US$99 per membership year (local currency may apply). See [Play Console setup](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en-en), [Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), and [Apple membership](https://developer.apple.com/support/compare-memberships/). Account identity, payments, and acceptance of developer agreements must be completed by the account owner.

### P2 — Reduce bundle and offline-cache cost

The production build warns that key chunks are large: `miracles` is about **972 kB** uncompressed, React vendor about **857 kB**, and Three vendor about **671 kB**. The PWA precache is about **27.8 MB across 284 entries**. Measure cold-start and memory on lower-end phones; lazy-load the Three/miracle path and other route-only code, split vendor chunks based on measured use, set an explicit offline storage budget, and validate cache eviction and upgrade behavior. Keep the current visual design while improving loading and memory behavior.

### P2 — Address dependency advisories deliberately

The latest `npm audit` reports **6 npm audit findings** (1 critical, 2 high, 3 moderate). The production graph has **2 moderate npm audit findings**, both in React Router; no high or critical production advisories remain. The critical `tar` finding and high Vite/Capacitor CLI findings are in development/build tooling. npm's available fixes for the remaining `@capacitor/cli`/`tar`, Vite, and React Router findings require major upgrades to Capacitor CLI 8, Vite 8, and React Router 7. Identify reachability and affected build/runtime surfaces, perform those migrations in a dedicated tested phase, then rerun build, tests, Android, and iOS validation. Do not equate a development-only advisory with production exploitability, but do not leave the critical advisory without a documented disposition.

### P2 — Improve quality-gate signal and browser coverage

Lint has no errors but still emits 100 warnings. The route smoke pass verified rendering and targeted state transitions, not screen-reader navigation, keyboard-only operation, contrast, all RTL layouts, permission-denial recovery, or every workflow. Add focused accessibility and interaction tests for sign-in/restore, prayer settings, onboarding, reader/audio, reminders, and deletion; exercise representative small/large screens and offline cold starts. The offline navigation and cached-audio changes still need true airplane-mode device verification.

### P2 — Review religious-source accuracy and attribution

The Quran page map and selected bundled integrity checks are verified, but the audit did not validate every Quran translation, Hadith grade, adhkar attribution, or Ijaz/scientific claim against primary sources and qualified scholarship. In particular, scientific-miracle claims should cite their source and be reviewed by a qualified subject-matter editor before being presented as established fact. Preserve Arabic text and existing app design while correcting any verified content errors.

## API, database, and data inventory

| Surface | Current role | Audit status |
|---|---|---|
| Supabase Auth / `athar_sync` | Sign-in, account-scoped cloud sync, leaderboard edge functions | Safe probes restricted by HTTP 402; no live schema/RLS mutation tests possible |
| Supabase Companion function → MiniMax | AI answers and related tools | Paid upstream is reachable without sufficient durable authorization/quota; release blocker |
| Aladhan | City/GPS prayer-time lookup | Client call reviewed; timeout, recent-GPS offline fallback, and date-specific next-day lookup added. Verify privacy wording and live provider behavior |
| Quran Foundation | Optional hosted translations/content | Server-side OAuth proxy, seven-day cache, and shared database quota migration implemented locally; migration, API/deployment, and full catalog access unverified while Supabase is restricted |
| EveryAyah | Recitation audio | Unified browser cache and honest partial-download messaging fixed; offline playback needs airplane-mode verification and source/rights review |
| Overpass / mosque search | Nearby mosque lookup | Static integration inventory only; offline cache, provider reliability, and privacy behavior need dedicated checks |
| Browser storage / IndexedDB | Progress, Hadith notes, custom reminders/packs, offline content | Backup/restore fixes covered by tests; cross-browser quota eviction and private-mode recovery remain unverified |
| Service worker / GitHub Pages | PWA navigation, precache, runtime caching, deployment | Build succeeds; new offline app-shell fallback is not yet verified in airplane mode or across an upgrade from an old cache |

No production database dump was available because the hosted project was restricted. Table-level RLS claims, existing user-row ownership, deployed function versions, backup/restore, quotas, and observability therefore remain **unverified against production**.

## Recommended next phases

1. Close the Companion abuse path with server-side authentication, quotas, payload limits, and spend controls; deploy only after abuse tests pass.
2. Restore Supabase availability; test schema, RLS, sync, identity ownership, existing-row recovery, and edge functions in staging; then schedule the reviewed migration/deploy.
3. Restore Supabase availability, apply and verify the Quran translation quota migration in staging, configure Quran Foundation backend credentials, deploy the translation proxy, and verify each enabled translation/chapter before production.
4. Finish iOS URL routing, required login alternative, privacy manifests, account deletion, native share configuration, and physical-device testing.
5. Correct prayer notification horizon and Android permission/reboot/time-change cases; verify PWA and audio offline behavior on real devices.
6. Reconcile store metadata and signing/version identity; prepare listing/privacy assets, tester recruitment, and signed release bundles.
7. Upgrade vulnerable dependencies, reduce startup/cache weight, eliminate lint warnings, and expand accessibility and content-source review.

## Audit limits

This pass makes no claim that the app is already top-ranked or that any store will approve it. No account was created, no credential or personal identifier was read, no payment or legal agreement was accepted, and no production schema/function deployment or user-data write was performed. Release account enrollment, identity verification, payment, signing custody, legal terms, and final store submission require the owner's account and decision. The old `AUDIT_REPORT_2026-07-19.md` remains a historical report for an earlier version; its findings need revalidation before being treated as current.
