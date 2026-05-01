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
  const [state, setState] = React.useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  React.useEffect(() => {
    const el = containerRef.current ?? document;

    if (!enabled) return;

    const onTouchStart = (e: Event) => {
      const touch = (e as TouchEvent).touches[0];
      // Only activate when at the very top of scroll
      const scrollEl = containerRef.current;
      const scrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY;
      if (scrollTop > 4) return;
      startYRef.current = touch.clientY;
    };

    const onTouchMove = (e: Event) => {
      const touch = (e as TouchEvent).touches[0];
      const dy = touch.clientY - startYRef.current;
      if (dy <= 0) return;
      const scrollEl = containerRef.current;
      const scrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY;
      if (scrollTop > 4) return;

      setState((prev) => ({
        ...prev,
        isPulling: dy > 20,
        pullDistance: Math.min(dy, threshold * 1.5),
      }));
    };

    const onTouchEnd = async () => {
      setState((prev) => {
        if (prev.pullDistance >= threshold) {
          // Trigger refresh
          Promise.resolve(onRefresh()).finally(() => {
            setState({ isPulling: false, isRefreshing: false, pullDistance: 0 });
          });
          return { isPulling: false, isRefreshing: true, pullDistance: 0 };
        }
        return { isPulling: false, isRefreshing: false, pullDistance: 0 };
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
  }, [onRefresh, threshold, enabled]);

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
      aria-live="polite"
      aria-label={isRefreshing ? "جارٍ التحديث" : "اسحب للتحديث"}
    >
      {isRefreshing ? (
        <span className="ptr-spinner" />
      ) : (
        <span style={{ fontSize: "0.8rem" }}>↓</span>
      )}
      <span>{isRefreshing ? "جارٍ التحديث…" : "اسحب للتحديث"}</span>
    </div>
  );
}
