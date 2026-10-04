# Android release polish implementation plan

> **For agentic workers:** Use the assigned parallel tasks and verification-before-completion workflow. The user's release request is the binding scope.

**Goal:** Deliver a clean Android-ready update, refreshed sounds and quiet followups, an accurate public privacy policy, Play listing screenshots, and Arabic release notes.

**Architecture:** Retain the current app design and notification scheduling. Use the user's permitted fixed-audio fallback because the installed native notification engine resolves bundled sound resources; do not introduce a new downloadable notification-sound subsystem in this release. Publish a standalone bilingual privacy page and link it from Settings and Play Console.

**Tech stack:** React/Vite, Capacitor 6, Android notification channels, GitHub Pages, Play Console.

## Constraints and decisions

- Remove visible startup data-loading copy and verbose provider/storage/transport explanations from app screens; preserve functional labels, errors, religious content, permission choices, and source credits.
- Bundle the exact provided Ahmad Al Nafees and Birds files; remove the old audio assets and use new channel IDs.
- One audible notification per prayer/reminder occurrence; followups and snoozes for the same occurrence are silent. A new recurrence can sound again.
- Correct the public contact to `amr@gharib.dev`, as confirmed by the user.
- Do not change clear-all-data or create a paid Supabase branch.
- Keep the existing Forest design. Capture actual Android emulator screens without system bars; do not fabricate a Samsung device or app state.
- Leave signed publication to the user. Preserve existing primary-checkout changes while bringing Android Studio's checkout up to date.

## Tasks

- [x] Screen copy cleanup: App, Companion/modal/profile, location screens, account/local-storage explanatory blocks; focused regression checks and rendered validation.
- [x] Audio update: exact file copies, profiles/migration, new audible channels, first-sound/followup/snooze regressions, preview verification.
- [x] Privacy page: trace real data collection and recipients, retention/deletion limits, public contact; responsive Arabic and English page and Settings link.
- [x] Release packaging: choose the next unused version/build number, synchronize package/Android/iOS metadata, run full web verification and Android build/lint/unit checks.
- [x] Independent code review: address material findings before pushing.
- [ ] Emulator and store assets: validate representative flows, capture final high-resolution screens with system bars hidden, replace Play phone screenshots and set the policy URL.
- [ ] Delivery: Arabic Play release notes, plain-language before/after table and next-update items, verified push/deployment, updated Android Studio checkout and signing handoff.

## Review focus

- Existing installations must switch away from immutable old sound channels after update.
- Snoozing and coincident prayer/Hadith/Ramadan notifications must not replay the main sound.
- Denied permissions and account transitions must retain existing safe scheduling behavior.
- Policy claims must match automatic leaderboard uploads, optional account sync, and opt-in personal AI context.
- Existing uncommitted primary-checkout edits and original supplied audio files must survive integration.

## Store upload adjustment

The owner asked to leave Edge file-URL access unchanged after the browser security tool blocked opening extension settings. Prepare screenshots for manual upload; edit privacy/Data safety through the visible form. Do not attempt a file-access workaround.
