# جدول الورد · جدول المحاسبة · رؤيتي — research and design

Written 2026-10-17. Three pieces that share one idea: **a person should be able to see, honestly and without
guilt, where they are climbing and where they have started to slip.**

## What exists (surveyed)

| App | What it does | What it does not |
|---|---|---|
| Ajr Pro, Daily Deeds, Niyyah, Ihsan | Daily checkboxes for prayers, adhkar, Quran, fasting; streaks; some exemptions (women) | A deed is done or not. No notion that "prayed" and "prayed in the first row of the mosque before iqama" are different rungs |
| ZikrApp, Everyday Muslim | Tasbih, qada tracker, fasting schedule, stats | No self-accounting table, no trend warning |
| Awrady, Ishraqa, Azkary, Tadhkira | Fixed wird lists (adhkar + Quran amount), reminders, 30-day charts | The wird is the app's, not the person's; no weekly grid; no link to what the person actually read |
| Habit apps (Streaks, Habitica, Finch, Loop) | Custom habits, grids, streak repair | Generic: no fiqh of the day (Mon/Thu fasts, Friday, women's exemptions), no Arabic-first design |
| Fitness readiness (Oura, Whoop, Apple Fitness) | One daily score, a 7-vs-28-day baseline, "you are trending down" | Not for worship — but the *baseline comparison* is exactly what a self-accounting table needs |

Classical sources for the idea: *muhasabat al-nafs* (Ibn al-Qayyim, *Madarij al-Salikin*; al-Muhasibi, *al-Ri'aya*) —
account for yourself daily, before you are accounted. Practical ladders come from the hadith on the ranks of prayer
(in its time, in congregation, the first row, before the iqama, the rawatib, night prayer before Fajr).

## Gaps this closes

1. **Ranked levels per deed** (not a checkbox). Each deed is a ladder; the person records the highest rung reached.
   A day's score is rung/total, so "Fajr in the first row with the sunnah" honestly outweighs "Fajr, late".
2. **Slip detection.** Recent 7 days vs the previous 21 per deed. A drop is shown as a gentle note with the *next
   rung to recover*, never a red alert. Two recorded misses in a row get their own line.
3. **A wird that belongs to the person**: Quran amounts (pages/juz/hizb), adhkar sets, custom dhikr counts, plain
   tasks; per weekday; per time slot; shown as a 7-day grid with one-tap logging.
4. **Everything already tracked flows in.** Fard prayers, adhkar and Quran reading the app already knows about
   pre-fill the table (suggested, never silently recorded as achievements).
5. **Insights becomes a review, not a dashboard**: one consistency score, a weekly "what changed" paragraph, best
   and weakest days, what improved, what slipped — across prayers, Quran, adhkar, qadaa, muhasaba and wird.

## Design rules

- No emoji, no leaderboard, no sharing of the muhasaba (it is between a person and their Lord).
- Unrecorded is not missed. Averages use recorded days; coverage is shown separately.
- Women get their own prayer ladders and exemption handling; nothing is assumed.
- Merge-safe: log entries are per-key (latest wins); wird progress adds like the tasbeeh counter.
- Pure logic in `src/lib/muhasaba.ts` and `src/lib/wird.ts`, tested; pages only render.

## Placement

Two quiet icon buttons at the top-left of the Home hero card (the empty corner): the wird table and the
muhasaba table. Insights keeps its place in the nav overflow.
