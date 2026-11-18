import * as React from "react";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import {
  ensureExactAlarmPermission,
  getNotificationPermission,
  playPrayerSoundPreview,
  playReminderSoundPreview,
  requestNotificationPermission,
  stopSoundPreview,
  type PRAYER_SOUND_OPTIONS,
  type REMINDER_SOUND_OPTIONS,
} from "@/lib/reminders";

export type Platform = "ios" | "android" | "web";

export function usePlatform(): Platform {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : "web";
}

export type NotificationPermission = "unknown" | "granted" | "denied" | "prompt";

/** The phone's notification permission, re-read whenever Athar comes back to the screen. */
export function useNotificationPermission(): [NotificationPermission, () => Promise<NotificationPermission>] {
  const [permission, setPermission] = React.useState<NotificationPermission>("unknown");
  const refresh = React.useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return "unknown" as const;
    try {
      const next = await getNotificationPermission();
      setPermission(next);
      return next;
    } catch {
      return "unknown" as const;
    }
  }, []);
  React.useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
  return [permission, refresh];
}

/**
 * Before turning on something that notifies: ask for the permission (and
 * exact alarms on Android). Resolves to whether notifications may be shown.
 */
export async function ensureNotificationsAllowed(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      toast.error("اسمح لأثر بالإشعارات من إعدادات الهاتف");
      return false;
    }
    await ensureExactAlarmPermission();
    return true;
  } catch {
    toast.error("تعذّر طلب إذن الإشعارات");
    return false;
  }
}

type ReminderSound = (typeof REMINDER_SOUND_OPTIONS)[number]["id"];
type PrayerSound = (typeof PRAYER_SOUND_OPTIONS)[number]["id"];

/** One sound preview at a time, stopped when the page closes. */
export function useSoundPreview() {
  const [playing, setPlaying] = React.useState<string | null>(null);
  React.useEffect(() => () => { stopSoundPreview(); }, []);
  const toggle = React.useCallback(async (key: string, play: (onDone: () => void) => Promise<void>) => {
    if (playing === key) {
      stopSoundPreview();
      setPlaying(null);
      return;
    }
    setPlaying(key);
    try {
      await play(() => setPlaying(null));
    } catch {
      setPlaying(null);
      toast.error("تعذّر تشغيل الصوت");
    }
  }, [playing]);
  return {
    playing,
    previewReminder: (id: ReminderSound) => toggle(`reminder:${id}`, (onDone) => playReminderSoundPreview(id, onDone)),
    previewPrayer: (id: PrayerSound) => toggle(`prayer:${id}`, (onDone) => playPrayerSoundPreview(id, onDone)),
  };
}

/** Brings a row reached from search into view and makes it glow for a moment. */
export function useSettingHighlight(hash: string) {
  React.useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!id) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-highlighted");
      window.setTimeout(() => el.classList.remove("is-highlighted"), 1800);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [hash]);
}
