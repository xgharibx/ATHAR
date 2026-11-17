import * as React from "react";

/** A click within this long after a counted press belongs to that press. */
const PRESS_CLICK_WINDOW_MS = 1000;

/**
 * Count the moment a finger, pen or mouse goes down, the way a physical
 * tasbeeh clicks, instead of when it lifts (a click fires only after the
 * finger leaves the screen, which feels slow over hundreds of taps).
 *
 * Keyboard, switch and screen-reader activation produce a click without a
 * press; those still count, once. Use with `touch-action: none` on the
 * target so a press there is never the start of a scroll.
 */
export function usePressCounter(onCount: () => void) {
  const countedPressAt = React.useRef<number | null>(null);

  const onPointerDown = React.useCallback((event: React.PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    countedPressAt.current = event.timeStamp;
    onCount();
  }, [onCount]);

  const onClick = React.useCallback((event: React.MouseEvent) => {
    const pressedAt = countedPressAt.current;
    countedPressAt.current = null;
    if (pressedAt != null && event.timeStamp - pressedAt < PRESS_CLICK_WINDOW_MS) return;
    onCount();
  }, [onCount]);

  return { onPointerDown, onClick };
}
