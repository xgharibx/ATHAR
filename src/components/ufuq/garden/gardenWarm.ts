/**
 * The garden's worker, started a moment before the garden is shown (the tap
 * that switches to «أفق»), so its code is fetched and run by the time the
 * garden needs it and the first frame comes sooner. Kept apart from the
 * garden itself, so the classic design never loads the garden's code.
 */

export function canDrawOffThread(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    "transferControlToOffscreen" in HTMLCanvasElement.prototype
  );
}

function spawn(): Worker {
  return new Worker(new URL("./gardenWorker.ts", import.meta.url), { type: "module", name: "garden" });
}

let spare: Worker | null = null;
let spareTimer = 0;

/** Start the worker ahead of the garden; unused, it is let go after a while. */
export function warmGarden(): void {
  if (spare || !canDrawOffThread()) return;
  try {
    spare = spawn();
  } catch {
    spare = null;
    return;
  }
  clearTimeout(spareTimer);
  spareTimer = window.setTimeout(() => {
    spare?.terminate();
    spare = null;
  }, 15000);
}

/** The worker started ahead, or a new one. */
export function takeGardenWorker(): Worker {
  const worker = spare ?? spawn();
  spare = null;
  clearTimeout(spareTimer);
  return worker;
}
