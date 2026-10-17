# Quran Foundation (quran.com/developers) — what exists, what Athar has, what to do

Researched 2026-10-17 from the public docs, live calls to the keyless
`api.quran.com/api/v4`, the official Developer Terms and FAQ, and your
Developer Console (signed in through your existing session — no password was
typed anywhere). Nothing was created, submitted or changed in your account.

## Headline findings

1. **Your Developer Console account has zero apps.** That is why the app's
   `quran-translations` Supabase function (written to call Quran Foundation) was
   never deployed — it needs a client id/secret that does not exist yet.
2. **The terms matter more than the features.** QF content may not be cached
   more than **7 days** except through **Content Sync**, and a prepackaged
   bundle of QF content is not allowed. Athar already caches QF word-by-word
   data for 7 days (a past audit fixed that), which is compliant.
3. **Athar already covers most of the Quran surface itself** (own text, Hafs,
   29 everyayah.com reciters, 13 tafsir editions, tajweed, mutashabihat, plans,
   khatma, memorisation, vocab, offline). The real gaps are *translations*
   (3 vs 126), *licensed audio with word timing*, and *syncing to a Quran.com
   account*.
4. **Production access is by approval**, with no published timeline. Prelive
   returns only Al-Fatihah and Al-Baqarah.

## 1. Content APIs

