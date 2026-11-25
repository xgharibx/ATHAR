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
9. **Find an ayah by reciting it**: a few words said aloud find the ayah, on the device.
10. **A khatma that knows what you read**: an ayah counts only when it stayed on screen
    long enough to be read, or was heard from the reciter, never by scrolling past.

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
| Translations of the meanings (18 languages) | Quran.com API v4 | Provider's and translators' terms | Fetched while the app runs, kept on the device |
| Word-by-word meanings (8 languages; none exists as open data in Arabic) | Quran.com API v4 | Provider's terms | Fetched while the app runs, kept on the device |
| The printed page: the line of each word on the 15-line Madani page | Quran.com API v4 (line numbers only; the words are Tanzil's) | Provider's terms | Fetched while the app runs, kept on the device |

## Architecture

- `src/quran2/`: the whole section, independent of the existing Quran code.
  - `data/`: text, metadata, morphology, timings, tafsir, Arabic normalisation.
  - `hifz/`: the memory model and the memorisation store.
  - `pages/`, `components/`, `quran2.css`: the screens, in the section's own shell at `/q2`.
- `reading/`: the khatma (one bit per ayah), the reading log, and the tracker that
  notices what is read.
- `native/`: what V2 hands to the phone: the widget payload, the daily reminder, and
  the sync that keeps both in step from app start.
- Audio: on the web, an audio element read every frame. In the iOS and Android apps,
  Athar's native player (AVPlayer, ExoPlayer) plays the surah, so the recitation goes on
  with the screen locked and shows on the lock screen; the page reads its position
  several times a second for the word highlight. A saved copy is played when there is one.

## Road

**Phase 1 (this release)**
- The section, its shell and the entry button «القرآن ٢».
- The surah index, in mushaf or revelation order.
- The reader: word-synced audio for 14 reciters, the word lens, hearing any word, and the ayah sheet with seven tafsirs.
- Hifz: FSRS with new, near and far review, the memory map, and the self-test sessions.
- The roots dictionary, search by text, root and lemma, and the Quran in numbers.

**Phase 2 (done)**
- Similar ayahs (mutashabihat), computed on the device from the text: any two
  ayahs that share three or more words in a row. Each verse sheet lists them
  with the shared words and the point where each one parts. A drill shows the
  shared words and asks for the right continuation for this surah.
- Talqeen: the reciter recites an ayah, then stays silent for you to repeat
  it (1 to 5 times), then moves to the next.
- Recitation check: recite a page from memory, and the speech recogniser
  follows it word by word (it understands the Uthmani spelling). Missed words
  are shown, and a grade is suggested for the memory model.
- Translations of the meanings in 18 languages, under each ayah in the reader
  and in the verse sheet.
- Memorisation, where you stopped and the section's settings are included in the
  account backup (validated on restore).

**Native phase (done, needs a new app release)**
- Reader audio through the app's native player: the recitation continues with the
  screen locked, with lock-screen and headphone controls, and the word highlight
  picks up where the reciter is when the app comes back.
- Save a surah's recitation on the phone (reader settings) to listen with no
  connection; downloads go on in the background, and the player uses the saved copy.
- The widget «حفظك اليوم» on iPhone (home and lock screen) and Android: the pages in
  today's session (new, near, far), the pages memorised, and the share of the mushaf.
  It is given the far-review dates, so it counts each day by itself.
- A daily reminder for the session at a time you choose, saying how many pages
  wait that day; a tap opens the memorisation page.
- The far review is due by the day, as in the halaqah: a page due this evening is
  part of this morning's session, and a page revised today is not asked again today.

**Phase 3, part one (done)**
- The seven tafsirs of an ayah side by side (columns on a tablet, one under another
  on a phone), moving from ayah to ayah.
- Your marks on ayahs: a bookmark, four colours and a note, shown in the text and
  gathered in «علاماتي», with the notes shareable; in the account backup.
- «ختمتي»: the khatma in progress (pages and juz read, where to go on), a goal
  (a week to two months) with today's share, the days you read, and past khatmas;
  in the account backup.
- Search by recitation: say a few words and the ayahs they come from are listed.
- Everyday spelling of the madda: «آمنوا»، «القرآن»، «آلاء» find «ءَامَنُوا»،
  «ٱلْقُرْءَان»، «ءَالَآء» everywhere words are matched.

**Phase 3, part two (done)**
- The printed page («المصحف بصفحاته»): the 604 pages with their 15 lines as printed,
  surah titles and basmalas in their places (at the foot of the page before, when
  the mushaf puts them there), two pages side by side on a tablet held sideways;
  turned by swipe, arrows or keyboard; a page counts for the khatma once read.
  Checked against the whole Quran: Quran.com's line data gives the same 77,429 words
  and the same page for all 6236 ayahs, and every page from 3 to 604 comes out full.
- Word-by-word meanings in 8 languages (English, Urdu, Indonesian, Turkish, Bengali,
  Persian, Hindi, Tamil), in the word lens or under each word. There is no open
  word-by-word Arabic gloss to use; Arabic readers have the root, lemma and grammar
  of every word, and the tafsirs.
- «اسأل عن الآية»: a question about an ayah is answered by «أثر» from that ayah's seven
  tafsirs only, which the server fetches itself; each meaning is attributed to its
  tafsir, a question they do not cover is said to be so, and the reply guard lets
  through only Quran text and quotations found in those tafsirs. It asks for the
  companion's consent first, and sends only the question and the ayah's reference.

**Next**
- Tajweed colours, once an open, verified source of tajweed rules per letter is found.
