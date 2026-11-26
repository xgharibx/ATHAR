/**
 * A lazily loaded component that can be fetched ahead of time. Once its code
 * has arrived (through `preload()` or a first render), it renders at once,
 * with no Suspense pause — so a change made ready in advance (a new design,
 * say) appears whole, in the same frame, instead of in pieces.
 */
import * as React from "react";

export type PreloadableComponent<P extends object> = React.FC<P> & { preload: () => Promise<unknown> };

export function lazyWithPreload<P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>): PreloadableComponent<P> {
  let loaded: React.ComponentType<P> | null = null;
  let pending: Promise<{ default: React.ComponentType<P> }> | null = null;
  const preload = () =>
    (pending ??= load().then(
      (m) => {
        loaded = m.default;
        return m;
      },
      (e: unknown) => {
        // A failed fetch (offline, a new version) may be tried again later.
        pending = null;
        throw e;
      },
    ));
  const Lazy = React.lazy(preload);
  const Preloadable = ((props: P) => React.createElement(loaded ?? Lazy, props)) as PreloadableComponent<P>;
  Preloadable.preload = preload;
  return Preloadable;
}
