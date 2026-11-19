/** Whether the full-screen player is open (one for the whole app). */
import * as React from "react";

let open = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (open === next) return;
  open = next;
  for (const fn of listeners) fn();
}

export const openFullPlayer = () => set(true);
export const closeFullPlayer = () => set(false);

export function useFullPlayerOpen(): boolean {
  return React.useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => open,
    () => false,
  );
}
