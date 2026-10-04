import { accountScopedLocalStorage } from "@/lib/accountStorageScope";

export const PRAYER_COORDS_KEY = "noor_prayer_coords_v1";
export const PRAYER_LOCATION_CHANGED_EVENT = "athar:prayer-location-changed";

export const DEFAULT_PRAYER_CITY = {
  city: "Cairo",
  country: "Egypt",
} as const;

export type PrayerCoordinates = {
  lat: number;
  lng: number;
};

export function readCachedPrayerCoordinates(): PrayerCoordinates | null {
  try {
    const raw = accountScopedLocalStorage.getItem(PRAYER_COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrayerCoordinates;
    if (
      !Number.isFinite(parsed?.lat) || parsed.lat < -90 || parsed.lat > 90 ||
      !Number.isFinite(parsed?.lng) || parsed.lng < -180 || parsed.lng > 180
    ) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}

/** Remove this account's saved GPS choice and notify prayer views to use the city fallback. */
export function clearCachedPrayerCoordinates(): boolean {
  try {
    accountScopedLocalStorage.removeItem(PRAYER_COORDS_KEY);
  } catch {
    return false;
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PRAYER_LOCATION_CHANGED_EVENT));
  return true;
}

export function getPrayerLocationIdentity(coords: PrayerCoordinates | null): string {
  return coords
    ? `coords:${coords.lat}:${coords.lng}`
    : `city:${DEFAULT_PRAYER_CITY.city}:${DEFAULT_PRAYER_CITY.country}`;
}
