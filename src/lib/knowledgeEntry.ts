import { arNum } from "@/lib/formatNumber";

/**
 * A numbered entry ("10. شرب الخمر") shows its number in the circle and the
 * name alone beside it; any other entry shows its first letter.
 */
export function entryBadge(nameAr: string): { badge: string; title: string } {
  const numbered = /^\s*(\d{1,3})\s*[.\-–:)]\s*(.+)$/.exec(nameAr);
  if (numbered) return { badge: arNum(Number(numbered[1])), title: numbered[2]!.trim() };
  return { badge: nameAr.trim().charAt(0), title: nameAr };
}
