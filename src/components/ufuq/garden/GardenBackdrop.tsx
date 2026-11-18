/**
 * Mounts the living garden (GardenEngine) behind every page of «أفق» while
 * the «الحديقة» look is on, and keeps it in step with the palette, today's
 * growth, the scroll position and the person's finger.
 */
import * as React from "react";
import { useLocation } from "react-router-dom";
import { useNoorStore } from "@/store/noorStore";
import { GardenEngine, type GardenMode } from "@/components/ufuq/garden/GardenEngine";
import { useGardenGrowth } from "@/components/ufuq/garden/useGardenGrowth";

function currentMode(): GardenMode {
  return document.documentElement.dataset.ufuqPalette === "night" ? "night" : "day";
}

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

export function GardenBackdrop() {
  const location = useLocation();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const bgRef = React.useRef<HTMLCanvasElement>(null);
  const engineRef = React.useRef<GardenEngine | null>(null);
  const growth = useGardenGrowth();
  const livePref = useNoorStore((s) => s.prefs.gardenLive !== false && !s.prefs.reduceMotion);
  const [systemReduced, setSystemReduced] = React.useState(prefersReducedMotion);
  const [mode, setMode] = React.useState<GardenMode>(currentMode);
  const live = livePref && !systemReduced;

  // The palette lives on <html>; follow it, including «الوقت» turning at Maghrib.
  React.useEffect(() => {
    const observer = new MutationObserver(() => setMode(currentMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ufuq-palette"] });
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMotion = () => setSystemReduced(prefersReducedMotion());
    mq?.addEventListener?.("change", onMotion);
    return () => {
      observer.disconnect();
      mq?.removeEventListener?.("change", onMotion);
    };
  }, []);

  const initial = React.useRef({ mode, live, ...growth });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgRef.current;
    if (!canvas || !bgCanvas) return;
    const engine = GardenEngine.create(bgCanvas, canvas, {
      mode: initial.current.mode,
      blooms: initial.current.blooms,
      palmFruit: initial.current.palmFruit,
      treeFruit: initial.current.treeFruit,
      live: initial.current.live,
    });
    if (!engine) return;
    engineRef.current = engine;

    let size = { w: 0, h: 0 };
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // The on-screen keyboard shrinks the window; the garden stays put.
      if (w === size.w && h < size.h && h > size.h * 0.55) return;
      size = { w, h };
      for (const el of [canvas, bgCanvas]) {
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }
      engine.resize(w, h);
    };
    resize();
    engine.setScroll(window.scrollY);
    engine.start();

    const onVisible = () => (document.hidden ? engine.stop() : engine.start());
    const onScroll = () => engine.setScroll(window.scrollY);
    let lastX = 0;
    let lastT = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      const v = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
      if (Math.abs(v) > 0.08 && dt < 120) engine.poke(e.clientX, v * 1.4);
    };
    const onDown = (e: PointerEvent) => {
      lastX = e.clientX;
      lastT = performance.now();
    };
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisible);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    engineRef.current?.setOptions({
      mode,
      live,
      blooms: growth.blooms,
      palmFruit: growth.palmFruit,
      treeFruit: growth.treeFruit,
    });
  }, [mode, live, growth.blooms, growth.palmFruit, growth.treeFruit]);

  // The garden frames the page: clear sky above, flowers below, and a soft
  // veil across the middle where the reading happens (lighter on «اليوم»).
  return (
    <>
      <canvas ref={bgRef} className="u-garden" aria-hidden="true" />
      <canvas ref={canvasRef} className="u-garden" aria-hidden="true" />
      <div className={`u-garden-veil ${location.pathname === "/" ? "is-light" : ""}`} aria-hidden="true" />
    </>
  );
}
