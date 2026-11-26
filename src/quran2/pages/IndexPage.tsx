import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQ2Meta } from "../hooks";
import { useQ2Store } from "../store";
import { arDigits, plainKey } from "../data/arabic";
import { juzRange, refFromIndex, surahPages } from "../data/meta";
import { Q2Error, Q2Loading } from "../components/ui";
import { BookMarked, BookOpen, Flag, Hash, Sprout } from "lucide-react";

/** The other ways into the mushaf, at the top of «المصحف». */
const WAYS = [
  { to: "/quran/page", Icon: BookOpen, label: "مصحف المدينة" },
  { to: "/quran/khatma", Icon: Flag, label: "ختمتي" },
  { to: "/quran/marks", Icon: BookMarked, label: "علاماتي" },
  { to: "/quran/roots", Icon: Sprout, label: "الجذور" },
  { to: "/quran/numbers", Icon: Hash, label: "بالأرقام" },
] as const;

/** The surahs (in mushaf order or the order of revelation) and the thirty juz. */
export default function Q2Index() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const meta = useQ2Meta();
  const savedOrder = useQ2Store((s) => s.prefs.order);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const order = params.get("order") === "revelation" ? "revelation" : params.get("order") === "mushaf" ? "mushaf" : savedOrder;
  const [tab, setTab] = React.useState<"surahs" | "juz">("surahs");
  const [q, setQ] = React.useState("");

  const setOrder = (next: "mushaf" | "revelation") => {
    setPrefs({ order: next });
    setParams({ order: next }, { replace: true });
  };

  if (meta.isError) return <Q2Error label="تعذّر تحميل الفهرس." onRetry={() => void meta.refetch()} />;
  if (!meta.data) return <Q2Loading />;
  const m = meta.data;
  const query = plainKey(q);
  const surahs = m.surahs
    .map((s, i) => ({ ...s, id: i + 1 }))
    .filter((s) => !query || plainKey(s.name).includes(query) || String(s.id) === q.trim())
    .sort((a, b) => (order === "revelation" ? a.order - b.order : a.id - b.id));

  return (
    <main className="q2-main">
      <h1 className="q2-h1">المصحف</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
        {WAYS.map(({ to, Icon, label }) => (
          <button key={to} type="button" className="q2-press" onClick={() => navigate(to)} style={{ display: "grid", justifyItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "var(--q2-soft)" }}>
            <span className="q2-tile-medal" style={{ width: 48, height: 48 }}><Icon size={20} aria-hidden="true" /></span>
            {label}
          </button>
        ))}
      </div>
      <div className="q2-index-tabs" style={{ marginTop: 16 }} role="tablist" aria-label="فهرس المصحف">
        <button type="button" role="tab" aria-selected={tab === "surahs"} className={`q2-index-tab${tab === "surahs" ? " is-on" : ""}`} onClick={() => setTab("surahs")}>السور</button>
        <button type="button" role="tab" aria-selected={tab === "juz"} className={`q2-index-tab${tab === "juz" ? " is-on" : ""}`} onClick={() => setTab("juz")}>الأجزاء</button>
      </div>

      {tab === "surahs" ? (
        <>
          <div className="q2-index-tabs q2-order-tabs" style={{ marginTop: 10 }} role="group" aria-label="ترتيب السور">
            <button type="button" className={`q2-index-tab${order === "mushaf" ? " is-on" : ""}`} onClick={() => setOrder("mushaf")} aria-pressed={order === "mushaf"}>ترتيب المصحف</button>
            <button type="button" className={`q2-index-tab${order === "revelation" ? " is-on" : ""}`} onClick={() => setOrder("revelation")} aria-pressed={order === "revelation"}>ترتيب النزول</button>
          </div>
          <input className="q2-input" style={{ marginTop: 12 }} placeholder="ابحث باسم السورة أو رقمها" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ابحث عن سورة" />
          {order === "revelation" ? (
            <p className="q2-small" style={{ marginTop: 10, lineHeight: 1.8 }}>
              ترتيب النزول المشهور (وهو ترتيب المصحف المصري)؛ وللعلماء في ترتيب بعض السور أقوال.
            </p>
          ) : null}
          <div className="q2-card" style={{ marginTop: 12 }}>
            {surahs.map((s) => {
              const [p1] = surahPages(m, s.id);
              return (
                <button key={s.id} type="button" className="q2-row q2-press" onClick={() => navigate(`/quran/read/${s.id}`)}>
                  <span className="q2-num"><span>{arDigits(order === "revelation" ? s.order : s.id)}</span></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontFamily: "var(--q2-serif)", fontSize: 19 }}>{s.name}</b>
                    <span className="q2-small" style={{ display: "block" }}>
                      {s.type === "meccan" ? "مكية" : "مدنية"}، {arDigits(s.ayahs)} آية، الصفحة {arDigits(p1)}
                    </span>
                  </span>
                  <span className="q2-small" style={{ textAlign: "end" }}>
                    {order === "revelation" ? `رقمها في المصحف ${arDigits(s.id)}` : `نزولها ${arDigits(s.order)}`}
                  </span>
                </button>
              );
            })}
            {!surahs.length ? <div className="q2-empty">لا سورة بهذا الاسم.</div> : null}
          </div>
        </>
      ) : (
        <div className="q2-card" style={{ marginTop: 12 }}>
          {m.juz.map(([s, a], i) => {
            const [first, last] = juzRange(m, i + 1);
            const [ls, la] = refFromIndex(m, last);
            return (
              <button key={i} type="button" className="q2-row q2-press" onClick={() => navigate(`/quran/read/${s}?a=${a}`)}>
                <span className="q2-num"><span>{arDigits(i + 1)}</span></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontFamily: "var(--q2-serif)", fontSize: 18 }}>الجزء {arDigits(i + 1)}</b>
                  <span className="q2-small" style={{ display: "block" }}>
                    من {m.surahs[s - 1]!.name} {arDigits(a)} إلى {m.surahs[ls - 1]!.name} {arDigits(la)}، {arDigits(last - first + 1)} آية
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
