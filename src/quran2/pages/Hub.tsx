/**
 * «القرآن الكريم» — the home, in the «مشكاة» design (docs/QURAN_V2_DESIGN.md): the niche
 * holding today's ayah under its lamp, where you stopped, three orbits (the khatma,
 * today's memorisation, your marks), and the worlds of the section as arch tiles.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookMarked, BookOpen, BookOpenText, Brain, Feather, Hash, Headphones, Info, Landmark, ListChecks, ListOrdered, Mic, ScrollText, Search, Sprout } from "lucide-react";
import { dayKey, useQ2Meta, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { arDigits } from "../data/arabic";
import { pageOf } from "../data/meta";
import { ayahText } from "../data/text";
import { useHifzToday } from "../hifz/useHifzToday";
import { countBits, decodeBits, TOTAL_AYAHS } from "../reading/khatma";
import { Niche, Orbit, Rosette } from "../components/Mishkat";

/** Ayahs for the niche, one a day in turn (references only; the words are Tanzil's). */
const DAILY: Array<[number, number]> = [
  [24, 35], [2, 255], [13, 28], [39, 53], [2, 186], [94, 5], [65, 3], [3, 190], [20, 114], [21, 87],
  [33, 41], [2, 152], [57, 4], [50, 16], [29, 69], [18, 10], [25, 74], [14, 7], [16, 97], [40, 60],
  [3, 139], [12, 87], [93, 5], [59, 22], [2, 286], [3, 173], [9, 51], [17, 82], [55, 13], [112, 1],
];

const WORLDS = [
  { to: "/quran/page", Icon: BookOpen, title: "المصحف بصفحاته", line: "الصفحات الـ٦٠٤ بأسطرها، أو بخط مصحف المدينة" },
  { to: "/quran/index", Icon: BookOpenText, title: "المصحف المرتّل", line: "اقرأ مع القارئ كلمةً كلمة" },
  { to: "/quran/khatma", Icon: ListChecks, title: "الختمة وخطتها", line: "وِرد يومي وتذكير يوصلك إلى الختم" },
  { to: "/quran/tasmee", Icon: Mic, title: "التسميع", line: "سمِّع حفظك، كلمةً كلمة" },
  { to: "/quran/hifz", Icon: Brain, title: "الحفظ", line: "جديد وقريب وبعيد، بنموذج ذاكرة" },
  { to: "/quran/tafsir", Icon: ScrollText, title: "التفسير", line: "سبعة تفاسير، واسأل عن الآية" },
  { to: "/quran/roots", Icon: Sprout, title: "معجم الجذور", line: "كل جذر ومشتقاته وأين يرد" },
  { to: "/quran/search", Icon: Search, title: "البحث", line: "بالكلمة أو الجذر أو بالتلاوة" },
  { to: "/quran/marks", Icon: BookMarked, title: "علاماتي", line: "علاماتك وألوانك وملاحظاتك" },
  { to: "/quran/numbers", Icon: Hash, title: "القرآن بالأرقام", line: "إحصاءات محسوبة من النص" },
  { to: "/quran/index?order=revelation", Icon: ListOrdered, title: "ترتيب النزول", line: "من «اقرأ» إلى آخر ما نزل" },
  { to: "/listen", Icon: Headphones, title: "السماع", line: "القرآن كاملًا بأصوات قرّاء العالم" },
  { to: "/quran-vocab", Icon: Feather, title: "مفردات القرآن", line: "كلمة كل يوم ومعناها" },
  { to: "/quran/about", Icon: Landmark, title: "عن القرآن في أثر", line: "مصادره وكيف بُني" },
] as const;

