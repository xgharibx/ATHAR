/**
 * «الحديقة الحيّة»: the drawn garden (GardenEngine) behind every page of
 * «أفق» — palms, cypresses, a blossoming tree, grass and flowers in the wind,
 * that gains new flowers with every tasbeeh — kept in step with the palette,
 * today's growth, the scroll position and the person's finger.
 */
import * as React from "react";
import { useLocation } from "react-router-dom";
import { useNoorStore } from "@/store/noorStore";
import type { GardenMode } from "@/components/ufuq/garden/GardenEngine";
import { createGardenController, type GardenController } from "@/components/ufuq/garden/gardenController";
import { useGardenGrowth } from "@/components/ufuq/garden/useGardenGrowth";

function currentMode(): GardenMode {
  return document.documentElement.dataset.ufuqPalette === "night" ? "night" : "day";
}

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

export function LiveGardenBackdrop({ forcedMode }: { forcedMode?: GardenMode } = {}) {
  const location = useLocation();
  const hostRef = React.useRef<HTMLDivElement>(null);
  const engineRef = React.useRef<GardenController | null>(null);
  const growth = useGardenGrowth();
  const livePref = useNoorStore((s) => s.prefs.gardenLive !== false && !s.prefs.reduceMotion);
  const [systemReduced, setSystemReduced] = React.useState(prefersReducedMotion);
  const [paletteMode, setMode] = React.useState<GardenMode>(currentMode);
  const mode = forcedMode ?? paletteMode;
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
    const host = hostRef.current;
    if (!host) return;
    // Fresh canvases on every mount: a canvas can be handed to a worker only once.
    const bgCanvas = document.createElement("canvas");
    const canvas = document.createElement("canvas");
    for (const el of [bgCanvas, canvas]) {
      el.className = "u-garden";
      el.setAttribute("aria-hidden", "true");
      host.appendChild(el);
    }
    const size = { w: window.innerWidth, h: window.innerHeight };
    for (const el of [canvas, bgCanvas]) {
      el.style.width = `${size.w}px`;
      el.style.height = `${size.h}px`;
    }
    const engine = createGardenController(
      bgCanvas,
      canvas,
      {
        mode: initial.current.mode,
        blooms: initial.current.blooms,
        palmFruit: initial.current.palmFruit,
        treeFruit: initial.current.treeFruit,
        live: initial.current.live,
      },
      size.w,
      size.h,
    );
    if (!engine) {
      bgCanvas.remove();
      canvas.remove();
      return;
    }
    engineRef.current = engine;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // The on-screen keyboard shrinks the window; the garden stays put.
      if (w === size.w && h < size.h && h > size.h * 0.55) return;
      if (w === size.w && h === size.h) return;
      size.w = w;
      size.h = h;
      for (const el of [canvas, bgCanvas]) {
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }
      engine.resize(w, h);
    };
    engine.setScroll(window.scrollY);

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
      bgCanvas.remove();
      canvas.remove();
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
      <div ref={hostRef} className="contents" aria-hidden="true" />
      <div className="u-garden-grade" aria-hidden="true" />
      <div className={`u-garden-veil ${location.pathname === "/" ? "is-light" : ""}`} aria-hidden="true" />
    </>
  );
}
