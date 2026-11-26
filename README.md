<div align="center">
  <img src="public/logo.svg" alt="Athar logo" width="112" height="112" />
  <h1>Athar · أثر</h1>
  <p>An Islamic companion for adhkar, Quran, prayer times and daily worship.<br />One codebase for web, Android and iOS.</p>
  <p>
    <a href="https://www.athark.org">Website</a> ·
    <a href="https://play.google.com/store/apps/details?id=com.athar.adhkar">Google Play</a> ·
    <a href="https://www.athark.org/support.html">Support</a> ·
    <a href="https://www.athark.org/privacy.html">Privacy</a> ·
    <a href="https://www.athark.org/terms.html">Terms</a>
  </p>
  <p>
    <a href="https://github.com/xgharibx/ATHAR/actions/workflows/ci.yml"><img src="https://github.com/xgharibx/ATHAR/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
    <a href="https://github.com/xgharibx/ATHAR/actions/workflows/codeql.yml"><img src="https://github.com/xgharibx/ATHAR/actions/workflows/codeql.yml/badge.svg" alt="CodeQL status" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/licence-proprietary-123a2b" alt="Licence: proprietary" /></a>
  </p>
</div>

> Athar is proprietary software. The source is published for transparency, not for reuse: see [LICENSE](LICENSE) and the [trademark policy](TRADEMARKS.md).

## Features

- **Adhkar** collections with a tasbeeh counter (also voice and Home Screen), favourites and progress tracking
- **القرآن الكريم**: the Madina mushaf page as printed (bundled, offline), tajweed colours, word-synced recitation, tafsirs side by side, translations, roots and word meanings, memorisation with spaced review, and التسميع with an on-device tajweed engine
- **السماع**: the whole Quran by the great reciters, golden recordings, the night prayers of the two Harams, tawasheeh and the live Quran radio, with native background playback and downloads
- **Prayer times**, Qibla, Adhan alerts that keep going a week ahead, and a Live Activity for the next prayer
- **Hadith**, stories, the Seerah, Asma al-Husna, duas, ruqyah and learning guides
- **Tracking**: wird, muhasaba, insights, missed prayers (qadaa) and the leaderboard
- **"Ask Athar"**, an optional assistant for Islamic questions
- **Three designs**: classic, the new classic and «أفق»
- **Native on both platforms**: Home Screen and Lock Screen widgets (prayer, adhkar, wird, tasbeeh, Qibla, memorisation, and the «السماع» player with play, pause and skip), Control Center controls, Siri and app shortcuts, Face ID / fingerprint lock, Wear OS tile, Android Auto
- **Offline-first**: core content works without a connection

## Technology

| Layer | Stack |
|---|---|
| App | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Mobile | Capacitor 8 (Android 7+, iOS 16.4+), native Swift (WidgetKit, App Intents, AVFoundation) and Java (Media3, App Widgets) |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Tests | Vitest, pgTAP |

## Getting started

Requirements: Node.js 26 (the current long-term-support release) and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build the web app |
| `npm run lint` | Lint the app and Edge Functions |
| `npm run test` | Run the unit tests |
| `npm run verify` | Run every release check, then build |
| `npm run android` | Build, sync and open the Android project |
| `npm run ios` | Build, sync and open the iOS project (macOS) |

## Repository layout

| Path | Contents |
|---|---|
| `src/` | Application source |
| `public/` | Static assets and bundled content |
| `android/`, `ios/`, `huawei/` | Native projects and store material |
| `supabase/` | Database migrations, Edge Functions and database tests |
| `tests/` | Unit tests |
| `tools/` | Build, release and content-sync scripts |
| `docs/` | Setup guides and release checklists |

## Configuration

Client configuration is read from `VITE_*` variables; see `.env.example`. Server credentials are stored only as Supabase Edge Function secrets and must never be given a `VITE_` prefix or committed.

## Releases

Changes for each version are in [CHANGELOG.md](CHANGELOG.md). Bump the version everywhere at once with `npm run version:bump` (checked by `npm run version:check`).

- Web: deployed by the `Deploy GitHub Pages` workflow on every push to `main`.
- Android: see `tools/android/README.md` and `docs/RELEASE_CHECKLIST_MOBILE_AR.md`.
- iOS: see `docs/RELEASE_CHECKLIST_IOS_AR.md` and the `iOS Build` workflow.
- Backend: see `docs/ACCOUNTS_SETUP.md`.

## Contributing

How the team works, and how to report a bug or a content correction: [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Licence and trademarks

Copyright © 2026 Amr Abdel-Aziz Gharib. All rights reserved.

- **Code and design:** proprietary; see [LICENSE](LICENSE).
- **Name and logo:** "Athar", "ATHAR", "أثر" and the Athar logo are trademarks of Amr Abdel-Aziz Gharib; see [TRADEMARKS.md](TRADEMARKS.md).
- **Religious texts and third-party components:** belong to their owners; see [NOTICE.md](NOTICE.md).
