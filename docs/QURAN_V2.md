# «القرآن ٢» — the charter

This file is the brief that Quran V2 is built from: the prompt, the decisions, and the road. It is kept up to date in the same pull request as any change to the section.

## The prompt

> Build, beside Athar's existing Quran section and without touching it, a second Quran
> section that has no equal. Think as one company: the CEO who decides what it is for,
> the scholar who guards the text, the linguist, the hafiz and the teacher who know how
> the Quran is really learned, the designer, the engineers for web, iOS and Android, the
> data engineer, QA, accessibility, privacy and legal.
>
> Start from nothing. Do not take text, data or code from the existing Quran section:
> anything it got wrong would be carried over. Choose every source again, record where it
> comes from and under what terms, and prove with tests that it is whole and aligned.
>
> Gather everything related to the Quran, near or far: reading, listening, understanding,
> memorising, the language of every word, the tafsirs side by side, the Quran's numbers
> and structure, search by meaning-bearing units (roots, lemmas), and the ways a person
> lives with the Quran day to day. Take what the best apps do well, then go past it: put
> the layers together so that each one makes the others richer.
>
> The text is sacred: never change it, never show a word that is not in the source, and
> never let a machine invent religious content. Where AI helps, it only explains what
> cited sources say.
>
> Use native iOS and Android code wherever native is genuinely better, and keep it all
> part of Athar.

## What makes it one of a kind

No single app joins these together; several exist nowhere in Arabic:

1. **Every word is alive.** Tap any word of the Quran: its root, lemma and grammar in
   Arabic terms, how many times the root and lemma occur, every place they occur, and
   the reciter's own voice saying that very word.
2. **Read along with the reciter.** Word-by-word highlighting for 14 reciters, follow mode, repeat per ayah.
3. **Seven tafsirs side by side** for any ayah: al-Muyassar, as-Sa'di, Ibn Kathir,
   at-Tabari, al-Qurtubi, al-Baghawi, al-Wasit.
4. **A real hifz system.** The traditional method (new lesson, near review, far review)
   driven by a modern memory model (FSRS): it knows how likely you are to remember each
   page today, and draws your whole mushaf as a living memory map.
5. **The roots dictionary.** Every root of the Quran, its derived words, and where it
   lives across the 114 surahs, drawn as a distribution strip.
6. **Search by root and lemma**, not only by spelling, with the results drawn across the mushaf.
7. **The Quran in numbers**, all computed on the device from the verified text, with the
   counting method stated, never copied from unverified lists.
8. **Mushaf order or revelation order**, everywhere a surah list appears.

## Principles

- **The text**: Tanzil Uthmani 1.1, bundled verbatim with its copyright block. The basmala
  that Tanzil writes at the start of the first ayah of 112 surahs is shown as the surah's
  heading; the text itself is never altered.
- **Word numbering**: the Quranic Arabic Corpus numbering, which the audio timings also
  use. Tanzil writes four words as two («بَعْدَ مَا» in 2:181, 8:6, 13:37; «إِلْ يَاسِينَ» in
  37:130); these are joined into one word by an explicit, tested table.
- **No invented content**: everything shown is from a named source; the counts are
  computed, with the method shown.
- **Offline first**: the text and metadata ship in the app; what is fetched (morphology,
  timings, tafsir) is kept on the device after the first use.
- **Privacy**: memorisation data stays on the device.

## Sources

| Layer | Source | Terms | How |
|---|---|---|---|
| Quran text | Tanzil Project, Uthmani 1.1 (tanzil.net) | CC BY 3.0, verbatim only, credit and link to tanzil.net | Bundled: `public/data/quran2/tanzil-uthmani.txt` |
| Metadata (surahs, revelation order, juz, hizb, pages, sajdas) | Tanzil quran-data 1.0 | CC BY 3.0 | Bundled: `public/data/quran2/tanzil-meta.json` |
| Morphology (roots, lemmas, grammar) | Quranic Arabic Corpus 0.4, Arabic edition by mustafa0x/quran-morphology (commit 8f38b39) | GNU GPL 3.0; credit and link to corpus.quran.com | Fetched while the app runs, kept on the device |
| Word timings and audio | Quran.com / QuranicAudio (qdc) | Provider's terms | Fetched while the app runs |
| Tafsirs | Quran.com API v4 | Provider's and publishers' terms | Fetched while the app runs, kept on the device |

## Architecture

- `src/quran2/`: the whole section, independent of the existing Quran code.
  - `data/`: text, metadata, morphology, timings, tafsir, Arabic normalisation.
  - `hifz/`: the memory model and the memorisation store.
  - `pages/`, `components/`, `quran2.css`: the screens, in the section's own shell at `/q2`.
- Native: audio already plays natively in Athar; V2 uses the WebView's audio element so
  that word timings are exact. Native work is planned where it is clearly better (below).

## Road

**Phase 1 (this release)**
- The section, its shell and the entry button «القرآن ٢».
- The surah index, in mushaf or revelation order.
- The reader: word-synced audio for 14 reciters, the word lens, hearing any word, and the ayah sheet with seven tafsirs.
- Hifz: FSRS with new, near and far review, the memory map, and the self-test sessions.
- The roots dictionary, search by text, root and lemma, and the Quran in numbers.

**Phase 2**
- Recitation checking that feeds the memory model.
- Talqeen mode: the reciter, then silence for you to repeat.
- Mutashabihat drills computed from the text.
- Range repeat for hifz.
- Translations.
- Asking about an ayah, answered only from the cited tafsirs.
- Backup of hifz progress with the account.

**Phase 3, native**
- An iOS and Android widget for "pages due today".
- A native background player that reports word timings, so read-along continues with the screen locked.
- Notifications for the daily hifz session.
- A two-page tablet layout.
