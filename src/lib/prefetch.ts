/** Load code that a tap will need soon, while the app is idle, so the tap itself is instant. */
export function prefetchWhenIdle(load: () => Promise<unknown>, timeout = 4000): () => void {
  const w = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const run = () => void load().catch(() => {});
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(run, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = setTimeout(run, 2500);
  return () => clearTimeout(id);
}
