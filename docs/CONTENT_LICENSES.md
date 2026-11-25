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
| Quran text for «القرآن ٢» (Tanzil Uthmani 1.1) | `public/data/quran2/tanzil-uthmani.txt` | Tanzil Project (tanzil.net), fetched by `tools/scripts/quran2/fetch-tanzil.mjs` | CC BY 3.0: verbatim copies only, the source named with a link to tanzil.net, and the copyright block kept in the file | Confirmed; the file is unchanged (a test rebuilds every line from the parsed words), and the credit is shown in the section |
| Quran metadata for «القرآن ٢» (Tanzil 1.0) | `public/data/quran2/tanzil-meta.json` | Tanzil Project | CC BY 3.0, with attribution | Confirmed; the notice travels in the file and the credit is shown in the section |
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
| Morphology for «القرآن ٢» (roots, lemmas, grammar of every word) | Quranic Arabic Corpus 0.4 (corpus.quran.com), Arabic edition `mustafa0x/quran-morphology` at commit 8f38b39, through jsDelivr | GNU GPL 3.0: credit with a link to corpus.quran.com; not redistributed by Athar | Confirmed; credited with a link wherever it is shown |
| Word timings and recitation audio for «القرآن ٢» | Quran.com / QuranicAudio (`api.qurancdn.com`, `download.quranicaudio.com`) | Provider's terms | To confirm |
| Seven Arabic tafsirs for «القرآن ٢» | Quran.com API v4 | Provider's and publishers' terms | To confirm |
| Translations of the meanings for «القرآن ٢» (18 languages) | Quran.com API v4 | Provider's and translators' terms | To confirm |
| Word-by-word meanings for «القرآن ٢» (8 languages) | Quran.com API v4 (`words=true&language=`) | Provider's terms | To confirm |
| Printed-page layout for «القرآن ٢» (the line of each word on the 15-line Madani page) | Quran.com API v4 (`word_fields=line_number`); only line numbers are used, the words are Tanzil's | Provider's terms | To confirm |
| «مصحف المدينة» page fonts for «القرآن ٢» (QCF V2, one font per page) and their glyph codes | King Fahd Complex for the Printing of the Holy Quran fonts, served by Quran.com (`static.qurancdn.com`, `code_v2`); fetched as data and kept on the device | The Complex's and the provider's terms | To confirm |
| Reem Kufi (display font of «القرآن ٢») | Google Fonts / Fontsource, bundled | SIL Open Font License 1.1 | Confirmed |
| Tafsirs given to «اسأل عن الآية» (the AI answers from them) | Quran.com API v4, fetched by the Athar server for the asked ayah | Provider's and publishers' terms | To confirm |
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
