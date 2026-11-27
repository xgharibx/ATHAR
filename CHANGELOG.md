# Changelog

What changed in each version of Athar, newest first. Store notes for a version
live in `ios/fastlane/metadata/*/release_notes.txt` (App Store) and
`docs/PLAY_WHATS_NEW_<version>.txt` (Google Play, 500 characters at most).

## 1.2.98 (build 111)

### Hadith
- **Lighter books:** a book opens from its table of contents (20–140 KB) and the chapter you read (at most ~0.8 MB), not the whole book (up to 8.6 MB). On the web, «تحميل الكل» keeps every book for offline reading (on the hadith page and in Settings › Data); the apps carry them already.
- **Chains and lists:** chains are read narrator by narrator (co-narrators, «ح», «يعني …» notes), and list rows show the hadith instead of its chain (chain-like previews from 35% to under 3%; only 3 hadiths, which are a chain alone, show no text).
- **One search everywhere:** the hadith page and the app's search use the same full-text search, with filters by grade, narrator and exact phrase, and voice search (also on the app's Search page).
- **Explanations:** 4,453 hadiths linked to their explanation (from 1,445); the Nawawi forty is fully explained offline. «الشروح» searches the explanations bundled with the app, also offline.
- **Curated cards point into the books:** a curated hadith shows the book's own wording and grade, with «اقرأه في الكتاب بإسناده».
- **Folders and export:** put saved hadiths in your own folders, search what you saved and your notes, and «تصدير ملاحظاتي» as a text file. Folders and the reading plan are in backups and sync.
- **One review with the Quran:** «مراجعة اليوم» shows the Quran pages and hadith cards due side by side; the memorisation reminder and the «حفظك اليوم» widget name both. Memo cards load only their own chapters.
- **Shared links:** a shared or copied hadith carries its link (www.athark.org/hadith/bukhari/1), which opens the hadith in the app where it is installed.
- **«اسأل عن الحديث»:** a question about a hadith, answered by «أثر» from that hadith, its scholars' rulings and its explanation only.
- **Word meanings:** tap an underlined word in the hadith to see its meaning (from the explanation's «معاني الكلمات», in 1,558 hadiths).
- **Reading plans:** the two forties a hadith a day, or a Sahih in a year, with today's share, progress and an optional daily reminder at the time you choose.
- In «أفق», the hadith pages keep one top bar; plain rows without star backgrounds.

## 1.2.97 (build 110)

### Hadith (bundle v2)
- **Search reads every word:** the whole text of all 36,064 hadiths is searchable offline (before, only the first ~250 characters, mostly the chain). Exact phrases first, then hadiths holding every word; the true number of results, per book, with a filter by book and «عرض المزيد».
- **Rulings with their scholars:** «الألباني: شاذ · زبير علي زئي: إسناده صحيح» on 21,000 hadiths of Abu Dawud, al-Tirmidhi, al-Nasa'i, Ibn Majah and the Muwatta, in Arabic, offline.
- «اسأل أثر» reads the same full texts for its offline references. The old 18 MB opening-words index is gone (the new texts add 3 MB net).

## 1.2.96 (build 109)

### Hadith
- **Cleaner books:** the 408 empty numbering placeholders are gone (203 in Muslim); the forties no longer show raw markup or the attribution twice; each of the 82 hadiths of the two forties has its title.
- **Printed numbers:** hadiths are cited and found by the numbers people quote («صحيح مسلم ١١٤٤ (٢)»، «المقدمة ١»), in the lists, the reader, search, copy and share; «اذهب إلى رقم» uses them too.
- **Reader:** the text comes first, the chain is folded as «الإسناد (٧ رواة)»; a labelled bar (حفظ · علامة · ملاحظة · مشاركة · المزيد); where you are in the chapter («٥ من ٥١»).
- **Grades and rulings** all in Arabic (شاذ، منكر، مرسل…), without Dorar's brackets.
- **Search** shows the words that matched, and «علي» finds «عَلَىَّ» (alef maqsura and ta marbuta either way).
- **One list of what you kept** (marks, notes and curated favourites) in «العلامات» and in Favorites, with its text, without loading whole books.
- **حديث اليوم:** one hadith a day on the home, «أفق», the hadith page and the widget; an optional reminder at Fajr with the hadith itself; a Lock Screen widget; «حديث اليوم في أثر» in Siri and iPhone search.
- «اسأل أثر» hadith cards open the hadith in the app's own book. One «الحديث» entry in the Library; «الشروح» on the hadith page; curated cards state only real grades; source credits moved to the privacy page.

## 1.2.95 (build 108)

- **Home (classic):** «زاد اليوم» in the look of «أفق» (the ayah in the mushaf's type, centred; Naskh texts; pill actions), and the card is as tall as the item shown: no more empty space under a short one.
- **Floating buttons:** they step aside while the page scrolls, and the quick tasbeeh button no longer sits over the Quran's pages beside «السماع».
- **«اسأل أثر»:** a question asked in another language is answered in it (verses and hadith still only from their verified Arabic blocks); Arabic replies are cleaned as before.

## 1.2.93 – 1.2.94

- «اسأل أثر»: fuller, clearer answers; consent text shortened; the assistant answers only through OpenAI, the service the consent names.
- Polished home, Quran index and Madina page; new store screenshots and notes (Arabic store listing on iOS).

## 1.2.92 (build 105)

### The Quran
- **القرآن الكريم**, rebuilt from the text up: one Quran section in place of the old reader, with nothing left behind (old bookmarks, notes and reading position carried over).
- **مصحف المدينة**: the page as printed, the King Fahd Complex page fonts, tajweed colours, interactive words. The page layout ships with the app, so it opens offline.
- Word-synced recitation in the background, tafsirs side by side, translations of the meanings, word meanings, roots and morphology, similar ayahs, voice search, «اسأل عن الآية», khatma and bookmarks.
- **الحفظ**: spaced review of memorised pages, talqeen, a daily session, a reminder, and a Home Screen widget for the pages due today.
- **التسميع**: recite and compare word by word, with an on-device tajweed engine that follows you live and checks the rules, tafkhim and tarqiq included. Nothing is recorded or sent.
- Downloads page for recitations, tafsirs and fonts. One top bar, new typefaces (IBM Plex Sans Arabic, Amiri).

### السماع
- The whole Quran by the great reciters, the golden recordings, the night prayers of the two Harams, tawasheeh and ibtihalat, and the live Quran radio.
- Native players on iPhone and Android: background playback, lock-screen and headphone controls, downloads, shuffle, sleep timer. No album covers; reciters appear by name.
- **New widget**: Home Screen (iPhone small and medium, Android 4×2), Lock Screen and Control Center. Shows what is playing, with a bar and clock that follow the recitation, and plays, pauses and skips without opening the app. After the app was closed, play picks up where you stopped.

### Designs and home
- **«أفق»**, an optional second design, switches instantly. The leaderboard is a trophy icon in its top bar.
- **الكلاسيكي الجديد**, a calm third home. The classic home is lighter by default, and «اكتشف» lists the adhkar last, as their own category.

### Everything else
- Hadith, the Miracles, the Seerah and stories, duas, Asma al-Husna and ruqyah reworked from A to Z.
- Tracking (wird, muhasaba, insights, qadaa), a shared group khatma, the leaderboard with live friends and a working weekly challenge.
- Native: Sign in with Apple, share sheet, back swipe, file save, pull-to-refresh, notifications with action buttons, widget taps that land on the right screen, Wear OS tile, and widgets for missed prayers, hadith and Qibla.
- «اسأل أثر» now answers with OpenAI GPT-6 Luna (in place of MiniMax), writes its answers onto the screen, goes deeper on long questions, and searches only the trusted scholarly sites. Everyone is asked for consent again, naming the new service.
- Content sources and licences are listed in the privacy policy, under «مصادر المحتوى وتراخيصه».

## 1.2.91 and earlier

See the merged pull requests on GitHub.
