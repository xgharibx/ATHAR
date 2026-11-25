/**
 * «القرآن ٢» — your own marks on an ayah: a bookmark, a colour and a note.
 * Kept on the device and in the account backup; listed in «علاماتي».
 */
import * as React from "react";
import { Bookmark, BookmarkCheck, Check, NotebookPen } from "lucide-react";
import { markKey, Q2_MARK_COLOR_NAMES as MARK_COLOR_NAMES, Q2_MARK_COLORS, useQ2Store } from "../store";

export function MarkPanel({ s, a }: { s: number; a: number }) {
  const mark = useQ2Store((st) => st.marks[markKey(s, a)]);
  const setMark = useQ2Store((st) => st.setMark);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(mark?.note ?? "");
  const saved = (mark?.note ?? "") === draft.trim();

  return (
    <div className="q2-card" style={{ marginTop: 14, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`q2-chip q2-press${mark?.bookmark ? " is-on" : ""}`}
          aria-pressed={Boolean(mark?.bookmark)}
          onClick={() => setMark(s, a, { bookmark: !mark?.bookmark })}
        >
          {mark?.bookmark ? <BookmarkCheck size={15} aria-hidden="true" /> : <Bookmark size={15} aria-hidden="true" />}
          {mark?.bookmark ? "عليها علامة" : "علامة"}
        </button>
        <span role="group" aria-label="لوّن الآية" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          {Q2_MARK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="q2-swatch q2-press"
              style={{ background: `var(--q2-sw-${c})` }}
              aria-pressed={mark?.color === c}
              aria-label={`لوّنها بالـ${MARK_COLOR_NAMES[c]}`}
              onClick={() => setMark(s, a, { color: mark?.color === c ? undefined : c })}
            >
              {mark?.color === c ? <Check size={14} aria-hidden="true" /> : null}
            </button>
          ))}
        </span>
        <button
          type="button"
          className={`q2-chip q2-press${mark?.note ? " is-on" : ""}`}
          style={{ marginInlineStart: "auto" }}
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
        >
          <NotebookPen size={15} aria-hidden="true" /> {mark?.note ? "ملاحظتك" : "ملاحظة"}
        </button>
      </div>
      {mark?.note && !editing ? (
        <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{mark.note}</p>
      ) : null}
      {editing ? (
        <div style={{ marginTop: 10 }}>
          <textarea
            className="q2-input"
            rows={4}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ما تدبّرته، أو فائدة، أو ما تريد أن تذكره"
            aria-label="ملاحظتك على الآية"
            style={{ width: "100%", resize: "vertical", lineHeight: 1.8 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="q2-btn q2-press"
              disabled={saved}
              onClick={() => {
                setMark(s, a, { note: draft });
                setEditing(false);
              }}
            >
              احفظ
            </button>
            {mark?.note ? (
              <button
                type="button"
                className="q2-btn is-ghost q2-press"
                onClick={() => {
                  setMark(s, a, { note: "" });
                  setDraft("");
                  setEditing(false);
                }}
              >
                احذف الملاحظة
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
