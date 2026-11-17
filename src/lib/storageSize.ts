import { arNum } from "@/lib/formatNumber";

/** "٥١٢ ك.ب", "١٥٠ م.ب", "١٫٥ ج.ب". */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${arNum(Math.max(0, Math.round(bytes / 1024)))} ك.ب`;
  if (bytes < 1024 * 1024 * 1024) return `${arNum(Math.round(bytes / (1024 * 1024)))} م.ب`;
  return `${arNum(Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10)} ج.ب`;
}
