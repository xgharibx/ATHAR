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

import { useUpdateAvailable, STORE_URL } from "@/hooks/useUpdateAvailable";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";

export function UpdatePill() {
  return Capacitor.isNativePlatform() ? <NativeUpdatePill /> : <WebUpdatePill />;
}

function NativeUpdatePill() {
  const { available, latest, dismiss } = useUpdateAvailable();

  if (!available) return null;

  const open = () => {
    const url = Capacitor.getPlatform() === "android" ? STORE_URL.android : STORE_URL.web;
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = url;
    }
  };

  return <UpdateAction label={`تحديث متاح — الإصدار ${latest}`} title={`الإصدار ${latest}`} onOpen={open} onDismiss={dismiss} />;
}

function WebUpdatePill() {
  const { available, applying, apply, dismiss } = usePwaUpdate();
  if (!available) return null;
  const open = () => {
    if (window.confirm("سيُعاد تحميل التطبيق لتطبيق التحديث. احفظ أي تغييرات غير محفوظة أولًا. هل تريد تطبيق التحديث الآن؟")) apply();
  };
  return <UpdateAction label="تحديث متاح — تطبيق التحديث" title="تطبيق التحديث بعد حفظ تغييراتك" applying={applying} onOpen={open} onDismiss={dismiss} />;
}

function UpdateAction({ label, title, applying = false, onOpen, onDismiss }: {
  label: string;
  title: string;
  applying?: boolean;
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
        <span>{applying ? "جارٍ التحديث…" : "تحديث"}</span>
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
