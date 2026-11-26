/**
 * «القرآن الكريم» — keep this surah's recitation on the phone, to listen with no
 * connection. Phones only: the app's native downloader saves the file, and its
 * player uses the saved copy by itself whenever the same recitation is played.
 */
import * as React from "react";
import { Check, CloudDownload, Loader2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { downloadNativeRecitations, hasNativeRecitation, nativeRemoveDownloads, nativeSavedUrls } from "@/lib/nativeRecitation";
import { LISTEN_MAX_FILE_BYTES, LISTEN_MAX_TOTAL_BYTES } from "@/lib/listen/downloads";

type Status = "checking" | "absent" | "saving" | "saved" | "unavailable";

export function OfflineRow({ url, surahName, reciterName }: { url: string | undefined; surahName: string; reciterName: string }) {
  const [status, setStatus] = React.useState<Status>("checking");

  React.useEffect(() => {
    if (!url || !hasNativeRecitation()) return;
    let alive = true;
    void nativeSavedUrls([url]).then((saved) => {
      if (alive) setStatus(saved == null ? "unavailable" : saved.has(url) ? "saved" : "absent");
    });
    return () => {
      alive = false;
    };
  }, [url]);

  if (!url || !hasNativeRecitation() || status === "unavailable") return null;

  const save = async () => {
    setStatus("saving");
    const result = await downloadNativeRecitations([url], () => {}, `سورة ${surahName}، ${reciterName}`, "quran2", LISTEN_MAX_FILE_BYTES, LISTEN_MAX_TOTAL_BYTES);
    if (result && result.saved > 0) {
      setStatus("saved");
      toast.success("حُفظت التلاوة على جهازك");
    } else {
      setStatus("absent");
      toast.error("تعذّر الحفظ الآن، تأكّد من الاتصال وحاول مرة أخرى");
    }
  };

  const remove = async () => {
    await nativeRemoveDownloads([url]);
    setStatus("absent");
  };

  return (
    <div className="q2-card" style={{ marginTop: 10 }}>
      <div className="q2-row" style={{ cursor: "default" }}>
        <span style={{ flex: 1 }}>
          <b style={{ display: "block", fontSize: 14.5 }}>سورة {surahName} دون اتصال</b>
          <span className="q2-small">
            {status === "saved"
              ? `محفوظة بصوت ${reciterName}، تُتلى من جهازك مع تتبّع الكلمات`
              : status === "saving"
                ? "يجري الحفظ، ويكمل ولو أغلقت التطبيق"
                : `احفظ تلاوة ${reciterName} لتسمعها بلا إنترنت`}
          </span>
        </span>
        {status === "saved" ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={18} aria-hidden="true" style={{ color: "var(--q2-green)" }} />
            <button type="button" className="q2-icon-btn q2-press" aria-label="احذف التلاوة المحفوظة" onClick={() => void remove()}>
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="q2-btn q2-press"
            onClick={() => void save()}
            disabled={status !== "absent"}
            aria-busy={status === "saving"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {status === "saving" || status === "checking" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CloudDownload size={16} aria-hidden="true" />}
            احفظ
          </button>
        )}
      </div>
    </div>
  );
}
