import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleDot,
  Compass,
  HandHeart,
  Headphones,
  Radio,
  Scale,
  Share2,
} from "lucide-react";
import "@/styles/homeNew.css";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { coerceCount, type Section } from "@/data/types";
import { DAILY_VERSES } from "@/data/dailyVerses";
import { useStartupReady } from "@/hooks/useStartupReady";
import { usePrayerTimes, formatPrayerHijriDate } from "@/hooks/usePrayerTimes";
import { useTodayKey } from "@/hooks/useTodayKey";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useNoorStore } from "@/store/noorStore";
import { useListenStore } from "@/lib/listen/store";
import { playTrack } from "@/lib/listen/player";
import { getRadioState, subscribeRadio, toggleRadio } from "@/lib/radioPlayer";
import { buildPrayerSchedule, type PrayerTimings } from "@/lib/prayerSchedule";
import { PRAYER_KEYS, ufuqClock, untilLabel } from "@/components/ufuq/ufuqTime";
import { getHomeAdhkarAction } from "@/lib/homeTimeActions";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { dhikrStateKey } from "@/lib/dhikrItemIdentity";
import { countCompletedKhatmaDays } from "@/lib/quranKhatma";
import { SURAH_NAMES } from "@/lib/surahNames";
import { arNum } from "@/lib/formatNumber";
import { shareText } from "@/lib/shareTargets";
import { vibrate } from "@/lib/haptics";
import { trackUxEvent } from "@/lib/uxMetrics";
import { AdhkarLoadStatus } from "@/components/home/AdhkarLoadStatus";

/*
 * «الكلاسيكي الجديد» — the home as one day, in three movements:
 *   السماء  where you are in the day (a real sun path: the curve crosses the
 *           horizon at sunrise and Maghrib), and the five prayers to mark;
 *   الورد   the adhkar of the hour, read and counted right here;
 *   الأثر   what today has left so far.
 * Then the Quran, your adhkar, a few tools, and the verse of the day.
 * Amiri carries the titles and the texts; one ornament (✦) and few boxes.
 */

const DAILY_ADHKAR = ["morning", "evening", "sleep"] as const;
const ADHKAR_TITLE: Record<string, string> = { morning: "أذكار الصباح", evening: "أذكار المساء", sleep: "أذكار النوم" };
const NEXT_ADHKAR: Record<string, string> = {
  morning: "أذكار المساء بعد العصر",
  evening: "أذكار النوم قبل أن تنام",
  sleep: "أذكار الصباح بعد الفجر",
};
const STRIP_DEFAULT = [
  "morning", "evening", "sleep", "post_prayer", "waking", "essentials", "salawat",
  "istighfar_100", "prophetic_duas", "quranic_duas", "ruqyah", "mosque", "home", "food",
];

function dailyIndex(key: string, length: number): number {
  let hash = 7;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return length ? hash % length : 0;
}

