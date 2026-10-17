/**
 * Which store this install came from, and where to send people to update it.
 *
 * Athar ships to Google Play and to Huawei AppGallery from one codebase. The
 * only thing that has to differ is where "a new version is out" leads — a
 * Huawei phone has no Play Store, so a Play link on one is a dead end, and the
 * same goes the other way.
 *
 * The native build is told its store at compile time (-Pstore=huawei) and
 * reports it through the StoreInfo plugin. It is deliberately NOT inferred from
 * the device manufacturer: someone can sideload, or install Play on a Huawei
 * phone, and a guess from the hardware would be wrong exactly when it matters.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export type StoreName = "play" | "huawei" | "ios" | "web";

/**
 * The id AppGallery assigns when the listing is created (shown in AppGallery
 * Connect as "App ID", e.g. "C115412345"). Until it is filled in, Huawei users
 * are sent to the website instead — a working page beats a broken store link.
 * See huawei/PUBLISHING_STEPS.md.
 */
export const HUAWEI_APPGALLERY_APP_ID = "";

export const PLAY_LISTING_URL = "https://play.google.com/store/apps/details?id=com.athar.adhkar";
export const WEB_URL = "https://www.athark.org";

type StoreInfoPlugin = {
  get(): Promise<{ store?: string }>;
  open(opts: { webUrl?: string }): Promise<void>;
};

let cached: StoreName | null = null;

function platformDefault(): StoreName {
  // Sharing reads this on every message. Nothing about working out which store
  // we came from is allowed to be the reason a share fails.
  let p = "web";
  try {
    p = Capacitor.getPlatform();
  } catch {
    /* treat as web */
  }
  if (p === "android") return "play"; // until the native side says otherwise
  if (p === "ios") return "ios";
  return "web";
}

/** The store, as best known right now. Correct once loadStoreIdentity() has run. */
export function currentStore(): StoreName {
  return cached ?? platformDefault();
}

/** Ask the native build which store it is for. Safe to call repeatedly. */
export async function loadStoreIdentity(): Promise<StoreName> {
  if (cached) return cached;
  if (Capacitor.getPlatform() !== "android") {
    cached = platformDefault();
    return cached;
  }
  try {
    // Held in a local and only a plain value is returned: a Capacitor plugin
    // handle is a Proxy that answers .then, so returning it from an async
    // function makes JavaScript call a native method named "then".
    const plugin = registerPlugin<StoreInfoPlugin>("StoreInfo");
    const res = await plugin.get();
    cached = res?.store === "huawei" ? "huawei" : "play";
  } catch {
    cached = "play"; // an older build without the plugin is a Play build
  }
  return cached;
}

function appGalleryUrl(): string {
  const id = HUAWEI_APPGALLERY_APP_ID.trim();
  if (!id) return WEB_URL;
  return `https://appgallery.huawei.com/app/${id.startsWith("C") ? id : `C${id}`}`;
}

/** The link a person can follow to get or update the app from where they got it. */
export function storeListingUrl(store: StoreName = currentStore()): string {
  switch (store) {
    case "play":
      return PLAY_LISTING_URL;
    case "huawei":
      return appGalleryUrl();
    default:
      return WEB_URL;
  }
}

/** Every link this app might ever put in a shared message, for de-duplication. */
export function allKnownStoreLinks(): string[] {
  return [PLAY_LISTING_URL, appGalleryUrl(), WEB_URL].filter(Boolean);
}

/**
 * Open the store listing. Native uses the store's own deep link so it lands in
 * the store app; everywhere else it is a normal link.
 */
export async function openStoreListing(): Promise<void> {
  const store = await loadStoreIdentity();
  const webUrl = storeListingUrl(store);
  if (Capacitor.getPlatform() === "android") {
    try {
      const plugin = registerPlugin<StoreInfoPlugin>("StoreInfo");
      await plugin.open({ webUrl });
      return;
    } catch {
      /* fall through to a plain link */
    }
  }
  try {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = webUrl;
  }
}
