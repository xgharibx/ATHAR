/**
 * «اليوم» — the home screen of «أفق».
 *
 * One idea per block, top to bottom, in the order a day is lived:
 *   the date and a greeting → the sky and the coming prayer → today's path
 *   (adhkar, wird, tasbeeh, prayers) → the verse of the day → carry on
 *   reading → the collections → everything else.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Compass, HandHeart, Library, MapPin, MessageCircle, Share2, Sparkles } from "lucide-react";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useStartupReady } from "@/hooks/useStartupReady";
import { usePrayerTimes, formatPrayerHijriDate } from "@/hooks/usePrayerTimes";
import { useTodayKey } from "@/hooks/useTodayKey";
import { useCurrentHour } from "@/hooks/useCurrentHour";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useNoorStore } from "@/store/noorStore";
import { buildPrayerSchedule, type PrayerTimings } from "@/lib/prayerSchedule";
import { formatHijri, getTodayIslamicInfo } from "@/lib/hijri";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { dhikrStateKey } from "@/lib/dhikrItemIdentity";
import { coerceCount, type Section } from "@/data/types";
import { DAILY_VERSES } from "@/data/dailyVerses";
import { SURAH_NAMES } from "@/lib/surahNames";
import { arNum } from "@/lib/formatNumber";
import { shareText } from "@/lib/shareTargets";
import { getHomeAdhkarAction } from "@/lib/homeTimeActions";
import { trackUxEvent } from "@/lib/uxMetrics";
import { useGardenGrowth } from "@/components/ufuq/garden/useGardenGrowth";
import { PRAYER_KEYS, skyPhaseFor, ufuqClock, ufuqGreeting, untilLabel } from "@/components/ufuq/ufuqTime";

function dailyIndex(key: string, length: number): number {
  let hash = 7;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return length ? hash % length : 0;
}

function useNow(intervalMs = 30_000) {
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

function useSectionPercent(section: Section | undefined) {
  const progress = useNoorStore((s) => s.progress);
  return React.useMemo(() => {
    if (!section) return 0;
    let done = 0;
    let total = 0;
    section.content.forEach((item, i) => {
      const target = coerceCount(item.count);
      total += target;
      done += Math.min(Math.max(0, Number(progress[dhikrStateKey(section.id, i, item.id)]) || 0), target);
    });
    return total ? Math.round((done / total) * 100) : 0;
  }, [progress, section]);
}

function Sky() {
  const navigate = useNavigate();
  const now = useNow();
  const { data, isLoading } = usePrayerTimes();
  const timings = data?.data?.timings as PrayerTimings | undefined;
  const schedule = React.useMemo(() => (timings ? buildPrayerSchedule(timings, now) : null), [timings, now]);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const phase = skyPhaseFor(minutesNow, timings);
  const night = phase === "isha" || phase === "fajr";

  if (!schedule) {
    return (
      <button type="button" className="u-sky u-card-press w-full text-start" data-phase={phase} onClick={() => navigate("/prayer-times")}>
        {night ? <span className="u-sky-stars" aria-hidden="true" /> : null}
        <div className="u-sky-label">مواقيت الصلاة</div>
        <div className="u-sky-name" style={{ fontSize: 30 }}>{isLoading ? "لحظات…" : "حدّد مدينتك"}</div>
        <div className="u-sky-time">لتظهر الصلاة القادمة ووقتها هنا</div>
        <span className="u-sky-count">افتح المواقيت <ArrowLeft size={14} aria-hidden="true" /></span>
      </button>
    );
  }

  const nextKey = schedule.next.name;
  const nextIndex = PRAYER_KEYS.indexOf(nextKey);
  return (
    <button
      type="button"
      className="u-sky u-card-press w-full text-start"
      data-phase={phase}
      onClick={() => {
        trackUxEvent("ufuq_home:sky");
        navigate("/prayer-times");
      }}
      aria-label={`الصلاة القادمة ${schedule.next.label} ${untilLabel(schedule.diffSec)}`}
    >
      {night ? <span className="u-sky-stars" aria-hidden="true" /> : null}
      <div className="u-sky-label">الصلاة القادمة</div>
      <div className="u-sky-name">{schedule.next.label}</div>
      <div className="u-sky-time u-num">
        {(() => {
          const clock = ufuqClock(timings?.[nextKey] ?? "");
          return <>{clock.time} <span className="opacity-75">{clock.period === "ص" ? "صباحًا" : "مساءً"}</span></>;
        })()}
      </div>
      <span className="u-sky-count">{untilLabel(schedule.diffSec)}</span>
      <div className="u-sky-track" aria-hidden="true">
        {schedule.primary.map((prayer, i) => (
          <div
            key={prayer.name}
            className={`u-sky-slot ${prayer.name === nextKey ? "is-next" : nextIndex > 0 && i < nextIndex ? "is-past" : ""}`}
          >
            {prayer.label}
            <b className="u-num">{ufuqClock(timings?.[prayer.name] ?? "").time}</b>
          </div>
        ))}
      </div>
    </button>
  );
}

function PathRow(props: {
  title: string;
  sub: string;
  percent: number;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  const done = props.percent >= 100;
  return (
    <button type="button" className="u-path-row" onClick={props.onClick}>
      <span
        className={`u-ring ${done ? "is-done" : ""}`}
        style={{ ["--p" as string]: Math.min(100, Math.max(0, props.percent)) }}
        aria-hidden="true"
      >
        {done ? <Check size={18} strokeWidth={2.4} /> : props.icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="u-path-title block">{props.title}</span>
        <span className="u-path-sub block">{props.sub}</span>
      </span>
      <ArrowLeft size={16} className="opacity-35 shrink-0" aria-hidden="true" />
    </button>
  );
}

function TodayPath({ sections }: { sections: Section[] }) {
  const navigate = useNavigate();
  const hour = useCurrentHour();
  const today = useTodayKey();
  const action = getHomeAdhkarAction(hour);
  const adhkarSection = sections.find((s) => s.id === action.id);
  const adhkarPercent = useSectionPercent(adhkarSection);

  const tasbeehDailyLog = useNoorStore((s) => s.tasbeehDailyLog);
  const sebhaTarget = useNoorStore((s) => s.sebhaTarget);
  const dailyGoal = useNoorStore((s) => s.prefs.tasbeehDailyGoal);
  const mushafPage = useNoorStore((s) => s.prefs.quranMushafPage);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);
  const quranGoal = useNoorStore((s) => s.prefs.quranDailyGoal);
  const prayerLog = useNoorStore((s) => s.prayerLog);

  const tasbeehToday = React.useMemo(
    () => Object.values(tasbeehDailyLog[today] ?? {}).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [tasbeehDailyLog, today],
  );
  const tasbeehGoal = dailyGoal && dailyGoal > 0 ? dailyGoal : sebhaTarget || 100;
  const ayahsToday = Number(quranDailyAyahs[today] ?? 0);
  const ayahGoal = quranGoal > 0 ? quranGoal : 10;
  const prayed = PRAYER_KEYS.filter((p) => prayerLog[today]?.[p]).length;

  const adhkarTitle = action.id === "morning" ? "أذكار الصباح" : action.id === "evening" ? "أذكار المساء" : "أذكار النوم";

  return (
    <div className="u-card u-path">
      <PathRow
        title={adhkarTitle}
        sub={adhkarPercent >= 100 ? "اكتملت، تقبّل الله" : adhkarPercent > 0 ? `أنجزت ${arNum(adhkarPercent)}٪` : "لم تبدأ بعد"}
        percent={adhkarPercent}
        icon={<Sparkles size={17} />}
        onClick={() => navigate(`/c/${action.id}`)}
      />
      <PathRow
        title="وِرد القرآن"
        sub={ayahsToday > 0 ? `${arNum(ayahsToday)} من ${arNum(ayahGoal)} آيات اليوم` : mushafPage ? `تابع من الصفحة ${arNum(mushafPage)}` : "ابدأ من الفاتحة"}
        percent={Math.round((ayahsToday / ayahGoal) * 100)}
        icon={<BookOpen size={17} />}
        onClick={() => navigate(mushafPage ? `/mushaf/${mushafPage}` : "/mushaf/1")}
      />
      <PathRow
        title="التسبيح"
        sub={`${arNum(tasbeehToday)} من ${arNum(tasbeehGoal)}`}
        percent={Math.round((tasbeehToday / tasbeehGoal) * 100)}
        icon={<span className="text-[13px] font-bold u-num">{arNum(Math.min(99, tasbeehToday))}</span>}
        onClick={() => navigate("/sebha")}
      />
      <PathRow
        title="الصلوات"
        sub={prayed === 5 ? "صلّيت الخمس، الحمد لله" : `سجّلت ${arNum(prayed)} من ٥`}
        percent={prayed * 20}
        icon={<span className="text-[13px] font-bold u-num">{arNum(prayed)}</span>}
        onClick={() => navigate("/prayer-times")}
      />
    </div>
  );
}

/** In the garden: what today's remembrance has planted, and why. */
function GardenGrowthCard() {
  const navigate = useNavigate();
  const growth = useGardenGrowth();
  const planted = Math.max(0, growth.planted);
  return (
    <div className="u-card u-growth">
      <div className="u-growth-head">
        <span className="u-growth-count u-num">{arNum(planted)}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold">
            {planted === 0 ? "حديقتك تنتظر غرسك" : planted === 1 ? "زهرة غرستها اليوم" : planted === 2 ? "زهرتان غرستهما اليوم" : planted <= 10 ? "زهرات غرستها اليوم" : "زهرة غرستها اليوم"}
          </span>
          <span className="block text-[12.5px] text-(--muted) mt-0.5">كل تسبيحة وذكر تُنبت زهرة في الحديقة خلفك</span>
        </span>
        <button type="button" className="u-pill-btn" onClick={() => navigate("/sebha")}>سبِّح</button>
      </div>
      <div className="u-growth-fruits">
        <span className={`u-growth-fruit ${growth.palmFruit ? "is-on" : ""}`}>
          {growth.palmFruit ? `النخلة تُثمر · ${arNum(growth.streak)} أيام متتالية` : "النخلة تُثمر بعد ٣ أيام متتالية"}
        </span>
        <span className={`u-growth-fruit ${growth.treeFruit ? "is-on" : ""}`}>
          {growth.treeFruit ? "الرمّان أثمر: أتممت وِردك" : "الرمّان يُثمر حين تُتمّ وِردك"}
        </span>
      </div>
      <blockquote className="u-growth-hadith">
        «…وأخبِرْهم أنّ الجنةَ طيّبةُ التُّربة، عذبةُ الماء، وأنّها قِيعان، وأنّ غِراسَها: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر»
        <cite>رواه الترمذي (٣٤٦٢)، وحسّنه الألباني</cite>
      </blockquote>
    </div>
  );
}