| Capability | Quran Foundation | Athar today | Verdict |
|---|---|---|---|
| Chapters / juz / hizb / rub / ruku / manzil / pages | Full, 114 chapters, 60 juz entries | Own bundled metadata + page map | **Have it.** Nothing needed |
| Uthmani text, Imlaei, IndoPak variants | Yes (`/quran/verses/...`) | One bundled Uthmani text (provenance not documented) | **Optional:** IndoPak script option for South-Asian users |
| Tajweed-coloured text | `text_uthmani_tajweed` | Yes (via QF word-by-word call) | Have it |
| QCF page glyphs (`code_v1`, `v1_page`) — true Madani page layout | Yes | Page map only, own fonts | **Upgrade:** exact printed-mushaf pages. Fonts may be bundled with an active console account + credit |
| Word-by-word (text, translation, transliteration) | Yes | Yes (7-day cache, compliant) | Have it |
| **Word-by-word audio** (`wbw/001_002_001.mp3`) | Yes, public CDN | Not used | **New:** tap a word, hear it. Good for learners/Tasmee |
| **Translations** | **126 in 69 languages** (Urdu 8, English 9, Turkish 5, French 3, Indonesian 3, Persian 2, …). No Arabic ones | **3** (Saheeh bundled; Yusuf Ali + Jalandhry via an **undeployed** proxy) | **Biggest gap.** Needs an approved app. Each translation has its own license — some non-commercial |
| **Tafsir** | 20 (7 Arabic incl. Ibn Kathir, Tabari, Qurtubi, Sa'di, Baghawi, Wasit, Muyassar; also Bengali, Urdu, English, Russian, Kurdish) | 13 (10 Arabic + 3 English) from a CDN mirror | Roughly at parity for Arabic. **New:** Urdu, Bengali, Russian, Kurdish. Switching source also fixes provenance |
| **Surah introductions** (`/chapters/{id}/info`) | Yes (Maududi, ~14,500 chars for al-Baqarah; Arabic variants exist) | `SurahInfoPopover` exists (own content) | **Upgrade:** richer intros per surah |
| Verse-by-verse audio | Yes, `recitations/{id}/by_ayah` | everyayah.com, 29 reciters | Have it (different source) |
| **Chapter audio with verse timestamps** (`?segments=true`) | Yes — gives per-verse (and word) timing | Not used | **New:** exact verse/word highlighting during playback, follow-along |
| Reciters | 12 verse reciters + a larger chapter-reciter set via the audio API | 29 | We have more. QF adds *licensed, timed* audio |
| **Search** | `/search` (needs the `search` scope = **requires approval**). Keyless search works for English; Arabic returned nothing in my test (encoding on my side — **unverified**) | Own local Arabic search (`quranDirectSearch`, ayah index), offline | Ours is offline and Arabic. QF search adds translation search; needs approval |
| **Qira'at** (readers, transmitters, junctures) | `/content/api/v4/qiraat/...` needs the `qiraat.read` scope (approval) | Hafs only | **New and distinctive** — no other app offers it easily. Approval needed |
| Random verse | Yes | Own | Have it |
| Verse media / video | Listed | none | Low value |
| Content Sync (official offline path) | Yes — snapshots + incremental, 7-day cadence | Offline via own bundle + IndexedDB | **Needed if** we ever want QF translations/tafsir offline legally |

## 2. User APIs (the user signs in with a Quran.com account, OAuth/PKCE)

| Feature | What it gives | Athar today | Verdict |
|---|---|---|---|
| Bookmarks, collections | Synced with Quran.com + other apps | Own bookmarks, own cloud sync (Supabase) | **Optional.** Value is *cross-app continuity* ("continue where you left off on Quran.com") |
| Reading sessions, streaks, goals, activity days | Cross-app reading progress, QF-side streak | Own daily goal, streak, plans, leaderboard | We already have richer ones. Importing is optional |
| Notes | Synced notes | Own `quranNotes` | Optional |
| Preferences, `app_state` | Reader prefs; private per-app sync state (**not launched yet**) | Own sync | Skip |
| QuranReflect (posts, comments, rooms, tags) | Social reflections on ayahs | none | A community feature — heavy to moderate. Skip for now |
| **Connected Apps listing** | Eligible OAuth apps can be featured to Quran.com users | none | **Free exposure** if we integrate OAuth |

Important: signing in with Quran.com would be a **second login system** next to
Google/Supabase. It is worth it only for the Connected Apps listing and
continuity. Note Apple's rule 4.8 already applies to the existing Google sign-in.

## 3. Tools, AI and open source

| Item | What it is | Fit for Athar |
|---|---|---|
| **Quran MCP** (`mcp.quran.ai`, open source `quran/quran-mcp`, QFGPL-1.0) | Semantic search + text/translation/tafsir/morphology retrieval, 50+ translations, 15+ tafsir, qira'at, root concordance | **Strong fit for the Companion.** Today the Companion verifies quotes against local packs; this grounds answers in verified text instead of the model's memory. Check the QFGPL-1.0 licence and the "derived materials / AI" clauses in the terms first |
| Quran Android / iOS / frontend / audio repos | Reference implementations | Read-only inspiration (page-image caching, audio gapless, accessibility) |
| Quran App Store (`quran.com/apps`) | A directory of third-party apps | Free listing opportunity |
| Quran Labs | Community experiments | Optional |
| JS SDK `@quranjs/api` | Typed server client | Convenient for a Supabase function; not required |

## 4. The rules that constrain everything (from the official Developer Terms)

| Rule | Consequence for Athar |
|---|---|
| Don't cache/store QF content > **1 week** unless via **Content Sync** | Existing 7-day WBW cache is fine. Anything longer-lived/offline from QF needs Content Sync |
| No prepackaged QF database or build-time bundle | We must not ship QF translations inside the app |
| Fonts and Mushaf images **may** be bundled (active console account + credit, only as part of the app) | QCF page fonts are allowed |
| Quran text must be **unmodified**; snippets keep their context | The Companion and share cards must not alter or truncate text misleadingly |
| Derived materials / embeddings / AI output that can reproduce QF content stay restricted; **no ML training without written consent**; RAG inside the app is treated differently | Matters for the Companion + any local search index built from QF text |
| Credit Quran Foundation "in a reasonably accessible place"; for Connected Apps: "Quran data provided by Quran.Foundation"; credit each edition | **Missing today** — Sources page credits only QUL. Needs a credit line |
| Publish a Privacy Policy + Terms; minimum scopes; user can revoke/delete; **report breaches within 24h** to developers@quran.com | Privacy policy exists; add Terms of Use + a QF section |
| Per-resource licences (some non-commercial) | Each translation/recitation must be checked before use |
| Revocable; 30 days' notice of breaking changes | Don't make the app hard-depend on QF; keep graceful fallbacks |
| Commercial use (ads, subscriptions, donations) allowed without a separate licence, if content stays inside the experience | OK for Athar |
| Rate limits not published | Keep the existing per-client quota in the proxy |

## 5. Risks and unknowns I could not resolve

- **We rely on the keyless `api.quran.com` for word-by-word.** I could not
  confirm whether that endpoint is supported long-term or intended for apps; the
  documented path is authenticated `apis.quran.foundation`. Worth moving
  behind an approved client.
- **Provenance of the bundled Quran text and the `muyassar` tafsir** is not
  documented in the repo. Not a QF issue, but you should know the source and its
  licence.
- Production approval criteria and timing are **not published**; contact is
  developers@quran.com.
- Arabic keyless search returned nothing in my test; that may be my encoding,
  not the API.

## 6. Recommended order

1. **Create a Server app** in the console (API access only — no redirect URIs).
   Do it as the owner; it needs your agreement to the Developer Terms.
2. Add the credit line to Sources + share cards, and the QF section to the
   privacy policy.
3. Deploy the already-written `quran-translations` function in **prelive**
   (Al-Fatihah/Al-Baqarah only) to prove the pipe, then request production.
4. After approval: **translations** (the 3 → many), **word-audio**, **timed
   chapter audio** (verse/word follow-along).
5. Then, in value order: Quran MCP for the Companion; qira'at; QF search;
   Quran.com login + Connected Apps listing.
6. Skip for now: QuranReflect, QF-side streaks/goals (we have better).

## What I deliberately did not do

- Did not type your password anywhere, and did not save it.
- Did not create an app, accept the Developer Terms, or submit any form.
- Did not store any QF content in the repo.
