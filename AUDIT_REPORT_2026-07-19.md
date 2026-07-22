# ATHAR (أثر) — Ultimate A-to-Z Audit
**Date:** 2026-07-19 · **Version audited:** 1.2.22 (build 34) · **Method:** static code audit across 10 parallel passes + direct verification of native/version/permission surfaces. No live browser click-through was performed in this pass (shared browser pane was unavailable to subagents); items needing live confirmation are marked **SUSPECTED**.

---

## 1. Executive summary

ATHAR is a large, mature, actively-developed Islamic super-app (Adhkar, full Quran reader with Tajweed/WBW, 6-collection Hadith library with narrator bios and offline explanations, an AI companion, prayer times/Qibla/mosques, a leaderboard, a "Scientific Miracles" mini-site, and ~15 supporting content sections) shipping to web (PWA), Android, and iOS via Capacitor. The codebase is unusually clean for its size: **0 lint errors, 0 typecheck errors, 454/454 tests passing, clean git tree, no leftover `console.log`/`debugger`, virtually no TODO/FIXME graveyard.** Recent commit history shows a real, disciplined audit-and-fix culture — most subsystems here have already been through 1-3 rounds of prior fixes.

That said, this pass found **one genuine blocker** (a verification feature that's permanently a no-op due to a never-called async function), plus a cluster of **major bugs concentrated in the two least-tested/newest areas**: the Companion AI modal and the Ijaz (Scientific Miracles) section. The rest of the app — Hadith, Knowledge/Library, Native platform config — came back essentially clean.

### Top 8 findings, ranked by impact
1. **[BLOCKER]** Companion's Quran-citation verification is dead-code-gated — every correctly-cited verse gets falsely flagged as "not found," visible in `CompanionModal`. See §3.1.
2. **[MAJOR]** The Companion **modal** (used from Mushaf/DhikrList/Hadith) never got the auto-scroll-during-streaming fix that shipped for the `/companion` page — the exact bug the commit claims to have fixed still reproduces in the modal. §3.1
3. **[MAJOR]** Android home-screen prayer widget can display a **stale "next prayer"** for hours after it actually passes, silently skipping straight to tomorrow. §6.1
4. **[MAJOR]** Ijaz section: 4 of 7 "Journey" deep-links point to slugs that don't exist — silent misdirect to a generic list instead of the intended miracle. Plus the home category grid links to the wrong route, and an entire second, unused Ijaz UI shell/store/hooks stack sits dead in the tree. §7
5. **[MAJOR]** Settings has two toggles ("app sounds" and "tasbeeh sound") that both silently control the *same* single preference — toggling one flips the other. §4.3
6. **[MAJOR]** Quran: selecting "Hafs" as the app-wide Arabic font reintroduces the exact Arabic-Indic-digit-as-tofu bug that was just fixed for Mushaf, through an untouched code path. §5.1
7. **[MAJOR]** Ayah share-composer's "Num · Surah name" reference style is broken — it prints the ayah number twice and omits the surah name entirely. §5.1
8. **[MAJOR]** Companion backend edge function is an effective open relay (CORS `*`, `verify_jwt=false`, unauthenticated body pass-through) — anyone who finds the URL can spend the app's MiniMax API quota from any origin. §3.1 / §9

### One-line verdict per subsystem
| Subsystem | Verdict |
|---|---|
| Companion AI | **Needs work** — 1 blocker, 3 majors, all fixable, mostly in the modal variant |
| Quran / Mushaf / Tafsir | **Needs work** — solid architecture, 2 majors + 1 minor-major discoverability gap |
| Hadith | **Solid** — zero new issues found, all prior fixes intact |
| Adhkar reader / Sebha / Settings / Store | **Needs work** — 1 major UX bug, otherwise solid |
| Prayer / Qibla / Mosques / Reminders | **Needs work** — 1 major native-widget staleness bug, page-level logic is correct |
| Ijaz (Scientific Miracles) | **Needs work** — never audited before; broken links + a lot of dead code, but core content (86 entries) is real and complete |
| Knowledge pages / Library / Video / Seerah / Companions | **Solid** — no blockers or majors found |
| Leaderboard + Supabase backend | **Needs work** — no injection/blocker-level leak, but a real error-message leak and a credential-storage risk |
| Native (Android/iOS) | **Solid** — versions in sync, permissions match usage, widgets wired correctly; iOS WidgetKit target requires a documented one-time manual Xcode step |
| Dead code / tests / build | **Solid** — clean build, clean lint, clean tests; a handful of orphaned files/exports, one 971 KB chunk |

---

## 2. Section-by-section audit

### 2.1 Companion AI (`/companion`, `CompanionModal`)
| Component | Missing | Broken | Dead/unused | Incomplete | Next action |
|---|---|---|---|---|---|
| `companionKnowledge.ts` verification | — | `verifyAnswerAsync` (the only populator of `QURAN_VERSES`) has zero callers → verification always false-flags | — | — | Wire `verifyAnswerAsync` into the hot path, or delete the "تحقّق من المصدر" banner |
| `CompanionModal.tsx` auto-scroll | — | Hardcoded `behavior:"smooth"` during streaming (page-level fix not ported here) | — | — | Port the `Companion.tsx` conditional-scroll fix into the modal |
| `companionAI.ts` time-phase/greeting | — | Reads a once-daily-refreshed cache (`noor_widget_prayer_v2`) instead of live schedule | — | — | Recompute phase from `prayerSchedule.ts` live, not the widget cache |
| `supabase/functions/companion` | Origin/body validation | Open CORS + no system-prompt pinning | — | — | Restrict CORS to app origin(s); reject/ignore client-supplied `system` |
| `companionVoice.ts` | — | — | 100% dead, zero imports | — | Delete file |
| `CompanionModal.tsx` reminder-chip matching | — | Matches reminders by title string only (collision risk) | — | — | Match by id |

### 2.2 Quran / Mushaf / Tafsir
| Component | Missing | Broken | Dead/unused | Incomplete | Next action |
|---|---|---|---|---|---|
| `globals.css` `[data-arabic-font="hafs"]` | — | Reintroduces digit-less font on `.arabic-text`, same bug class as the just-fixed tofu-digit issue | — | — | Apply the same `--font-arabic` numeral-safe override to the Hafs variant |
| `ayahPoster.ts:599` | — | `numberedSurahName` case duplicates ayah number, omits surah name | — | — | Fix template string to include `sName` |
| `Tafsir.tsx:170` | 4 of 13 tafsir editions undiscoverable via UI (`.slice(0,9)`) | — | — | Editions only reachable via `?source=` deep link | Remove the slice or add pagination |
| `Mushaf.tsx` download progress | Western digits used inside an otherwise Arabic-Indic UI (3 spots) | — | — | — | Wrap in `arNum`/`toArabicNumeral` |
| `quranMeta.ts`/`quranIDB.ts`/`quranTranslationLocal.ts` | — | — | 3 exported functions, zero references | — | Delete or wire up |

### 2.3 Hadith (`/hadith/*`, `/library/sharh`)
No new findings. All previously-shipped fixes (isnad/matn split, single sharh implementation, deduped grade-chip keys, offline `sharh-bundled.json` wiring, reverted fuzzy-match, merged pages) verified intact. **No action needed.**

### 2.4 Adhkar reader / Sebha / Settings / Store
| Component | Missing | Broken | Dead/unused | Incomplete | Next action |
|---|---|---|---|---|---|
| `Settings.tsx:507-511` & `:937-946` | — | Two separately-labeled switches both write `prefs.enableSounds` — toggling one silently flips the other | — | — | Split into two real preference fields |
| `noorStore.ts:107,546` | — | — | `tasbeehLongPressEnabled` pref: no reader, no Settings UI | — | Delete or implement |
| `customReminderActions.ts` | `seenTemplateIds` not declared on `NoorState` type | — | — | 5× `as unknown as any` casts to work around it | Add proper typing |
| `noorStore.ts:1136` `setItemCount` | Doesn't call `ensureDailyResets()` unlike its siblings | — | — | — | Add the call for consistency |

### 2.5 Prayer Times / Qibla / Nearby Mosques / Reminders
| Component | Missing | Broken | Dead/unused | Incomplete | Next action |
|---|---|---|---|---|---|
| `NoorPrayerWidgetProvider.java` + `prayerWidget.ts` | — | Widget trusts a precomputed `nextPrayer`/`passed` snapshot instead of recomputing live → shows stale prayer for hours, rolls to tomorrow | — | — | Recompute next-unpassed prayer from `prayers[]` + device time on every `onUpdate`, or re-sync payload each prayer boundary |
| `NearbyMosques.tsx` | No offline fallback, no response caching | — | — | — | Cache last successful Overpass response |
| Qibla page | No retry affordance if permission granted but no orientation event ever fires | — | — | — | Add a manual retry/fallback state (SUSPECTED cosmetic) |

### 2.6 الإعجاز العلمي (Ijaz / Scientific Miracles) — first-time audit
| Component | Missing | Broken | Dead/unused | Incomplete | Next action |
|---|---|---|---|---|---|
| `IjazJourney.tsx` | — | 4/7 "read more" links use non-existent slugs, silently fall back to the generic list | — | — | Fix the 4 slugs to match `miracles.ts` |
| `IjazHome.tsx:1238` | — | Category grid cards all link to `/ijaz/miracles` instead of `/ijaz/categories/:id` | — | — | Fix link target |
| `IjazCategory.tsx` | 3 of 5 categories have no path to this page anywhere in the UI | — | — | Nearly orphaned route | Link all 5 categories from Home |
| `src/ijaz/components/layout/*`, `src/ijaz/store/useStore.ts`, `src/ijaz/hooks/index.ts` | — | — | 100% dead — a whole parallel shell/store/hooks stack, never imported | — | Delete |
| `src/ijaz/components/effects/*`, `three/*` (6 files) | — | — | Dead, superseded by CSS-star approach | — | Delete |
| `IjazMiracleDetail.tsx:50` | Video feature fully wired but hardcoded `VIDEOS_ENABLED = false` | — | — | Intentionally disabled ("per product decision") | Confirm intent; delete if permanently off |
| `IjazTimeline.tsx` | Hardcoded 8-event dataset, disconnected from the 86-entry `miracles.ts` | — | Unused import (`getVisualizationColor`/`getCategoryLabel`) | Prone to drift | Derive timeline from `miracles.ts` or document the split intentionally |

### 2.7 Knowledge pages / Library / Video Library / Seerah / Companions / Duas / Asma
No blockers or majors. "Faith Branches" (previously flagged as thin) is now content-complete (15 entries) and on par with siblings. All routes reachable within 1-2 taps of the bottom nav. Companion (Sahaba) bios and hadith narrator-bio lookup correctly share one implementation, not two. **One cosmetic note:** the 6 KnowledgeSection routes aren't in Home's quick-link grid (only reachable via the Library tab) — a UX preference, not a defect.

### 2.8 Leaderboard + Supabase backend
| Component | Missing | Broken | Dead/unused | Incomplete | Next action |
|---|---|---|---|---|---|
| `supabase/functions/dorar/index.ts:103` | — | Leaks raw `e.message` to client on fetch failure | — | — | Return a fixed error code, like the leaderboard function does |
| `src/lib/leaderboard.ts:117` | — | Admin token persisted in plaintext `localStorage` (broadens XSS blast radius vs. intended "paste per-session" design) | — | — | Move to `sessionStorage` or in-memory only |
| `supabase/functions/leaderboard/index.js` | — | — | Byte-identical dead duplicate of `index.ts` (not deployed — `config.toml` has no `main`, defaults to `.ts`) | — | Delete `.js` |
| `supabase/` | No migrations directory | — | — | Schema unmanaged in-repo | Add migrations or document schema elsewhere |
| Both edge functions | Rate limiting is in-memory per-isolate (resets on cold start, spoofable IP headers) | — | — | — | Low priority; acceptable for current scale |

### 2.9 Native (Android + iOS)
Versions in sync everywhere (`1.2.22` / `versionCode 34` / Xcode `$(MARKETING_VERSION)` resolved at build time). AndroidManifest permissions all have corresponding JS usage (location for Qibla/PrayerTimes/Mosques, mic for Sebha's voice-counted tasbeeh, exact-alarm for reminders). iOS `Info.plist` usage strings match. Android widget `SharedPreferences` key ("CapacitorStorage") and payload keys match `widgetDataBridge.ts` exactly, including a documented fallback for a known Capacitor-Preferences key-prefixing quirk. `ios/WidgetExtension/AtharWidgets.swift` is real, complete Swift code but **not yet wired into an Xcode target** — this is explicitly documented as a one-time manual Mac step in `ios/WidgetExtension/README.md`, not a bug. *(iOS runtime behavior cannot be verified without a Mac/simulator.)*

### 2.10 Dead code / tests / build
`npm run typecheck` / `lint` / `test` / `build` all pass cleanly (454/454 tests, 0 lint warnings). Bundle has one large chunk: `miracles-*.js` at **971 KB raw / 383 KB gzip** (the Ijaz content dataset) plus `vendor-react` (855 KB) and `vendor-three` (671 KB) — all pre-existing, none newly introduced. 4 corrupted mojibake text-dump files and 2 superseded QA reports sit at repo root as clutter (not shipped, not referenced by build).

---

## 3. Bug list

| # | File:line | Repro | Severity |
|---|---|---|---|
| 1 | `src/lib/companionKnowledge.ts:542` (`verifyAnswerAsync`) has 0 callers; `verifyAnswer` (companionAI.ts:1057, the actual hot path) reads a `QURAN_VERSES` map that only `verifyAnswerAsync` populates | Ask the Companion (via `CompanionModal`, e.g. from Mushaf) any question that correctly cites a Quran verse → amber "تحقّق من المصدر" (source-not-found) banner appears even though the citation is correct | **Blocker** |
| 2 | `src/components/companion/CompanionModal.tsx:193-195` | Open the Companion modal from Mushaf/DhikrList/Hadith, send a message, watch the message list scroll during token-by-token streaming — `behavior:"smooth"` queues and lags visibly behind, same as the bug the `/companion` page fix (a341295) claims to have solved | Major |
| 3 | `android/app/src/main/java/com/athar/adhkar/NoorPrayerWidgetProvider.java` reading `prayerWidget.ts`'s once-daily `nextPrayer` snapshot | Add the prayer-times home-screen widget, wait past the shown prayer's time without reopening the app → widget keeps showing the same (now-passed) prayer with a countdown that silently jumps to tomorrow | Major |
| 4 | `src/ijaz/pages/IjazJourney.tsx:97,118,160,186` | Open `/ijaz/journey`, click "اقرأ المزيد" on any of the 4 affected cards → lands on the generic `/ijaz/miracles` list instead of the specific miracle | Major |
| 5 | `src/ijaz/pages/IjazHome.tsx:1238` | On `/ijaz`, click any category card in the Categories grid → always routes to `/ijaz/miracles`, never `/ijaz/categories/:id` | Major |
| 6 | `src/pages/Settings.tsx:507-511` and `:937-946` | Toggle "أصوات التطبيق" off → "أصوات العدّ" (tasbeeh sound) also silently turns off, and vice versa | Major |
| 7 | `src/styles/globals.css` — `[data-arabic-font="hafs"] .arabic-text` has no numeral-safe font fallback | Settings → Arabic Font → Hafs, then open Mushaf's tafsir/mutashabihat sheet → Arabic-Indic digits render as tofu (same bug class as the recently-fixed one, different trigger) — **SUSPECTED**, needs live confirmation of actual glyph rendering | Major |
| 8 | `src/lib/ayahPoster.ts:599` | Ayah share composer → pick "رقم · اسم السورة" reference style → output is `2:255 · 255`, not `2:255 · البقرة` | Major |
| 9 | `supabase/functions/companion/index.ts` (`verify_jwt=false`, `Access-Control-Allow-Origin: *`, only `model`/`max_tokens` sanitized) | Extract the (discoverable) proxy URL and POST an arbitrary `system`/`messages`/`tools` payload from any origin → function forwards it to MiniMax, spending the app's API quota | Major (cost-abuse / open-proxy, not a key leak) |
| 10 | `supabase/functions/dorar/index.ts:103` | Trigger any upstream fetch failure in the Dorar proxy → raw `e.message` returned to client in the `detail` field | Major |
| 11 | `src/lib/leaderboard.ts:117,483,496` | Paste the leaderboard admin token once → it's written to `localStorage` in plaintext indefinitely, wider exposure than the "paste manually when needed" design intent | Major (credential handling) |
| 12 | `src/pages/Tafsir.tsx:170` (`TAFSIR_EDITIONS.slice(0,9)`) | Open `/tafsir` → only 9 of 13 available editions appear in the picker; the other 4 (incl. all English editions) are only reachable via a `?source=` URL param | Minor-major (discoverability) |

---

## 4. Dead code inventory

| Item | Evidence |
|---|---|
| `src/lib/companionVoice.ts` (full STT/TTS module) | Zero imports anywhere in `src/` (grep-confirmed); orphaned by the "Companion: remove voice UI" commit |
| `src/ijaz/components/layout/AppShell.tsx`, `Header.tsx`, `Footer.tsx` | A second, complete Ijaz shell — never imported; the live shell is `src/components/layout/IjazShell.tsx` |
| `src/ijaz/store/useStore.ts`, `src/ijaz/hooks/index.ts` (`useCursorLight`, `useAudio`, `useSearch`) | Zero imports across the app |
| `src/ijaz/components/effects/SmoothScroll.tsx`, `ShaderBackground.tsx`, `src/ijaz/components/three/{CinematicCosmos,CosmosScene,GalaxyBackground,MicroscopicScene}.tsx` | Zero imports; superseded by the current CSS-starfield approach |
| `src/lib/quranMeta.ts` `maybeStripDiacritics`, `src/lib/quranIDB.ts` `idbGetPageIndexMeta`, `src/lib/quranTranslationLocal.ts` `getEnglishAyahTranslation` | Exported, zero external references |
| `supabase/functions/leaderboard/index.js` | Byte-identical duplicate of `index.ts` (line-ending diff only); not the deployed entrypoint |
| `noorStore.ts` `tasbeehLongPressEnabled` preference | Declared, defaulted, exported/imported in data packs — never read, no UI control |
| Repo root: `extracted_card_2.txt`, `extracted_content.txt`, `extracted_content_correct.txt`, `final_extracted_content.txt` | Corrupted mojibake text dumps, not referenced by build or `src/` |
| Repo root: `QA_REPORT_2026-05-07.md`, `QA_REPORT_FINAL_2026-05-07.md` | Snapshot from v1.2.7 (build 19); current is 1.2.22/34 — superseded documentation |
| `src/ijaz/pages/IjazTimeline.tsx:7` | Imports `getVisualizationColor`/`getCategoryLabel`, never calls them |

---

## 5. Missing / unreachable feature inventory

- **`src/ijaz/pages/IjazCategory.tsx`** — reachable only via 2 of 5 categories (`cosmological`, `logical-philosophical` seeker paths) plus miracle-detail breadcrumbs; `biological`, `earth-sciences`, `prophecies` have no UI path to their category page (compounded by bug #5 above).
- **iOS home-screen widget** — code-complete (`AtharWidgets.swift`) but not registered as an Xcode target; requires the one documented manual step before it can ship. Not a code bug, but currently non-functional on iOS builds.
- **Ijaz video overlay** — fully built (`VideoOverlay.tsx`, `videos.ts`, thumbnails) but permanently disabled via a hardcoded flag; effectively vaporware in the current build.
- **Tafsir editions 10-13** (Arabic "المختصر" + 3 English editions) — exist and work, but have no discoverable UI entry point on `/tafsir` (Mushaf's inline sheet does show all 13, so it's a single-page gap, not systemic).

---

## 6. Security findings (severity-ranked)

1. **Major** — Companion edge function accepts arbitrary `system`/`messages`/`tools` from any origin (open CORS, `verify_jwt=false`, no origin/prompt pinning) → cost-abuse surface, not a credential leak. `supabase/functions/companion/index.ts`.
2. **Major** — Dorar proxy leaks raw exception text to the client on failure. `supabase/functions/dorar/index.ts:103`.
3. **Moderate** — Leaderboard admin token persisted in plaintext `localStorage` rather than ephemeral storage, widening XSS blast radius. `src/lib/leaderboard.ts`.
4. **Minor** — Both edge functions' rate limiting is in-memory per-Deno-isolate (resets on cold start) and keyed off client-supplied forwarding headers (spoofable if the platform doesn't strip them).
5. **Minor** — No `supabase/migrations` in-repo; schema is provisioned out-of-band with no version-controlled source of truth.
6. **Clean, confirmed** — No secret values (`MINIMAX_API_KEY`, `sk-*`, admin token value) found in the production `dist/` bundle; only the admin-token localStorage *key name* and UI placeholder text appear, which is expected and harmless. No SQL injection surface — all DB access goes through PostgREST-style parameterized calls.

---

## 7. Performance findings

- `miracles-*.js` chunk (Ijaz content) is **971 KB raw / 383 KB gzip** — the single largest chunk in the app, flagged directly by Vite's build output. Given the section is a lazy route (`React.lazy`), this only loads when a user visits `/ijaz`, but is worth code-splitting further (e.g. per-category) if load time on `/ijaz` is noticeable on low-end devices.
- `vendor-react` (855 KB) and `vendor-three` (671 KB) are large but expected given React Three Fiber is used for the 3D background — no action needed unless the 3D background becomes optional.
- `savePartialStream` in Companion history re-serializes the *entire* message history to `localStorage` on every streamed token (`companionHistory.ts:117-122`, called from `Companion.tsx:356-359`), an O(n) write per token for long conversations — real but likely sub-perceptible cost; worth debouncing if long companion sessions become common.
- Build time ~15s, PWA precache ~19.3 MB across 267 entries — reasonable for the content volume (bundled Quran text, hadith, 1,609 offline sharh explanations).

---

## 8. Accessibility findings

- Icon-only controls sampled across Settings, Sebha, Ijaz's SearchBar/VideoOverlay/DeepDivePanel/Header all carry `aria-label`s — no gaps found in the sampled set.
- Qibla page has full keyboard/permission-flow handling; no focus-trap issues found in Ijaz's `SearchBar` (Escape/Arrow key support confirmed).
- **Not exhaustively checked:** the 86 individual per-miracle visualization components in Ijaz, and `VideoOverlay.tsx`'s modal — it closes only on backdrop click, with no confirmed Escape-key handler or focus trap (SUSPECTED, needs live check; low priority since the video feature is currently disabled).

---

## 9. Test coverage map

**PASS: 454/454 tests, 54 test files, 0 lint errors, 0 typecheck errors, clean build.**

| Subsystem | Coverage |
|---|---|
| Companion AI | Heavy (17 dedicated test files) |
| Quran / Mushaf / Tafsir | Good (13+ files: search, translations, reciters, persistence, scroll mode, etc.) |
| Sebha | Tested |
| Settings / theming | Tested |
| Prayer / Reminders | Tested (schedule, custom-reminder delivery/notifications/storage) |
| Home / Adhkar reader | **Indirect only** — floating-widget tests exist, but no dedicated test for the core reader flow |
| Hadith (reader/books) | **Untested** — only Companion's hadith-verification logic has coverage, not the Hadith UI itself |
| Leaderboard | **Untested** |
| Ijaz section | **Untested** |
| Knowledge pages (asma/duas/stories/angels/etc.) | **Untested** |
| Library / Video Library | **Untested** |
| Native widget bridge (`widgetDataBridge.ts`, `tasbeehWidgetSync.ts`) | **Untested** |
| Supabase edge functions | **Untested** |
| Qibla / Nearby Mosques | **Untested** |

This is the honest risk map: the areas with the most bugs found in this audit (Ijaz, native prayer widget, Leaderboard/backend) are exactly the areas with zero automated test coverage — the correlation is not a coincidence.

---

## 10. Prioritized recommendations

### Quick wins (small, high-value, low-risk)
1. Fix the 4 broken Ijaz Journey slugs and the category-grid link target (bugs #4, #5) — pure string fixes.
2. Fix `ayahPoster.ts`'s `numberedSurahName` template (bug #8) — one-line fix.
3. Split `Settings.tsx`'s dual-bound `enableSounds` toggle into two real preferences (bug #6).
4. Downgrade `dorar/index.ts`'s error response to a fixed code instead of `e.message` (bug #10).
5. Move the leaderboard admin token from `localStorage` to `sessionStorage` (bug #11).
6. Delete confirmed-dead files: `companionVoice.ts`, the parallel Ijaz shell/store/hooks/effects stack, `supabase/functions/leaderboard/index.js`, the 4 mojibake root-level text dumps, the 2 stale QA reports.
7. Remove `Tafsir.tsx`'s `.slice(0,9)` so all 13 editions are visible in the picker (bug #12).

### Bigger bets (real projects)
1. **Fix Companion verification** (bug #1, blocker) — either wire `verifyAnswerAsync` into the real hot path or remove the false-flagging banner entirely; this is user-trust-critical for an Islamic-content app.
2. **Unify the Companion modal and page implementations** — they currently have two separately-maintained copies of streaming/scroll/reminder-parsing logic that have already diverged once (bug #2) and will again.
3. **Fix the native prayer-widget staleness** (bug #3) — recompute next-prayer from live device time in the Android widget provider rather than trusting a once-daily JS snapshot; same risk likely applies once the iOS widget ships.
4. **Add test coverage for Ijaz, Leaderboard, Hadith UI, and the native widget bridge** — these are exactly the zero-coverage areas that produced this audit's bug list.
5. **Harden the Companion and Dorar edge functions** — pin CORS to the app's real origins and stop accepting an arbitrary client-supplied `system` prompt.
6. Complete the iOS WidgetKit target registration (one documented manual Xcode step) so the iOS build gets home-screen widgets at parity with Android.
