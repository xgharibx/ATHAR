import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// الحجة الكونية الكلامية — Kalam Cosmological Argument
// Cinematic: a Big Bang flash erupts and an expanding universe of particles
// streams outward, establishing "the universe began". Premise cards cascade
// into a glowing conclusion, and the required attributes of the First Cause ignite.

const STEPS = [
  { n: '١', text: 'كل ما له بداية فله سبب' },
  { n: '٢', text: 'الكون له بداية' },
  { n: '∴', text: 'إذن للكون سبب' },
];

const CAUSE_PROPS = ['أزليّ', 'غير مادّي', 'قادر', 'مريد'];

export default function KalamCosmologicalVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const stars = Array.from({ length: 220 }, () => {
      const ang = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.35 + 0.05;
      return {
        ang,
        speed,
        r: Math.random() * 1.6 + 0.4,
        hue: Math.random(),
        delay: Math.random() * 0.5,
      };
    });

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w * 0.5;
      const cy = h * 0.46;

      ctx.fillStyle = '#04030a';
      ctx.fillRect(0, 0, w, h);

      // expansion factor loops every 6s with a flash at t=0
      const cycle = time % 6;
      const flash = Math.max(0, 1 - cycle / 0.6);
      const expand = Math.min(1, cycle / 4.5);
      const ease = 1 - Math.pow(1 - expand, 2);

      // Big Bang flash
      if (flash > 0) {
        const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5 * flash + 20);
        fg.addColorStop(0, `rgba(255,250,235,${flash})`);
        fg.addColorStop(0.5, `rgba(255,210,140,${flash * 0.6})`);
        fg.addColorStop(1, 'rgba(212,168,83,0)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }

      // central glow (singularity)
      const cglow = 0.4 + Math.sin(time * 3) * 0.2;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
      cg.addColorStop(0, `rgba(255,240,200,${cglow})`);
      cg.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();

      // expanding universe particles
      const maxR = Math.min(w, h) * 0.55;
      for (const s of stars) {
        const local = Math.max(0, ease - s.delay * 0.1);
        const dist = local * maxR * s.speed * 4;
        const px = cx + Math.cos(s.ang) * dist;
        const py = cy + Math.sin(s.ang) * dist;
        const alpha = (1 - local * 0.3) * 0.9;
        const col = s.hue > 0.5 ? '255,225,150' : '160,200,255';
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${alpha})`;
        ctx.fill();
      }

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
        الحجة الكونية
      </motion.p>

      {/* Premise chain */}
      <div className="absolute left-0 right-0 top-[20%] flex flex-col items-center gap-2 z-10 pointer-events-none px-4">
        {STEPS.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i === 2 ? 0 : (i % 2 ? 40 : -40), scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.5, duration: 0.6 }}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 backdrop-blur-sm border ${
              i === 2
                ? 'bg-verse-green/15 border-verse-green/40'
                : 'bg-black/35 border-gold-primary/25'
            }`}
            style={i === 2 ? { boxShadow: '0 0 22px rgba(45,212,168,0.35)' } : undefined}
          >
            <span className={`font-amiri text-sm ${i === 2 ? 'text-verse-green' : 'text-gold-primary'}`}>{s.n}</span>
            <span className={`font-tajawal text-xs md:text-sm ${i === 2 ? 'text-verse-green' : 'text-text-secondary'}`}>{s.text}</span>
          </motion.div>
        ))}
      </div>

      {/* First-Cause attributes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 0.8 }}
        className="absolute bottom-[16%] left-0 right-0 z-10 pointer-events-none"
      >
        <p className="text-center text-gold-primary/70 text-xs font-tajawal mb-1.5">صفات السبب الأول</p>
        <div className="flex flex-wrap justify-center gap-1.5 px-4">
          {CAUSE_PROPS.map((p, i) => (
            <motion.span
              key={p}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.6 + i * 0.2, duration: 0.4 }}
              className="rounded-full bg-gold-primary/10 border border-gold-primary/30 px-2.5 py-0.5 font-amiri text-xs text-gold-primary"
            >
              {p}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.4, duration: 1.2 }}
        className="absolute bottom-4 left-0 right-0 text-center font-amiri text-xs md:text-sm text-verse-green/75 px-4 z-10 pointer-events-none"
        style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}
      >
        أَمْ خُلِقُوا مِنْ غَيْرِ شَيْءٍ أَمْ هُمُ الْخَالِقُونَ — الطور : 35
      </motion.p>
    </div>
  );
}
