# Third-Party Notices

Athar is proprietary software (see [LICENSE](LICENSE)). It incorporates and connects to third-party material that remains the property of its owners and is used under their own terms. This file is a summary; the terms published by each owner prevail.

## Open-source software

The app is built with open-source packages, including React, Vite, Tailwind CSS, Capacitor, the Supabase client, Three.js, Framer Motion, Dexie, Zustand and others.

The copyright notice and licence text of every package that ships in the app are generated at build time and published with it at <https://www.athark.org/third-party-licenses.txt>. A test fails the build if a shipped package carries a copyleft or unreviewed licence, and a pull-request check blocks new dependencies under such licences. The native projects additionally use the dependencies declared in `android/` (Gradle) and `ios/` (CocoaPods).

## Religious texts and content

Quran text, translations, tafsir, hadith collections and adhkar included in or retrieved by the app originate from their respective publishers and scholarly sources. Attribution for each collection is shown inside the app on its Sources screens. This content is not covered by the Athar licence and is not claimed as Athar's own work.

The source, terms and confirmation status of each item are tracked in [docs/CONTENT_LICENSES.md](docs/CONTENT_LICENSES.md).

## Online services

Depending on the features a user enables, the app requests data from:

| Service | Purpose |
|---|---|
| Supabase | Accounts, cloud sync, leaderboards, server functions |
| AlAdhan | Prayer-time calculation |
| OpenStreetMap Overpass | Nearby mosque search |
| Quran.com / Quran Foundation | Word-by-word data and translations |
| EveryAyah | Quran recitation audio |
| HadeethEnc, Dorar | Hadith explanations and verification |
| MiniMax | Language model behind "Ask Athar" |
| YouTube, RadioJar | Video and radio streams |

Use of each service is subject to that service's terms and privacy policy. See the privacy policy at <https://www.athark.org/privacy.html> for what is sent to each.

## Fonts, audio and artwork

Fonts, recitation and adhan audio, animations and icons bundled with the app are used under the licences granted by their respective authors.

## Corrections

If you are a rights holder and believe material is used or attributed incorrectly, contact <amr@gharib.dev> and we will correct it promptly.
