import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookMarked, BookOpenText, Brain, Hash, Info, ListOrdered, Search, Sprout } from "lucide-react";
import { useQ2Meta } from "../hooks";
import { useQ2Store } from "../store";
import { arDigits } from "../data/arabic";
import { pageOf } from "../data/meta";
import { useHifzToday } from "../hifz/useHifzToday";
import { countBits, decodeBits, TOTAL_AYAHS } from "../reading/khatma";
import { dayKey } from "../hooks";

const WORLDS = [
  { to: "/q2/index", Icon: BookOpenText, title: "المصحف المرتّل", line: "اقرأ مع القارئ كلمةً كلمة، والمس أي كلمة لتعرفها" },
  { to: "/q2/hifz", Icon: Brain, title: "الحفظ", line: "خطة الحلقة: جديد وقريب وبعيد، بنموذج ذاكرة حديث" },
  { to: "/q2/roots", Icon: Sprout, title: "معجم الجذور", line: "كل جذر في القرآن، ومشتقاته، وأين يرد" },
  { to: "/q2/search", Icon: Search, title: "البحث", line: "بالكلمة كما تكتبها، أو بجذرها، أو بلفظها" },
  { to: "/q2/numbers", Icon: Hash, title: "القرآن بالأرقام", line: "إحصاءات محسوبة من النص نفسه، بطريقة عدّ معلنة" },
  { to: "/q2/marks", Icon: BookMarked, title: "علاماتي", line: "ما علّمته ولوّنته من الآيات، وملاحظاتك عليها" },
  { to: "/q2/index?order=revelation", Icon: ListOrdered, title: "ترتيب النزول", line: "السور كما نزلت، من «اقرأ» إلى آخر ما نزل" },
] as const;

export default function Q2Hub() {
  const navigate = useNavigate();
  const meta = useQ2Meta();
  const lastRead = useQ2Store((s) => s.lastRead);
  const today = useHifzToday();
  const khatmaBits = useQ2Store((s) => s.khatma.bits);
  const readToday = useQ2Store((s) => s.readLog[dayKey()] ?? 0);
  const khatmaShare = React.useMemo(() => countBits(decodeBits(khatmaBits)) / TOTAL_AYAHS, [khatmaBits]);
  const last = lastRead && meta.data ? meta.data.surahs[lastRead.s - 1] : null;

  return (
    <main className="q2-main">
      <section style={{ textAlign: "center", padding: "18px 0 6px" }}>
        <div className="q2-eyebrow">الإصدار الثاني</div>
        <h1 style={{ fontFamily: "var(--q2-serif)", fontSize: 46, fontWeight: 700, lineHeight: 1.6 }}>القرآن الكريم</h1>
        <p className="q2-soft" style={{ fontSize: 15 }}>
          اقرأ <span className="q2-orn">✦</span> افهم <span className="q2-orn">✦</span> احفظ <span className="q2-orn">✦</span> تدبّر
        </p>
      </section>

      {last && lastRead ? (
        <button
          type="button"
          className="q2-card q2-press"
          style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 16, marginTop: 18, textAlign: "start" }}
          onClick={() => navigate(`/q2/read/${lastRead.s}?a=${lastRead.a}`)}
        >
          <span className="q2-num"><span>{arDigits(lastRead.s)}</span></span>
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
        <button type="button" className="q2-btn q2-press" style={{ width: "100%", marginTop: 18 }} onClick={() => navigate("/q2/read/1")}>
          ابدأ من الفاتحة
        </button>
      )}

      <button
        type="button"
        className="q2-card q2-press"
        style={{ display: "block", width: "100%", padding: 16, marginTop: 12, textAlign: "start" }}
        onClick={() => navigate("/q2/hifz")}
      >
        <span className="q2-eyebrow">حفظك اليوم</span>
        {today.memorised ? (
          <span style={{ display: "flex", gap: 18, marginTop: 6 }}>
            {[
              { n: today.plan.newPages.length, label: "جديد" },
              { n: today.plan.near.length, label: "قريب" },
              { n: today.plan.far.length, label: "بعيد" },
            ].map((x) => (
              <span key={x.label}>
                <b style={{ fontSize: 24 }}>{arDigits(x.n)}</b>
                <span className="q2-small" style={{ display: "block" }}>{x.label}</span>
              </span>
            ))}
            <span style={{ marginInlineStart: "auto", textAlign: "end" }}>
              <b style={{ fontSize: 24 }}>{arDigits(today.memorised)}</b>
              <span className="q2-small" style={{ display: "block" }}>صفحة محفوظة</span>
            </span>
          </span>
        ) : (
          <span className="q2-small" style={{ display: "block", marginTop: 4 }}>
            لم تبدأ بعد. خطة يومية على طريقة الحلقات، تتذكّر عنك متى تراجع كل صفحة.
          </span>
        )}
      </button>

      <button
        type="button"
        className="q2-card q2-press"
        style={{ display: "block", width: "100%", padding: 16, marginTop: 12, textAlign: "start" }}
        onClick={() => navigate("/q2/khatma")}
      >
        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="q2-eyebrow">ختمتي</span>
          <span className="q2-small" style={{ marginInlineStart: "auto" }}>
            {readToday ? `${arDigits(readToday)} آية اليوم` : "لم تقرأ اليوم بعد"}
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <b style={{ fontSize: 24 }}>{arDigits(Math.floor(khatmaShare * 100))}٪</b>
          <span className="q2-bar" style={{ flex: 1 }}><span style={{ width: `${khatmaShare * 100}%` }} /></span>
        </span>
      </button>

      <section className="q2-section">
        <div className="q2-head">
          <h2 className="q2-h2"><span className="q2-orn">✦</span> العوالم</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {WORLDS.map(({ to, Icon, title, line }, i) => (
            <button
              key={to}
              type="button"
              className="q2-card q2-press"
              style={{
                padding: 14,
                textAlign: "start",
                minHeight: 132,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                // An odd last world takes the whole row.
                gridColumn: i === WORLDS.length - 1 && WORLDS.length % 2 ? "span 2" : undefined,
              }}
              onClick={() => navigate(to)}
            >
              <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", borderRadius: 12, color: "var(--q2-green)", background: "var(--q2-green-soft)" }}>
                <Icon size={21} aria-hidden="true" />
              </span>
              <b style={{ fontFamily: "var(--q2-serif)", fontSize: 18 }}>{title}</b>
              <span className="q2-small" style={{ lineHeight: 1.6 }}>{line}</span>
            </button>
          ))}
        </div>
      </section>

      <button type="button" className="q2-link" style={{ marginTop: 18 }} onClick={() => navigate("/q2/about")}>
        <Info size={15} aria-hidden="true" /> عن «القرآن ٢» ومصادره
      </button>
    </main>
  );
}
