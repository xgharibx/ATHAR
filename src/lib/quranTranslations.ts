/**
 * Quran translations — Saheeh is bundled, while Yusuf Ali and Jalandhry are
 * loaded a surah at a time through the server-side Quran Foundation proxy.
 * Selected translations are cached in IndexedDB for offline reading.
 */
import * as React from "react";
import { getSupabase } from "@/lib/authClient";
import {
  QURAN_TRANSLATION_CACHE_EXPIRED_EVENT,
  QURAN_TRANSLATION_CACHE_TTL_MS,
  idbDeleteExtras,
  idbGetExtras,
  idbPruneQuranTranslationCache,
  scheduleQuranTranslationCacheExpiry,
  idbSetExtras,
} from "@/lib/quranIDB";
import { getEnglishText as getSahihEnglishText, type QuranExtras } from "@/data/quranExtras";
import { loadEnglishTranslationCache, type QuranEnglishTranslation } from "@/lib/quranTranslationLocal";
import { getSurahAyahCount, globalAyahNumber, locateGlobalAyah } from "@/data/quranSurahCounts";

export type TranslationId = "saheeh" | "yusuf_ali" | "jalandhry";

export type TranslationSource = {
  id: TranslationId;
  /** Arabic label shown first in the picker. */
  ar: string;
  /** English translator/translation name. */
  en: string;
  /** Two-letter language code used by the API. */
  lang: "en" | "ur";
  /** Quran Foundation translation ID. Saheeh is bundled so it has no ID. */
  apiId: number | null;
  /** True if the source is bundled in /public/data. */
  bundled: boolean;
  /** Approximate size for the bundled source or an uncached remote source. */
  approxSizeKB: number;
};

export const TRANSLATION_SOURCES: TranslationSource[] = [
  /*
   * NOTE: Arabic labels are intentional — they are place/writer
   * transliterations (الأجرومية / الألبيرية / الأرضية) chosen by the user.
   * Do NOT "correct" them to look like English-name transliterations
   * (e.g. "ساهيه" or "يوسف علي") without explicit user approval.
   */
  { id: "saheeh", ar: "الأجرومية", en: "Saheeh International", lang: "en", apiId: null, bundled: true, approxSizeKB: 880 },
  { id: "yusuf_ali", ar: "الألبيرية", en: "Yusuf Ali", lang: "en", apiId: 22, bundled: false, approxSizeKB: 900 },
  { id: "jalandhry", ar: "الأرضية", en: "Jalandhry", lang: "ur", apiId: 234, bundled: false, approxSizeKB: 1200 },
];

const IDB_KEY = "noor_quran_translations_v2";
const IDB_TTL_MS = QURAN_TRANSLATION_CACHE_TTL_MS;

/** A flat translation index: global ayah number → translated text. */
export type TranslationIndex = Record<number, string>;
type CachedTranslationChapter = { cachedAt: number; index: TranslationIndex };
type MemoryTranslationChapter = CachedTranslationChapter;
type RemoteTranslationPayload = { translations?: Array<{ verse_key?: unknown; text?: unknown }> };

/** One in-memory cache and one in-flight request per source and surah. */
const MEM_CACHE: Partial<Record<TranslationId, Map<number, MemoryTranslationChapter>>> = {};
const INFLIGHT: Partial<Record<TranslationId, Map<number, Promise<TranslationIndex>>>> = {};

function chapterCacheKey(id: TranslationId, surahId: number) {
  return `${IDB_KEY}:${id}:${surahId}`;
}

function isCompleteChapterIndex(surahId: number, index: TranslationIndex): boolean {
  const count = getSurahAyahCount(surahId);
  if (!count) return false;
  for (let ayah = 1; ayah <= count; ayah += 1) {
    const text = index[globalAyahNumber(surahId, ayah)];
    if (typeof text !== "string" || !text.trim()) return false;
  }
  return true;
}

function isCachedTranslation(value: unknown, surahId: number): value is CachedTranslationChapter {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<CachedTranslationChapter>;
  return Number.isFinite(row.cachedAt) && !!row.index && typeof row.index === "object" &&
    isCompleteChapterIndex(surahId, row.index);
}

function isFresh(cachedAt: number, now = Date.now()): boolean {
  const age = now - cachedAt;
  return Number.isFinite(cachedAt) && age >= 0 && age < IDB_TTL_MS;
}

function announceExpiredTranslationCache(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QURAN_TRANSLATION_CACHE_EXPIRED_EVENT));
  }
}

function cacheInMemory(id: TranslationId, surahId: number, chapter: CachedTranslationChapter): void {
  getMemoryChapters(id).set(surahId, chapter);
  scheduleQuranTranslationCacheExpiry(chapter.cachedAt);
}

function getMemoryChapters(id: TranslationId): Map<number, MemoryTranslationChapter> {
  return (MEM_CACHE[id] ??= new Map<number, MemoryTranslationChapter>());
}

