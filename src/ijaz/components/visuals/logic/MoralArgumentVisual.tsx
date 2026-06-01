import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// الحجة الأخلاقية — The Moral Argument
// Cinematic: a luminous balance scale settles into perfect equilibrium while
// streams of objective moral values rise from it toward a single transcendent
// source of light — grounding objective morality in the Divine.

const STEPS = [
  { n: '١', text: 'لو لا الله، لا قيم موضوعية' },
  { n: '٢', text: 'القيم الموضوعية موجودة' },
  { n: '∴', text: 'إذن الله موجود' },
];

const MORAL_FACTS = ['العدل', 'الرحمة', 'الصدق', 'حُرمة الظلم'];

export default function MoralArgumentVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const rays = Array.from({ length: 40 }, () => ({
      x: 0.3 + Math.random() * 0.4,
      r: Math.random() * 1.4 + 0.6,
      sp: Math.random() * 0.5 + 0.4,
      delay: Math.random() * 3,
    }));

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      const bg = ctx.createRadialGradient(w * 0.5, h * 0.18, 0, w * 0.5, h * 0.6, w * 0.9);
      bg.addColorStop(0, '#0d1218');
      bg.addColorStop(1, '#05070a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // transcendent source at top
      const srcX = w * 0.5;
      const srcY = h * 0.12;
      const pulse = 0.6 + Math.sin(time * 1.6) * 0.3;
      const sg = ctx.createRadialGradient(srcX, srcY, 0, srcX, srcY, w * 0.3);
      sg.addColorStop(0, `rgba(255,240,200,${0.5 * pulse + 0.15})`);
      sg.addColorStop(0.5, `rgba(212,168,83,${0.18 * pulse})`);
      sg.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.beginPath();
      ctx.arc(srcX, srcY, w * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.fill();

      // rising value particles toward the source
      const baseY = h * 0.62;
      for (const r of rays) {
        const t = ((time - r.delay) % 3.5) / 3.5;
        if (t < 0) continue;
        const ez = t;
        const px = (r.x + (0.5 - r.x) * ez) * w + Math.sin(time * 2 + r.x * 10) * 6;
        const py = baseY + (srcY - baseY) * ez;
        const alpha = Math.sin(t * Math.PI) * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, r.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,225,150,${alpha})`;
        ctx.fill();
      }

      // luminous balance scale settling to equilibrium
      const settle = Math.min(1, time / 3);
      const tilt = Math.sin(time * 1.2) * (1 - settle) * 0.25;
      const cx = w * 0.5;
      const beamY = baseY;
      const armLen = w * 0.16;

      ctx.save();
      ctx.translate(cx, beamY);
      ctx.rotate(tilt);
      // beam
      ctx.strokeStyle = 'rgba(212,168,83,0.85)';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = 'rgba(212,168,83,0.6)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-armLen, 0);
      ctx.lineTo(armLen, 0);
      ctx.stroke();
      // pans
      for (const side of [-1, 1]) {
        const px = side * armLen;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px - 12, 22);
        ctx.moveTo(px, 0);
        ctx.lineTo(px + 12, 22);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, 26, 13, Math.PI, Math.PI * 2, true);
        ctx.stroke();
      }
      ctx.restore();

      // central post
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(212,168,83,0.7)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx, beamY);
      ctx.lineTo(cx, beamY + h * 0.14);
      ctx.stroke();
      // pivot glow
      ctx.beginPath();
      ctx.arc(cx, beamY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,245,210,0.95)';
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };

    let started = false;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

      <motion.p
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-3 left-0 right-0 text-center font-amiri text-base md:text-lg text-gold-primary z-10 pointer-events-none"
        style={{ textShadow: '0 0 18px rgba(212,168,83,0.4)' }}
      >
        الحجة الأخلاقية
      </motion.p>

      {/* Premise chain */}
      <div className="absolute left-2 top-[26%] flex flex-col gap-1.5 z-10 pointer-events-none">
        {STEPS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.45, duration: 0.5 }}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 backdrop-blur-sm border ${
              i === 2 ? 'bg-verse-green/15 border-verse-green/40' : 'bg-black/30 border-gold-primary/20'
            }`}
          >
            <span className={`font-amiri text-xs ${i === 2 ? 'text-verse-green' : 'text-gold-primary'}`}>{s.n}</span>
            <span className={`font-tajawal text-[10px] md:text-xs ${i === 2 ? 'text-verse-green' : 'text-text-secondary'}`}>{s.text}</span>
          </motion.div>
        ))}
      </div>

      {/* Moral facts pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-[16%] left-0 right-0 flex flex-wrap justify-center gap-1.5 px-4 z-10 pointer-events-none"
      >
        {MORAL_FACTS.map((m, i) => (
          <motion.span
            key={m}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 + i * 0.18, duration: 0.4 }}
            className="rounded-full bg-gold-primary/10 border border-gold-primary/30 px-2.5 py-0.5 font-amiri text-xs text-gold-primary"
          >
            {m}
          </motion.span>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 1.2 }}
        className="absolute bottom-4 left-0 right-0 text-center font-amiri text-xs md:text-sm text-verse-green/75 px-4 z-10 pointer-events-none"
        style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}
      >
        إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ — النحل : 90
      </motion.p>
    </div>
  );
}
