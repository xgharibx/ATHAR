import * as React from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { clearDownloadedRecitations, downloadedRecitationBytes, hasNativeRecitation } from "@/lib/nativeRecitation";
import { formatStorageSize } from "@/lib/storageSize";

/**
 * Recitations saved for offline listening in the apps: how much space they
 * take, and a way to delete them. They are kept as files by the native player,
 * which removes the oldest itself past 1 GB.
 */
export function RecitationDownloadsRow() {
  const [bytes, setBytes] = React.useState<number | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!hasNativeRecitation()) return;
    let active = true;
    void downloadedRecitationBytes().then((value) => {
      if (active) setBytes(value);
    });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!confirming) return;
    // Ask again if the second tap does not come soon.
    const timer = window.setTimeout(() => setConfirming(false), 5000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  if (!hasNativeRecitation() || bytes === null) return null;

  const remove = async () => {
    setBusy(true);
    const cleared = await clearDownloadedRecitations();
    setBusy(false);
    setConfirming(false);
    if (cleared) {
      setBytes(0);
      toast.success("حُذفت التلاوات المحمّلة");
    } else {
      toast.error("تعذّر حذف التلاوات المحمّلة");
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-(--stroke) bg-(--card-2) p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">التلاوات المحمّلة</div>
          <div className="text-[11px] text-(--muted-2)">
            {bytes > 0
              ? `${formatStorageSize(bytes)} للاستماع دون إنترنت · تُحذف الأقدم تلقائيًا بعد ١ ج.ب`
              : "لا توجد تلاوات محمّلة — حمّلها من قائمة المصحف للاستماع دون إنترنت"}
          </div>
        </div>
        {bytes > 0 && (
          confirming ? (
            <Button size="sm" variant="outline" onClick={() => void remove()} disabled={busy}>
              {busy ? "جارٍ الحذف…" : "تأكيد الحذف"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
              حذف
            </Button>
          )
        )}
      </div>
    </div>
  );
}
