import * as React from "react";
import toast from "react-hot-toast";
import { Download, Upload, Trash2, BookMarked, BookOpen } from "lucide-react";
import { useNoorStore, type ExportBlobV1 } from "@/store/noorStore";
import { shareFileBlob } from "@/lib/shareTargets";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsUI";

type ClearChoice = "adhkar" | "quran" | "all";

const CLEAR_TEXT: Record<ClearChoice, { title: string; hint: string; confirm: string; done: string }> = {
  adhkar: { title: "مسح تقدّم الأذكار والمفضلة", hint: "العدّ والإنجازات والمفضلة", confirm: "تأكيد مسح الأذكار", done: "مُسح تقدّم الأذكار" },
  quran: { title: "مسح بيانات القرآن", hint: "الإشارات والتظليل والملاحظات والتقدّم", confirm: "تأكيد مسح القرآن", done: "مُسحت بيانات القرآن" },
  all: { title: "مسح كل البيانات", hint: "يعود أثر كما ثُبّت أول مرة", confirm: "تأكيد مسح كل شيء", done: "مُسحت كل البيانات" },
};

function clearEverything() {
  localStorage.clear();
  sessionStorage.clear();
  if (typeof indexedDB !== "undefined" && indexedDB.databases) {
    void indexedDB.databases().then((dbs) => {
      for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
    });
  } else if (typeof indexedDB !== "undefined") {
    indexedDB.deleteDatabase("noor-quran-cache-v1");
  }
}

export function DataGroup() {
  const exportState = useNoorStore((s) => s.exportState);
  const importState = useNoorStore((s) => s.importState);
  const resetAdhkarProgress = useNoorStore((s) => s.resetAdhkarProgress);
  const resetQuranData = useNoorStore((s) => s.resetQuranData);
  const [confirming, setConfirming] = React.useState<ClearChoice | null>(null);

  const backup = async () => {
    try {
      const data = exportState();
      const result = await shareFileBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        { filename: `أثر-نسخة-احتياطية-${data.exportedAt.slice(0, 10)}.athar`, title: "نسخة أثر الاحتياطية" },
      );
      if (result === "shared") toast.success("اختر مكان حفظ النسخة (الملفات، Google Drive، iCloud…)");
      else if (result === "downloaded") toast.success("نُزّلت النسخة الاحتياطية");
      else if (result === "failed") toast.error("تعذّر حفظ النسخة الاحتياطية");
    } catch {
      toast.error("تعذّر حفظ النسخة الاحتياطية");
    }
  };

  const restore = async (file: File) => {
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (
        typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        (raw as Record<string, unknown>).version !== 1 ||
        typeof (raw as Record<string, unknown>).exportedAt !== "string"
      ) {
        toast.error("هذا ليس ملف نسخة احتياطية من أثر، أو أنه تالف");
        return;
      }
      await importState(raw as ExportBlobV1);
      toast.success("استُعيدت بياناتك");
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("تعذّرت قراءة الملف");
    }
  };

  const clear = (choice: ClearChoice) => {
    try {
      if (choice === "adhkar") resetAdhkarProgress();
      else if (choice === "quran") resetQuranData();
      else {
        clearEverything();
        toast.success(CLEAR_TEXT.all.done);
        setTimeout(() => window.location.reload(), 800);
        return;
      }
      toast.success(CLEAR_TEXT[choice].done);
    } catch {
      toast.error("تعذّر المسح");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <>
      <SettingsSection
        title="النسخ الاحتياطي"
        footer="تحفظ النسخة تقدّمك ومفضلتك وإعداداتك في ملف واحد، يمكنك وضعه في الملفات أو Google Drive أو iCloud واستعادته على أي جهاز."
      >
        <SettingsRow id="backup" icon={<Download size={17} />} title="حفظ نسخة احتياطية" onClick={() => void backup()} />
        <div className="settings-row">
          <label className="settings-row-head is-button">
            <span className="settings-row-icon" aria-hidden="true"><Upload size={17} /></span>
            <span className="settings-row-text">
              <span className="settings-row-title">استعادة من نسخة</span>
              <span className="settings-row-hint">تحلّ محلّ بياناتك الحالية</span>
            </span>
            <input
              type="file"
              accept=".athar,application/json"
              className="sr-only"
              aria-label="استعادة من نسخة احتياطية"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void restore(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="مسح البيانات" footer="لا يمكن التراجع عن المسح. احفظ نسخة احتياطية قبله إن أردت.">
        {(["adhkar", "quran", "all"] as const).map((choice) => (
          <SettingsRow
            key={choice}
            id={choice === "adhkar" ? "clear" : undefined}
            icon={choice === "adhkar" ? <BookMarked size={17} /> : choice === "quran" ? <BookOpen size={17} /> : <Trash2 size={17} />}
            title={<span className={choice === "all" ? "text-(--danger)" : undefined}>{CLEAR_TEXT[choice].title}</span>}
            hint={CLEAR_TEXT[choice].hint}
            control={confirming === choice ? (
              <span className="flex gap-1.5">
                <button type="button" className="settings-choice-preview" onClick={() => setConfirming(null)}>إلغاء</button>
                <button type="button" className="settings-choice-preview !border-(--danger) !text-(--danger)" onClick={() => clear(choice)}>
                  {CLEAR_TEXT[choice].confirm}
                </button>
              </span>
            ) : (
              <button type="button" className="settings-choice-preview" onClick={() => setConfirming(choice)}>مسح</button>
            )}
          />
        ))}
      </SettingsSection>
    </>
  );
}
