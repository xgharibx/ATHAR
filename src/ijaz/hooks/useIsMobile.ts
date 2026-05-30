
import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is narrower than `breakpoint` pixels.
 * Starts as `false` on both server and client to avoid hydration mismatches,
 * then updates synchronously after the first paint via useEffect.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches); // set correct value after hydration
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

