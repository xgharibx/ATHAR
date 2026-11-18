/**
 * «الحديقة»: real footage behind every page — of «أفق» while the garden look
 * is on, or of the classic design with its «حديقة الليل» theme.
 *
 *   still   a photograph of the scene, painted at once and kept when motion
 *           is reduced, «حديقة حيّة» is off, or the phone will not autoplay;
 *   film    the scene itself, a seamless 10-second loop composed from real
 *           clips (tools/garden-footage), played silently by the phone's
 *           video decoder;
 *   lights  the moon in tonight's real phase and fireflies (or sunlit motes)
 *           that grow in number with the day's remembrance;
 *   veil    a soft band across the middle, where the page is read.
 */
import * as React from "react";
import { useLocation } from "react-router-dom";
import { useNoorStore } from "@/store/noorStore";
import { GardenOverlay, type OverlayMode } from "@/components/ufuq/garden/gardenOverlay";
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

export function GardenBackdrop({ forcedMode }: { forcedMode?: GardenMode } = {}) {
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
    const overlay = GardenOverlay.create(canvas, initial.current.mode, `${base}garden/moon.jpg`);
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

  React.useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.setMode(mode);
    overlay.setCount(lightsFor(growth.blooms));
    if (live && !document.hidden) overlay.start();
    else overlay.stop();
  }, [mode, live, growth.blooms]);

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
        <img className="u-garden-still" src={still} alt="" decoding="async" />
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
      </div>
      <canvas ref={canvasRef} className="u-garden" aria-hidden="true" />
      <div className={`u-garden-veil ${location.pathname === "/" ? "is-light" : ""}`} aria-hidden="true" />
    </>
  );
}
