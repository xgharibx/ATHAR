/**
 * Quran translations — multiple sources the user can switch between.
 *
 * Three sources are shipped:
 *  1. "Saheeh International" (English) — bundled at /data/quran-en-sahih.json
 *     because it's the most common English translation and the existing
 *     preview rows already use it.
 *  2. "Yusuf Ali" (English) — fetched on demand from the quran.foundation
 *     API and cached in IndexedDB for offline use.
 *  3. "Jalandhry" (Urdu) — also fetched and cached in IDB.
 *
 * Each source is keyed by the same global ayah number (1..6236) used by
 * the bundled Sahih bundle, so lookup is identical to the existing helper
 * `getEnglishText` in quranExtras. The runtime falls back to the bundled
 * Saheeh text if a remote fetch fails, so the picker never leaves the user
 * without translation.
 */
import { idbGetExtras, idbSetExtras } from "@/lib/quranIDB";
import { getEnglishText as getSahihEnglishText, type QuranExtras } from "@/data/quranExtras";
import { globalAyahNumber } from "@/data/quranSurahCounts";

export type TranslationId = "saheeh" | "yusuf_ali" | "jalandhry";

export type TranslationSource = {
  id: TranslationId;
  /** Arabic label shown first in the picker. */
  ar: string;
  /** English translator/translation name. */
  en: string;
  /** Two-letter language code used by the API. */
  lang: "en" | "ur";
  /** quran.foundation translation ID. Saheeh is bundled so it has no id. */
  apiId: number | null;
  /** True if the source is bundled in /public/data. */
  bundled: boolean;
};

export const TRANSLATION_SOURCES: TranslationSource[] = [
  { id: "saheeh",     ar: "الأجرومية", en: "Saheeh International", lang: "en", apiId: null, bundled: true  },
  { id: "yusuf_ali",  ar: "الألبيرية", en: "Yusuf Ali",            lang: "en", apiId: 84,    bundled: false },
  { id: "jalandhry",  ar: "الأرضية",   en: "Jalandhry",            lang: "ur", apiId: 157,   bundled: false },
];

const API_URL = "https://api.quran.foundation/api/v4/quran/translations/";
const IDB_KEY = "noor_quran_translations_v1";
const IDB_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/** A flat translation index: global ayah number → translated text. */
export type TranslationIndex = Record<number, string>;

/** In-memory cache so we don't refetch on every navigation. */
const MEM_CACHE: Partial<Record<TranslationId, TranslationIndex>> = {};

/** One persistent fetch promise per id so we never parallel-fetch. */
const INFLIGHT: Partial<Record<TranslationId, Promise<TranslationIndex>>> = {};

/** Convert the API ayah-array response to a global-ayah number index. */
function apiResponseToIndex(raw: { ayahs: Array<{ number: number; text: string }> }): TranslationIndex {
  const out: TranslationIndex = {};
  for (const a of raw.ayahs) {
    if (a.number >= 1 && a.number <= 6236) out[a.number] = a.text;
  }
  return out;
}

async function fetchRemoteIndex(id: TranslationId, apiId: number): Promise<TranslationIndex> {
  // 1) Try IDB cache first.
  try {
    const cached = await idbGetExtras<{ cachedAt: number; index: TranslationIndex }>(`${IDB_KEY}:${id}`);
    if (cached && Date.now() - cached.cachedAt < IDB_TTL_MS) {
      MEM_CACHE[id] = cached.index;
      return cached.index;
    }
  } catch { /* IDB unavailable — fall through to network */ }

  // 2) Network fetch.
  const r = await fetch(`${API_URL}${apiId}?format=json`);
  if (!r.ok) throw new Error(`Translation fetch ${id} failed: ${r.status}`);
  const raw = (await r.json()) as { ayahs: Array<{ number: number; text: string }> };
  const index = apiResponseToIndex(raw);
  // 3) Persist + memo.
  MEM_CACHE[id] = index;
  void idbSetExtras(`${IDB_KEY}:${id}`, { cachedAt: Date.now(), index }).catch(() => {});
  return index;
}

export async function getTranslation(
  id: TranslationId,
  globalAyah: number,
): Promise<string | null> {
  if (id === "saheeh") {
    return MEMORY_SAHEEH ? getSahihEnglishText(MEMORY_SAHEEH, globalAyah) : null;
  }
  const src = TRANSLATION_SOURCES.find((s) => s.id === id);
  if (!src || src.apiId === null) return null;
  if (MEM_CACHE[id]) return MEM_CACHE[id]![globalAyah] ?? null;
  if (!INFLIGHT[id]) {
    INFLIGHT[id] = fetchRemoteIndex(id, src.apiId).finally(() => {
      INFLIGHT[id] = undefined as unknown as Promise<TranslationIndex> | undefined;
    });
  }
  try {
    const idx = await INFLIGHT[id]!;
    return idx[globalAyah] ?? null;
  } catch {
    // Network failed — fall back to Saheeh (bundled, always works).
    if (MEMORY_SAHEEH) return getSahihEnglishText(MEMORY_SAHEEH, globalAyah);
    return null;
  }
}

/** Lookup using the *surah* & *ayah* local indices (preferred helper). */
export async function getTranslationForAyah(
  id: TranslationId,
  surahId: number,
  ayahIndex: number,
): Promise<string | null> {
  return getTranslation(id, globalAyahNumber(surahId, ayahIndex));
}

/** Translation text keyed by the user's chosen source, read once from prefs
 *  plus a per-page override (Mushaf can pass an override). */
export function getSavedTranslationId(
  prefs: { quranTranslationId?: TranslationId | null },
  override: TranslationId | null = null,
): TranslationId {
  if (override) return override;
  if (prefs.quranTranslationId) return prefs.quranTranslationId;
  return "saheeh";
}

/* ─── Saheeh bridge: the bundled translation lives in quranExtras. We accept
 * a setter so the rest of the app can hand us the lazily-loaded bundle
 * after the user opts into translation. ──────────────────────────────────── */
let MEMORY_SAHEEH: QuranExtras | null = null;
export function registerSaheehExtras(extras: QuranExtras | null): void {
  MEMORY_SAHEEH = extras;
}

/* ─── Reactive hook for React components ─────────────────────────────────── */
import * as React from "react";

export function useTranslationForAyah(
  id: TranslationId,
  surahId: number,
  ayahIndex: number,
  /** Optional pre-loaded Saheeh extras to avoid a 880 KB fetch. */
  extras: QuranExtras | null,
): string | null {
  const [text, setText] = React.useState<string | null>(null);
  // Keep the in-memory Saheeh handle in sync so direct (non-hook) lookups
  // stay correct if any other module needs them.
  React.useEffect(() => { registerSaheehExtras(extras); }, [extras]);
  React.useEffect(() => {
    let cancelled = false;
    setText(null);
    if (id === "saheeh") {
      // Synchronous via the bundled cache.
      const t = getSahihEnglishText(extras, globalAyahNumber(surahId, ayahIndex));
      if (!cancelled) setText(t);
      return () => { cancelled = true; };
    }
    void (async () => {
      const t = await getTranslationForAyah(id, surahId, ayahIndex);
      if (!cancelled) setText(t);
    })();
    return () => { cancelled = true; };
  }, [id, surahId, ayahIndex, extras]);
  return text;
}
