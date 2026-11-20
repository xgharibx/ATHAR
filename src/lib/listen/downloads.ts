/**
 * Listening offline in «السماع» (the Android and iOS apps).
 *
 * A whole surah is saved as a file by the native background downloader the
 * recitations already use (WorkManager on Android, a background URL session
 * on iOS), so it carries on with the app closed; the native player then plays
 * the saved file instead of the stream. Three ways in:
 *
 *   - «احفظ ما أستمع إليه»: a track you keep listening to (half a minute or
 *     more) is saved while it plays, so next time it needs no connection;
 *   - «تنزيل» on any track, or «تنزيل الكل» for a whole recitation;
 *   - the downloads page, to play, check and remove what is saved.
 *
 * Saved files share the recitations' space budget (the oldest go first when
 * it is full); the list here is checked against what is really on the phone.
 */
import type { ListenTrack } from "@/lib/listen/catalog";
import { useListenStore } from "@/lib/listen/store";
import {
  downloadNativeRecitations,
  hasNativeRecitation,
  nativeRemoveDownloads,
  nativeSavedUrls,
} from "@/lib/nativeRecitation";

/** A whole surah in high quality is well under this; al-Baqarah at 128 kbps is about 115 MB. */
export const LISTEN_MAX_FILE_BYTES = 500 * 1024 * 1024;
/** Whole recitations are large (the full Quran is about 1–2 GB): saved listening may use up to this. */
export const LISTEN_MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024;

export function canDownloadListening(): boolean {
  return hasNativeRecitation();
}

/** Save tracks on the phone; resolves with how many are saved. */
export async function downloadTracks(
  tracks: ListenTrack[],
  options: { title?: string; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ saved: number; total: number } | null> {
  const unique = [...new Map(tracks.map((t) => [t.url, t])).values()];
  if (!canDownloadListening() || unique.length === 0) return null;
  const result = await downloadNativeRecitations(
    unique.map((t) => t.url),
    options.onProgress ?? (() => {}),
    options.title,
    "listen",
    LISTEN_MAX_FILE_BYTES,
    LISTEN_MAX_TOTAL_BYTES,
  );
  if (!result) return null;
  // Record exactly what reached the phone.
  const saved = await nativeSavedUrls(unique.map((t) => t.url));
  const done = saved ? unique.filter((t) => saved.has(t.url)) : result.saved === unique.length ? unique : [];
  useListenStore.getState().markDownloaded(done);
  return { saved: done.length, total: unique.length };
}

/** Which of these tracks are saved on the phone (by id). Empty outside the apps. */
export async function savedTrackIds(tracks: ListenTrack[]): Promise<Set<string>> {
  if (!canDownloadListening() || tracks.length === 0) return new Set();
  const saved = await nativeSavedUrls(tracks.map((t) => t.url));
  if (!saved) return new Set();
  return new Set(tracks.filter((t) => saved.has(t.url)).map((t) => t.id));
}

/** Drop list entries whose files are gone (removed to make room, or cleared). */
export async function reconcileDownloads(): Promise<ListenTrack[]> {
  const all = Object.values(useListenStore.getState().downloads);
  if (!canDownloadListening()) return all;
  const saved = await nativeSavedUrls(all.map((t) => t.url));
  if (!saved) return all;
  const gone = all.filter((t) => !saved.has(t.url)).map((t) => t.id);
  useListenStore.getState().forgetDownloads(gone);
  return all.filter((t) => saved.has(t.url)).sort((a, b) => b.savedAt - a.savedAt);
}

export async function removeDownloadedTracks(tracks: ListenTrack[]): Promise<void> {
  if (canDownloadListening()) await nativeRemoveDownloads(tracks.map((t) => t.url));
  useListenStore.getState().forgetDownloads(tracks.map((t) => t.id));
}

// ── Saving while listening ──────────────────────────────────────────────────

/** Listened this long, a track is worth keeping (a quick skip is not). */
export const AUTO_SAVE_AFTER_MS = 30_000;
const autoQueued = new Set<string>();

/** Called by the player as a track plays; saves it once, in the background. */
export function maybeAutoSave(track: ListenTrack | null, heardMs: number): void {
  if (!track || heardMs < AUTO_SAVE_AFTER_MS || autoQueued.has(track.id)) return;
  const state = useListenStore.getState();
  if (!state.autoSave || !canDownloadListening() || state.downloads[track.id]) return;
  autoQueued.add(track.id);
  void downloadTracks([track]).catch(() => {
    autoQueued.delete(track.id);
  });
}
