/**
 * Web pages open inside Athar.
 *
 * In the apps, a source link, a library page or a "learn more" link used to
 * leave Athar for the browser, and getting back meant finding the app again.
 * Now they open in the phone's own in-app browser (InAppBrowserPlugin:
 * Safari's view on iPhone, a Chrome Custom Tab on Android), which keeps the
 * browser's sign-ins and has a Done button straight back to the same screen.
 *
 * Links that belong to another app still go to that app: the stores, maps,
 * YouTube, WhatsApp and Telegram, and anything that is not a web address
 * (mail, phone). Links inside Athar are untouched.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

type InAppBrowserPlugin = { open(options: { url: string; color?: string }): Promise<void> };

let plugin: InAppBrowserPlugin | null = null;

function native(): InAppBrowserPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<InAppBrowserPlugin>("InAppBrowser");
  return plugin;
}

/** Hosts whose links are meant for their own app, not a browser page. */
const APP_HOSTS = [
  "play.google.com",
  "apps.apple.com",
  "itunes.apple.com",
  "appgallery.huawei.com",
  "appgallery.cloud.huawei.com",
  "maps.google.com",
  "maps.apple.com",
  "goo.gl",
  "maps.app.goo.gl",
  "youtube.com",
  "youtu.be",
  "wa.me",
  "whatsapp.com",
  "t.me",
  "telegram.me",
];

function belongsToAnApp(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (APP_HOSTS.some((app) => host === app || host.endsWith(`.${app}`))) return true;
  // Google Maps also lives under google.com/maps.
  return /(^|\.)google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps");
}

/** Whether `href` should open in the in-app browser. */
export function opensInApp(href: string, base: string = typeof location === "undefined" ? "https://localhost" : location.href): boolean {
  let url: URL;
  let page: URL;
  try {
    page = new URL(base);
    url = new URL(href, page);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.origin === page.origin) return false;
  if (typeof location !== "undefined" && url.origin === location.origin) return false;
  return !belongsToAnApp(url);
}

function themeColor(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')?.content?.trim();
  return value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : undefined;
}

let originalOpen: typeof window.open | null = null;

/** Open a web page: in the in-app browser in the apps, in a new tab in a browser. */
export async function openInApp(href: string): Promise<void> {
  const bridge = native();
  if (bridge) {
    try {
      await bridge.open({ url: new URL(href, location.href).toString(), color: themeColor() });
      return;
    } catch {
      // An older app without the plugin: the browser, as before.
    }
  }
  (originalOpen ?? window.open).call(window, href, "_blank", "noopener,noreferrer");
}

let installed = false;

/**
 * In the apps, send web links and `window.open` calls to the in-app browser.
 * Runs after the app's own click handlers, so a link whose click the app
 * already handled is left alone.
 */
export function installInAppBrowserLinks(): void {
  if (installed || typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
  installed = true;

  window.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor || anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href") ?? "";
    if (!opensInApp(href)) return;
    event.preventDefault();
    void openInApp(anchor.href);
  });

  originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = url === undefined ? "" : String(url);
    if (href && opensInApp(href)) {
      void openInApp(href);
      return null;
    }
    return originalOpen!(url, target, features);
  }) as typeof window.open;
}