function getFreshMemoryIndex(id: TranslationId, surahId: number): TranslationIndex | null {
  const cached = MEM_CACHE[id]?.get(surahId);
  if (!cached) return null;
  if (isFresh(cached.cachedAt)) return cached.index;
  MEM_CACHE[id]?.delete(surahId);
  return null;
}

function getInFlightMap(id: TranslationId): Map<number, Promise<TranslationIndex>> {
  return (INFLIGHT[id] ??= new Map<number, Promise<TranslationIndex>>());
}

function buildChapterIndex(surahId: number, raw: RemoteTranslationPayload): TranslationIndex {
  const count = getSurahAyahCount(surahId);
  if (!count || !Array.isArray(raw?.translations)) throw new Error("invalid translation chapter response");

  const out: TranslationIndex = {};
  const seen = new Set<number>();
  for (const row of raw.translations) {
    if (typeof row?.verse_key !== "string" || typeof row.text !== "string") continue;
    const match = /^(\d+):(\d+)$/.exec(row.verse_key);
    if (!match || Number(match[1]) !== surahId) continue;
    const ayah = Number(match[2]);
    const text = row.text.trim();
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > count || !text || seen.has(ayah)) {
      throw new Error("invalid translation chapter response");
    }
    seen.add(ayah);
    out[globalAyahNumber(surahId, ayah)] = text;
  }

  if (seen.size !== count) throw new Error("incomplete translation chapter");
  return out;
}

async function requestRemoteChapter(apiId: number, surahId: number): Promise<TranslationIndex> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("translation service is not configured");
  const { data, error } = await supabase.functions.invoke("quran-translations", {
    body: { translationId: apiId, chapterNumber: surahId },
  });
  if (error) throw new Error(error.message || "translation service unavailable");
  return buildChapterIndex(surahId, data as RemoteTranslationPayload);
}

async function fetchRemoteSurah(id: TranslationId, apiId: number, surahId: number): Promise<TranslationIndex> {
  const inMemory = getFreshMemoryIndex(id, surahId);
  if (inMemory) return inMemory;

  const cacheKey = chapterCacheKey(id, surahId);
  try {
    const cached = await idbGetExtras<unknown>(cacheKey);
    if (isCachedTranslation(cached, surahId)) {
      if (isFresh(cached.cachedAt)) {
        cacheInMemory(id, surahId, cached);
        return cached.index;
      }
      void idbDeleteExtras(cacheKey);
    } else if (cached !== null) {
      void idbDeleteExtras(cacheKey);
    }
  } catch {
    // Continue to the network; cache failures must not disable online reading.
  }

  const index = await requestRemoteChapter(apiId, surahId);
  const cached = { cachedAt: Date.now(), index };
  cacheInMemory(id, surahId, cached);
  void idbSetExtras(cacheKey, cached, cached.cachedAt);
  return index;
}

function getRemoteSurah(id: TranslationId, apiId: number, surahId: number): Promise<TranslationIndex> {
  const inflight = getInFlightMap(id);
  const existing = inflight.get(surahId);
  if (existing) return existing;
  const request = fetchRemoteSurah(id, apiId, surahId).finally(() => inflight.delete(surahId));
  inflight.set(surahId, request);
  return request;
}

export async function getTranslation(id: TranslationId, globalAyah: number): Promise<string | null> {
  if (id === "saheeh") {
    return MEMORY_SAHEEH ? getSahihEnglishText(MEMORY_SAHEEH, globalAyah) : null;
  }
  const source = TRANSLATION_SOURCES.find((item) => item.id === id);
  const location = locateGlobalAyah(globalAyah);
  if (!source?.apiId || !location) return null;
  try {
    const index = await getRemoteSurah(id, source.apiId, location.surahId);
    return index[globalAyah] ?? null;
  } catch {
    // A remote source never masquerades as the bundled Saheeh translation.
    return null;
  }
}

/** Prune persisted and in-memory provider text that reached the one-week limit. */
export async function pruneExpiredTranslationCache(now = Date.now()): Promise<number> {
  const removedPersisted = await idbPruneQuranTranslationCache(now);
  let removed = removedPersisted;
  let removedMemory = 0;
  for (const id of ["yusuf_ali", "jalandhry"] as const) {
    const chapters = MEM_CACHE[id];
    if (!chapters) continue;
    for (const [surahId, cached] of chapters) {
      if (isFresh(cached.cachedAt, now)) continue;
      chapters.delete(surahId);
      removed += 1;
      removedMemory += 1;
    }
  }
  if (removedMemory > 0 && removedPersisted === 0) announceExpiredTranslationCache();
  return removed;
}

