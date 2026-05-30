
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic miracle that iron was "sent down" from space —
// modern science confirms iron originates from supernovae explosions.
// Shows a supernova burst, falling iron meteorites with glowing trails, and scattered stars.

export default function IronSentDownVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Stars
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.5 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.5 + 0.3,
    }));

    // Meteorites
    const meteorites = Array.from({ length: 12 }, () => ({
      x: Math.random(),
      y: -Math.random() * 0.5,
      speed: Math.random() * 0.003 + 0.002,
      size: Math.random() * 8 + 4,
      trail: [] as { x: number; y: number; alpha: number }[],
      angle: Math.random() * 0.4 - 0.2 + Math.PI / 2,
      active: Math.random() > 0.5,
      delay: Math.random() * 300,
    }));

    // Supernova rings
    const rings = Array.from({ length: 5 }, (_, i) => ({
      radius: 0,
      maxRadius: 0.15 + i * 0.06,
      alpha: 0,
      active: false,
      delay: i * 40,
    }));

    // Sparks
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];

    let flashAlpha = 0;
    let supernovaTimer = 0;
    const supernovaInterval = 400;

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background — deep space
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.7);
      bg.addColorStop(0, '#0c0820');
      bg.addColorStop(1, '#050510');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        const twinkle = Math.sin(time * 0.02 * s.speed + s.twinkle) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * (0.7 + twinkle * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + twinkle * 0.7})`;
        ctx.fill();
      }

      // Supernova cycle
      supernovaTimer++;
      if (supernovaTimer >= supernovaInterval) {
        supernovaTimer = 0;
        flashAlpha = 1;
        for (const ring of rings) {
          ring.radius = 0;
          ring.alpha = 1;
          ring.active = true;
        }
        // Spawn sparks
        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 1;
          sparks.push({
            x: 0.5, y: 0.35,
            vx: Math.cos(angle) * speed / w,
            vy: Math.sin(angle) * speed / h,
            life: 1,
            maxLife: Math.random() * 80 + 40,
          });
        }
      }

      // Flash
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,200,100,${flashAlpha * 0.3})`;
        ctx.fillRect(0, 0, w, h);
        flashAlpha *= 0.95;
      }

      // Supernova rings
      for (const ring of rings) {
        if (!ring.active) continue;
        if (supernovaTimer < ring.delay) continue;
        ring.radius += (ring.maxRadius - ring.radius) * 0.03;
        ring.alpha *= 0.99;
        if (ring.alpha < 0.01) { ring.active = false; continue; }

        const cx = w * 0.5;
        const cy = h * 0.35;
        const r = ring.radius * w;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,69,0,${ring.alpha * 0.7})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        // Glow
        const glow = ctx.createRadialGradient(cx, cy, r - 4, cx, cy, r + 12);
        glow.addColorStop(0, `rgba(255,107,53,${ring.alpha * 0.3})`);
        glow.addColorStop(1, 'rgba(255,107,53,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Core glow
      const coreAlpha = 0.3 + Math.sin(time * 0.04) * 0.15 + (flashAlpha * 0.5);
      const coreGlow = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.06);
      coreGlow.addColorStop(0, `rgba(255,200,100,${coreAlpha})`);
      coreGlow.addColorStop(0.5, `rgba(255,69,0,${coreAlpha * 0.5})`);
      coreGlow.addColorStop(1, 'rgba(139,69,19,0)');
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.35, w * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.fill();

      // Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 1 / sp.maxLife;
        if (sp.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(sp.x * w, sp.y * h, 2 * sp.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${sp.life})`;
        ctx.fill();
      }

      // Meteorites
      for (const m of meteorites) {
        if (time < m.delay) continue;
        if (!m.active) {
          m.active = true;
          m.x = 0.3 + Math.random() * 0.4;
          m.y = -0.05;
        }
        m.x += Math.cos(m.angle) * m.speed * 0.3;
        m.y += Math.sin(m.angle) * m.speed;

        // Store trail
        m.trail.push({ x: m.x, y: m.y, alpha: 1 });
        if (m.trail.length > 30) m.trail.shift();

        // Draw trail
        for (let t = 0; t < m.trail.length; t++) {
          const tp = m.trail[t];
          tp.alpha *= 0.95;
          const trailSize = m.size * (t / m.trail.length) * 0.6;
          ctx.beginPath();
          ctx.arc(tp.x * w, tp.y * h, trailSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,69,0,${tp.alpha * 0.4})`;
          ctx.fill();
        }

        // Draw meteorite body
        const mg = ctx.createRadialGradient(
          m.x * w, m.y * h, 0,
          m.x * w, m.y * h, m.size
        );
        mg.addColorStop(0, '#ffcc66');
        mg.addColorStop(0.4, '#ff6b35');
        mg.addColorStop(1, 'rgba(139,69,19,0)');
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.size, 0, Math.PI * 2);
        ctx.fillStyle = mg;
        ctx.fill();

        // Reset if off-screen
        if (m.y > 1.1) {
          m.x = 0.3 + Math.random() * 0.4;
          m.y = -0.05;
          m.trail = [];
          m.delay = time + Math.random() * 100;
          m.active = false;
        }
      }

      // Iron molecule glow particles near bottom
      for (let i = 0; i < 6; i++) {
        const px = 0.2 + Math.sin(time * 0.008 + i * 1.2) * 0.3 + 0.3;
        const py = 0.75 + Math.sin(time * 0.012 + i * 0.8) * 0.08;
        const pa = Math.sin(time * 0.02 + i) * 0.3 + 0.4;
        const feGlow = ctx.createRadialGradient(px * w, py * h, 0, px * w, py * h, 18);
        feGlow.addColorStop(0, `rgba(255,100,30,${pa})`);
        feGlow.addColorStop(1, 'rgba(139,69,19,0)');
        ctx.beginPath();
        ctx.arc(px * w, py * h, 18, 0, Math.PI * 2);
        ctx.fillStyle = feGlow;
        ctx.fill();
        ctx.font = `${12}px monospace`;
        ctx.fillStyle = `rgba(255,165,0,${pa * 0.8})`;
        ctx.fillText('Fe', px * w - 6, py * h + 4);
      }

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
