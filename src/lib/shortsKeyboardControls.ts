const SEEK_STEP = 0.05;
const SEEK_PAGE_STEP = 0.1;

/** Returns the next normalized Shorts position for a standard slider key. */
export function getShortsSeekTarget(key: string, current: number): number | null {
  if (key === "Home") return 0;
  if (key === "End") return 1;

  const step = key === "ArrowRight" || key === "ArrowUp"
    ? SEEK_STEP
    : key === "ArrowLeft" || key === "ArrowDown"
      ? -SEEK_STEP
      : key === "PageUp"
        ? SEEK_PAGE_STEP
        : key === "PageDown"
          ? -SEEK_PAGE_STEP
          : null;
  if (step === null) return null;

  const position = Number.isFinite(current) ? current : 0;
  return Math.min(1, Math.max(0, position + step));
}
