/**
 * «القرآن الكريم» — «علاماتي»: every ayah you bookmarked, coloured or wrote a note
 * on, newest first, with your notes in full.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BookmarkCheck, NotebookPen, Share2 } from "lucide-react";
import { useQ2Meta, useQ2Text } from "../hooks";
import { Q2_MARK_COLOR_NAMES as MARK_COLOR_NAMES, useQ2Store, type Q2Mark, type Q2MarkColor } from "../store";
import { ayahText } from "../data/text";
import { arCount, arDigits } from "../data/arabic";
import { Q2Error, Q2Loading } from "../components/ui";
import { shareText } from "@/lib/shareTargets";

type Filter = "all" | "bookmark" | "note" | Q2MarkColor;

export default function Q2Marks() {
  const navigate = useNavigate();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const marks = useQ2Store((s) => s.marks);
  const [filter, setFilter] = React.useState<Filter>("all");

  const list = React.useMemo(() => {
    return Object.entries(marks)
      .map(([key, mark]) => {
        const [s, a] = key.split(":").map(Number) as [number, number];
        return { s, a, mark };
      })
      .filter(({ mark }) =>
        filter === "all" ? true : filter === "bookmark" ? mark.bookmark : filter === "note" ? Boolean(mark.note) : mark.color === filter,
      )
      .sort((x, y) => y.mark.at - x.mark.at);
  }, [marks, filter]);

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!text.data || !meta.data) return <Q2Loading />;
  const t = text.data;
  const m = meta.data;
  const all = Object.values(marks);
  const count = (f: (x: Q2Mark) => boolean) => all.filter(f).length;
  const colours = (Object.keys(MARK_COLOR_NAMES) as Q2MarkColor[]).filter((c) => count((x) => x.color === c));
  const notes = list.filter((x) => x.mark.note);

  const shareNotes = () => {
    const body = notes
      .map(({ s, a, mark }) => `﴿${ayahText(t.surahs[s - 1]!.ayahs[a - 1]!)}﴾ [${m.surahs[s - 1]!.name}: ${arDigits(a)}]\n${mark.note}`)
      .join("\n\n");
    void shareText(body);
  };

  return (
    <main className="q2-main">
      <h1 className="q2-h1">علاماتي</h1>
      <p className="q2-soft" style={{ marginTop: 4 }}>
        {all.length ? arCount(all.length, "آية واحدة", "آيتان", "آيات", "آية") + " عليها علامة أو لون أو ملاحظة." : "ما تعلّمه في المصحف يجتمع هنا."}
      </p>

      {all.length ? (
        <div className="q2-chips" style={{ marginTop: 12, flexWrap: "wrap" }} role="tablist" aria-label="اعرض">
          {([
            ["all", `الكل (${arDigits(all.length)})`],
            ["bookmark", `العلامات (${arDigits(count((x) => Boolean(x.bookmark)))})`],
            ["note", `الملاحظات (${arDigits(count((x) => Boolean(x.note)))})`],
            ...colours.map((c) => [c, MARK_COLOR_NAMES[c]] as [Filter, string]),
          ] as Array<[Filter, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`q2-chip q2-press${filter === id ? " is-on" : ""}`}
              onClick={() => setFilter(id)}
            >
              {id in MARK_COLOR_NAMES ? <i className="q2-swatch" style={{ width: 12, height: 12, background: `var(--q2-sw-${id})`, border: 0, boxShadow: "none" }} aria-hidden="true" /> : null}
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div className="q2-card" style={{ padding: 16, marginTop: 16, lineHeight: 2 }}>
          المس رقم أي آية في المصحف، ثم اختر «علامة»، أو لونًا، أو اكتب ملاحظتك عليها. تُحفظ على جهازك ومع نسختك الاحتياطية.
          <div>
            <button type="button" className="q2-btn q2-press" style={{ marginTop: 12 }} onClick={() => navigate("/quran/index")}>افتح المصحف</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {list.map(({ s, a, mark }) => {
          const ayah = t.surahs[s - 1]?.ayahs[a - 1];
          if (!ayah) return null;
          return (
            <button
              key={`${s}:${a}`}
              type="button"
              className="q2-card q2-press"
              style={{ textAlign: "start", padding: "12px 14px", borderInlineStart: mark.color ? `4px solid var(--q2-sw-${mark.color})` : undefined }}
              onClick={() => navigate(`/quran/read/${s}?a=${a}`)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="q2-eyebrow">سورة {m.surahs[s - 1]!.name}، الآية {arDigits(a)}</span>
                {mark.bookmark ? <BookmarkCheck size={15} aria-label="علامة" style={{ color: "var(--q2-gold)" }} /> : null}
                {mark.note ? <NotebookPen size={15} aria-label="ملاحظة" style={{ color: "var(--q2-green)" }} /> : null}
              </span>
              <span
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "var(--q2-quran)", fontSize: 19, lineHeight: 2, marginTop: 4 }}
              >
                {ayahText(ayah)}
              </span>
              {mark.note ? <span style={{ display: "block", marginTop: 6, fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{mark.note}</span> : null}
            </button>
          );
        })}
      </div>

      {notes.length ? (
        <button type="button" className="q2-btn is-ghost q2-press" style={{ width: "100%", marginTop: 14 }} onClick={shareNotes}>
          <Share2 size={16} aria-hidden="true" /> شارك {notes.length === 1 ? "ملاحظتك" : "ملاحظاتك"} مع آياتها
        </button>
      ) : null}
    </main>
  );
}
