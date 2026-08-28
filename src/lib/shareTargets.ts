/**
 * One way to share, everywhere.
 *
 * The web path (`navigator.share`) is not available in the Capacitor Android
 * WebView at all, so "share as photo" fell through to an <a download> click
 * that a WebView has nowhere to put — a button that produced no sheet and no
 * file. Native goes through ShareBridge (see ShareBridgePlugin.java, written
 * by hand because @capacitor/share's build.gradle breaks current AGP).
 *
 * Order matters: native bridge → Web Share with files → Web Share text-only →
 * download. Each step is a genuine fallback, not a guess.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

/** Where the app can be installed. Appended to anything shared. */
export const STORE_LINKS = {
  android: "https://play.google.com/store/apps/details?id=com.athar.adhkar",
  web: "https://www.athark.org",
} as const;

/**
 * The invitation appended to shared content.
 *
 * Kept to three short lines on purpose. The point of sharing a dhikr is the
 * dhikr; a long advert underneath it makes the whole message read as promotion
 * and people stop sending them. This is the pattern the well-behaved Arabic
 * Islamic apps use — one line of identity, one link, nothing else.
 */
export function appInvite(): string {
  return `\n\n— تطبيق أثر · أذكار وقرآن\n${STORE_LINKS.android}`;
}

/** Append the invitation unless the text already carries it. */
export function withInvite(text: string): string {
  if (text.includes(STORE_LINKS.android)) return text;
  return `${text}${appInvite()}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("could not read blob"));
    r.readAsDataURL(blob);
  });
}

type ShareBridge = {
  shareImage(o: { base64: string; filename?: string; text?: string; title?: string }): Promise<void>;
  saveImage(o: { base64: string; filename?: string }): Promise<void>;
  shareText(o: { text: string; title?: string }): Promise<void>;
};

let cachedBridge: ShareBridge | null | undefined;

/**
 * The native bridge, or null off-device.
 *
 * **Deliberately not async.** `registerPlugin()` returns a Proxy that answers
 * ANY property access with a native method call — including `.then`. Returning
 * it from an async function therefore made JavaScript treat it as a thenable:
 * it read `.then`, got back something callable, and invoked it as a promise,
 * which asked Android for a plugin method literally named `then`. That
 * rejected with `"ShareBridge.then()" is not implemented on android`, and
 * because the unwrapping happens outside the function body, the try/catch
 * never saw it. `await nativeBridge()` thus threw instead of yielding a bridge,
 * and EVERY share and save on Android failed silently — the button did nothing
 * at all, which is exactly what it looked like.
 *
 * Cached as well, so repeat calls stop tripping Capacitor's "already
 * registered" warning.
 */
function nativeBridge(): ShareBridge | null {
  if (cachedBridge !== undefined) return cachedBridge;
  if (!Capacitor.isNativePlatform()) {
    cachedBridge = null;
    return null;
  }
  try {
    cachedBridge = registerPlugin<ShareBridge>("ShareBridge");
  } catch {
    cachedBridge = null;
  }
  return cachedBridge;
}

export type ShareResult = "shared" | "downloaded" | "failed";
export type SaveResult = "saved" | "shared" | "downloaded" | "failed";

/** Share an image, with the text (and app invitation) alongside it. */
export async function shareImageBlob(
  blob: Blob,
  opts: { filename?: string; text?: string; title?: string } = {},
): Promise<ShareResult> {
  const filename = opts.filename ?? "athar.png";
  const text = withInvite(opts.text ?? "");
  const title = opts.title ?? "أثر";

  const bridge = nativeBridge();
  if (bridge) {
    try {
      await bridge.shareImage({ base64: await blobToBase64(blob), filename, text, title });
      return "shared";
    } catch {
      // fall through — a cancelled sheet and a broken bridge look the same, so
      // the web paths below are still worth trying.
    }
  }

  const file = new File([blob], filename, { type: blob.type || "image/png" });
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch {
      return "failed"; // user dismissed, or the sheet refused
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

/** Share plain text, with the app invitation appended. */
export async function shareText(raw: string, title = "أثر"): Promise<ShareResult> {
  const text = withInvite(raw);

  const bridge = nativeBridge();
  if (bridge) {
    try {
      await bridge.shareText({ text, title });
      return "shared";
    } catch {
      /* fall through */
    }
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text, title });
      return "shared";
    } catch {
      return "failed";
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "downloaded"; // copied — the caller words it
  } catch {
    return "failed";
  }
}

/**
 * Put an image where the user can find it again.
 *
 * Every caller used to do this with an <a download> click and then report
 * success unconditionally. In the Capacitor WebView there is no download
 * manager for that click to reach, so on Android and iOS the button produced
 * no file and a message saying it had — the single most misleading thing the
 * app did.
 *
 * Three honest outcomes, in order of preference:
 *   - Android: written straight into Pictures/Athar via MediaStore.
 *   - iOS: no bridge implementation exists, so the share sheet is offered
 *     instead; "Save Image" there is one tap and genuinely saves.
 *   - Web: the <a download> that does work in a real browser.
 *
 * The result says which of those actually happened, so callers can stop
 * claiming a download that never occurred.
 */
export async function saveImageBlob(
  blob: Blob,
  opts: { filename?: string; text?: string; title?: string } = {},
): Promise<SaveResult> {
  const filename = opts.filename ?? "athar.png";

  const bridge = nativeBridge();
  if (bridge) {
    try {
      await bridge.saveImage({ base64: await blobToBase64(blob), filename });
      return "saved";
    } catch {
      // No saveImage on this platform (iOS has no bridge at all). Offering the
      // share sheet is the nearest real thing — it can save to Photos/Files.
      const shared = await shareImageBlob(blob, opts);
      return shared === "failed" ? "failed" : shared;
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "downloaded";
  } catch {
    return "failed";
  }
}

/** The message that matches what actually happened. */
export function saveResultMessage(r: SaveResult): { ok: boolean; text: string } {
  switch (r) {
    case "saved":
      return { ok: true, text: "تم حفظ الصورة في المعرض" };
    case "downloaded":
      return { ok: true, text: "تم تنزيل الصورة" };
    case "shared":
      return { ok: true, text: "تمت المشاركة" };
    default:
      return { ok: false, text: "تعذّر حفظ الصورة" };
  }
}
