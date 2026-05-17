import { loadQuranDB, loadQuranPageMap } from "@/data/quranLoad";
import {
  idbGetPageMapMeta,
  idbGetQuranMeta,
  idbSetPageMap,
  idbSetPageMapPinned,
  idbSetQuran,
  idbSetQuranPinned,
} from "@/lib/quranIDB";

export type MushafOfflineProgress = {
  done: number;
  total: number;
  label: string;
};

export type MushafOfflineStatus = {
  ready: boolean;
  bundledReady: boolean;
  indexedDBReady: boolean;
  quranReady: boolean;
  pageMapReady: boolean;
  quranCached: boolean;
  pageMapCached: boolean;
  pinnedAt?: number;
  cachedAt?: number;
  sizeLabel: string;
};

export const MUSHAF_OFFLINE_SIZE_LABEL = "نحو ١٫٦ م.ب";
const BUNDLED_MUSHAF_READY = true;

let ensureMushafCorePromise: Promise<MushafOfflineStatus> | null = null;

export async function getMushafOfflineStatus(): Promise<MushafOfflineStatus> {
  const [quranMeta, pageMapMeta] = await Promise.all([
    idbGetQuranMeta(),
    idbGetPageMapMeta(),
  ]);
  const quranReady = !!quranMeta?.pinnedAt;
  const pageMapReady = !!pageMapMeta?.pinnedAt;
  const indexedDBReady = quranReady && pageMapReady;
  const pinnedAtValues = [quranMeta?.pinnedAt, pageMapMeta?.pinnedAt].filter((value): value is number => typeof value === "number");
  const cachedAtValues = [quranMeta?.cachedAt, pageMapMeta?.cachedAt].filter((value): value is number => typeof value === "number");

  return {
    ready: BUNDLED_MUSHAF_READY || indexedDBReady,
    bundledReady: BUNDLED_MUSHAF_READY,
    indexedDBReady,
    quranReady: BUNDLED_MUSHAF_READY || quranReady,
    pageMapReady: BUNDLED_MUSHAF_READY || pageMapReady,
    quranCached: !!quranMeta && !quranMeta.stale,
    pageMapCached: !!pageMapMeta && !pageMapMeta.stale,
    pinnedAt: pinnedAtValues.length ? Math.min(...pinnedAtValues) : undefined,
    cachedAt: cachedAtValues.length ? Math.min(...cachedAtValues) : undefined,
    sizeLabel: MUSHAF_OFFLINE_SIZE_LABEL,
  };
}

export async function downloadMushafCore(onProgress?: (progress: MushafOfflineProgress) => void): Promise<MushafOfflineStatus> {
  const total = 3;
  onProgress?.({ done: 0, total, label: "تهيئة النسخة المحلية" });

  onProgress?.({ done: 1, total, label: "نسخ نص القرآن" });
  const quran = await loadQuranDB();
  await idbSetQuran(quran, { pinned: true });

  onProgress?.({ done: 2, total, label: "نسخ فهرس الصفحات" });
  const pageMap = await loadQuranPageMap();
  await idbSetPageMap(pageMap, { pinned: true });

  onProgress?.({ done: 3, total, label: "التحقق من الجاهزية" });
  const status = await getMushafOfflineStatus();
  if (!status.indexedDBReady) {
    throw new Error("Mushaf core data was cached but not fully pinned");
  }
  return status;
}

export async function ensureMushafCoreOffline(): Promise<MushafOfflineStatus> {
  const status = await getMushafOfflineStatus();
  if (status.indexedDBReady) return status;
  if (!ensureMushafCorePromise) {
    ensureMushafCorePromise = downloadMushafCore().finally(() => {
      ensureMushafCorePromise = null;
    });
  }
  return ensureMushafCorePromise;
}

export async function clearMushafOfflineCore(): Promise<MushafOfflineStatus> {
  await Promise.all([
    idbSetQuranPinned(false),
    idbSetPageMapPinned(false),
  ]);
  return getMushafOfflineStatus();
}