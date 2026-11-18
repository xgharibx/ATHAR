/**
 * Prayer times that follow you when you travel.
 *
 * When the app opens or comes back, and the person already uses their
 * location for prayer times with the location permission granted, Athar
 * checks where the phone is (no new permission, no background tracking). If
 * it is more than 25 km from the saved place, the location is updated, so the
 * times, alerts and alarms follow. Settings › تنبيهات الصلوات can turn it off.
 *
 * While the app stays closed, the phone notices a new time zone itself and
 * asks the person to open Athar (PrayerTopUp, `tz` in the plan).
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { getAccountStorageOwner } from "@/lib/accountStorageScope";
import { readCachedPrayerCoordinates, type PrayerCoordinates } from "@/lib/prayerLocation";

export const TRAVEL_DISTANCE_KM = 25;
/** At most one check this often. */
const CHECK_INTERVAL_MS = 20 * 60_000;

/** Great-circle distance in km. */
export function distanceKm(a: PrayerCoordinates, b: PrayerCoordinates): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

type LocationAccessPlugin = { status(): Promise<{ granted: boolean }> };

/** Whether the location permission is already granted; never asks for it. */
async function locationGranted(): Promise<boolean> {
  try {
    return (await registerPlugin<LocationAccessPlugin>("LocationAccess").status()).granted === true;
  } catch {
    return false;
  }
}

function currentPosition(): Promise<PrayerCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  });
}

let lastCheck = Number.NEGATIVE_INFINITY;

export type TravelCheck = "moved" | "same" | "skipped";

/** Update the saved prayer location if the phone has moved far from it. */
export async function followTravel(
  save: (lat: number, lng: number) => void,
  options: { enabled: boolean; now?: number } = { enabled: true },
): Promise<TravelCheck> {
  const now = options.now ?? Date.now();
  if (!options.enabled || !Capacitor.isNativePlatform() || now - lastCheck < CHECK_INTERVAL_MS) return "skipped";
  const saved = readCachedPrayerCoordinates();
  // City mode: the person has not chosen to use their location.
  if (!saved) return "skipped";
  lastCheck = now;
  const owner = getAccountStorageOwner();
  if (!(await locationGranted())) return "skipped";
  try {
    const here = await currentPosition();
    if (getAccountStorageOwner() !== owner) return "skipped";
    if (distanceKm(saved, here) <= TRAVEL_DISTANCE_KM) return "same";
    save(here.lat, here.lng);
    return "moved";
  } catch {
    return "skipped";
  }
}

/** For tests. */
export function resetTravelCheck() {
  lastCheck = Number.NEGATIVE_INFINITY;
}
