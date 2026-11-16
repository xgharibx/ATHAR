# Athar

Athar (أثر) is an Islamic companion app for adhkar, Quran, prayer times and daily worship. It ships from one codebase as a web app, an Android app and an iOS app.

- Web: <https://www.athark.org>
- Android: `com.athar.adhkar` on Google Play
- iOS and Huawei AppGallery: built from the same sources

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

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

Copyright © 2026 Athar. All rights reserved. This is proprietary software; see [LICENSE](LICENSE). Third-party content and open-source components are listed in [NOTICE.md](NOTICE.md).
