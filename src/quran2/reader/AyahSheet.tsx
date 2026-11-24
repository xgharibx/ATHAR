import * as React from "react";
import { BookmarkCheck, Brain, Copy, Play, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useQ2Tafsir } from "../hooks";
import { Q2_TAFSIRS } from "../data/tafsir";
import { arDigits } from "../data/arabic";
import { Q2Error, Q2Loading } from "../components/ui";
import { shareText } from "@/lib/shareTargets";

/** One ayah: what to do with it, and seven tafsirs side by side. */
export function AyahSheet({ s, a, text, surahName, page, inHifz, canPlay, onPlay, onLastRead, onHifz }: {
  s: number;
  a: number;
  text: string;
  surahName: string;
  page: number;
  inHifz: boolean;
  canPlay: boolean;
  onPlay: () => void;
  onLastRead: () => void;
  onHifz: () => void;
}) {
  const [tafsir, setTafsir] = React.useState(Q2_TAFSIRS[0]!.id);
  const [full, setFull] = React.useState(false);
  const q = useQ2Tafsir(tafsir, s, a);
  const quote = `﴿${text}﴾ [${surahName}: ${arDigits(a)}]`;
  const paragraphs = q.data ?? [];
  const shown = full ? paragraphs : paragraphs.slice(0, 4);
  const edition = Q2_TAFSIRS.find((t) => t.id === tafsir)!;

  return (
    <div>
      <div className="q2-eyebrow">
        {surahName}، الآية {arDigits(a)}، الصفحة {arDigits(page)}
      </div>
      <p style={{ fontFamily: "var(--q2-quran)", fontSize: 23, lineHeight: 2.1, marginTop: 6 }}>{text}</p>

      <div className="q2-chips" style={{ marginTop: 10 }}>
        <button type="button" className="q2-chip q2-press" onClick={onPlay} disabled={!canPlay}>
          <Play size={15} aria-hidden="true" /> استمع من هنا
        </button>
        <button type="button" className="q2-chip q2-press" onClick={onLastRead}>
          <BookmarkCheck size={15} aria-hidden="true" /> وقفتُ هنا
        </button>
        <button type="button" className={`q2-chip q2-press${inHifz ? " is-on" : ""}`} onClick={onHifz}>
          <Brain size={15} aria-hidden="true" /> {inHifz ? "صفحتها في حفظك" : "أضف صفحتها إلى حفظك"}
        </button>
        <button
          type="button"
          className="q2-chip q2-press"
          onClick={() => {
            void navigator.clipboard?.writeText(quote).then(() => toast.success("نُسخت الآية"), () => toast.error("تعذّر النسخ"));
          }}
        >
          <Copy size={15} aria-hidden="true" /> نسخ
        </button>
        <button type="button" className="q2-chip q2-press" onClick={() => void shareText(quote)}>
          <Share2 size={15} aria-hidden="true" /> مشاركة
        </button>
      </div>

      <div className="q2-section" style={{ marginTop: 22 }}>
        <div className="q2-head">
          <h3 className="q2-h2">التفاسير</h3>
          <span className="q2-small">سبعة تفاسير جنبًا إلى جنب</span>
        </div>
        <div className="q2-chips" role="tablist" aria-label="اختر التفسير">
          {Q2_TAFSIRS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tafsir}
              className={`q2-chip q2-press${t.id === tafsir ? " is-on" : ""}`}
              onClick={() => {
                setTafsir(t.id);
                setFull(false);
              }}
            >
              {t.short}
            </button>
          ))}
        </div>
        <div className="q2-card" style={{ marginTop: 10, padding: "14px 16px" }} role="tabpanel">
          <div className="q2-small" style={{ marginBottom: 6 }}>
            {edition.name} — {edition.author}
          </div>
          {q.isLoading ? <Q2Loading /> : null}
          {q.isError ? <Q2Error label="تعذّر تحميل التفسير. تحقق من الاتصال." onRetry={() => void q.refetch()} /> : null}
          {shown.map((p, i) => (
            <p key={i} style={{ fontSize: 16, lineHeight: 2, marginTop: i ? 10 : 0 }}>{p}</p>
          ))}
          {paragraphs.length > 4 ? (
            <button type="button" className="q2-link" onClick={() => setFull((v) => !v)}>
              {full ? "أقل" : `اقرأ التفسير كاملًا (${arDigits(paragraphs.length)} فقرة)`}
            </button>
          ) : null}
          {q.data && !paragraphs.length ? <p className="q2-small">لا نص لهذه الآية في هذا التفسير (قد يكون مضمومًا إلى آية قبلها).</p> : null}
        </div>
        <p className="q2-credit">التفاسير عبر واجهة Quran.com.</p>
      </div>
    </div>
  );
}