export default function Q2Hub() {
  const navigate = useNavigate();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const lastRead = useQ2Store((s) => s.lastRead);
  const marksCount = useQ2Store((s) => Object.keys(s.marks).length);
  const khatmaBits = useQ2Store((s) => s.khatma.bits);
  const readToday = useQ2Store((s) => s.readLog[dayKey()] ?? 0);
  const today = useHifzToday();
  const khatmaShare = React.useMemo(() => countBits(decodeBits(khatmaBits)) / TOTAL_AYAHS, [khatmaBits]);
  const [daily] = React.useState(() => DAILY[Math.floor(Date.now() / 86_400_000) % DAILY.length]!);
  const dailyAyah = text.data?.surahs[daily[0] - 1]?.ayahs[daily[1] - 1];
  const last = lastRead && meta.data ? meta.data.surahs[lastRead.s - 1] : null;
  const due = today.plan.newPages.length + today.plan.near.length + today.plan.far.length;

  return (
    <main className="q2-main">
      <Niche className="q2-rise is-hero" style={{ aspectRatio: "0.9", maxWidth: 430, margin: "6px auto 0" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", textAlign: "center", height: "100%", minHeight: "inherit", padding: "0 22px 26px" }}>
          <div className="q2-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Rosette size={10} /> آية اليوم <Rosette size={10} />
          </div>
          <p style={{ fontFamily: "var(--q2-quran)", fontSize: dailyAyah && dailyAyah.words.length > 30 ? 19 : dailyAyah && dailyAyah.words.length > 14 ? 22 : 26, lineHeight: 2.1, marginTop: 8 }}>
            {dailyAyah ? ayahText(dailyAyah) : " "}
          </p>
          {meta.data ? (
            <button type="button" className="q2-link" onClick={() => navigate(`/quran/read/${daily[0]}?a=${daily[1]}`)}>
              سورة {meta.data.surahs[daily[0] - 1]!.name}، {arDigits(daily[1])} <ArrowLeft size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </Niche>

      <section className="q2-section q2-rise" style={{ animationDelay: "80ms" }}>
        {last && lastRead ? (
          <button
            type="button"
            className="q2-card q2-press"
            style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 16, textAlign: "start" }}
            onClick={() => navigate(`/quran/read/${lastRead.s}?a=${lastRead.a}`)}
          >
            <span className="q2-num">{arDigits(lastRead.s)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="q2-eyebrow" style={{ display: "block" }}>تابع من حيث وقفت</span>
              <b style={{ fontFamily: "var(--q2-serif)", fontSize: 20 }}>سورة {last.name}</b>
              <span className="q2-small" style={{ display: "block" }}>
                الآية {arDigits(lastRead.a)}
                {meta.data ? `، الصفحة ${arDigits(pageOf(meta.data, lastRead.s, lastRead.a))}` : ""}
              </span>
            </span>
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="q2-btn q2-press" style={{ width: "100%" }} onClick={() => navigate("/quran/read/1")}>
            ابدأ من الفاتحة
          </button>
        )}
      </section>

      <section className="q2-card q2-section q2-rise" style={{ padding: "18px 10px 14px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", animationDelay: "140ms" }}>
        <button type="button" className="q2-press" onClick={() => navigate("/quran/khatma")} aria-label="ختمتي">
          <Orbit value={khatmaShare} label={`${arDigits(Math.floor(khatmaShare * 100))}٪`} sub={readToday ? `ختمتي، ${arDigits(readToday)} آية اليوم` : "ختمتي"} />
        </button>
        <button type="button" className="q2-press" onClick={() => navigate("/quran/hifz")} aria-label="حفظ اليوم">
          <Orbit value={today.memorised / 604} tone="gold" label={arDigits(due)} sub={due ? "صفحة في جلسة اليوم" : "حفظك اليوم"} />
        </button>
        <button type="button" className="q2-press" onClick={() => navigate("/quran/marks")} aria-label="علاماتي">
          <Orbit value={Math.min(1, marksCount / 50)} label={arDigits(marksCount)} sub="علاماتي" />
        </button>
      </section>

      <section className="q2-section q2-rise" style={{ animationDelay: "200ms" }}>
        <button type="button" className="q2-tile is-feature q2-press" style={{ width: "100%", gap: 14 }} onClick={() => navigate("/quran/tasmee")}>
          <span className="q2-tile-medal"><Mic size={24} aria-hidden="true" /></span>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ display: "flex", alignItems: "center", gap: 8 }}>التسميع <span className="q2-badge">جديد</span></b>
            <span>اتلُ من حفظك، فيتتبعك كلمةً كلمة، ويريك ما فاتك، وتسمع نطقك ونطق القارئ للكلمة نفسها.</span>
          </span>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
      </section>

      <section className="q2-section">
        <div className="q2-section-title" style={{ marginBottom: 12 }}>
          <Rosette size={14} /> العوالم
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {WORLDS.map(({ to, Icon, title, line }, i) => (
            <button key={to} type="button" className="q2-tile q2-press q2-rise" style={{ animationDelay: `${240 + i * 40}ms` }} onClick={() => navigate(to)}>
              <span className="q2-tile-medal"><Icon size={21} aria-hidden="true" /></span>
              <b>{title}</b>
              <span>{line}</span>
            </button>
          ))}
        </div>
      </section>

      <button type="button" className="q2-link" style={{ marginTop: 18 }} onClick={() => navigate("/quran/about")}>
        <Info size={15} aria-hidden="true" /> عن «القرآن الكريم» ومصادره
      </button>
    </main>
  );
}