function VerseOfTheDay() {
  const navigate = useNavigate();
  const today = useTodayKey();
  const verse = DAILY_VERSES[dailyIndex(today, DAILY_VERSES.length)];
  if (!verse) return null;
  const ref = `${verse.surahName} · ${arNum(verse.ayahIndex)}`;
  return (
    <figure className="u-card u-verse">
      <figcaption className="u-verse-mark">آية اليوم</figcaption>
      <blockquote className="u-verse-text">{verse.arabic}</blockquote>
      <div className="u-verse-ref">{ref}</div>
      {verse.meaning ? <p className="mt-3 text-[13.5px] leading-7 text-(--muted)">{verse.meaning}</p> : null}
      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          type="button"
          className="u-pill-btn is-quiet"
          onClick={() => navigate(`/mushaf?surah=${verse.surahId}&ayah=${verse.ayahIndex}`)}
        >
          <BookOpen size={16} aria-hidden="true" />
          في المصحف
        </button>
        <button
          type="button"
          className="u-pill-btn is-quiet"
          aria-label="مشاركة الآية"
          onClick={() => void shareText(`﴿${verse.arabic}﴾\n— ${ref}`)}
        >
          <Share2 size={16} aria-hidden="true" />
          مشاركة
        </button>
      </div>
    </figure>
  );
}

