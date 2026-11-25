/**
 * «القرآن ٢» — the khatma: which ayahs you have read since you began it.
 *
 * Kept as one bit per ayah (6236 bits, about a kilobyte as text), so it is
 * small enough to live in the store and the account backup. An ayah counts as
 * read when it has stayed on screen long enough to be read, or when the
 * reciter has recited it while you listened (reading/useReadingTracker.ts).
 * Pages and juz are worked out from the ayahs.
 */
import { juzRange, pageRange, refFromIndex, type Q2Meta, type Q2Ref } from "../data/meta";

export const TOTAL_AYAHS = 6236;
const BYTES = Math.ceil(TOTAL_AYAHS / 8);

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function decodeBits(b64: string | undefined | null): Uint8Array {
  const out = new Uint8Array(BYTES);
  if (!b64) return out;
  try {
    const raw = atob(b64);
    for (let i = 0; i < Math.min(raw.length, BYTES); i++) out[i] = raw.charCodeAt(i);
  } catch {
    // A damaged value reads as nothing read.
  }
  return out;
}

export function encodeBits(bits: Uint8Array): string {
  return toBase64(bits);
}

export const emptyBits = (): string => encodeBits(new Uint8Array(BYTES));

export function hasBit(bits: Uint8Array, index: number): boolean {
  return (bits[index >> 3]! & (1 << (index & 7))) !== 0;
}

/** Set the ayahs (mushaf indexes 0–6235); returns the new value and how many were new. */
export function addBits(b64: string, indexes: Iterable<number>): { bits: string; added: number; total: number } {
  const bits = decodeBits(b64);
  let added = 0;
  for (const i of indexes) {
    if (!Number.isInteger(i) || i < 0 || i >= TOTAL_AYAHS || hasBit(bits, i)) continue;
    bits[i >> 3]! |= 1 << (i & 7);
    added += 1;
  }
  return { bits: added ? encodeBits(bits) : b64, added, total: countBits(bits) };
}

export function countBits(bits: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < TOTAL_AYAHS; i++) if (hasBit(bits, i)) n += 1;
  return n;
}

function rangeShare(bits: Uint8Array, [first, last]: [number, number]): number {
  let read = 0;
  for (let i = first; i <= last; i++) if (hasBit(bits, i)) read += 1;
  return read / (last - first + 1);
}

/** For each of the 604 pages, the share of its ayahs read (1 = the page is read). */
export function pageShares(meta: Q2Meta, bits: Uint8Array): number[] {
  return Array.from({ length: meta.pages.length }, (_, i) => rangeShare(bits, pageRange(meta, i + 1)));
}

/** For each of the 30 juz, the share of its ayahs read. */
export function juzShares(meta: Q2Meta, bits: Uint8Array): number[] {
  return Array.from({ length: meta.juz.length }, (_, i) => rangeShare(bits, juzRange(meta, i + 1)));
}

/** Where to go on: the first ayah not read yet, in mushaf order (null when all are read). */
export function firstUnread(meta: Q2Meta, bits: Uint8Array): Q2Ref | null {
  for (let i = 0; i < TOTAL_AYAHS; i++) if (!hasBit(bits, i)) return refFromIndex(meta, i);
  return null;
}

/** Days in a row, up to today (or up to yesterday while today is still empty), with reading. */
export function readingStreak(log: Record<string, number>, today: Date): number {
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const day = new Date(today);
  if (!log[key(day)]) day.setDate(day.getDate() - 1);
  let n = 0;
  while (log[key(day)]) {
    n += 1;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

/**
 * With a goal of finishing in `goalDays` from `startedAt`: how many pages a day
 * are left to read, and how many days remain (today included).
 */
export function khatmaPace(options: { pagesRead: number; startedAt: number; goalDays: number; now: number }): { daysLeft: number; perDay: number; onTrack: boolean } {
  const { pagesRead, startedAt, goalDays, now } = options;
  const start = new Date(startedAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const elapsed = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  const daysLeft = Math.max(1, goalDays - elapsed);
  const left = Math.max(0, 604 - pagesRead);
  const perDay = Math.ceil(left / daysLeft);
  // On track: at least the share of the mushaf the days gone by call for.
  const expected = (604 * Math.min(goalDays, elapsed)) / goalDays;
  return { daysLeft, perDay, onTrack: pagesRead >= expected - 0.5 };
}
