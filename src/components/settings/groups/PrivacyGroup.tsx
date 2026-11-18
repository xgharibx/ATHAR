import * as React from "react";
import toast from "react-hot-toast";
import { Fingerprint, Sparkles, ShieldCheck } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { appLockMethodLabel, appLockStatus, appLockSupported, confirmOwner, type AppLockStatus } from "@/lib/appLock";
import { hasCompanionAiConsent, revokeCompanionAiConsent } from "@/lib/companionConsent";
import { openInApp } from "@/lib/inAppBrowser";
import { SettingsRow, SettingsSection, ToggleRow } from "@/components/settings/SettingsUI";

export function PrivacyGroup() {
  const prefs = useNoorStore((s) => s.prefs);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [kind, setKind] = React.useState<AppLockStatus["kind"]>("passcode");
  const [busy, setBusy] = React.useState(false);
  const [, refresh] = React.useReducer((n: number) => n + 1, 0);
  const aiAllowed = hasCompanionAiConsent();

  React.useEffect(() => {
    if (!appLockSupported()) return;
    let active = true;
    void appLockStatus().then((status) => {
      if (!active) return;
      setAvailable(status.available);
      setKind(status.kind);
    });
    return () => { active = false; };
  }, []);

  const toggleLock = async (next: boolean) => {
    setBusy(true);
    try {
      const status = await appLockStatus();
      if (!status.available) {
        setAvailable(false);
        toast.error("فعّل رمز قفل الهاتف أو البصمة من إعدادات الهاتف أولًا");
        return;
      }
      if (!(await confirmOwner(next ? "تفعيل قفل التطبيق" : "إيقاف قفل التطبيق"))) return;
      setPrefs({ biometricLock: next });
      toast.success(next ? "فُعّل قفل التطبيق" : "أُوقف قفل التطبيق");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {appLockSupported() ? (
        <SettingsSection title="القفل">
          <ToggleRow
            id="app-lock"
            icon={<Fingerprint size={17} />}
            title="قفل التطبيق"
            hint={available === false
              ? "فعّل رمز قفل الهاتف أو البصمة من إعدادات الهاتف لاستخدام القفل"
              : `يُطلب ${appLockMethodLabel(kind)} لفتح أثر بعد إغلاقه أو تركه دقيقة`}
            checked={prefs.biometricLock ?? false}
            disabled={available === false || busy}
            onChange={(next) => void toggleLock(next)}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="الذكاء الاصطناعي"
        footer="حين تسأل «أثر»، تُرسل رسالتك وسياق المحادثة عبر خادم أثر إلى خدمة MiniMax للذكاء الاصطناعي لكتابة الرد. يُطلب إذنك قبل أول رسالة، ويمكنك سحبه هنا متى شئت."
      >
        <SettingsRow
          id="ai"
          icon={<Sparkles size={17} />}
          title="إذن مشاركة الرسائل"
          hint={aiAllowed ? "مسموح — ستُطلب موافقتك من جديد إن سحبته" : "سيطلب أثر إذنك قبل أول رسالة"}
          control={aiAllowed ? (
            <button
              type="button"
              className="settings-choice-preview"
              onClick={() => {
                revokeCompanionAiConsent();
                refresh();
                toast.success("سُحب الإذن، وسيُطلب قبل الرسالة التالية");
              }}
            >
              سحب الإذن
            </button>
          ) : undefined}
        />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          id="privacy-policy"
          icon={<ShieldCheck size={17} />}
          title="سياسة الخصوصية"
          hint="ما الذي يحفظه أثر، وأين، ولماذا"
          onClick={() => void openInApp("https://www.athark.org/privacy.html")}
        />
      </SettingsSection>
    </>
  );
}
