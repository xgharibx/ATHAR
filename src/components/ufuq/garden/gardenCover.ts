/**
 * When a full-screen view draws its own garden over the page (the player of
 * «السماع»), the page's garden behind it rests: one garden drawn at a time.
 */
type Listener = (covered: boolean) => void;

const listeners = new Set<Listener>();
let covers = 0;

export function isGardenCovered(): boolean {
  return covers > 0;
}

export function onGardenCover(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Cover the page's garden; call the returned function to uncover it. */
export function coverGarden(): () => void {
  covers += 1;
  if (covers === 1) for (const fn of listeners) fn(true);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    covers = Math.max(0, covers - 1);
    if (covers === 0) for (const fn of listeners) fn(false);
  };
}
