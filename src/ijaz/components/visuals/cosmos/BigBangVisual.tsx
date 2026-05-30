
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 💥 الانفجار العظيم — The Big Bang + Cosmic Smoke (دُخَان)
// "ثُمَّ اسْتَوَىٰ إِلَى السَّمَاءِ وَهِيَ دُخَانٌ"
// Explosion from singularity, expanding smoke, particles materializing

export default function BigBangVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Smoke particles
    const smokeParticles = Array.from({ length: 300 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 2 + 0.5,
      size: Math.random() * 40 + 15,
      opacity: Math.random() * 0.4 + 0.1,
      dist: 0,
      maxDist: Math.random() * 0.6 + 0.2,
      delay: Math.random() * 2,
      turbulence: Math.random() * 20 - 10,
      r: Math.floor(180 + Math.random() * 75),
      g: Math.floor(100 + Math.random() * 80),
      b: Math.floor(50 + Math.random() * 50),
    }));

    // Bright explosion sparks
    const sparks = Array.from({ length: 200 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 5 + 2,
      size: Math.random() * 3 + 1,
      life: 0,
      maxLife: Math.random() * 3 + 1,
      delay: Math.random() * 0.5,
      hue: Math.random() > 0.5 ? 35 + Math.random() * 15 : 200 + Math.random() * 40,
    }));

    const draw = () => {
      time += 0.012;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.max(w, h) * 0.5;

      // Fade trail
      ctx.fillStyle = 'rgba(5, 5, 16, 0.15)';
      ctx.fillRect(0, 0, w, h);

      // Phase: 0-1 = flash, 1-4 = expansion, 4+ = smoke settling
      const phase = time;

      // Initial bright flash
      if (phase < 2) {
        const flashIntensity = Math.max(0, 1 - phase) * 0.8;
        const flashR = phase * maxR * 0.3;
        const fGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
        fGrad.addColorStop(0, `rgba(255, 255, 240, ${flashIntensity})`);
        fGrad.addColorStop(0.3, `rgba(255, 200, 100, ${flashIntensity * 0.5})`);
        fGrad.addColorStop(1, `rgba(255, 100, 50, 0)`);
        ctx.fillStyle = fGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Smoke (دُخَان) — the key Quranic description
      smokeParticles.forEach((p) => {
        if (phase < p.delay) return;
        const t = phase - p.delay;
        const dist = Math.min(t * p.speed * 0.05, p.maxDist);
        const turbX = Math.sin(t * 1.5 + p.angle * 3) * p.turbulence * dist;
        const turbY = Math.cos(t * 2 + p.angle * 5) * p.turbulence * dist;

        const x = cx + Math.cos(p.angle) * dist * maxR + turbX;
        const y = cy + Math.sin(p.angle) * dist * maxR + turbY;
        const fadein = Math.min(1, t * 2);
        const fadeout = dist > p.maxDist * 0.8 ? (p.maxDist - dist) / (p.maxDist * 0.2) : 1;
        const alpha = p.opacity * fadein * Math.max(0, fadeout);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.size * (1 + dist));
        grad.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + dist), 0, Math.PI * 2);
        ctx.fill();
      });

      // Bright sparks flying outward
      sparks.forEach((s) => {
        if (phase < s.delay) return;
        const t = phase - s.delay;
        if (t > s.maxLife) return;

        const dist = t * s.speed * 0.08;
        const x = cx + Math.cos(s.angle) * dist * maxR;
        const y = cy + Math.sin(s.angle) * dist * maxR;
        const alpha = Math.max(0, 1 - t / s.maxLife);

        ctx.beginPath();
        ctx.arc(x, y, s.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 100%, 80%, ${alpha})`;
        ctx.fill();

        // Glow trail
        ctx.beginPath();
        ctx.arc(x, y, s.size * 4 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 100%, 60%, ${alpha * 0.15})`;
        ctx.fill();
      });

      // Central core — still glowing
      const coreSize = 8 + Math.sin(time * 2) * 3;
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 3);
      cGrad.addColorStop(0, `rgba(255, 230, 180, ${Math.min(0.9, 0.3 + Math.sin(time) * 0.2)})`);
      cGrad.addColorStop(0.5, 'rgba(255, 150, 50, 0.2)');
      cGrad.addColorStop(1, 'rgba(255, 100, 30, 0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize * 3, 0, Math.PI * 2);
      ctx.fill();

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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 2 }}
        className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xl md:text-2xl text-verse-green/80" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          ثُمَّ اسْتَوَىٰ إِلَى السَّمَاءِ وَهِيَ دُخَانٌ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">فصلت : 11</p>
      </motion.div>
    </div>
  );
}
