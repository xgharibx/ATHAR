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

export function UpdatePill() {
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

  return (
    <div className="update-pill-wrap">
      <button
        type="button"
        className="update-pill"
        onClick={open}
        aria-label={`تحديث متاح — الإصدار ${latest}`}
        title={`الإصدار ${latest}`}
      >
        <ArrowUpCircle size={15} aria-hidden="true" />
        <span>تحديث</span>
      </button>
      <button
        type="button"
        className="update-pill-dismiss"
        onClick={dismiss}
        aria-label="إخفاء إشعار التحديث"
      >
        <X size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

export default UpdatePill;
