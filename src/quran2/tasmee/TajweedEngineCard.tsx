/**
 * «محرك التجويد»: what it is, and its download (once, on Wi-Fi preferably),
 * or its removal. It runs on the device: the recitation never leaves it.
 */
import * as React from "react";
import { toast } from "react-hot-toast";
import { CheckCircle2, Cpu, Download, Trash2, X } from "lucide-react";
import { arDigits } from "../data/arabic";
import { ENGINE_MB, engineSupported, installEngine, removeEngine } from "../tajweed/engine";
import { useEngineInstalled } from "./useEngineInstalled";

export function TajweedEngineCard({ compact = false, onChange }: { compact?: boolean; onChange?: (installed: boolean) => void }) {
  const [installed, refresh] = useEngineInstalled();
  const [progress, setProgress] = React.useState<number | null>(null);
  const abort = React.useRef<AbortController | null>(null);

  if (!engineSupported()) {
    return <p className="q2-small">فحص التجويد يحتاج متصفحًا أحدث أو تطبيق أثر.</p>;
  }
  const install = () => {
    const ctl = new AbortController();
    abort.current = ctl;
    setProgress(0);
    void installEngine((done, total) => setProgress(done / total), ctl.signal)
      .then(() => {
        toast.success("صار فحص التجويد جاهزًا على جهازك");
        refresh();
        onChange?.(true);
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name !== "AbortError") toast.error("تعذّر التنزيل، أعد المحاولة عند توفر الاتصال");
      })
      .finally(() => {
        abort.current = null;
        setProgress(null);
      });
  };

  return (
    <div className="q2-card" style={{ padding: compact ? "12px 14px" : 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="q2-tile-medal" style={{ width: 40, height: 40, flex: "none" }}><Cpu size={19} aria-hidden="true" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", fontSize: 15.5 }}>محرك التجويد</b>
          <span className="q2-small">
            يستمع لتلاوتك على جهازك وحده، فيزن المدود والغنن والقلقلة والإخفاء والإقلاب والإدغام، ويُريك أخطاء النطق كلمةً كلمة.
          </span>
        </span>
      </div>
      {progress !== null ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }} role="status" aria-live="polite">
          <span className="q2-bar" style={{ flex: 1 }}><span style={{ width: `${progress * 100}%` }} /></span>
          <span className="q2-small">{arDigits(Math.round(progress * 100))}٪</span>
          <button type="button" className="q2-icon-btn q2-press" aria-label="ألغِ التنزيل" onClick={() => abort.current?.abort()}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : installed ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className="q2-offline is-done"><CheckCircle2 size={14} aria-hidden="true" /> جاهز على جهازك، يعمل دون إنترنت</span>
          {!compact ? (
            <button
              type="button"
              className="q2-chip q2-press"
              onClick={() =>
                void removeEngine().then(() => {
                  refresh();
                  onChange?.(false);
                })
              }
            >
              <Trash2 size={14} aria-hidden="true" /> احذفه من الجهاز
            </button>
          ) : null}
        </div>
      ) : (
        <button type="button" className="q2-btn q2-press" style={{ width: "100%", marginTop: 12 }} onClick={install}>
          <Download size={16} aria-hidden="true" /> نزّله مرة واحدة ({arDigits(ENGINE_MB)} م.ب)
        </button>
      )}
      {!compact ? (
        <p className="q2-credit" style={{ textAlign: "start", marginTop: 10 }}>
          نموذج «HisnLabs Tajweed v2» (رخصة Apache 2.0) ومحرّك أحكامه، مع مُصوِّت «quran-transcript» (رخصة MIT). أداة للمراجعة الذاتية، لا تغني عن الشيخ المُقرئ.
        </p>
      ) : null}
    </div>
  );
}
