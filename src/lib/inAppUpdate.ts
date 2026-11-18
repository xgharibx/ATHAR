/**
 * Google Play's in-app update for the Android Play build (InAppUpdatePlugin).
 * The new version downloads in the background while the person keeps using
 * Athar; one tap then restarts into it. Everywhere else (Huawei, iPhone, web)
 * the update pill keeps opening the store page.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type PlayUpdateStatus = "downloading" | "downloaded" | "installing" | "failed" | "canceled";

type InAppUpdatePlugin = {
  start(): Promise<{ started: boolean }>;
  complete(): Promise<void>;
  status(): Promise<{ downloaded: boolean }>;
  addListener(event: "state", listener: (state: { status: PlayUpdateStatus; progress?: number }) => void): Promise<PluginListenerHandle>;
};

let plugin: InAppUpdatePlugin | null = null;

function androidPlugin(): InAppUpdatePlugin | null {
  if (Capacitor.getPlatform() !== "android") return null;
  plugin ??= registerPlugin<InAppUpdatePlugin>("InAppUpdate");
  return plugin;
}

/** Start Play's update download. False when Play has nothing to offer (or this is not a Play build). */
export async function startPlayUpdate(): Promise<boolean> {
  const native = androidPlugin();
  if (!native) return false;
  try {
    return (await native.start()).started;
  } catch {
    return false;
  }
}

/** Restart into a downloaded update. */
export async function completePlayUpdate(): Promise<void> {
  await androidPlugin()?.complete().catch(() => {});
}

/** Whether an update finished downloading earlier and only needs a restart. */
export async function playUpdateDownloaded(): Promise<boolean> {
  const native = androidPlugin();
  if (!native) return false;
  try {
    return (await native.status()).downloaded;
  } catch {
    return false;
  }
}

/** Follow the download; returns an unsubscribe function. */
export function onPlayUpdateState(listener: (status: PlayUpdateStatus, progress?: number) => void): () => void {
  const native = androidPlugin();
  if (!native) return () => {};
  let handle: PluginListenerHandle | null = null;
  let cancelled = false;
  void native.addListener("state", ({ status, progress }) => listener(status, progress))
    .then((h) => {
      if (cancelled) void h.remove();
      else handle = h;
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    void handle?.remove();
  };
}
