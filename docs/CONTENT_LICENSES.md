# Content and Asset Licence Register

Every piece of content and every asset in Athar that Athar did not create, with where it comes from, the terms it is used under, and whether those terms have been confirmed. Software packages are covered separately by the generated `third-party-licenses.txt` published with the app.

**Status**

- **Confirmed**: the licence is recorded in this repository or stated by the source.
- **To confirm**: the source is known, but its terms for use in an app have not been checked and recorded.
- **Unresolved**: no licence could be established. Replace the asset or obtain written permission before the next store release.

Update this file in the same pull request as any change to bundled content.

## Bundled in the app

| Asset | Location | Source | Terms | Status |
|---|---|---|---|---|
| Quran text (Uthmani script) | `public/data/quran.json` | Not recorded | The text must be reproduced exactly; most publishers also require attribution | To confirm: record the publisher and edition |
| English translation | `public/data/quran-en-sahih.json` | Saheeh International | Copyrighted translation | To confirm: permission for redistribution in an app |
| Tafsir al-Muyassar | `public/data/tafseer-muyassar.json` | Retrieved through alquran.cloud (`tools/scripts/download-tafseer.mjs`); work of the King Fahd Complex | Publisher's terms | To confirm |
| Hadith collections (nine books, Nawawi, Qudsi) | `public/data/hadith/*.json` | `fawazahmed0/hadith-api` (`tools/scripts/import-hadith.mjs`) | That project's licence | To confirm: record the licence stated in that repository |
| Hadith gradings | `public/data/hadith/dorar-takhrij-bundled.json` | Dorar hadith encyclopedia (dorar.net) | Dorar's terms of use | To confirm |
| Hadith explanations | `public/data/hadith/sharh-bundled.json` | HadeethEnc (hadeethenc.com) | HadeethEnc's terms of use | To confirm |
| Ibn al-Qayyim excerpts | `public/data/sources/ibn-qayyim-wikisource.txt` and derived data | Arabic Wikisource | CC BY-SA 4.0: attribution, and the excerpts stay under the same licence | Confirmed; attribution must remain visible in the app |
| Quran font (Uthmanic Hafs) | `public/fonts/quran/hafs/` | King Fahd Complex for the Printing of the Holy Quran | Publisher's font licence | To confirm |
| Brand font subset (Noto Naskh Arabic) | `public/fonts/intro/` | Google Fonts | SIL Open Font License 1.1 (`OFL.txt` alongside) | Confirmed |
| Adhan recording (Ahmad al-Nafees) | `public/sounds/prayer-alerts/`, `android/app/src/main/res/raw/` | `Kiwifu/adhan-mp3` | The collection is described as free for Islamic apps but carries no licence file | Unresolved |
| Bird sounds | `public/sounds/reminders/birds.mp3` | Not recorded | None recorded | Unresolved |
| Pulse animation | `public/lottie/noor-pulse.json` | Created for Athar | Owned by Athar | To confirm authorship |
| Logo, app icon, splash artwork | `public/logo.svg`, `public/icons/`, native projects | Created for Athar | Owned by Athar | To confirm: if a designer made them, hold a written assignment of rights |

## Fetched while the app runs

Nothing in this table is redistributed by Athar; the app requests it from the provider. Each provider's terms still apply.

| Content | Provider | Terms to respect | Status |
|---|---|---|---|
| Web fonts (Amiri, Amiri Quran, Cairo, Tajawal, Noto Naskh Arabic, Scheherazade New) | Google Fonts | SIL Open Font License 1.1 | Confirmed |
| Recitation audio | EveryAyah | Provider's terms | To confirm |
| Word-by-word data and translations | Quran.com / Quran Foundation | Developer terms, including limits on caching | To confirm against the current terms |
| Tafsir editions | `spa5k/tafsir_api` through jsDelivr | That project's licence and the publishers' terms | To confirm |
| Similar-verses data | `Waqar144/Quran_Mutashabihat_Data` through jsDelivr | That project's licence | To confirm |
| Prayer times | AlAdhan | Provider's terms | To confirm |
| Nearby mosques | OpenStreetMap through Overpass | ODbL: credit "© OpenStreetMap contributors" where the data is shown | Confirmed; credit is shown on the mosques screen |
| Hadith lookups for the assistant | Dorar (dorar.net) | Dorar's terms of use | To confirm |
| Assistant web sources | The sites in `supabase/functions/companion/sources.ts` | Short excerpts with a link to the source page | Confirmed practice; excerpts are limited in length and always linked |
| Video and radio | YouTube, RadioJar | Played through the providers' own players and streams | Confirmed practice |
| Language model | MiniMax | MiniMax platform terms | Confirmed; described in the privacy policy |

## Open items

1. Record the publisher and edition of the Quran text.
2. Confirm redistribution terms for the Saheeh International translation, or fetch it from a licensed provider instead of bundling it.
3. Replace the adhan recording and the bird sound with recordings that carry a clear licence, or obtain written permission.
4. Record the licence of each data project named above, with the revision that was imported.
5. Confirm ownership of the logo and artwork in writing.