function parseMinutes(raw: string | undefined): number | null {
  const m = /(\d{1,2}):(\d{2})/.exec(raw ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    const onVisible = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}

function useRadio() {
  const [state, setState] = React.useState(getRadioState);
  React.useEffect(() => subscribeRadio(() => setState(getRadioState())), []);
  return state;
}

function sectionCounts(section: Section | undefined, progress: Record<string, unknown>) {
  return (section?.content ?? []).map((item, i) => {
    const target = coerceCount(item.count);
    const have = Math.min(target, Math.max(0, Number(progress[dhikrStateKey(section!.id, i, item.id)]) || 0));
    return { target, have };
  });
}

function shareOf(counts: Array<{ target: number; have: number }>): number {
  const total = counts.reduce((s, c) => s + c.target, 0);
  return total ? counts.reduce((s, c) => s + c.have, 0) / total : 0;
}

function streakLabel(days: number): string {
  if (days === 1) return "أول يوم في سلسلتك";
  if (days === 2) return "يومان متتاليان";
  if (days <= 10) return `${arNum(days)} أيام متتالية`;
  return `${arNum(days)} يومًا متتاليًا`;
}

function Ornament() {
  return <span className="nh-orn" aria-hidden="true">✦</span>;
}

function Heading({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="nh-head">
      <h2 className="nh-h">
        <Ornament />
        {title}
      </h2>
      {aside}
    </div>
  );
}

/* ── I. The sky ───────────────────────────────────────────────────── */

const SKY_W = 340;
const SKY_H = 112;
const SKY_PAD = 12;
const HORIZON = 76;
const AMP = 58;

function SkyArc({ timings, nowMin, nextKey, prayed }: {
  timings: PrayerTimings;
  nowMin: number;
  nextKey: string;
  prayed: Record<string, boolean>;
}) {
  const uid = React.useId().replace(/:/g, "");
  const fajr = parseMinutes(timings.Fajr);
  const sunrise = parseMinutes(timings.Sunrise);
  const maghrib = parseMinutes(timings.Maghrib);
  const isha = parseMinutes(timings.Isha);
  if (fajr == null || sunrise == null || maghrib == null || isha == null || maghrib <= sunrise) return null;

  const start = fajr - 40;
  const end = isha + 40;
  const x = (t: number) => SKY_W - SKY_PAD - ((t - start) / (end - start)) * (SKY_W - 2 * SKY_PAD);
  const h = (t: number) => Math.sin((Math.PI * (t - sunrise)) / (maghrib - sunrise));
  const y = (t: number) => HORIZON - h(t) * AMP;
  const line = (from: number, to: number, steps = 48) => {
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = from + ((to - from) * i) / steps;
      d += `${i ? "L" : "M"}${x(t).toFixed(1)},${y(t).toFixed(1)}`;
    }
    return d;
  };
  const at = Math.min(end, Math.max(start, nowMin));
  const day = `M${x(sunrise).toFixed(1)},${HORIZON} ${line(sunrise, maghrib).replace(/^M/, "L")} L${x(maghrib).toFixed(1)},${HORIZON} Z`;
  const isDay = h(at) > -0.03;
  const sx = x(at);
  const sy = y(at);

  return (
    <svg className="nh-sky" viewBox={`0 0 ${SKY_W} ${SKY_H}`} role="img" aria-label="مسار الشمس اليوم ومواقيت الصلاة">
      <defs>
        <linearGradient id={`d${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--nh-sun)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--nh-sun)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`g${uid}`}>
          <stop offset="0" stopColor="var(--nh-sun)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--nh-sun)" stopOpacity="0" />
        </radialGradient>
        <mask id={`m${uid}`}>
          <rect x="0" y="0" width={SKY_W} height={SKY_H} fill="white" />
          <circle cx={sx + 3.6} cy={sy - 2.8} r="6.6" fill="black" />
        </mask>
      </defs>
      <path d={day} fill={`url(#d${uid})`} />
      <line x1="0" x2={SKY_W} y1={HORIZON} y2={HORIZON} className="nh-sky-horizon" />
      <path d={line(at, end)} className="nh-sky-future" />
      <path d={line(start, at)} className="nh-sky-past" />
      <line x1={x(sunrise)} x2={x(sunrise)} y1={HORIZON - 3} y2={HORIZON + 3} className="nh-sky-tick" />
      {PRAYER_KEYS.map((key) => {
        const t = parseMinutes(timings[key]);
        if (t == null) return null;
        const isNext = key === nextKey && t > nowMin;
        return (
          <circle
            key={key}
            cx={x(t)}
            cy={y(t)}
            r={isNext ? 4.6 : 3.4}
            className={`nh-sky-dot${prayed[key] ? " is-prayed" : ""}${isNext ? " is-next" : ""}`}
          />
        );
      })}
      {isDay ? (
        <g className="nh-sun">
          <circle cx={sx} cy={sy} r="17" fill={`url(#g${uid})`} />
          <circle cx={sx} cy={sy} r="6.5" fill="var(--nh-sun)" />
        </g>
      ) : (
        <circle cx={sx} cy={sy} r="8" className="nh-moon" mask={`url(#m${uid})`} />
      )}
    </svg>
  );
}

function SkyHero({ hijri }: { hijri: string }) {
  const navigate = useNavigate();
  const now = useNow();
  const today = useTodayKey();
  const prayedToday = useNoorStore((s) => s.prayerLog[today]);
  const setPrayerLogged = useNoorStore((s) => s.setPrayerLogged);
  const haptics = useNoorStore((s) => s.prefs.enableHaptics);
  const { data, isLoading } = usePrayerTimes();
  const timings = data?.data?.timings as PrayerTimings | undefined;
  const schedule = React.useMemo(() => (timings ? buildPrayerSchedule(timings, now) : null), [timings, now]);
  const prayed = prayedToday ?? {};
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isFriday = now.getDay() === 5;
  const weekday = new Intl.DateTimeFormat("ar", { weekday: "long" }).format(now);

  const meta = (
    <div className="nh-hero-meta">
      <span>{hijri ? `${weekday}، ${hijri}` : weekday}</span>
      {isFriday ? <span className="nh-hero-friday">جمعة مباركة</span> : null}
    </div>
  );

  if (!schedule || !timings) {
    return (
      <section className="nh-hero">
        {meta}
        <button type="button" className="nh-hero-main nh-press" onClick={() => navigate("/prayer-times")}>
          <span className="nh-eyebrow">مواقيت الصلاة</span>
          <span className="nh-hero-name">{isLoading ? "لحظات…" : "حدّد مدينتك"}</span>
          <span className="nh-hero-until">لتظهر الصلاة القادمة ومسار يومك هنا</span>
        </button>
      </section>
    );
  }

  const nextKey = schedule.next.name;
  const untilSec = Math.max(0, (schedule.next.at.getTime() - now.getTime()) / 1000);
  const clock = ufuqClock(timings[nextKey] ?? "");

  return (
    <section className="nh-hero" aria-label="السماء اليوم">
      {meta}
      <button
        type="button"
        className="nh-hero-main nh-press"
        onClick={() => {
          trackUxEvent("home_new:prayer");
          navigate("/prayer-times");
        }}
      >
        <span className="nh-eyebrow">
          الصلاة القادمة · {clock.time} {clock.period === "ص" ? "صباحًا" : "مساءً"}
        </span>
        <span className="nh-hero-name">{schedule.next.label}</span>
        <span className="nh-hero-until">{untilLabel(untilSec)}</span>
      </button>
      <SkyArc timings={timings} nowMin={nowMin} nextKey={nextKey} prayed={prayed} />
      <div className="nh-prayers" role="group" aria-label="صلوات اليوم: اضغط على ما صلّيته">
        {schedule.primary.map((prayer) => {
          const t = parseMinutes(timings[prayer.name]);
          const due = t != null && t <= nowMin;
          const done = Boolean(prayed[prayer.name]);
          const isNext = prayer.name === nextKey && !due;
          return (
            <button
              key={prayer.name}
              type="button"
              disabled={!due}
              aria-pressed={due ? done : undefined}
              aria-label={due ? `${prayer.label}: ${done ? "صلّيتها" : "لم تُسجَّل بعد"}` : `${prayer.label} لم يحن وقتها`}
              className={`nh-prayer${due ? " is-due" : ""}${done ? " is-done" : ""}${isNext ? " is-next" : ""}`}
              onClick={() => {
                setPrayerLogged(today, prayer.name, !done);
                if (haptics) vibrate(done ? 8 : [12, 30, 12]);
              }}
            >
              <span className="nh-prayer-mark" aria-hidden="true">{done ? <Check size={12} strokeWidth={3} /> : null}</span>
              <span className="nh-prayer-name">{prayer.label}</span>
              <span className="nh-prayer-time">{ufuqClock(timings[prayer.name] ?? "").time}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ── II. The wird of the hour ─────────────────────────────────────── */

function WirdNow({ sections }: { sections: Section[] }) {
  const navigate = useNavigate();
  const now = useNow(60_000);
  const action = getHomeAdhkarAction(now.getHours());
  const section = sections.find((s) => s.id === action.id);
  const progress = useNoorStore((s) => s.progress);
  const increment = useNoorStore((s) => s.increment);
  const haptics = useNoorStore((s) => s.prefs.enableHaptics);
  const counts = React.useMemo(() => sectionCounts(section, progress), [section, progress]);
  const index = counts.findIndex((c) => c.have < c.target);
  // Opened for one dhikr only: counting it to the end folds the next one again.
  const [expandedAt, setExpandedAt] = React.useState<number | null>(null);
  const expanded = expandedAt === index;
  if (!section || !counts.length) return null;

  const title = ADHKAR_TITLE[section.id] ?? section.title;
  const share = shareOf(counts);
  const open = (focus?: number) => navigate(focus == null ? `/c/${section.id}` : `/c/${section.id}?focus=${focus}`);

  if (index < 0) {
    return (
      <section className="nh-wird is-done" aria-label={title}>
        <div className="nh-wird-done-mark" aria-hidden="true"><Check size={22} strokeWidth={2.6} /></div>
        <div className="nh-wird-title">تمّت {title}</div>
        <p className="nh-wird-dua">تقبّل الله منك</p>
        <div className="nh-wird-next">التالي: {NEXT_ADHKAR[section.id] ?? "تصفّح أذكارك"}</div>
        <button type="button" className="nh-link nh-press" onClick={() => open()}>
          افتح {title} <ArrowLeft size={14} aria-hidden="true" />
        </button>
      </section>
    );
  }

  const item = section.content[index]!;
  const { target, have } = counts[index]!;
  const long = item.text.length > 230;
  const ring = 2 * Math.PI * 27;

  return (
    <section className="nh-wird" aria-label={title}>
      <div className="nh-wird-top">
        <button type="button" className="nh-wird-title nh-press" onClick={() => open()}>{title}</button>
        <span className="nh-wird-count">الذكر {arNum(index + 1)} من {arNum(counts.length)}</span>
      </div>
      <div className="nh-bar" aria-hidden="true"><span style={{ width: `${Math.round(share * 100)}%` }} /></div>
      <p key={index} className={`nh-wird-text${long && !expanded ? " is-clamped" : ""}`}>{item.text}</p>
      {long ? (
        <button type="button" className="nh-more-text" onClick={() => setExpandedAt(expanded ? null : index)} aria-expanded={expanded}>
          {expanded ? "أقل" : "اقرأه كاملًا"}
          <ChevronDown size={14} aria-hidden="true" style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
        </button>
      ) : null}
      <div className="nh-wird-actions">
        <button type="button" className="nh-link nh-press" onClick={() => open(index)}>
          في صفحة الأذكار <ArrowLeft size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="nh-counter nh-press"
          aria-label={target > 1 ? `عدّ: ${arNum(have)} من ${arNum(target)}` : "قرأته"}
          onClick={() => {
            const next = increment({ sectionId: section.id, index, target, itemId: item.id });
            if (haptics) vibrate(next >= target ? [14, 40, 14] : 10);
          }}
        >
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" className="nh-counter-track" />
            <circle
              cx="32"
              cy="32"
              r="27"
              className="nh-counter-arc"
              strokeDasharray={ring}
              strokeDashoffset={ring * (1 - have / target)}
              transform="rotate(-90 32 32)"
            />
          </svg>
          <span className="nh-counter-label">
            {target > 1 ? (
              <>
                <b>{arNum(have)}</b>
                <small>/{arNum(target)}</small>
              </>
            ) : (
              <b className="nh-counter-once">قرأته</b>
            )}
          </span>
        </button>
      </div>
    </section>
  );
}

/* ── III. Today's trace ───────────────────────────────────────────── */

function TodayTrace({ sections }: { sections: Section[] }) {
  const navigate = useNavigate();
  const today = useTodayKey();
  const prayerLog = useNoorStore((s) => s.prayerLog);
  const progress = useNoorStore((s) => s.progress);
  const activity = useNoorStore((s) => s.activity);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const quranGoalPref = useNoorStore((s) => s.prefs.quranDailyGoal);
  const tasbeehDailyLog = useNoorStore((s) => s.tasbeehDailyLog);
  const tasbeehGoalPref = useNoorStore((s) => s.prefs.tasbeehDailyGoal);
  const sebhaTarget = useNoorStore((s) => s.sebhaTarget);

  const prayers = PRAYER_KEYS.filter((p) => prayerLog[today]?.[p]).length;
  const adhkarDone = DAILY_ADHKAR.filter((id) => {
    const counts = sectionCounts(sections.find((s) => s.id === id), progress);
    return counts.length > 0 && counts.every((c) => c.have >= c.target);
  }).length;
  const quranRead = Number(quranDailyAyahs[today] ?? 0);
  const quranGoal = quranGoalPref > 0 ? quranGoalPref : 10;
  const tasbeeh = Object.values(tasbeehDailyLog[today] ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const tasbeehGoal = tasbeehGoalPref && tasbeehGoalPref > 0 ? tasbeehGoalPref : sebhaTarget || 100;

  const streak = React.useMemo(() => {
    let s = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 3650; i++) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!((activity[k] ?? 0) > 0)) break;
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [activity]);

  const cells = [
    { label: "الصلوات", value: prayers, of: 5, share: prayers / 5 },
    { label: "الأذكار", value: adhkarDone, of: 3, share: adhkarDone / 3 },
    { label: "آيات", value: quranRead, of: quranGoal, share: quranRead / quranGoal },
    { label: "تسبيحة", value: tasbeeh, of: tasbeehGoal, share: tasbeeh / tasbeehGoal },
  ];

  return (
    <section aria-labelledby="nh-trace">
      <Heading
        title="أثرك اليوم"
        aside={streak > 0 ? <span className="nh-streak">{streakLabel(streak)}</span> : null}
      />
      <button type="button" id="nh-trace" className="nh-trace nh-press" onClick={() => navigate("/insights")} aria-label="أثرك اليوم: افتح رؤيتي">
        {cells.map((c) => (
          <span key={c.label} className={`nh-trace-cell${c.share >= 1 ? " is-full" : ""}`}>
            <span className="nh-trace-value">
              <b>{arNum(c.value)}</b>
              <small>/{arNum(c.of)}</small>
            </span>
            <span className="nh-trace-label">{c.label}</span>
            <span className="nh-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round(c.share * 100))}%` }} /></span>
          </span>
        ))}
      </button>
    </section>
  );
}

/* ── IV. The Quran ────────────────────────────────────────────────── */

function QuranCard() {
  const navigate = useNavigate();
  const mushafPage = useNoorStore((s) => s.prefs.quranMushafPage);
  const lastRead = useNoorStore((s) => s.quranLastRead);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);
  const lastListen = useListenStore((s) => s.history[0]);
  const radio = useRadio();
  const isFriday = new Date().getDay() === 5;

  const surahName = lastRead ? SURAH_NAMES[lastRead.surahId - 1] : undefined;
  const title = surahName ? `سورة ${surahName}` : "المصحف الشريف";
  const sub = lastRead
    ? `الآية ${arNum(lastRead.ayahIndex)}${mushafPage ? ` · الصفحة ${arNum(mushafPage)}` : ""}`
    : mushafPage
      ? `الصفحة ${arNum(mushafPage)}`
      : "ابدأ من الفاتحة";
  const khatma = khatmaStartISO && khatmaDays
    ? Math.min(100, Math.round((countCompletedKhatmaDays(khatmaStartISO, khatmaDays, khatmaDone) / khatmaDays) * 100))
    : null;
  const resume = () => {
    trackUxEvent("home_new:quran");
    navigate(mushafPage ? `/quran/page/${mushafPage}` : lastRead ? `/quran/read/${lastRead.surahId}?a=${lastRead.ayahIndex}` : "/quran/page/1");
  };

  return (
    <section aria-labelledby="nh-quran">
      <Heading
        title="القرآن"
        aside={
          isFriday && lastRead?.surahId !== 18 ? (
            <button type="button" className="nh-aside-link" onClick={() => navigate("/quran/read/18")}>
              الجمعة: سورة الكهف
            </button>
          ) : (
            <button type="button" className="nh-aside-link" onClick={() => navigate("/quran")}>الفهرس</button>
          )
        }
      />
      <div className="nh-quran">
        <button type="button" id="nh-quran" className="nh-banner nh-press" onClick={resume} aria-label={`تابع القراءة: ${title}، ${sub}`}>
          <span className="nh-banner-name">
            <Ornament />
            {title}
            <Ornament />
          </span>
          <span className="nh-banner-sub">{sub}</span>
        </button>
        {khatma != null ? (
          <button type="button" className="nh-khatma" onClick={() => navigate("/quran/plans")}>
            <span>ختمتك</span>
            <span className="nh-bar" aria-hidden="true"><span style={{ width: `${khatma}%` }} /></span>
            <span>{arNum(khatma)}٪</span>
          </button>
        ) : null}
        <div className="nh-quran-actions">
          <button type="button" className="nh-primary nh-press" onClick={resume}>
            <BookOpen size={17} aria-hidden="true" /> {lastRead || mushafPage ? "تابع القراءة" : "ابدأ القراءة"}
          </button>
          <button
            type="button"
            className="nh-round nh-press"
            aria-label={lastListen ? `أكمل الاستماع: ${lastListen.track.title}` : "السماع"}
            onClick={() => (lastListen ? playTrack(lastListen.track, { resume: true }) : navigate("/listen"))}
          >
            <Headphones size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`nh-round nh-press${radio.playing ? " is-live" : ""}`}
            aria-label={radio.playing ? "إيقاف إذاعة القرآن" : "إذاعة القرآن"}
            aria-pressed={radio.playing}
            onClick={() => toggleRadio()}
          >
            <Radio size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── V. Your adhkar ───────────────────────────────────────────────── */

function AdhkarShelf({ sections }: { sections: Section[] }) {
  const navigate = useNavigate();
  const progress = useNoorStore((s) => s.progress);
  const order = useNoorStore((s) => s.prefs.homeStripOrder);
  const byId = React.useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const ids = (order?.length ? order : STRIP_DEFAULT).filter((id) => byId.has(id)).slice(0, 14);

  return (
    <section aria-labelledby="nh-shelf">
      <Heading
        title="أذكارك"
        aside={
          <button type="button" className="nh-aside-link" onClick={() => navigate("/explore")}>
            الأقسام كلها ({arNum(sections.length)})
          </button>
        }
      />
      <div className="nh-shelf" id="nh-shelf">
        {ids.map((id) => {
          const section = byId.get(id)!;
          const identity = getSectionIdentity(id);
          const share = shareOf(sectionCounts(section, progress));
          return (
            <button
              key={id}
              type="button"
              className="nh-book nh-press"
              style={{ "--book": identity.accent } as React.CSSProperties}
              onClick={() => {
                trackUxEvent(`home_new:shelf:${id}`);
                navigate(`/c/${id}`);
              }}
            >
              <span className="nh-book-icon" aria-hidden="true">{identity.icon}</span>
              <span className="nh-book-title">{section.title}</span>
              <span className="nh-book-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(share * 100)}%` }} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ── VI. Tools ────────────────────────────────────────────────────── */

const TOOLS = [
  { label: "السبحة", route: "/sebha", Icon: CircleDot },
  { label: "القبلة", route: "/qibla", Icon: Compass },
  { label: "الأدعية", route: "/duas", Icon: HandHeart },
  { label: "جدول الورد", route: "/wird", Icon: CalendarCheck },
  { label: "المحاسبة", route: "/muhasaba", Icon: Scale },
] as const;

function Tools() {
  const navigate = useNavigate();
  return (
    <nav className="nh-tools" aria-label="أدوات">
      {TOOLS.map(({ label, route, Icon }) => (
        <button
          key={route}
          type="button"
          className="nh-tool nh-press"
          onClick={() => {
            trackUxEvent(`home_new:tool:${route}`);
            navigate(route);
          }}
        >
          <span className="nh-tool-icon"><Icon size={21} aria-hidden="true" /></span>
          {label}
        </button>
      ))}
    </nav>
  );
}

/* ── VII. The verse of the day ────────────────────────────────────── */

function VerseOfDay() {
  const navigate = useNavigate();
  const today = useTodayKey();
  const verse = DAILY_VERSES[dailyIndex(today, DAILY_VERSES.length)];
  if (!verse) return null;
  const ref = `${verse.surahName}، الآية ${arNum(verse.ayahIndex)}`;
  return (
    <section className="nh-verse" aria-label="آية اليوم">
      <div className="nh-verse-rule" aria-hidden="true"><span /><Ornament /><span /></div>
      <div className="nh-eyebrow">آية اليوم</div>
      <button type="button" className="nh-verse-text" onClick={() => navigate(`/quran/read/${verse.surahId}?a=${verse.ayahIndex}`)}>
        ﴿{verse.arabic}﴾
      </button>
      <div className="nh-verse-foot">
        <span>{ref}</span>
        <button type="button" className="nh-verse-share" aria-label="مشاركة الآية" onClick={() => void shareText(`﴿${verse.arabic}﴾\n— ${ref}`)}>
          <Share2 size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function ClassicNewHomePage() {
  const { data, isLoading, isFetching, error, refetch } = useAdhkarDB();
  useStartupReady(!isLoading);
  useScrollRestoration();
  const sections = React.useMemo(() => data?.db.sections ?? [], [data]);
  const prayerTimes = usePrayerTimes();
  const hijriData = prayerTimes.data?.data?.date?.hijri;
  const hijri = hijriData ? formatPrayerHijriDate(hijriData) : "";

  React.useEffect(() => {
    document.title = "أثر";
  }, []);

  if (!data) {
    return <AdhkarLoadStatus hasData={false} error={error ?? true} isFetching={isFetching} onRetry={() => { void refetch(); }} />;
  }

  return (
    <div className="nh page-enter">
      <AdhkarLoadStatus hasData error={error} isFetching={isFetching} onRetry={() => { void refetch(); }} />
      <SkyHero hijri={hijri} />
      <WirdNow sections={sections} />
      <TodayTrace sections={sections} />
      <QuranCard />
      <AdhkarShelf sections={sections} />
      <Tools />
      <VerseOfDay />
    </div>
  );
}
