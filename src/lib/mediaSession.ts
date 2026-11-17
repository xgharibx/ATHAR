import { Capacitor } from "@capacitor/core";
import type { MediaSessionAction, MediaSessionPlaybackState, MetadataOptions } from "@capgo/capacitor-media-session";

/**
 * Lock-screen, notification, headphone and car controls for long-form audio
 * (Quran recitation and the radio).
 *
 * The web app uses the browser's Media Session API. The Android and iOS apps
 * use a native media session: on Android it runs a media playback
 * foreground service, which keeps audio going with the screen off and shows
 * the media notification; on iOS it fills the Now Playing controls.
 *
 * One player owns the session at a time. A player claims it when it starts
 * and only the current owner can update or release it, so the recitation and
 * the radio never overwrite each other's controls.
 */
export type MediaOwner = "quran" | "radio";
export type MediaHandlers = Partial<Record<Extract<MediaSessionAction, "play" | "pause" | "stop" | "nexttrack" | "previoustrack">, () => void>>;
export type NowPlaying = { title: string; artist?: string; album?: string };

const ACTIONS = ["play", "pause", "stop", "nexttrack", "previoustrack"] as const;
const ARTWORK_PATH = "/icons/icon-512.png";

let owner: MediaOwner | null = null;
let nativePlugin: Promise<typeof import("@capgo/capacitor-media-session").MediaSession> | null = null;
let artworkDataUrl: Promise<string | null> | null = null;

const isNative = () => Capacitor.isNativePlatform();

function plugin() {
  nativePlugin ??= import("@capgo/capacitor-media-session").then((module) => module.MediaSession);
  return nativePlugin;
}

/** The app icon as a data URL: native code cannot read the web view's own paths. */
function nativeArtwork(): Promise<string | null> {
  artworkDataUrl ??= fetch(ARTWORK_PATH)
    .then((response) => (response.ok ? response.blob() : Promise.reject(new Error("artwork unavailable"))))
    .then((blob) => new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    }))
    .catch(() => null);
  return artworkDataUrl;
}

function webSession(): MediaSession | null {
  return typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
}

/** Take over the controls for a player that is starting. */
export async function claimMediaSession(next: MediaOwner, info: NowPlaying, handlers: MediaHandlers): Promise<void> {
  owner = next;
  const metadata: MetadataOptions = { title: info.title, artist: info.artist, album: info.album ?? "أثر" };
  try {
    if (isNative()) {
      const session = await plugin();
      if (owner !== next) return;
      const artwork = await nativeArtwork();
      await session.setMetadata({ ...metadata, artwork: artwork ? [{ src: artwork, sizes: "512x512", type: "image/png" }] : [] });
      for (const action of ACTIONS) {
        const handler = handlers[action];
        await session.setActionHandler({ action }, handler ? () => { if (owner === next) handler(); } : null);
      }
      return;
    }
    const session = webSession();
    if (!session || typeof MediaMetadata === "undefined") return;
    session.metadata = new MediaMetadata({ ...metadata, artwork: [{ src: ARTWORK_PATH, sizes: "512x512", type: "image/png" }] });
    for (const action of ACTIONS) {
      const handler = handlers[action];
      try {
        session.setActionHandler(action, handler ? () => { if (owner === next) handler(); } : null);
      } catch {
        // The browser does not support this action.
      }
    }
  } catch {
    // Controls are a convenience; playback must never fail because of them.
  }
}

/** Update the title shown on the controls, if this player still owns them. */
export async function updateNowPlaying(from: MediaOwner, info: NowPlaying): Promise<void> {
  if (owner !== from) return;
  const metadata: MetadataOptions = { title: info.title, artist: info.artist, album: info.album ?? "أثر" };
  try {
    if (isNative()) {
      const artwork = await nativeArtwork();
      await (await plugin()).setMetadata({ ...metadata, artwork: artwork ? [{ src: artwork, sizes: "512x512", type: "image/png" }] : [] });
      return;
    }
    const session = webSession();
    if (session && typeof MediaMetadata !== "undefined") {
      session.metadata = new MediaMetadata({ ...metadata, artwork: [{ src: ARTWORK_PATH, sizes: "512x512", type: "image/png" }] });
    }
  } catch {
    // ignore
  }
}

/** Show playing or paused, if this player still owns the controls. */
export async function setMediaPlaybackState(from: MediaOwner, state: Exclude<MediaSessionPlaybackState, "none">): Promise<void> {
  if (owner !== from) return;
  try {
    if (isNative()) {
      await (await plugin()).setPlaybackState({ playbackState: state });
      return;
    }
    const session = webSession();
    if (session) session.playbackState = state;
  } catch {
    // ignore
  }
}

/** Remove the controls (and Android's media notification) when a player stops. */
export async function releaseMediaSession(from: MediaOwner): Promise<void> {
  if (owner !== from) return;
  owner = null;
  try {
    if (isNative()) {
      const session = await plugin();
      await session.setPlaybackState({ playbackState: "none" });
      for (const action of ACTIONS) await session.setActionHandler({ action }, null);
      return;
    }
    const session = webSession();
    if (!session) return;
    session.playbackState = "none";
    session.metadata = null;
    for (const action of ACTIONS) {
      try {
        session.setActionHandler(action, null);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

/** The player that currently owns the controls. */
export function currentMediaOwner(): MediaOwner | null {
  return owner;
}