function ContinueReading() {
  const navigate = useNavigate();
  const lastRead = useNoorStore((s) => s.quranLastRead);
  const page = useNoorStore((s) => s.prefs.quranMushafPage);
  if (!page && !lastRead) return null;
  const surah = lastRead ? SURAH_NAMES[lastRead.surahId - 1] : null;
  const percent = page ? Math.round((page / 604) * 100) : 0;
  return (
    <button
      type="button"
      className="u-card u-card-press w-full p-4 text-start flex items-center gap-4"
      onClick={() => navigate(page ? `/mushaf/${page}` : "/quran")}
    >
      <span className="u-tile-icon" aria-hidden="true"><BookOpen size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="u-eyebrow block">تابع القراءة</span>
        <span className="block text-[16px] font-semibold mt-0.5">
          {surah ? `سورة ${surah}` : "المصحف"}
          {page ? <span className="text-(--muted) font-medium"> · صفحة {arNum(page)}</span> : null}
        </span>
        {page ? (
          <span className="u-progress block mt-2.5" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
        ) : null}
      </span>
      <ArrowLeft size={16} className="opacity-35 shrink-0" aria-hidden="true" />
    </button>
  );
}

function CollectionCard({ section }: { section: Section }) {
  const navigate = useNavigate();
  const identity = getSectionIdentity(section.id);
  const percent = useSectionPercent(section);
  return (
    <button type="button" className="u-card u-card-press u-collection" onClick={() => navigate(`/c/${section.id}`)}>
      <span className="u-collection-icon" aria-hidden="true">{identity.icon}</span>
      <span className="u-collection-title block">{section.title}</span>
      <span className="u-collection-bar block" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
    </button>
  );
}

