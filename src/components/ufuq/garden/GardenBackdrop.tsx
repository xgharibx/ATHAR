/**
 * «الحديقة»: real footage behind every page — of «أفق» while the garden look
 * is on, or of the classic design with its «حديقة الليل» theme.
 *
 *   still   a photograph of the scene, painted at once and kept when motion
 *           is reduced, «حديقة حيّة» is off, or the phone will not autoplay;
 *   film    the scene itself, a seamless 10-second loop composed from real
 *           clips (tools/garden-footage), played silently by the phone's
 *           video decoder;
 *   moon    inside the scene, tonight's real phase, hidden frame by frame
 *           behind the palm fronds that sweep across it;
 *   lights  fireflies (or sunlit motes) that grow in number with the day's
 *           remembrance;
 *   bed     with «بستان الذِّكر»: real flowers in the foreground, each one
 *           planted by a remembrance and opening on screen (bustanBed.ts);
 *   veil    a soft band across the middle, where the page is read.
 */
import * as React from "react";
import { useLocation } from "react-router-dom";
import { useNoorStore } from "@/store/noorStore";
import { GardenOverlay, type OverlayMode } from "@/components/ufuq/garden/gardenOverlay";
import { MoonLayer } from "@/components/ufuq/garden/gardenMoon";
import { BustanBed } from "@/components/ufuq/garden/bustanBed";
import { useGardenGrowth } from "@/components/ufuq/garden/useGardenGrowth";
import { lightsFor } from "@/components/ufuq/garden/gardenMath";

export type GardenMode = OverlayMode;

function currentMode(): GardenMode {
  return document.documentElement.dataset.ufuqPalette === "night" ? "night" : "day";
}

function subscribePalette(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ufuq-palette"] });
  return () => observer.disconnect();
}

function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  mq?.addEventListener?.("change", onChange);
  return () => mq?.removeEventListener?.("change", onChange);
}

/** Share of the screen's height the flower bed occupies, from the bottom. */
const BED_BAND = 0.3;

