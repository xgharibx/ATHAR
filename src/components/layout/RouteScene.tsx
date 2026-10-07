import * as React from "react";
import { useLocation } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { useNoorStore } from "@/store/noorStore";
import { isStartupPending } from "@/lib/startup";
import { StartupReady } from "@/components/StartupReady";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

const RetainedViewport = React.createContext(false);

/** Keep this boundary above Routes so nested and full-screen destinations
 * also retain their previous screen while their first chunk is loading. */
export function RouteViewport({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={null}>
    <RetainedViewport.Provider value>{children}</RetainedViewport.Provider>
  </React.Suspense>;
}

function Scene({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  const [initialLaunch] = React.useState(isStartupPending);
  const reduced = useNoorStore(s => s.prefs.reduceMotion);
  const osReduced = useReducedMotion();
  const animate = !initialLaunch && !reduced && !osReduced;
  const [passageVisible, setPassageVisible] = React.useState(animate);
  return <div data-route-scene={pathname} className={`route-scene${animate ? " route-scene-enter" : ""}`}>
    {animate && passageVisible && <div className="route-star-passage" aria-hidden="true" onAnimationEnd={event => {
      if (event.target === event.currentTarget.lastElementChild) setPassageVisible(false);
    }}><i /><i /><i /></div>}
    {children}
    <StartupReady ready={pathname !== "/"} />
  </div>;
}

/** A persistent boundary retains the previous route during lazy navigation.
 * Enter only after the destination commits; no exit queue or transformed
 * ancestor that would trap a page's fixed buttons beneath the fold. */
export function RouteScene({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const retained = React.useContext(RetainedViewport);
  const scene = <RouteErrorBoundary key={pathname}>
      <Scene key={pathname} pathname={pathname}>{children}</Scene>
    </RouteErrorBoundary>;
  return retained ? scene : <React.Suspense fallback={null}>{scene}</React.Suspense>;
}
