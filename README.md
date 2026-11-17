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

- Adhkar collections with a tasbeeh counter, favourites and progress tracking
- Quran reader (Mushaf), tafsir, translations, memorisation and recitation tools
- Prayer times, Qibla direction and reminders
- Hadith library and learning content
- "Ask Athar", an optional assistant for Islamic questions
- Optional accounts with cloud sync and leaderboards
- Offline-first: core content works without a connection

## Technology

| Layer | Stack |
|---|---|
| App | React 18, TypeScript, Vite, Tailwind CSS |
| Mobile | Capacitor 6 (Android, iOS) |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Tests | Vitest, pgTAP |

## Getting started

Requirements: Node.js 24 and npm.

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