if (typeof window !== "undefined") {
  window.addEventListener(QURAN_TRANSLATION_CACHE_EXPIRED_EVENT, () => {
    const now = Date.now();
    for (const id of ["yusuf_ali", "jalandhry"] as const) {
      for (const [surahId, cached] of MEM_CACHE[id] ?? []) {
        if (isFresh(cached.cachedAt, now)) continue;
        MEM_CACHE[id]?.delete(surahId);
      }
    }
  });
}

export async function getTranslationForAyah(id: TranslationId, surahId: number, ayahIndex: number): Promise<string | null> {
  const count = getSurahAyahCount(surahId);
  if (!count || !Number.isInteger(ayahIndex) || ayahIndex < 1 || ayahIndex > count) return null;
  return getTranslation(id, globalAyahNumber(surahId, ayahIndex));
}

export function getSavedTranslationId(
  prefs: { quranTranslationId?: TranslationId | null },
  override: TranslationId | null = null,
): TranslationId {
  if (override) return override;
  if (prefs.quranTranslationId) return prefs.quranTranslationId;
  return "saheeh";
}

/* Saheeh is lazily loaded by quranExtras after the user opens translation UI. */
let MEMORY_SAHEEH: QuranExtras | null = null;
export function registerSaheehExtras(extras: QuranExtras | null): void {
  MEMORY_SAHEEH = extras;
}

export function useTranslationForAyah(
  id: TranslationId,
  surahId: number,
  ayahIndex: number,
  extras: QuranExtras | null,
): string | null {
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => { registerSaheehExtras(extras); }, [extras]);
  React.useEffect(() => {
    let cancelled = false;
    setText(null);
    if (id === "saheeh") {
      const result = getSahihEnglishText(extras, globalAyahNumber(surahId, ayahIndex));
      if (!cancelled) setText(result);
      return () => { cancelled = true; };
    }
    void getTranslationForAyah(id, surahId, ayahIndex)
      .then((result) => { if (!cancelled) setText(result); })
      .catch(() => { if (!cancelled) setText(null); });
    return () => { cancelled = true; };
  }, [id, surahId, ayahIndex, extras]);
  return text;
}

export type TranslationSizeInfo = {
  source: TranslationSource;
  sizeKB: number;
  cachedAt: number | null;
};

export async function getTranslationSize(id: TranslationId): Promise<TranslationSizeInfo> {
  const source = TRANSLATION_SOURCES.find((item) => item.id === id);
  if (!source) throw new Error(`Unknown translation id: ${id}`);
  if (source.bundled) return { source, sizeKB: source.approxSizeKB, cachedAt: null };

  const rows = await Promise.all(Array.from({ length: 114 }, (_, index) =>
    idbGetExtras<unknown>(chapterCacheKey(id, index + 1))));
  const validRows = rows.filter((row, index): row is CachedTranslationChapter =>
    isCachedTranslation(row, index + 1) && isFresh(row.cachedAt));
  if (validRows.length === 0) return { source, sizeKB: source.approxSizeKB, cachedAt: null };
  const sizeBytes = validRows.reduce((total, row) => total + JSON.stringify(row.index).length, 0);
  const cachedAt = Math.max(...validRows.map((row) => row.cachedAt));
  return { source, sizeKB: Math.max(1, Math.round(sizeBytes / 1024)), cachedAt };
}

export function getTranslationSourceMeta(id: TranslationId): TranslationSource {
  const source = TRANSLATION_SOURCES.find((item) => item.id === id);
  if (!source) throw new Error(`Unknown translation id: ${id}`);
  return source;
}

export function getTranslationApproxSizeKB(id: TranslationId): number {
  return getTranslationSourceMeta(id).approxSizeKB;
}

/** Load exactly the requested chapters; remote sources are fetched by chapter and cached. */
export async function loadTranslationForSurahs(
  id: TranslationId,
  surahIds: ReadonlyArray<number>,
): Promise<QuranEnglishTranslation> {
  const source = TRANSLATION_SOURCES.find((item) => item.id === id);
  if (!source) throw new Error(`Unknown translation id: ${id}`);
  const requested = [...new Set(surahIds)].filter((surahId) => Number.isInteger(surahId) && getSurahAyahCount(surahId) > 0);

  if (source.bundled) {
    const cached = await loadEnglishTranslationCache();
    const out: QuranEnglishTranslation = {};
    for (const surahId of requested) if (cached[surahId]) out[surahId] = cached[surahId];
    return out;
  }

  const chapters = await Promise.all(requested.map((surahId) =>
    getRemoteSurah(id, source.apiId!, surahId)));
  const out: QuranEnglishTranslation = {};
  requested.forEach((surahId, index) => {
    const count = getSurahAyahCount(surahId);
    const chapter: string[] = [""];
    for (let ayah = 1; ayah <= count; ayah += 1) {
      chapter.push(chapters[index]![globalAyahNumber(surahId, ayah)]!);
    }
    out[surahId] = chapter;
  });
  return out;
}
