# App quality audit and verified repairs

> For agentic workers: use systematic-debugging, test-driven-development, and verification-before-completion. The user authorized autonomous investigation and fixes across Android and web. Domain owners work in parallel with disjoint files; root reviews and verifies the combined changes.

**Goal:** Study the application's Android and iPhone web readiness, repair evidenced defects, and deliver a complete findings ledger with coverage limits and a prioritized release plan.

**Architecture:** Preserve the React/Vite/Capacitor/Supabase architecture. Fix causes in their owning modules, preserve existing user data and contracts, and add regression coverage for consequential behavior. Keep live production changes separate from local verified repairs.

**Spec:** User request of 2026-10-02: comprehensive app/API/database study and improvements for Android and iOS web users, with autonomous permission.

**Tech stack:** React 18, TypeScript, Vite 5, Vitest, Capacitor 6, Android Java, Supabase Edge Functions/Postgres, IndexedDB, Zustand.

## Constraints and review focus

- Preserve secret values and personal data; evidence uses fresh contexts and synthetic identities.
- Avoid broad redesign or dependency-major migrations during an audit.
- Record source findings separately from live verification and device-only unknowns.
- Test restore across reload, offline first launch, changing GPS, edits/signout during sync, duplicate/cold-start auth callbacks, native prayer/custom notification coexistence, and React state transitions.
- Leave production schema/data/deployments untouched until the local implementation and release impact are fully reviewed.

## Tasks

- [x] **Root: release validation and route crashes.** Scoped ESLint to maintained TS/TSX sources; fixed the lint errors without suppressing hook rules. Moved Home tasbeeh totals and Quran resume memos to unconditional component scope. Verified route state transitions, lint, tests, and production build.
- [x] **Root: bundled Quran page-map integrity.** Added a regression test against shipped Quran/page-map JSON, corrected the invalid leading byte, and verified complete surah/ayah/page coverage. Offline first-launch behavior remains a device check.
- [x] **Web/data owner: backup and prayer reliability.** Export/import now includes actual custom data packs; custom reminders and Hadith state restore through persistent stores. GPS fallback uses newly acquired coordinates and bounds stalled requests; tests cover persistence and fallback.
- [x] **Backend owner: cloud-sync lifecycle and leaderboard ownership.** Preserved in-flight edits and invalidated stale account work. Added leaderboard ownership RPC and migration with synthetic edge-handler tests. Migration/deployment remains pending because the hosted Supabase project is restricted.
- [x] **Android owner: notification and auth delivery.** Scoped custom notification cancellation, selected the monochrome icon, retained cold-start callbacks until one JS listener is ready, and deduplicated callback exchange. Verified tests and Java compilation; emulator rejected a broadcast for an unregistered widget ID without creating state.
- [x] **Root: integrate and review.** Reviewed the combined change set; `npm run verify`, Android debug build, and browser route/state checks passed. Offline airplane-mode and physical-device checks remain listed in the audit report.
- [x] **All: audit ledger.** Added `AUDIT_REPORT_2026-10-02.md` with API/database, auth/sync, security/privacy, PWA/offline, content integrity, UI/accessibility/localization, media/performance, native/release, and deployment findings, with evidence limits and prioritized next phases.

## Completion criteria

The audit deliverable covers every identified subsystem, distinguishes verified/local fixes from unresolved findings, and gives actionable release work. Local changes pass fresh applicable checks. Passing this audit is not a claim that every physical device or production workflow has been certified.
