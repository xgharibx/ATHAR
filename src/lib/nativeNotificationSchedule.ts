import { Capacitor } from "@capacitor/core";
import type { Schedule } from "@capacitor/local-notifications";

/** Keeps user-scheduled Android reminders eligible to fire during Doze. */
export function withAndroidDozeDelivery(schedule: Schedule): Schedule {
  return Capacitor.getPlatform() === "android"
    ? { ...schedule, allowWhileIdle: true }
    : schedule;
}
