import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
