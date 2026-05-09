import * as React from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  /** Pixels to pull before triggering refresh (default: 80) */
  threshold?: number;
  /** Whether ptr is enabled (default: true) */
  enabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

/**
 * De2 — Pull-to-refresh hook.
 * Attach `containerRef` to your scrollable container and render the `PTRIndicator`.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const containerRef = React.useRef<HTMLElement | null>(null);
  const startYRef = React.useRef(0);
  // Track pull distance in a ref so onTouchEnd can read it without capturing
  // stale state inside a setState updater (React Strict Mode double-invokes updaters).
  const pullDistanceRef = React.useRef(0);
  const onRefreshRef = React.useRef(onRefresh);
  React.useEffect(() => { onRefreshRef.current = onRefresh; });

  const [state, setState] = React.useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  React.useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: Event) => {
      const touch = (e as TouchEvent).touches[0];
      // Only activate when at the very top of scroll
      const scrollEl = containerRef.current;
      const scrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY;
      if (scrollTop > 4) return;
      startYRef.current = touch?.clientY ?? 0;
    };

    const onTouchMove = (e: Event) => {
      const touch = (e as TouchEvent).touches[0];
      if (!touch) return;
      const dy = touch.clientY - startYRef.current;
      if (dy <= 0) return;
      const scrollEl = containerRef.current;
      const scrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY;
      if (scrollTop > 4) return;

      const clamped = Math.min(dy, threshold * 1.5);
      pullDistanceRef.current = clamped;
      setState((prev) => ({
        ...prev,
        isPulling: dy > 20,
        pullDistance: clamped,
      }));
    };

    const onTouchEnd = () => {
      const shouldRefresh = pullDistanceRef.current >= threshold;
      pullDistanceRef.current = 0;
      startYRef.current = 0;

      if (!shouldRefresh) {
        setState({ isPulling: false, isRefreshing: false, pullDistance: 0 });
        return;
      }

      // Transition to refreshing state first, then run async refresh outside updater.
      setState({ isPulling: false, isRefreshing: true, pullDistance: 0 });
      void Promise.resolve(onRefreshRef.current()).finally(() => {
        setState({ isPulling: false, isRefreshing: false, pullDistance: 0 });
      });
    };

    const target = containerRef.current ?? document;
    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: true });
    target.addEventListener("touchend", onTouchEnd);

    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold, enabled]); // onRefresh accessed via ref — no re-attachment needed

  return { containerRef, ...state };
}

/** Visual indicator to render at top of the page when pulling */
export function PTRIndicator({
  isPulling,
  isRefreshing,
}: {
  isPulling: boolean;
  isRefreshing: boolean;
}) {
  if (!isPulling && !isRefreshing) return null;
  return (
    <div
      className={`ptr-indicator ${isPulling ? "ptr-pulling" : ""} ${isRefreshing ? "ptr-refreshing" : ""}`}
      role="status"
      aria-live="polite" aria-atomic="true"
      aria-label={isRefreshing ? "جارٍ التحديث" : "اسحب للتحديث"}
    >
      {isRefreshing ? (
        <span className="ptr-spinner" aria-hidden="true" />
      ) : (
        <span style={{ fontSize: "0.8rem" }} aria-hidden="true">↓</span>
      )}
      <span>{isRefreshing ? "جارٍ التحديث…" : "اسحب للتحديث"}</span>
    </div>
  );
}
