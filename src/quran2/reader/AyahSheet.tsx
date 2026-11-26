import * as React from "react";
import { BookmarkCheck, Brain, Columns3, Copy, ImageIcon, Play, Share2 } from "lucide-react";
import { ShareAyahSheet } from "../share/ShareAyahSheet";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useQ2Tafsir, useQ2Translation } from "../hooks";
import { Q2_TAFSIRS } from "../data/tafsir";
import { Q2_TRANSLATIONS, getTranslation } from "../data/translations";
import { useQ2Store } from "../store";
import { SimilarList } from "./SimilarList";
import { MarkPanel } from "./MarkPanel";

// The AI client loads only when «اسأل عنها» is opened.
const AskPanel = React.lazy(() => import("./AskPanel").then((m) => ({ default: m.AskPanel })));
import { arDigits } from "../data/arabic";
import { Q2Error, Q2Loading } from "../components/ui";
import { shareText } from "@/lib/shareTargets";

type Tab = "tafsir" | "ask" | "similar" | "translation";

/** The meaning of one ayah in a chosen language. */
function TranslationPanel({ s, a }: { s: number; a: number }) {
  const saved = useQ2Store((st) => st.prefs.translation);
  const [id, setId] = React.useState(saved ?? Q2_TRANSLATIONS[0]!.id);
  const q = useQ2Translation(id, s);
  const t = getTranslation(id)!;
  return (
    <div>
      <div className="q2-chips" role="tablist" aria-label="اختر اللغة">
        {Q2_TRANSLATIONS.map((tr) => (
          <button
            key={tr.id}
            type="button"
            role="tab"
            aria-selected={tr.id === id}
            className={`q2-chip q2-press${tr.id === id ? " is-on" : ""}`}
            onClick={() => setId(tr.id)}
          >
            <bdi>{tr.label}</bdi>
          </button>
        ))}
      </div>
      <div className="q2-card" style={{ marginTop: 10, padding: "14px 16px" }} role="tabpanel">
        <div className="q2-small" style={{ marginBottom: 6 }}><bdi>{t.by}</bdi></div>
        {q.isLoading ? <Q2Loading /> : null}
        {q.isError ? <Q2Error label="تعذّر تحميل الترجمة. تحقق من الاتصال." onRetry={() => void q.refetch()} /> : null}
        {q.data?.[a - 1] ? (
          <p dir={t.dir} lang={t.lang} style={{ fontSize: 16, lineHeight: 1.9, textAlign: "start" }}>{q.data[a - 1]}</p>
        ) : null}
      </div>
      <p className="q2-credit">ترجمة معاني القرآن، لا تقوم مقام النص العربي. عبر واجهة Quran.com.</p>
    </div>
  );
}

/** One ayah: what to do with it, seven tafsirs side by side, its similar ayahs and its translations. */
export function AyahSheet({ s, a, text, surahName, page, inHifz, canPlay, onPlay, onLastRead, onHifz, initialTab }: {
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
  initialTab?: Tab;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<Tab>(initialTab ?? "tafsir");
  const [imageOpen, setImageOpen] = React.useState(false);
  const [tafsir, setTafsir] = React.useState(Q2_TAFSIRS[0]!.id);
  const [full, setFull] = React.useState(false);
  const q = useQ2Tafsir(tafsir, s, a, tab === "tafsir");
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
        <button type="button" className="q2-chip q2-press" onClick={() => setImageOpen(true)}>
          <ImageIcon size={15} aria-hidden="true" /> صورة
        </button>
        <button type="button" className="q2-chip q2-press" onClick={() => void shareText(quote)}>
          <Share2 size={15} aria-hidden="true" /> نص
        </button>
      </div>
      <ShareAyahSheet open={imageOpen} onClose={() => setImageOpen(false)} s={s} a={a} text={text} surahName={surahName} />

      <MarkPanel s={s} a={a} />

      <div className="q2-chips" role="tablist" aria-label="عن الآية" style={{ marginTop: 22 }}>
        {([
          ["tafsir", "التفاسير السبعة"],
          ["ask", "اسأل عنها"],
          ["similar", "المتشابهات"],
          ["translation", "الترجمات"],
        ] as Array<[Tab, string]>).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`q2-chip q2-press${tab === id ? " is-on" : ""}`}
            style={{ fontSize: 14 }}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ask" ? (
        <div style={{ marginTop: 12 }}>
          <React.Suspense fallback={<Q2Loading />}>
            <AskPanel s={s} a={a} />
          </React.Suspense>
        </div>
      ) : null}
      {tab === "similar" ? <div style={{ marginTop: 12 }}><SimilarList s={s} a={a} /></div> : null}
      {tab === "translation" ? <div style={{ marginTop: 12 }}><TranslationPanel s={s} a={a} /></div> : null}

      {tab === "tafsir" ? (
      <div className="q2-section" style={{ marginTop: 12 }}>
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
        <button type="button" className="q2-btn is-ghost q2-press" style={{ width: "100%", marginTop: 10 }} onClick={() => navigate(`/quran/tafsir/${s}/${a}`)}>
          <Columns3 size={16} aria-hidden="true" /> قارن التفاسير السبعة معًا
        </button>
        <p className="q2-credit">التفاسير عبر واجهة Quran.com.</p>
      </div>
      ) : null}
    </div>
  );
}
