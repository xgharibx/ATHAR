
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic description of the water cycle —
// modern hydrology confirms the complete cycle of evaporation, condensation, and precipitation.
// Shows ocean, evaporation, cloud formation, rain, rivers/springs, and mountains.

export default function WaterCycleVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Evaporation particles rising from ocean
    const evapParticles = Array.from({ length: 60 }, () => ({
      x: 0.05 + Math.random() * 0.35,
      y: 0.72 + Math.random() * 0.05,
      speed: 0.0008 + Math.random() * 0.0012,
      size: 1.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.3 + Math.random() * 0.4,
      state: 'rising' as 'rising' | 'cloud' | 'rain' | 'river',
    }));

    // Rain drops
    const rainDrops = Array.from({ length: 50 }, () => ({
      x: 0.5 + Math.random() * 0.3,
      y: 0.2 + Math.random() * 0.1,
      speed: 0.003 + Math.random() * 0.004,
      length: 6 + Math.random() * 10,
      active: Math.random() > 0.3,
    }));

    // River flow particles
    const riverParticles = Array.from({ length: 30 }, () => ({
      x: 0.65 + Math.random() * 0.05,
      y: 0.5 + Math.random() * 0.03,
      progress: Math.random(),
    }));

    // Cloud puffs
    const clouds = Array.from({ length: 12 }, (_, i) => ({
      x: 0.42 + (i % 4) * 0.08 + Math.random() * 0.04,
      y: 0.15 + Math.floor(i / 4) * 0.05 + Math.random() * 0.03,
      rx: 0.03 + Math.random() * 0.04,
      ry: 0.015 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
    }));

    // Ocean wave points
    const wavePoints = Array.from({ length: 40 }, (_, i) => ({
      x: i / 39,
      phase: Math.random() * Math.PI * 2,
      amp: 2 + Math.random() * 4,
      speed: 0.02 + Math.random() * 0.02,
    }));

    // Mountain terrain path
    const mountainPath = [
      { x: 0.4, y: 0.75 },
      { x: 0.5, y: 0.6 },
      { x: 0.55, y: 0.55 },
      { x: 0.6, y: 0.42 },  // peak
      { x: 0.65, y: 0.38 },  // highest peak
      { x: 0.72, y: 0.45 },
      { x: 0.78, y: 0.5 },
      { x: 0.85, y: 0.55 },
      { x: 0.92, y: 0.62 },
      { x: 1.0, y: 0.65 },
    ];

    // Snow particles on mountain tops
    const snowParticles = Array.from({ length: 20 }, () => ({
      x: 0.58 + Math.random() * 0.15,
      y: 0.36 + Math.random() * 0.08,
      size: 1 + Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2,
    }));

    // Cycle arrows (visual indicators)
    const arrowPhase = { evaporate: 0, condense: 0, precipitate: 0, flow: 0 };

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background — dark blue sky
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#060612');
      bg.addColorStop(0.3, '#080818');
      bg.addColorStop(0.7, '#0a0a1e');
      bg.addColorStop(1, '#060612');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Sun glow (top right for evaporation source)
      const sunGlow = ctx.createRadialGradient(w * 0.15, h * 0.08, 0, w * 0.15, h * 0.08, w * 0.12);
      sunGlow.addColorStop(0, 'rgba(255,200,80,0.15)');
      sunGlow.addColorStop(0.5, 'rgba(255,180,60,0.05)');
      sunGlow.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(w * 0.15, h * 0.08, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.15, h * 0.08, 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,220,100,0.4)';
      ctx.fill();

      // OCEAN (bottom left)
      const oceanTop = h * 0.75;
      const oceanGrad = ctx.createLinearGradient(0, oceanTop, 0, h);
      oceanGrad.addColorStop(0, '#1166cc');
      oceanGrad.addColorStop(0.3, '#0055aa');
      oceanGrad.addColorStop(1, '#003366');
      ctx.beginPath();
      ctx.moveTo(0, oceanTop);
      // Waves
      for (const wp of wavePoints) {
        if (wp.x > 0.42) break;
        const waveY = oceanTop + Math.sin(time * wp.speed + wp.phase) * wp.amp;
        ctx.lineTo(wp.x * w, waveY);
      }
      ctx.lineTo(0.42 * w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Ocean surface shimmer
      for (let x = 0.02; x < 0.4; x += 0.03) {
        const shimY = oceanTop + Math.sin(time * 0.03 + x * 20) * 3;
        const shimAlpha = Math.sin(time * 0.02 + x * 15) * 0.2 + 0.2;
        ctx.beginPath();
        ctx.moveTo(x * w, shimY);
        ctx.lineTo((x + 0.02) * w, shimY + 1);
        ctx.strokeStyle = `rgba(136,204,255,${shimAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // MOUNTAINS (right side)
      ctx.beginPath();
      ctx.moveTo(mountainPath[0].x * w, mountainPath[0].y * h);
      for (let i = 1; i < mountainPath.length; i++) {
        ctx.lineTo(mountainPath[i].x * w, mountainPath[i].y * h);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0.4 * w, h);
      ctx.closePath();
      const mtGrad = ctx.createLinearGradient(0, h * 0.35, 0, h);
      mtGrad.addColorStop(0, '#3d6b3d');
      mtGrad.addColorStop(0.3, '#2d5a2d');
      mtGrad.addColorStop(1, '#1a3a1a');
      ctx.fillStyle = mtGrad;
      ctx.fill();

      // Mountain texture
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < mountainPath.length - 1; i++) {
        const p1 = mountainPath[i];
        const p2 = mountainPath[i + 1];
        for (let j = 0; j < 3; j++) {
          const frac = 0.3 + j * 0.25;
          ctx.beginPath();
          ctx.moveTo(p1.x * w, (p1.y + (1 - p1.y) * frac) * h);
          ctx.lineTo(p2.x * w, (p2.y + (1 - p2.y) * frac) * h);
          ctx.strokeStyle = '#44aa66';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Snow on peaks
      for (const sp of snowParticles) {
        const twinkle = Math.sin(time * 0.02 + sp.twinkle) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(sp.x * w, sp.y * h, sp.size * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.5})`;
        ctx.fill();
      }
      // Snow cap
      ctx.beginPath();
      ctx.moveTo(0.6 * w, h * 0.42);
      ctx.lineTo(0.65 * w, h * 0.38);
      ctx.lineTo(0.7 * w, h * 0.43);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();

      // CLOUDS
      for (const cl of clouds) {
        const cx = cl.x * w + Math.sin(time * 0.003 + cl.phase) * 5;
        const cy = cl.y * h;
        const pulse = Math.sin(time * 0.01 + cl.phase) * 0.1 + 0.9;
        const cGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cl.rx * w * pulse);
        cGlow.addColorStop(0, 'rgba(255,255,255,0.35)');
        cGlow.addColorStop(0.6, 'rgba(200,220,255,0.15)');
        cGlow.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.beginPath();
        ctx.ellipse(cx, cy, cl.rx * w * pulse, cl.ry * h * pulse, 0, 0, Math.PI * 2);
        ctx.fillStyle = cGlow;
        ctx.fill();
      }

      // EVAPORATION particles
      for (const ep of evapParticles) {
        ep.y -= ep.speed;
        ep.x += Math.sin(time * 0.01 + ep.phase) * 0.0004;

        // Rising from ocean to cloud level
        if (ep.y < 0.2) {
          ep.y = 0.72 + Math.random() * 0.05;
          ep.x = 0.05 + Math.random() * 0.35;
        }

        const px = ep.x * w;
        const py = ep.y * h;
        const fadeAlpha = ep.y > 0.5 ? ep.alpha : ep.alpha * (ep.y / 0.5);

        const eg = ctx.createRadialGradient(px, py, 0, px, py, ep.size * 3);
        eg.addColorStop(0, `rgba(136,204,255,${fadeAlpha})`);
        eg.addColorStop(1, 'rgba(136,204,255,0)');
        ctx.beginPath();
        ctx.arc(px, py, ep.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = eg;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, ep.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,230,255,${fadeAlpha * 0.8})`;
        ctx.fill();
      }

      // RAIN drops
      for (const rd of rainDrops) {
        if (!rd.active) {
          if (Math.random() > 0.99) rd.active = true;
          continue;
        }
        rd.y += rd.speed;
        if (rd.y > 0.7) {
          rd.y = 0.2 + Math.random() * 0.05;
          rd.x = 0.48 + Math.random() * 0.25;
        }

        ctx.beginPath();
        ctx.moveTo(rd.x * w, rd.y * h);
        ctx.lineTo(rd.x * w - 0.5, rd.y * h + rd.length);
        ctx.strokeStyle = `rgba(100,180,255,${0.3 + Math.sin(time * 0.05) * 0.1})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // RIVER/SPRING flow down mountain
      const riverPath = [
        { x: 0.65, y: 0.42 },
        { x: 0.62, y: 0.5 },
        { x: 0.58, y: 0.58 },
        { x: 0.52, y: 0.63 },
        { x: 0.45, y: 0.68 },
        { x: 0.42, y: 0.74 },
      ];
      // Draw river path
      ctx.beginPath();
      ctx.moveTo(riverPath[0].x * w, riverPath[0].y * h);
      for (let i = 1; i < riverPath.length; i++) {
        const prev = riverPath[i - 1];
        const curr = riverPath[i];
        ctx.quadraticCurveTo(
          (prev.x + curr.x) / 2 * w + Math.sin(time * 0.02 + i) * 3,
          (prev.y + curr.y) / 2 * h,
          curr.x * w,
          curr.y * h
        );
      }
      ctx.strokeStyle = 'rgba(0,102,204,0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // River flow particles
      for (const rp of riverParticles) {
        rp.progress += 0.003;
        if (rp.progress > 1) rp.progress = 0;

        const idx = Math.floor(rp.progress * (riverPath.length - 1));
        const nextIdx = Math.min(idx + 1, riverPath.length - 1);
        const frac = (rp.progress * (riverPath.length - 1)) - idx;
        const rpx = (riverPath[idx].x + (riverPath[nextIdx].x - riverPath[idx].x) * frac) * w;
        const rpy = (riverPath[idx].y + (riverPath[nextIdx].y - riverPath[idx].y) * frac) * h;

        ctx.beginPath();
        ctx.arc(rpx + Math.sin(time * 0.04) * 2, rpy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,200,255,${0.4 + Math.sin(rp.progress * Math.PI) * 0.3})`;
        ctx.fill();
      }

      // Cycle direction arrows (subtle)
      arrowPhase.evaporate = time * 0.01;
      // Evaporation arrow (up)
      const arrAlpha = 0.15 + Math.sin(time * 0.02) * 0.05;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.5);
      ctx.lineTo(w * 0.2, h * 0.3);
      ctx.lineTo(w * 0.18, h * 0.34);
      ctx.moveTo(w * 0.2, h * 0.3);
      ctx.lineTo(w * 0.22, h * 0.34);
      ctx.strokeStyle = `rgba(136,204,255,${arrAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Rain arrow (down)
      ctx.beginPath();
      ctx.moveTo(w * 0.6, h * 0.25);
      ctx.lineTo(w * 0.6, h * 0.4);
      ctx.lineTo(w * 0.58, h * 0.36);
      ctx.moveTo(w * 0.6, h * 0.4);
      ctx.lineTo(w * 0.62, h * 0.36);
      ctx.strokeStyle = `rgba(100,180,255,${arrAlpha})`;
      ctx.stroke();

      // Labels
      ctx.font = `${Math.max(10, w * 0.011)}px sans-serif`;
      ctx.fillStyle = `rgba(136,204,255,${0.25 + Math.sin(time * 0.015) * 0.1})`;
      ctx.fillText('Evaporation', w * 0.08, h * 0.55);
      ctx.fillText('Condensation', w * 0.45, h * 0.12);
      ctx.fillText('Precipitation', w * 0.7, h * 0.28);
      ctx.fillText('Collection', w * 0.08, h * 0.88);

      animId = requestAnimationFrame(draw);
    };
    let started = false;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 2);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 2);
      if (!started) { started = true; draw(); }
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className={`relative w-full h-full overflow-hidden ${className || ''}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </motion.div>
  );
}
