# قضاء الفوائت — research and design

Researched 2026-10-17. Sources are linked inline; nothing here is a fatwa.

## 1. What exists today

Apps found (store listings and vendor pages — **developer claims, not independent
reviews; none of the calculators' accuracy could be verified**):

| App | Notable features |
|---|---|
| Qada: Missed Prayer Tracker (Android) | Debt from birth date + puberty age + gender + madhhab; deducts menstruation; fasts; streaks, charts, reminders, **home-screen widget**, backup, PDF export |
| قضاء — متابع الصلاة الفائتة (iOS) | Same calculator inputs; Witr; Ramadan fasts; one-tap logging |
| Qaza Tracker (iOS) | Calculator from age + start date; batch-log all six prayers; kaffarah / voluntary fasts |
| Qadha Tracker (Android) | The only listing with a **fidyah calculator**; cloud sync; biometric lock |
| Qada (iOS) | On-device only; **catch-up forecast** (projected completion date); calendar; JSON export |
| عداد القضاء (Android) | Enter days/months/years owed → per-prayer list |
| Vakit, فرائضي, Selamet, Kaza Tracker … | Counters, daily reminders, tasbih bundled |

### What none of them appear to do (the opening)

1. **A living plan.** The debt is computed once and then it is a counter. None
   recompute *today's* quota per prayer from your pace and a finish date.
2. **Guidance in the flow.** The rulings (order, "one qadaa with each fard",
   surplus counts as nafl) are absent or buried in a blog link.
3. **Fasting as a ledger with a deadline.** Fasts are a bare counter. None show a
   per-Ramadan ledger, a live countdown to the next Ramadan, or the madhhab-
   dependent fidya rule.
4. **Honest uncertainty.** One guess for the debt. The fatwa says to estimate by
   *ghalabat al-zann* and lean towards more; a range does that.
5. **Integration.** They are islands: no link to the day's actual prayers, no
   account sync with the rest of the user's worship data.

## 2. The rulings the tool must respect

From [Dar al-Ifta al-Misriyyah](https://www.dar-alifta.org/ar/fatwa/details/13010/%D8%AD%D9%83%D9%85-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9-%D8%A7%D9%84%D9%81%D8%A7%D8%A6%D8%AA%D8%A9),
[IslamWeb](https://www.islamweb.net/ar/fatwa/460420/%D9%85%D8%B0%D8%A7%D9%87%D8%A8-%D8%A7%D9%84%D8%B9%D9%84%D9%85%D8%A7%D8%A1-%D9%81%D9%8A-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A7%D9%84%D8%B5%D9%84%D9%88%D8%A7%D8%AA-%D9%84%D9%85%D9%86-%D8%AA%D8%B1%D9%83%D9%87%D8%A7-%D9%85%D8%AA%D8%B9%D9%85%D8%AF%D8%A7)
and the Egyptian fatwa on [delayed Ramadan qadaa](https://www.dar-alifta.org/ar/fatwa/details/18377/%D9%85%D8%AF%D9%89-%D9%88%D8%AC%D9%88%D8%A8-%D8%A5%D8%AE%D8%B1%D8%A7%D8%AC-%D8%A7%D9%84%D9%81%D8%AF%D9%8A%D8%A9-%D8%A8%D8%B3%D8%A8%D8%A8-%D8%AA%D8%A3%D8%AE%D9%8A%D8%B1-%D9%82%D8%B6%D8%A7%D8%A1-%D8%B1%D9%85%D8%B6%D8%A7%D9%86-%D8%AD%D8%AA%D9%89-%D8%AC%D8%A7%D8%A1-%D8%B1%D9%85%D8%B6%D8%A7%D9%86-%D8%A2%D8%AE%D8%B1):

| Ruling | Consequence in the app |
|---|---|
| Qadaa is obligatory, however many (majority of the four madhhabs). A minority (Ibn Taymiyya and others) do not require it for the deliberate leaver — the fatwa authorities follow the majority | The app follows the majority and **says a minority view exists**; it never presents it as settled by the app |
| Women do not make up prayers missed during hayd / nifas | Calculator deducts them; fasting for those days *is* owed |
| Keep the **order** when the missed prayers are **five or fewer**; the order falls away beyond that | App shows the order helper only when ≤ 5 remain |
| When the count is unknown: estimate by *ghalabat al-zann*, **lean towards more** | Three estimates (minimum / likely / safe); **safe is the default** |
| Easiest method: **one qadaa with each present fard** | First plan mode; the default |
| Extra prayers count as **nafl**; falling short after honest effort is not held against you | Surplus is shown as nafl, never as an error |
| Pray the fara'id, not nawafil, in between | Guidance text |
| Witr is wajib in the Hanafi madhhab, sunnah in the others | Witr tracked only for Hanafi (or if the user opts in) |
| Fasting qadaa is by *tarakhi* (Hanafi); the majority require finishing before the next Ramadan. Delaying **without excuse** past the next Ramadan: **majority → qadaa + feeding a poor person (a mudd) per day**; Hanafi → qadaa only (the Egyptian Dar al-Ifta fatwa cited here gives qadaa only) | Fidya rule is **driven by the chosen madhhab**; with an excuse, no fidya |

The app calculates; it does not rule. Every estimate screen carries "راجع
مفتيك" and the madhhab setting is shown, not hidden.

## 3. Product design

**Entry point.** A round button to the right of the bottom bar, exactly where the
invisible "balance twin" already sits opposite the ⋮ button — so the bar stays
dead-centre and nothing already tuned moves. Icon: a timer with a reset arrow
("making up time"). A small accent dot appears when today's quota is not done.

**Route** `/qadaa` — one page, top to bottom:

1. **Hero** — ring of remaining/owed, projected finish date, streak.
2. **Today** — quota per prayer (from the active plan) with one-tap +1 / undo,
   and a "full day" button (+1 to each).
3. **Prayers** — remaining / done / surplus per prayer, bars.
4. **Fasting** — per-Ramadan ledger, live countdown to the next Ramadan, deadline
   advice, fidya box.
5. **Plan** — *one with each fard* / *N days per day* / *finish by date*; shows
   the plan's date next to the date implied by actual pace.
6. **Calculator** — guided; gives min / likely / safe; or manual entry.
7. **Guidance** — the rulings above, collapsible.

**Data** (all additive, synced): `qadaaOwed`, `qadaaDone`, `qadaaDayTotals`,
`qadaaSettings`. Owed and done are separate on purpose: `done` only ever grows
(merges safely across devices) while `owed` is the user's own statement of the
debt (last-writer-wins). Remaining = owed − done.

**Not included, deliberately.** No leaderboard score, no sharing: qadaa is
between a person and Allah, and ranking it invites exactly what it should not.

## 4. Verification plan

- Pure-logic tests: calculator (men/women, uncertainty range, edge dates),
  quota by plan mode, pace/projection, fasting deadline, fidya by madhhab.
- Store tests: log / undo / day totals / sync merge / persistence migration.
- Browser: render, log, undo, plan switch, calculator, countdown, RTL, mobile
  width, nav-button position and centring.
- Android emulator: the button, the page, the widget.
