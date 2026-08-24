# Athar — Full Widget System Audit, Research & Upgrade

**How to use this document:** paste everything below the line into a Claude Code session opened in this repo (fresh session is fine — it's self-contained). It is written to be executed as one long-running, multi-session initiative, not one sitting. Work phase by phase, commit at the end of each phase, and check in with the user between phases if anything below turns out to be stale (this brief was written 2026-07-22 against commit `ce23ed6` — re-verify file names/line numbers before trusting them, code moves).

---

## Mission

Take Athar's **Android launcher home-screen widget system** — the real OS-level widgets a user long-presses their home screen and adds, not any in-app UI — through a complete audit, cleanup, competitive research pass, and upgrade cycle. End state: every widget that ships is bug-free, visually polished, genuinely useful, and verified working on a real Android emulator, placed on an actual simulated home screen. Anything that doesn't earn its place gets removed. Anything that could be better gets rebuilt using ideas pulled from how the best Islamic apps (and Android's own design guidelines) do it. Where technically possible, make widgets update live instead of on a stale timer.

**Explicitly out of scope: anything inside the app itself.** This app also happens to have an in-app Home *page* with toggleable dashboard cards (prayer/hadith/checklist/etc., configured in Settings) — that is a completely different system (plain React components) and is **not** what this document means by "widget." Do not touch it, audit it, or fold it into this work. If you're ever unsure whether something is in scope, the test is: does the user interact with it from their phone's home screen without opening the app? If not, it's out of scope here.

This is a big, multi-phase ask. Track it with `TaskCreate`/todos, commit incrementally per phase (small reviewable commits, not one giant diff), and don't let scope creep into unrelated app areas.

---

## 0. Orientation — read this before touching anything

This app already has a mature widget system that has been through several redesign passes — you are not starting from zero, and you should not assume everything is broken or basic. Skim the git history first:

```
git log --oneline -- android/app/src/main/java/com/athar/adhkar/ src/lib/widgetDataBridge.ts src/lib/tasbeehWidgetSync.ts src/lib/prayerWidget.ts src/lib/widgetRefresh.ts
```

Notable prior milestones (verify current state — don't take these as still-true, they're history): a premium bitmap-rendered redesign with gradient rings and "living sky" backgrounds, a prior dead-code cleanup pass, a "go-wild" pass that added real animated stars and a live countdown, and interactive/hardening fixes for Android 12+ crashes. This repo also has a persistent cross-session memory system at `C:\Users\Amrab\.claude\projects\C--Users-Amrab-Downloads-noor-adhkar\memory\` — if you have access to it, read `athar-widgets-themes-ai.md`, `athar-ios-platform-setup.md`, and `browser-pane-hidden-testing-pitfall.md` before starting. The facts below are already folded in from those, but the memory files may have more detail.

**Hard environment constraint:** this dev machine is Windows. Android is fully buildable and testable here (`gradlew assembleDebug`, the emulator). **iOS is not** — there's no Xcode, no macOS. iOS widgets (WidgetKit) are out of scope for the hands-on build/test work in this pass; at most, keep the JS data layer iOS-friendly (it already writes via Capacitor Preferences, which a future WidgetKit extension could read via an App Group — suggested group id `group.app.athar`). Do not attempt to open or build the `ios/` project.

---

## 1. Scope — native Android launcher widgets, and only that

Real OS-level `AppWidgetProvider`s the user long-presses their phone's home screen and adds, outside the app entirely. This is where "make it live," "research the best apps," and "test on the emulator" apply, since these have real OS constraints in-app UI never does.

Current inventory (verify this list is still accurate — files move):

| Provider (`android/app/src/main/java/com/athar/adhkar/`) | Layout / info.xml | Size (cells) | Purpose |
|---|---|---|---|
| `NoorWidgetProvider` | `noor_widget` / `noor_widget_info.xml` | 3×2 | Generic/original widget — generic description string, oldest-looking. **Investigate first**: this may be a legacy survivor from before the app was purpose-built widgets for each feature (see `ccfaf42 fix(widgets): remove old widgets` in git log — a cleanup already happened once; this may have been missed, or may still earn its keep). Check what it actually renders before assuming it's dead. |
| `NoorCompactWidgetProvider` | `noor_widget_compact` | 2×1 | Smallest size variant |
| `NoorPrayerWidgetProvider` | `noor_widget_prayer` | 4×2 | Prayer times, compact — has sky-phase background + Canvas progress ring |
| `NoorPrayerFullWidgetProvider` | `widget_prayer_full` | 4×3 | Prayer times, full |
| `NoorDashboardWidgetProvider` | `widget_dashboard` | 4×4 | "Ultimate" combined dashboard: prayer + adhkar + wird + streak |
| `NoorAdhkarWidgetProvider` | `widget_adhkar` / `widget_adhkar_progress` | 4×2 | Morning/evening adhkar progress |
| `NoorWirdWidgetProvider` | `widget_wird` | 4×2 | Quran daily-reading (wird) progress |
| `NoorTasbeehWidgetProvider` | `noor_widget_tasbeeh` / `widget_tasbeeh_counter` | 2×2 | Interactive dhikr counter (tap to increment without opening app) |
| `NoorAsmaWidgetProvider` | `widget_asma` | — | Asma al-Husna (99 names) |
| `NoorQiblaWidgetProvider` | `widget_qibla` | — | Qibla bearing/direction |
| `NoorSunnahWidgetProvider` | `noor_widget_sunnah` | — | Daily/shuffled hadith |

That's **11 registered widget providers** (confirmed live in `AndroidManifest.xml` as `<receiver>` entries — all 11 are currently registered, none are orphaned from the manifest). Plus shared infrastructure, not widgets themselves:
- `AtharWidgetProvider.java` — shared base/helpers: `openApp()` (deep-link into the SPA via `athar_route` intent extra, consumed by `MainActivity.injectPendingRoute()`), `dateLine()` (Hijri via `android.icu`, API 24+ guarded), `skyFor()` (resolves fajr/dhuhr/asr/maghrib/isha background art)
- `WidgetCanvas.java` — renders gradient rings/bars as bitmaps (`setImageViewBitmap`), because `RemoteViews` can't do CSS-style gradients natively
- `WidgetData.java`, `WidgetUpdater.java`, `AtharWidgetSpec.java` — data/update plumbing
- `WidgetRefreshPlugin.java` — custom Capacitor plugin, forces immediate widget repaint instead of waiting for the OS's 30-minute minimum `updatePeriodMillis`

JS-side bridge (writes app state → `@capacitor/preferences` → native `SharedPreferences`, which the providers read on update):
- `src/lib/widgetDataBridge.ts` — adhkar/wird/dashboard/sunnah/qibla payloads (`noor_widget_adhkar_v1`, `noor_widget_wird_v1`, `noor_widget_dashboard_v1`, `noor_widget_sunnah_v1`, `noor_widget_qibla_v1`)
- `src/lib/tasbeehWidgetSync.ts`, `src/lib/prayerWidget.ts` — same pattern for tasbeeh + prayer
- `src/lib/widgetRefresh.ts` — calls the native `WidgetRefreshPlugin` (no-ops on web/iOS)

**Non-obvious constraint: do not rename or move these Java provider classes.** An `AppWidgetProvider`'s component name is baked into every home screen where a user already placed that widget — renaming orphans their existing widget (shows a blank/broken tile until they re-add it). This is almost certainly why classes are still `Noor*`-prefixed even though the app and package are branded "Athar" — leave that alone; it's not an inconsistency worth "fixing."

*(Note: this app separately has an in-app Home page with toggleable dashboard cards, e.g. a `HomeWidgetKey` type in `src/store/noorStore.ts` — that's a different, unrelated system and is out of scope per the Mission section above. Don't audit it, don't clean it up, don't let it bleed into this work even though the naming is confusingly similar.)*

---

## 2. Ground rules

- **Propose before you delete.** For anything in Phase 2 (dead-widget removal), write out the removal list with your reasoning first, so it can be sanity-checked, before deleting files/receivers/resources. Don't silently drop a widget some user has already placed on their home screen without a clear reason.
- **Multiple providers at different cell sizes is not automatically duplication.** Android widgets often need one provider per size/layout variant (that's the platform's model, not this codebase's mistake). Before flagging two providers as redundant, check whether they're genuinely different content or genuinely the same content at two sizes — and if it's the latter, consider whether **consolidating into a single provider using `RemoteViews(Map<SizeF, RemoteViews>)`** (responsive single-provider layouts, API 31+) is a cleaner fix than deleting one size outright. That's a real modernization opportunity here (see Phase 4).
- **Never fabricate religious content.** Any new widget touching Quran/hadith/Asma al-Husna text must pull from the app's existing vetted data (`public/data/*`, the hadith bundle, `quranLoad`) — same non-negotiable rule already enforced for the Companion AI. Do not invent or paraphrase scripture/hadith text for a widget mockup.
- **RTL and Arabic-first.** This is a primarily Arabic, RTL app. Every widget layout change must be checked in RTL, not just eyeballed in LTR and assumed to mirror correctly.
- **Respect the browser-pane testing trap.** If you preview any of this through the in-app dev-server browser pane, know that it runs as a hidden/occluded tab: `requestAnimationFrame` never fires, smooth-scroll and `react-virtuoso` silently render nothing, and stale console errors can persist across reloads. None of that is a real bug — and it's irrelevant to native widget work anyway, since **native Android widgets can only be honestly verified on the emulator**, never in the web preview.
- **Gate everything on the existing verify script:** `npm run verify` (lint + vitest + build) must pass before you consider any phase done.
- **Commit style:** small, focused commits per logical change (matches this repo's existing history — e.g. `2160c4a Widget cleanup: delete duplicate/dead code`, `b875843 Give the prayer-times widget a Canvas-rendered progress ring`). Don't bundle "delete dead widget" with "add new widget" with "redesign X" in one commit.

---

## Phase 1 — Deep audit & bug hunt

Go through **all 11 native widget providers** individually. For each one, check:

1. **Renders correctly at every supported size** — from `minWidth`/`minHeight` up through resize (check each `*_info.xml` for its actual `resizeMode`/`targetCellWidth`/`targetCellHeight` range; don't assume).
2. **Light vs dark system theme** — Android widgets follow system day/night, largely independent of the app's own 14 in-app experiential themes (don't try to port all 14 to native widgets — scope native theming to light/dark, and whatever the existing "sky-phase"/"living sky" treatment already covers).
3. **RTL correctness** — text alignment, icon mirroring, `layout_gravity`.
4. **Font-scale accessibility** — system font size cranked up; check `RemoteViews` text sizing doesn't clip or overlap.
5. **Empty/first-run state** — no location yet (Qibla, Prayer widgets), no reading history yet (Wird), streak = 0 (Dashboard), no cached hadith yet (Sunnah). Every widget needs a real empty state, not a crash or blank tile.
6. **Post-interaction state** — tasbeeh tap increments and persists correctly; deep links (`AtharWidgetProvider.openApp`) land on the right in-app route via `MainActivity.injectPendingRoute()`.
7. **Crash resilience** — prior hardening pass (`0c0ea45`) added try/catch guards + fixed an invalid-fontFamily crash across providers; confirm that hardening is still intact on **all 11**, not just the ones touched most recently. Watch `adb logcat` for `AppWidgetProvider`/`RemoteViews` exceptions while placing and interacting with each widget.
8. **Multi-instance behavior** — add the same widget twice to the home screen; both instances should update independently and correctly (per-widget-id state, not shared/crossed state).
9. **Data freshness** — cross-check each JS sync function (`widgetDataBridge.ts`, `tasbeehWidgetSync.ts`, `prayerWidget.ts`) against what the widget actually displays; look for any widget reading a stale/abandoned preference key that nothing writes anymore.

Write down every bug found (file:line, repro steps) before fixing — this becomes your Phase 1 commit's changelog.

---

## Phase 2 — Delete dead/unused widgets

Using the Phase 1 findings plus the lead already identified in §1 (`NoorWidgetProvider` as a legacy-survivor candidate), decide what actually goes. For each candidate removal:

- State why it's dead (superseded by X, never reachable, confirmed unused, genuinely redundant with Y at the same content-and-size).
- Remove it completely, not commented out: the Java provider class, its `<receiver>` entry in `AndroidManifest.xml`, its layout XML, its `*_info.xml`, any now-orphaned drawables, and any JS-side sync function/preference key that only that widget consumed.

Do not remove a widget just because it's old — remove it because it's confirmed redundant, broken beyond reasonable repair, or provides negative value (confuses users, duplicates a better widget exactly).

---

## Phase 3 — Wide competitive & design research

This is the "wildest ever research" ask — actually go look, don't rely on general knowledge. Use WebSearch/WebFetch.

**Islamic apps known for strong widget offerings — research their widget features and design specifically** (Play Store listing screenshots, app-review articles, feature-comparison posts, XDA/Reddit threads on "best prayer widget"): Muslim Pro, Athan (Athan.com), Muslim: Qibla, Athan, Quran & Duas, Quran Majeed (PakData), Quran.com's official app, Tarteel, Ayat: Prayer Times & Azan, IslamicFinder, Ramadan-specific apps (for seasonal countdown/suhoor-iftar widget ideas). For each, capture: what widgets they ship, what sizes, what's genuinely well-designed vs generic, what data they make "live," and anything distinctly clever (e.g., countdown-to-next-prayer that visibly ticks, lock-screen widgets, stacked/swipeable widgets, Material You adaptive color).

**Platform design guidance — research the platform-level state of the art, not just competitor apps:**
- Android: official App Widget quality guidelines / "widget quality tiers" (developer.android.com), Jetpack Glance (the modern Compose-based widget framework — evaluate whether it would reduce this app's hand-rolled `RemoteViews` + manual bitmap-gradient plumbing in `WidgetCanvas.java`, and whether migrating any widget to it is worth it, without treating a full rewrite as mandatory), Material You dynamic color for widgets (`android:colorMode`, system-wallpaper tonal palettes on Android 12+), Google's "Now in Android" sample app (a well-known reference implementation for widget best practices).
- iOS (research-only, no build): WidgetKit HIG, Live Activities/Dynamic Island patterns other apps use for things like a Ramadan countdown — useful to know even though you can't build it here, so the JS data layer doesn't paint itself into a corner.

Produce a short findings writeup (doesn't need to be a separate doc — a well-organized commit message or a scratch note is fine) that feeds directly into Phase 4 and 5: concrete, specific ideas, not vague inspiration.

---

## Phase 4 — Upgrade pass, widget by widget

Go through the (post-cleanup) widget list one at a time and apply Phase 3 findings. For each, consider:

- **Visual polish**: does it match the quality bar of the best thing you found in research? Extend the existing sky-phase/"living sky" treatment where it fits; keep gradient/ring rendering consistent via `WidgetCanvas.java` rather than one-off hacks per widget.
- **"Make it live" — concrete techniques to evaluate, not just wish for:**
  - `WidgetRefreshPlugin` already gives instant repaint on data change (push model) — confirm every relevant JS write path actually calls `refreshHomeWidgets()`.
  - For genuinely time-based liveness (e.g. minutes-until-next-prayer ticking down without opening the app), investigate a `TIME_TICK`-driven repaint (system broadcast, fires every minute) — likely only worth enabling on the prayer widgets while a countdown is "hot" (e.g. within the final hour before the next prayer), falling back to the sparser default otherwise, to stay battery-respectful.
  - Investigate Android 12+ native `RemoteViews` interactivity (compound-button/checkbox actions bound directly to a `PendingIntent`) for tighter tap-to-increment behavior on the tasbeeh widget, if it isn't already using this.
  - Investigate per-size responsive layouts (`RemoteViews(Map<SizeF, RemoteViews>)`) as a way to make one widget adapt its content density live across resize, instead of static min/default layouts.
- **Customization**: are there reasonable user-facing options worth exposing (e.g. which prayer-widget size shows what data, color/theme choice, which surah/hadith source)? Only add configuration that's genuinely useful, not settings for their own sake.
- **Accessibility**: `contentDescription` on meaningful `RemoteViews` elements.

Upgrade in small batches (2-3 widgets per commit), verify each batch on the emulator before moving to the next.

---

## Phase 5 — Add new widgets

Based on genuine gaps found in Phase 3 research (not filler — this project already has a stated principle for this, see commit `e8d73c0 Add two new widgets grounded in real, existing features (not filler)`; keep that bar). Before inventing a new widget, grep `public/data/` and the existing data layer for what's already available — new widgets should surface real existing app data/features, the same way the current 11 do. Candidate directions to evaluate against research findings: a Hijri-date/Islamic-events widget (the Hijri calc already exists in `AtharWidgetProvider.dateLine()`), a Ramadan countdown (seasonal), a lock-screen-sized minimal widget once you've confirmed what that needs on Android. Don't add a widget you can't back with real data.

---

## Phase 6 — Android emulator test pass (final proof)

Everything above gets verified for real here — this is not optional, and it's not satisfied by the web dev-server preview (see the browser-pane caveat in Ground Rules).

**Known-working recipe (re-verify it's still accurate for your emulator setup):**
- Boot AVD `Medium_Phone_API_36.1` with `-gpu angle_indirect` (swiftshader is known to crash this AVD).
- Grant location permission, then `adb emu geo fix <lng> <lat>` for GPS-dependent widgets (Qibla, Prayer).
- Build/install: `gradlew assembleDebug` — use the Android Studio JBR for `JAVA_HOME` (`C:\Program Files\Android\Android Studio\jbr`, JDK 21 — the system Java is unsuitable for this Gradle/AGP version).
- Place a widget: long-press home screen → Widgets → Browse tab → Athar → drag the desired provider onto the home screen (`adb shell input draganddrop <x1> <y1> <x2> <y2> <duration>`).
- **Known picker limitation**: the widget-picker carousel does not paginate via swipe under automation — only the first card in the list is reliably reachable that way. To exercise the other providers without fighting the picker, send their update/interaction broadcasts directly (e.g. a `TASBEEH_INCREMENT` intent with a fake widget id) to drive the provider's code path crash-free, and spot-check placement manually for a representative subset.
- Watch `adb logcat` filtered to the app's package for exceptions during placement, resize, and interaction.

**Test matrix** — for every surviving widget: default size, min size, max reasonable resize; light + dark system theme; RTL text rendering; empty/first-run state; after a real interaction (tap, deep link); after force-stopping and relaunching the app (widget should keep showing last-known data, not blank). Do a final full regression pass (place every remaining widget at least once, confirm no crashes, confirm `npm run verify` is green) before calling this done.

---

## Definition of done

- Every remaining native launcher widget has been individually verified on the Android emulator per the Phase 6 matrix — no crashes, no visual glitches, correct RTL, correct empty states.
- Every deletion in Phase 2 is accounted for end-to-end (no orphaned manifest entries, resources, or JS sync code).
- Research findings (Phase 3) are visibly reflected in at least the highest-value widgets' upgrades (Phase 4), not just collected and shelved.
- Any new widget (Phase 5) is backed by real app data and passes the same Phase 6 matrix as everything else.
- `npm run verify` passes.
- Work is in reviewable, incremental commits — not one mega-commit — so it can be checked in stages.
