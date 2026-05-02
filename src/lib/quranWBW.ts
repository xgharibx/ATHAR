/**
 * Word-by-word + Tajweed Quran data — Phase 2A/2B
 * Fetches per-word Arabic, translation, transliteration, and tajweed markup
 * from quran.com API v4. Caches in IndexedDB (Dexie) with 30-day TTL.
 *
 * API: https://api.quran.com/api/v4/verses/by_chapter/{id}?language=en&words=true&word_fields=text_uthmani,text_uthmani_tajweed,translation,transliteration&per_page=300
 */
import * as React from "react";
import Dexie, { type Table } from "dexie";

export interface WbwWord {
  ar: string;  // Arabic word text (Uthmani)
  tr: string;  // English translation
  tl: string;  // Transliteration
  tj: string;  // Tajweed-annotated text (<rule class=X>…</rule>)
}

/** Array indexed by ayah number (1-based). wbwData[surahId][ayahNumber] */
export type WbwSurah = Array<WbwWord[]>;

interface WbwCacheRow {
  key: string;       // "wbw_{surahId}"
  data: WbwSurah;
  cachedAt: number;
}

class NoorWbwDexie extends Dexie {
  wbwCache!: Table<WbwCacheRow, string>;
  constructor() {
    super("noor-wbw-cache-v4"); // v4: flatten nested rule tags
    this.version(1).stores({ wbwCache: "key" });
  }
}

let _db: NoorWbwDexie | null = null;
function getDB(): NoorWbwDexie {
  if (!_db) _db = new NoorWbwDexie();
  return _db;
}

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

async function idbGet(surahId: number): Promise<WbwSurah | null> {
  try {
    const row = await getDB().wbwCache.get(`wbw_${surahId}`);
    if (!row || Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return row.data;
  } catch {
    return null;
  }
}

async function idbSet(surahId: number, data: WbwSurah): Promise<void> {
  try {
    await getDB().wbwCache.put({ key: `wbw_${surahId}`, data, cachedAt: Date.now() });
  } catch {
    // IDB write failure is non-fatal
  }
}

interface QuranComWord {
  char_type_name: string;  // "word" | "end"
  text_uthmani: string;
  text_uthmani_tajweed: string;
  translation: { text: string };
  transliteration: { text: string | null };
}

interface QuranComVerse {
  verse_number: number;
  words: QuranComWord[];
}

interface QuranComResponse {
  verses: QuranComVerse[];
}

export async function loadWbwSurah(surahId: number): Promise<WbwSurah> {
  const cached = await idbGet(surahId);
  if (cached) return cached;

  // per_page=300 covers the longest surah (Al-Baqarah: 286 ayahs)
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=en&words=true&word_fields=text_uthmani%2Ctext_uthmani_tajweed%2Ctranslation%2Ctransliteration&per_page=300`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`WBW fetch failed: ${resp.status}`);

  const json: QuranComResponse = await resp.json();

  // Build 1-indexed array: result[0] unused, result[ayahNum] = words[]
  const result: WbwSurah = [[]]; // index 0 placeholder
  for (const verse of json.verses) {
    const words: WbwWord[] = verse.words
      .filter((w) => w.char_type_name === "word")
      .map((w) => ({
        ar: w.text_uthmani,
        tr: w.translation.text,
        tl: w.transliteration.text ?? "",
        tj: w.text_uthmani_tajweed ?? w.text_uthmani,
      }));
    result[verse.verse_number] = words;
  }

  await idbSet(surahId, result);
  return result;
}

// ─── Tajweed renderer ────────────────────────────────────────────────────────

/**
 * Parse quran.com tajweed markup (<rule class=X>text</rule>) into React spans.
 * The API sometimes nests <rule> tags — we flatten them first (inner rule wins).
 */
function flattenRules(text: string): string {
  // Collapse <rule class=outer><rule class=inner>TEXT</rule></rule> → <rule class=inner>TEXT</rule>
  const nested = /<rule class=[a-z_-]+>(<rule class=[a-z_-]+>[\s\S]*?<\/rule>)<\/rule>/g;
  let prev = "";
  let curr = text;
  // Iteratively flatten until stable (handles multiple nesting levels)
  while (curr !== prev) { prev = curr; curr = curr.replace(nested, "$1"); }
  return curr;
}

export function renderTajweed(tjText: string): React.ReactNode {
  const text = flattenRules(tjText);
  const parts: React.ReactNode[] = [];
  const pattern = /<rule class=([a-z_-]+)>([\s\S]*?)<\/rule>/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      React.createElement("span", { key: i, className: `tj tj-${match[1]}` }, match[2])
    );
    last = match.index + match[0].length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  if (parts.length === 0) return text;
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

