/**
 * "A new version is out" — in the header, and only when it is true.
 *
 * Sits where the hamburger used to. The bar is otherwise static furniture, so
 * this is the one place in the app worth spending on something conditional:
 * most of the time it renders nothing at all, and the header is simply cleaner
 * than it was.
 *
 * Restrained on purpose. A pill, the app's own accent, one slow breath of a
 * halo — not a badge, not a modal, not a red dot. It can be dismissed, and the
 * dismissal only covers the version it was made about.
 */
import React from "react";
import { ArrowUpCircle, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import { useUpdateAvailable } from "@/hooks/useUpdateAvailable";
import { openStoreListing } from "@/lib/storeIdentity";
import { completePlayUpdate, onPlayUpdateState, playUpdateDownloaded, startPlayUpdate } from "@/lib/inAppUpdate";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";

export function UpdatePill() {
  return Capacitor.isNativePlatform() ? <NativeUpdatePill /> : <WebUpdatePill />;
}

function NativeUpdatePill() {
  const { available, latest, dismiss } = useUpdateAvailable();
  // Google Play builds: download inside the app, then restart into it.
  const [phase, setPhase] = React.useState<"idle" | "downloading" | "downloaded">("idle");

  React.useEffect(() => {
    let active = true;
    void playUpdateDownloaded().then((downloaded) => {
      if (active && downloaded) setPhase("downloaded");
    });
    const stop = onPlayUpdateState((status) => {
      if (status === "downloading") setPhase("downloading");
      else if (status === "downloaded") setPhase("downloaded");
      else if (status === "failed" || status === "canceled") setPhase("idle");
    });
    return () => {
      active = false;
      stop();
    };
  }, []);

  if (phase === "downloaded") {
    return (
      <UpdateAction
        label="اكتمل تنزيل التحديث — أعد التشغيل"
        title="أعد تشغيل أثر لتثبيت التحديث"
        text="أعد التشغيل"
        onOpen={() => void completePlayUpdate()}
        onDismiss={() => setPhase("idle")}
      />
    );
  }
  if (!available && phase === "idle") return null;

  const open = async () => {
    if (phase === "downloading") return;
    if (await startPlayUpdate()) {
      setPhase("downloading");
      return;
    }
    // Huawei builds, iPhone, or Play has nothing to offer yet (staged
    // rollout): the store page, opened natively inside the store app.
    void openStoreListing();
  };

  return (
    <UpdateAction
      label={phase === "downloading" ? "جارٍ تنزيل التحديث" : `تحديث متاح — الإصدار ${latest}`}
      title={`الإصدار ${latest}`}
      applying={phase === "downloading"}
      applyingText="جارٍ التنزيل…"
      onOpen={() => void open()}
      onDismiss={dismiss}
    />
  );
}

function WebUpdatePill() {
  const { available, applying, apply, dismiss } = usePwaUpdate();
  if (!available) return null;
  const open = () => {
    if (window.confirm("سيُعاد تحميل التطبيق لتطبيق التحديث. احفظ أي تغييرات غير محفوظة أولًا. هل تريد تطبيق التحديث الآن؟")) apply();
  };
  return <UpdateAction label="تحديث متاح — تطبيق التحديث" title="تطبيق التحديث بعد حفظ تغييراتك" applying={applying} onOpen={open} onDismiss={dismiss} />;
}

function UpdateAction({ label, title, applying = false, text = "تحديث", applyingText = "جارٍ التحديث…", onOpen, onDismiss }: {
  label: string;
  title: string;
  applying?: boolean;
  text?: string;
  applyingText?: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="update-pill-wrap">
      <button
        type="button"
        className="update-pill"
        onClick={onOpen}
        disabled={applying}
        aria-label={label}
        title={title}
      >
        <ArrowUpCircle size={15} aria-hidden="true" />
        <span>{applying ? applyingText : text}</span>
      </button>
      <button
        type="button"
        className="update-pill-dismiss"
        onClick={onDismiss}
        disabled={applying}
        aria-label="إخفاء إشعار التحديث"
      >
        <X size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

export default UpdatePill;