const FEATURED_SECTIONS = ["morning", "evening", "sleep", "post_prayer", "waking", "salaah", "tasabeeh", "friday", "mosque", "home", "salawat", "istikhara"];

const TILES = [
  { path: "/qibla", title: "القبلة", sub: "بوصلة دقيقة", icon: Compass },
  { path: "/hadith", title: "الأحاديث", sub: "الكتب الستة", icon: Library },
  { path: "/duas", title: "الأدعية", sub: "من القرآن والسنة", icon: HandHeart },
  { path: "/mosques", title: "المساجد", sub: "الأقرب إليك", icon: MapPin },
] as const;

export function UfuqHome() {
  const navigate = useNavigate();
  useScrollRestoration();
  const { data, isLoading } = useAdhkarDB();
  useStartupReady(!isLoading);
  const hour = useCurrentHour();
  const prayer = usePrayerTimes();
  const sections = React.useMemo(() => data?.db.sections ?? [], [data]);
  const garden = useNoorStore((s) => (s.prefs.ufuqLook ?? "garden") === "garden");

  const hijri = React.useMemo(() => {
    const fromApi = formatPrayerHijriDate(prayer.data?.data?.date?.hijri);
    if (fromApi) return fromApi;
    try {
      return formatHijri(getTodayIslamicInfo().hijri);
    } catch {
      return "";
    }
  }, [prayer.data]);

  const gregorian = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("ar-EG-u-nu-arab", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  const strip = React.useMemo(() => {
    const byId = new Map(sections.map((s) => [s.id, s]));
    const featured = FEATURED_SECTIONS.map((id) => byId.get(id)).filter((s): s is Section => Boolean(s));
    const rest = sections.filter((s) => !FEATURED_SECTIONS.includes(s.id));
    return [...featured, ...rest].slice(0, 12);
  }, [sections]);

  return (
    <div className="u-home">
      <header className="u-home-head">
        <div className="u-home-date">
          <span>{gregorian}</span>
          {hijri ? <i aria-hidden="true" /> : null}
          {hijri ? <span>{hijri}</span> : null}
        </div>
        <h1 className="u-display mt-2">{ufuqGreeting(hour)}</h1>
      </header>

      <Sky />

      <div className="u-section-head">
        <h2>مسار اليوم</h2>
      </div>
      <TodayPath sections={sections} />

      {garden ? (
        <>
          <div className="u-section-head">
            <h2>حديقتك</h2>
          </div>
          <GardenGrowthCard />
        </>
      ) : null}

      <div className="u-section-head">
        <h2>من كتاب الله</h2>
      </div>
      <VerseOfTheDay />

      <div className="mt-3">
        <ContinueReading />
      </div>

      <div className="u-section-head">
        <h2>الأذكار</h2>
        <button type="button" onClick={() => navigate("/explore#adhkar")}>عرض الكل</button>
      </div>
      <div className="u-strip" role="list" aria-label="مجموعات الأذكار">
        {strip.map((section) => (
          <div role="listitem" key={section.id}>
            <CollectionCard section={section} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="u-card u-card-press w-full mt-6 p-5 text-start flex items-center gap-4"
        onClick={() => navigate("/companion")}
      >
        <span className="u-tile-icon" aria-hidden="true"><MessageCircle size={18} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-semibold">اسأل أثر</span>
          <span className="block text-[13px] text-(--muted) mt-0.5">سؤال في دينك؟ رفيقك يجيبك بهدوء ومصادر</span>
        </span>
        <ArrowLeft size={16} className="opacity-35 shrink-0" aria-hidden="true" />
      </button>

      <div className="u-section-head">
        <h2>أدوات</h2>
        <button type="button" onClick={() => navigate("/explore")}>اكتشف المزيد</button>
      </div>
      <div className="u-bento">
        {TILES.map((tile) => (
          <button key={tile.path} type="button" className="u-card u-card-press u-tile" onClick={() => navigate(tile.path)}>
            <span className="u-tile-icon" aria-hidden="true"><tile.icon size={18} /></span>
            <span>
              <span className="u-tile-title block">{tile.title}</span>
              <span className="u-tile-sub block">{tile.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="u-foot">
        صدقةٌ جارية
        <br />
        اترك أثرًا طيبًا
      </p>
      {garden ? <div className="u-garden-window" aria-hidden="true" /> : null}
    </div>
  );
}

export default UfuqHome;
