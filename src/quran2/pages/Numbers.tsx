import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQ2Meta, useQ2Morph, useQ2Text } from "../hooks";
import { computeStats } from "../data/stats";
import { arDigits } from "../data/arabic";
import { spacedRoot, splitKey } from "../data/morphology";
import { Q2Loading, Q2Strip } from "../components/ui";

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="q2-card" style={{ padding: "14px 12px", textAlign: "center" }}>
      <b style={{ fontSize: 24, display: "block" }}>{typeof n === "number" ? arDigits(n.toLocaleString("en-US").replace(/,/g, "٬")) : n}</b>
      <span className="q2-small">{label}</span>
    </div>
  );
}

export default function Q2Numbers() {
  const navigate = useNavigate();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const morph = useQ2Morph();
  const stats = React.useMemo(() => (text.data && meta.data ? computeStats(text.data, meta.data) : null), [text.data, meta.data]);
  const roots = React.useMemo(() => {
    const m = morph.data;
    if (!m) return null;
    const top = [...m.roots.entries()].map(([r, keys]) => ({ r, n: keys.length, surahs: new Set(keys.map((k) => splitKey(k)[0])).size })).sort((a, b) => b.n - a.n);
    const pos = { N: 0, V: 0, P: 0 };
    for (const segs of m.segments.values()) {
      const stem = segs.find((s) => !s.tags.includes("PREF") && !s.tags.includes("SUFF")) ?? segs[0]!;
      pos[stem.pos] += 1;
    }
    return { count: m.roots.size, lemmas: m.lemmas.size, top: top.slice(0, 12), pos };
  }, [morph.data]);

  if (!stats || !meta.data || !text.data) return <Q2Loading />;
  const m = meta.data;
  const name = (s: number) => m.surahs[s - 1]!.name;
  const maxTop = roots?.top[0]?.n ?? 1;

  return (
    <main className="q2-main">
      <h1 className="q2-h1">القرآن بالأرقام</h1>
      <p className="q2-soft" style={{ marginTop: 4, lineHeight: 1.9 }}>كل رقم هنا محسوب على جهازك من نص المصحف نفسه، وطريقة العدّ مذكورة تحته.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 14 }}>
        <Stat n={stats.surahs} label="سورة" />
        <Stat n={stats.ayahs} label="آية" />
        <Stat n={stats.words} label="كلمة" />
        <Stat n={stats.letters} label="حرفًا مرسومًا" />
        <Stat n={604} label="صفحة في مصحف المدينة" />
        <Stat n={m.juz.length} label="جزءًا" />
        <Stat n={m.hizbQuarters.length / 4} label="حزبًا" />
        <Stat n={m.hizbQuarters.length} label="ربعًا" />
        <Stat n={m.sajdas.length} label="موضع سجدة" />
        <Stat n={m.manzils.length} label="منازل" />
        <Stat n={m.rukus.length} label="ركوعًا" />
      </div>
      <p className="q2-small" style={{ marginTop: 10, lineHeight: 1.8 }}>
        الكلمات بتقسيم المدوّنة القرآنية العربية، دون البسملة في أوائل السور عدا الفاتحة. والحروف هي المرسومة في الرسم العثماني (تنزيل) دون الحركات والألف الصغيرة والمدّات والعلامات؛ ولأهل العدد طرق أخرى تعطي أرقامًا مختلفة.
      </p>

      <section className="q2-section">
        <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> مكي ومدني</h2>
        <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", marginTop: 12 }} role="img" aria-label="نسبة الآيات المكية والمدنية">
          <span style={{ width: `${(stats.meccan.ayahs / stats.ayahs) * 100}%`, background: "var(--q2-gold)" }} />
          <span style={{ flex: 1, background: "var(--q2-green)" }} />
        </div>
        <div className="q2-head" style={{ marginTop: 8 }}>
          <span><b style={{ color: "var(--q2-gold)" }}>مكية:</b> {arDigits(stats.meccan.surahs)} سورة، {arDigits(stats.meccan.ayahs)} آية</span>
          <span><b style={{ color: "var(--q2-green)" }}>مدنية:</b> {arDigits(stats.medinan.surahs)} سورة، {arDigits(stats.medinan.ayahs)} آية</span>
        </div>
        <p className="q2-small">بحسب تصنيف بيانات مشروع تنزيل؛ وفي بعض السور خلاف معروف.</p>
      </section>

      <section className="q2-section">
        <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> طول السور</h2>
        <div style={{ marginTop: 12 }}>
          <Q2Strip
            counts={stats.surahWords}
            label="عدد كلمات كل سورة"
            startLabel="الفاتحة"
            endLabel="الناس"
            onPick={(i) => navigate(`/quran/read/${i + 1}`)}
          />
        </div>
        <div className="q2-card" style={{ marginTop: 12 }}>
          <button type="button" className="q2-row" onClick={() => navigate(`/quran/read/${stats.longestSurah.s}`)}>
            <span style={{ flex: 1 }}>أطول سورة</span>
            <b>{name(stats.longestSurah.s)}، {arDigits(stats.longestSurah.words)} كلمة</b>
          </button>
          <button type="button" className="q2-row" onClick={() => navigate(`/quran/read/${stats.shortestSurah.s}`)}>
            <span style={{ flex: 1 }}>أقصر سورة</span>
            <b>{name(stats.shortestSurah.s)}، {arDigits(stats.shortestSurah.words)} كلمات</b>
          </button>
          <button type="button" className="q2-row" onClick={() => navigate(`/quran/read/${stats.longestAyah.s}?a=${stats.longestAyah.a}`)}>
            <span style={{ flex: 1 }}>أطول آية</span>
            <b>{name(stats.longestAyah.s)} {arDigits(stats.longestAyah.a)}، {arDigits(stats.longestAyah.words)} كلمة</b>
          </button>
          <div className="q2-row">
            <span style={{ flex: 1 }}>آيات من كلمة واحدة</span>
            <b>{arDigits(stats.oneWordAyahs.length)}</b>
          </div>
        </div>
        <div className="q2-chips" style={{ marginTop: 10, flexWrap: "wrap" }}>
          {stats.oneWordAyahs.map(({ s, a }) => (
            <button key={`${s}:${a}`} type="button" className="q2-chip q2-press" onClick={() => navigate(`/quran/read/${s}?a=${a}`)}>
              <span style={{ fontFamily: "var(--q2-quran)", fontSize: 17 }}>{text.data!.surahs[s - 1]!.ayahs[a - 1]!.words[0]!.text}</span>
              <span className="q2-small">{name(s)} {arDigits(a)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="q2-section">
        <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> أكثر الحروف</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8, marginTop: 12 }}>
          {stats.letterFrequency.slice(0, 12).map(([ch, n]) => (
            <div key={ch} className="q2-card" style={{ padding: "10px 6px", textAlign: "center" }}>
              <b style={{ fontFamily: "var(--q2-serif)", fontSize: 26, color: "var(--q2-gold)" }}>{ch}</b>
              <span className="q2-small" style={{ display: "block" }}>{arDigits(n)}</span>
            </div>
          ))}
        </div>
        <p className="q2-small" style={{ marginTop: 8 }}>الألف هنا تجمع الألف والألف الموصولة (ٱ)؛ والهمزة المفردة (ء) حرف مستقل.</p>
      </section>

      <section className="q2-section">
        <h2 className="q2-h2"><span className="q2-orn" aria-hidden="true" /> لغة القرآن</h2>
        {roots ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 12 }}>
              <Stat n={roots.count} label="جذرًا" />
              <Stat n={roots.lemmas} label="لفظًا (مدخلًا معجميًا)" />
            </div>
            <div className="q2-card" style={{ padding: 14, marginTop: 10, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
              {[
                { t: "اسم", n: roots.pos.N },
                { t: "فعل", n: roots.pos.V },
                { t: "حرف وأداة", n: roots.pos.P },
              ].map((x) => (
                <span key={x.t}>
                  <b style={{ fontSize: 20 }}>{arDigits(x.n)}</b>
                  <span className="q2-small" style={{ display: "block" }}>{x.t}</span>
                </span>
              ))}
            </div>
            <div className="q2-head" style={{ marginTop: 16 }}><b>أكثر الجذور ورودًا</b></div>
            <div className="q2-card">
              {roots.top.map((r) => (
                <button key={r.r} type="button" className="q2-row q2-press" onClick={() => navigate(`/quran/roots/${encodeURIComponent(r.r)}`)}>
                  <span style={{ fontFamily: "var(--q2-serif)", fontSize: 22, fontWeight: 700, color: "var(--q2-gold)", minWidth: 80 }}>{spacedRoot(r.r)}</span>
                  <span style={{ flex: 1 }}>
                    <span className="q2-bar"><span style={{ width: `${(r.n / maxTop) * 100}%` }} /></span>
                  </span>
                  <b style={{ minWidth: 52, textAlign: "end" }}>{arDigits(r.n)}</b>
                </button>
              ))}
            </div>
            <p className="q2-small" style={{ marginTop: 8 }}>نوع الكلمة بحسب جذعها في المدوّنة القرآنية العربية.</p>
          </>
        ) : (
          <Q2Loading label="يُحمَّل معجم الكلمات لحساب الجذور…" />
        )}
      </section>
    </main>
  );
}
