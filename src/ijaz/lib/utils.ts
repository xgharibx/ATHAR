import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { arNum } from '@/lib/formatNumber';
import { countAr, type CountForms } from '@/lib/arabicCount';
import type { Miracle } from '@/ijaz/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVerseReference(surah: string, ayah: number, ayahEnd?: number): string {
  if (ayahEnd) {
    return `${surah}: ${ayah}-${ayahEnd}`;
  }
  return `${surah}: ${ayah}`;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    cosmological: 'الإعجاز الكوني',
    biological: 'الإعجاز البيولوجي',
    'earth-sciences': 'علوم الأرض',
    prophecies: 'النبوءات',
    'logical-philosophical': 'البراهين المنطقية',
  };
  return labels[category] || category;
}

export function getCategoryLabelEn(category: string): string {
  const labels: Record<string, string> = {
    cosmological: 'Cosmological',
    biological: 'Biological',
    'earth-sciences': 'Earth Sciences',
    prophecies: 'Prophecies',
    'logical-philosophical': 'Logical',
  };
  return labels[category] || category;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function getVisualizationColor(type: string): string {
  const colors: Record<string, string> = {
    cosmos: '#4A90D9',
    microscopic: '#2DD4A8',
    earth: '#F59E0B',
    timeline: '#D4A853',
    logic: '#A855F7',
  };
  return colors[type] || '#D4A853';
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/* ── Arabic wording ─────────────────────────────────────────── */

export const MIRACLE: CountForms = { one: 'معجزة واحدة', two: 'معجزتان', few: 'معجزات', many: 'معجزة' };
export const PROOF: CountForms = { one: 'دليل واحد', two: 'دليلان', few: 'أدلة', many: 'دليلًا', hundred: 'دليل' };
export const VERSE: CountForms = { one: 'آية واحدة', two: 'آيتان', few: 'آيات', many: 'آية' };
export const YEAR: CountForms = { one: 'سنة واحدة', two: 'سنتان', few: 'سنوات', many: 'سنة' };

/** «الذاريات: ٤٧» or «الطور: ٣٥–٣٦». */
export function verseRefAr(surah: string, ayah: number, ayahEnd?: number): string {
  return `${surah}: ${arNum(ayah)}${ayahEnd ? `–${arNum(ayahEnd)}` : ''}`;
}

/** The year the revelation began, from which the head start is counted. */
export const REVELATION_YEAR = 610;

/** The earliest year in a miracle's evidence that science confirmed it, if any. */
export function discoveryYear(m: Miracle): number | null {
  // Arguments of reason are not "confirmed by science" in a given year.
  if (m.category === 'logical-philosophical') return null;
  let best: number | null = null;
  for (const e of m.scientificEvidence) {
    const y = Number.parseInt(String(e.year ?? '').match(/\d{4}/)?.[0] ?? '', 10);
    if (Number.isFinite(y) && y > REVELATION_YEAR + 100 && (best === null || y < best)) best = y;
  }
  return best;
}

/** A year as written in Arabic, without a thousands separator: «١٩٢٩». */
export function yearAr(y: number | string): string {
  return String(y).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!);
}

/** «١٣١٩ سنة»: a span of years, written like a year (no thousands separator). */
export function yearsAr(n: number): string {
  return countAr(n, YEAR).replace(/٬/g, '');
}

/** Keeps only the Arabic tags. */
export function arabicTags(tags: string[]): string[] {
  return tags.filter((t) => /[؀-ۿ]/.test(t));
}

/** «Dr. Haitham Talaat» and the like, in Arabic. */
export function authorAr(author: string, authorArabic?: string): string {
  if (authorArabic) return authorArabic;
  if (/haitham\s+tal/i.test(author)) return 'د. هيثم طلعت';
  return author;
}
