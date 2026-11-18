/**
 * Directions to a place in the phone's own maps app.
 *
 *   - iPhone: Apple Maps, with the place as the destination.
 *   - Android: a geo: link, which opens the phone's maps app of choice —
 *     Google Maps, Waze, or Petal Maps on Huawei phones without Google.
 *   - Web, or when no maps app answers: Google Maps on the web.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export type Place = { lat: number; lng: number; name: string };

export function webMapsUrl(place: Place): string {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

export function directionsUrl(place: Place, platform = Capacitor.getPlatform()): string {
  const label = encodeURIComponent(place.name);
  if (platform === "ios") return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${label}`;
  if (platform === "android") return `geo:0,0?q=${place.lat},${place.lng}(${label})`;
  return webMapsUrl(place);
}

/** The maps app's name for the button's label. */
export function mapsAppLabel(platform = Capacitor.getPlatform()): string {
  if (platform === "ios") return "خرائط Apple";
  if (platform === "android") return "تطبيق الخرائط";
  return "خرائط جوجل";
}

/** Android opens the geo: link through the native bridge; elsewhere the link opens itself. */
export async function openDirectionsOnAndroid(place: Place): Promise<void> {
  try {
    const bridge = registerPlugin<{ openExternal(options: { url: string }): Promise<void> }>("AuthBridge");
    await bridge.openExternal({ url: directionsUrl(place, "android") });
  } catch {
    // No maps app on the phone: the web map still works.
    window.open(webMapsUrl(place), "_blank", "noopener,noreferrer");
  }
}