export function GardenBackdrop({ forcedMode, bed = false }: { forcedMode?: GardenMode; bed?: boolean } = {}) {
  const location = useLocation();
  const base = import.meta.env.BASE_URL ?? "/";
  const growth = useGardenGrowth();
  const livePref = useNoorStore((s) => s.prefs.gardenLive !== false && !s.prefs.reduceMotion);
  // The palette lives on <html> («الوقت» turns it at Maghrib and Fajr).
  const paletteMode = React.useSyncExternalStore(subscribePalette, currentMode, (): GardenMode => "day");
  const systemReduced = React.useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);
  const [filmReady, setFilmReady] = React.useState(false);
  const mode = forcedMode ?? paletteMode;
  const live = livePref && !systemReduced;

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const stillRef = React.useRef<HTMLImageElement>(null);
  const moonCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const bedCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const bedRef = React.useRef<BustanBed | null>(null);
  const moonRef = React.useRef<MoonLayer | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const overlayRef = React.useRef<GardenOverlay | null>(null);
  const layerRef = React.useRef<HTMLDivElement>(null);

  // The film: play while live and visible; otherwise the still stays.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!live) {
      video.pause();
      return;
    }
    let cancelled = false;
    const tryPlay = () => {
      if (cancelled || document.hidden) return;
      void video.play().catch(() => {
        // Autoplay refused (low-power mode, a WebView policy): keep the still
        // and try again on the next touch.
        const retry = () => {
          window.removeEventListener("pointerdown", retry);
          void video.play().catch(() => {});
        };
        window.addEventListener("pointerdown", retry, { once: true, passive: true });
      });
    };
    const onVisible = () => (document.hidden ? video.pause() : tryPlay());
    tryPlay();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, mode]);

  // Moon and lights.
  const initial = React.useRef({ mode, live, count: lightsFor(growth.blooms) });
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const overlay = GardenOverlay.create(canvas, initial.current.mode);
    if (!overlay) return;
    overlayRef.current = overlay;
    overlay.setCount(initial.current.count);
    let size = { w: 0, h: 0 };
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // The on-screen keyboard shrinks the window; the garden stays put.
      if (w === size.w && h < size.h && h > size.h * 0.55) return;
      size = { w, h };
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      overlay.resize(w, h);
    };
    resize();
    if (initial.current.live) overlay.start();
    const onVisible = () => (document.hidden ? overlay.stop() : overlay.start());
    const onDown = (e: PointerEvent) => overlay.touch(e.clientX, e.clientY);
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisible);
      overlay.destroy();
      overlayRef.current = null;
    };
  }, [base]);

  // The Moon: redrawn on each new frame of the film (or once from the still),
  // masked by the fronds in that very frame.
  React.useEffect(() => {
    const canvas = moonCanvasRef.current;
    if (!canvas) return;
    const media = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !video.paused) return video;
      const still = stillRef.current;
      return still && still.complete && still.naturalWidth ? still : null;
    };
    const moon = MoonLayer.create(canvas, `${base}garden/moon.jpg`, () => moon?.draw(media()));
    if (!moon) return;
    moonRef.current = moon;
    const layout = () => {
      moon.layout(window.innerWidth, window.innerHeight);
      moon.draw(media());
    };
    layout();
    window.addEventListener("resize", layout);
    return () => {
      window.removeEventListener("resize", layout);
      moonRef.current = null;
    };
  }, [base]);

  React.useEffect(() => {
    const moon = moonRef.current;
    if (!moon) return;
    moon.setVisible(mode === "night");
    if (mode !== "night") return;
    const video = videoRef.current;
    const still = stillRef.current;
    const media = () => (video && video.readyState >= 2 && !video.paused ? video : still && still.complete ? still : null);
    let stopped = false;
    let handle = 0;
    type FrameVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };
    const v = video as FrameVideo | null;
    const tick = () => {
      if (stopped) return;
      moon.draw(media());
      if (v?.requestVideoFrameCallback) handle = v.requestVideoFrameCallback(tick);
      else handle = window.setTimeout(tick, 42);
    };
    const redraw = () => moon.draw(media());
    still?.addEventListener("load", redraw);
    if (live && v) {
      if (v.requestVideoFrameCallback) handle = v.requestVideoFrameCallback(tick);
      else handle = window.setTimeout(tick, 42);
      v.addEventListener("playing", redraw);
    }
    redraw();
    return () => {
      stopped = true;
      still?.removeEventListener("load", redraw);
      v?.removeEventListener("playing", redraw);
      if (v?.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [mode, live]);

  React.useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.setMode(mode);
    overlay.setCount(lightsFor(growth.blooms));
    if (live && !document.hidden) overlay.start();
    else overlay.stop();
  }, [mode, live, growth.blooms]);

  // «بستان الذِّكر»: the flower bed in the foreground.
  const bedLive = React.useRef(live);
  React.useEffect(() => {
    if (!bed) return;
    const canvas = bedCanvasRef.current;
    if (!canvas) return;
    const engine = BustanBed.create(canvas, base);
    if (!engine) return;
    bedRef.current = engine;
    let size = { w: 0, h: 0 };
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w === size.w && h < size.h && h > size.h * 0.55) return;
      size = { w, h };
      engine.resize(w, Math.round(h * BED_BAND));
    };
    resize();
    const onDown = (e: PointerEvent) => {
      if (e.clientY > window.innerHeight * (1 - BED_BAND - 0.05)) engine.touch(e.clientX);
    };
    const onVisible = () => (document.hidden ? engine.stop() : bedLive.current && engine.start());
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisible);
      engine.destroy();
      bedRef.current = null;
    };
  }, [bed, base]);

  React.useEffect(() => {
    bedLive.current = live;
    const engine = bedRef.current;
    if (!engine) return;
    engine.setNight(mode === "night");
    engine.setState({ planted: Math.max(0, growth.planted), streak: growth.streak, wirdDone: growth.treeFruit });
    if (live && !document.hidden) engine.start();
    else engine.stop();
  }, [bed, mode, live, growth.planted, growth.streak, growth.treeFruit]);

  // A little depth: the scene drifts up a few pixels as the page scrolls.
  React.useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !live) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const shift = Math.min(40, window.scrollY * 0.04);
        layer.style.transform = `translate3d(0, ${-shift}px, 0) scale(1.06)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [live]);

  const still = `${base}garden/${mode}.jpg`;
  const film = `${base}garden/${mode}.mp4`;

  return (
    <>
      <div ref={layerRef} className="u-garden-scene" aria-hidden="true">
        <img ref={stillRef} className="u-garden-still" src={still} alt="" decoding="async" />
        <video
          key={mode}
          ref={videoRef}
          className={`u-garden-film ${filmReady && live ? "is-ready" : ""}`}
          src={film}
          poster={still}
          muted
          loop
          playsInline
          autoPlay={live}
          preload={live ? "auto" : "none"}
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => setFilmReady(true)}
          onEmptied={() => setFilmReady(false)}
        />
        <canvas ref={moonCanvasRef} className="u-garden-moon" />
      </div>
      {bed ? <canvas ref={bedCanvasRef} className="u-garden-bed" aria-hidden="true" /> : null}
      <canvas ref={canvasRef} className="u-garden" aria-hidden="true" />
      <div className={`u-garden-veil ${location.pathname === "/" ? "is-light" : ""}`} aria-hidden="true" />
    </>
  );
}
