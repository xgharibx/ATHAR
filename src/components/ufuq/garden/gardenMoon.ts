/**
 * The Moon of «الحديقة الحيّة»: NASA's surface map (Scientific Visualization
 * Studio, SVS 5048, public domain), shaded to tonight's real phase with a soft
 * terminator and earthshine.
 */
import { moonIllumination, moonPhase } from "@/components/ufuq/garden/gardenMath";

/**
 * Tonight's Moon from NASA's surface map: r is the disc's radius, R the
 * radius of its glow (the sprite is 2R square, in CSS pixels).
 */
export function paintRealMoon(img: HTMLImageElement, r: number, R: number, dpr: number, date = new Date()): HTMLCanvasElement | null {
  const side = R * 2;
  const c = document.createElement("canvas");
  c.width = c.height = Math.round(side * dpr);
  const g = c.getContext("2d");
  if (!g) return null;
  g.scale(dpr, dpr);
  const phase = moonPhase(date);
  const lit = moonIllumination(phase);

  // Glow in the air around it, brighter the fuller it is.
  const halo = g.createRadialGradient(R, R, r * 0.9, R, R, R);
  halo.addColorStop(0, `rgba(214,224,255,${0.1 + lit * 0.32})`);
  halo.addColorStop(0.3, `rgba(196,210,250,${0.03 + lit * 0.1})`);
  halo.addColorStop(1, "rgba(190,205,250,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, side, side);

  g.save();
  g.beginPath();
  g.arc(R, R, r, 0, Math.PI * 2);
  g.clip();
  g.drawImage(img, R - r, R - r, r * 2, r * 2);
  // The night side, with a feathered terminator (lit limb on the right
  // while waxing, as seen from the northern hemisphere).
  const shade = document.createElement("canvas");
  shade.width = shade.height = Math.ceil(r * 2 * dpr);
  const s = shade.getContext("2d");
  if (s) {
    s.scale(dpr, dpr);
    s.translate(r, r);
    if (phase >= 0.5) s.scale(-1, 1);
    s.fillStyle = "rgba(6,9,18,0.95)";
    s.fillRect(-r, -r, r * 2, r * 2);
    s.globalCompositeOperation = "destination-out";
    s.filter = `blur(${Math.max(0.8, r * 0.07)}px)`;
    const rx = r * Math.abs(Math.cos(2 * Math.PI * phase));
    s.beginPath();
    s.arc(0, 0, r * 1.03, -Math.PI / 2, Math.PI / 2, false);
    s.ellipse(0, 0, rx, r * 1.03, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5);
    s.closePath();
    if (lit > 0.01) s.fill();
  }
  g.drawImage(shade, R - r, R - r, r * 2, r * 2);
  // Earthshine: the dark side is never quite black.
  g.globalCompositeOperation = "screen";
  g.fillStyle = "rgba(40,52,82,0.12)";
  g.fillRect(R - r, R - r, r * 2, r * 2);
  g.restore();
  return c;
}
