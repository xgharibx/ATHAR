/**
 * «أثر سماعك»: what your listening adds up to — today against your goal,
 * the week, your streak, the listening khatma (every surah heard to the end),
 * the reciters and surahs you return to most.
 */
import * as React from "react";
import { Flame, RotateCcw, Sparkles, Trophy } from "lucide-react";
import "@/styles/listen.css";
import { arabicDigits, formatListened, surahName } from "@/lib/listen/catalog";
import { dayKey, lastSevenDays, listeningStreak, useListenStore } from "@/lib/listen/store";

const GOALS = [5, 10, 15, 30, 60];

export function ListenStatsPage() {
  const s = useListenStore();
  const week = lastSevenDays(s.days);
  const max = Math.max(60, ...week.map((d) => d.seconds));
  const streak = listeningStreak(s.days);
  const today = s.days[dayKey()] ?? 0;
  const done = new Set(s.khatma.done);
  const topArtists = Object.entries(s.byArtist).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topSurahs = Object.entries(s.heard).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const activeDays = Object.values(s.days).filter((v) => v >= 60).length;

  React.useEffect(() => {
    document.title = "أثر سماعك — السماع";
  }, []);

  return (
    <div className="ls-page page-enter">
      <header>
        <h1 className="ls-title">أثر سماعك</h1>
        <p className="ls-sub">﴿وَإِذَا قُرِئَ الْقُرْآنُ فَاسْتَمِعُوا لَهُ وَأَنصِتُوا لَعَلَّكُمْ تُرْحَمُونَ﴾ [الأعراف: ٢٠٤]. يُحفظ أثرك هذا على جهازك.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="ls-stat">
          <b>{formatListened(today)}</b>
          <span>اليوم، والهدف {arabicDigits(s.dailyGoalMinutes)} د</span>
        </div>
        <div className="ls-stat">
          <b className="inline-flex items-center gap-1">
            <Flame size={20} className="text-(--accent)" aria-hidden="true" /> {arabicDigits(streak)}
          </b>
          <span>أيام متتالية</span>
        </div>
        <div className="ls-stat">
          <b>{formatListened(s.totalSeconds)}</b>
          <span>مجموع ما سمعت</span>
        </div>
        <div className="ls-stat">
          <b>{arabicDigits(activeDays)}</b>
          <span>يومًا سمعت فيه</span>
        </div>
      </div>

      <section className="ls-card p-4">
        <div className="ls-section-head">
          <h2>هذا الأسبوع</h2>
          <span className="text-[12px] text-(--muted)">{formatListened(week.reduce((a, d) => a + d.seconds, 0))}</span>
        </div>
        <div className="ls-bars" role="img" aria-label="دقائق السماع في الأيام السبعة الأخيرة">
          {week.map((d) => (
            <div key={d.key} className="ls-bar">
              <i style={{ height: `${Math.max(4, (d.seconds / max) * 100)}%`, opacity: d.seconds ? 1 : 0.35 }} title={formatListened(d.seconds)} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ls-card p-4">
        <div className="ls-section-head">
          <div>
            <h2 className="inline-flex items-center gap-1.5">
              <Sparkles size={17} className="text-(--accent)" aria-hidden="true" /> ختمة السماع
            </h2>
            <p>كل سورة تسمعها إلى آخرها تُضاء هنا{s.khatma.rounds ? `، أتممت ${arabicDigits(s.khatma.rounds)} ختمة` : ""}</p>
          </div>
          <b className="text-(--accent)">{arabicDigits(done.size)}/١١٤</b>
        </div>
        <div className="ls-grid114" role="img" aria-label={`سمعت ${done.size} سورة من ١١٤`}>
          {Array.from({ length: 114 }, (_, i) => i + 1).map((n) => (
            <span key={n} className={done.has(n) ? "is-on" : ""} title={surahName(n)}>
              {arabicDigits(n)}
            </span>
          ))}
        </div>
        {s.khatma.completedAt || done.size > 0 ? (
          <button
            type="button"
            className="ls-ghost-btn mt-3 w-full"
            onClick={() => {
              if (window.confirm("بدء ختمة سماع جديدة؟")) s.restartKhatma();
            }}
          >
            <RotateCcw size={16} aria-hidden="true" /> {s.khatma.completedAt ? "ابدأ ختمة جديدة" : "البدء من جديد"}
          </button>
        ) : null}
      </section>

      {topArtists.length ? (
        <section>
          <div className="ls-section-head">
            <h2 className="inline-flex items-center gap-1.5">
              <Trophy size={17} className="text-(--accent)" aria-hidden="true" /> الأصوات الأقرب إليك
            </h2>
          </div>
          <div className="ls-list">
            {topArtists.map(([name, sec], i) => (
              <div key={name} className="ls-row">
                <span className="ls-row-num">{arabicDigits(i + 1)}</span>
                <span className="ls-row-main">
                  <span className="ls-row-title block">{name}</span>
                </span>
                <span className="text-[12.5px] text-(--muted)">{formatListened(sec)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {topSurahs.length ? (
        <section>
          <div className="ls-section-head">
            <h2>السور التي تعود إليها</h2>
          </div>
          <div className="ls-chips">
            {topSurahs.map(([n, times]) => (
              <span key={n} className="ls-chip">
                {surahName(Number(n))}، {arabicDigits(times)}×
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ls-card p-4">
        <div className="ls-section-head">
          <h2>وِردك اليومي من السماع</h2>
        </div>
        <div className="ls-chips" role="radiogroup" aria-label="الهدف اليومي">
          {GOALS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={s.dailyGoalMinutes === g} className={`ls-chip ${s.dailyGoalMinutes === g ? "is-on" : ""}`} onClick={() => s.setDailyGoal(g)}>
              {arabicDigits(g)} دقيقة
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
