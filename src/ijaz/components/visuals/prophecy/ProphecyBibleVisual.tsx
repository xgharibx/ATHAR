
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// النبوءة في الإنجيل — Prophecy in the Gospel (الصف 6)
// Cinematic: a radiant open Gospel under a descending shaft of light, golden
// motes streaming down, and the transliteration chain Parakletos → Periklytos → أحمد.

export default function ProphecyBibleVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    // Descending light motes
    const motes = Array.from({ length: 70 }, () => ({
      x: 0.5 + (Math.random() - 0.5) * 0.4,
      y: Math.random(),
      r: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 0.0025 + 0.0008,
      drift: (Math.random() - 0.5) * 0.0004,
      phase: Math.random() * Math.PI * 2,
    }));

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.3,
      tw: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Background — violet sanctuary
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.25, 0, w * 0.5, h * 0.5, w * 0.85);
      bg.addColorStop(0, '#140f24');
      bg.addColorStop(1, '#070512');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        const t = Math.sin(time * 1.5 + s.tw) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,180,255,${0.15 + t * 0.35})`;
        ctx.fill();
      }

      // Descending shaft of light
      const cx = w * 0.5;
      const pulse = 0.16 + Math.sin(time * 1.1) * 0.06;
      const shaft = ctx.createLinearGradient(cx, 0, cx, h * 0.72);
      shaft.addColorStop(0, `rgba(220,200,255,${pulse + 0.12})`);
      shaft.addColorStop(0.5, `rgba(192,168,224,${pulse})`);
      shaft.addColorStop(1, 'rgba(192,168,224,0)');
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.05, 0);
      ctx.lineTo(cx + w * 0.05, 0);
      ctx.lineTo(cx + w * 0.2, h * 0.72);
      ctx.lineTo(cx - w * 0.2, h * 0.72);
      ctx.closePath();
      ctx.fillStyle = shaft;
      ctx.fill();

      // Motes streaming down the shaft
      for (const p of motes) {
        p.y += p.speed;
        p.x += p.drift;
        if (p.y > 0.72) { p.y = 0; p.x = 0.5 + (Math.random() - 0.5) * 0.4; }
        const tw = Math.sin(time * 2 + p.phase) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r * (0.6 + tw * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,215,255,${tw * 0.5})`;
        ctx.fill();
      }

      // ---- Open Gospel book ----
      const bookCx = w * 0.5;
      const bookCy = h * 0.62;
      const reveal = Math.min(1, time / 1.4);
      const ease = 1 - Math.pow(1 - reveal, 3);
      const bw = w * 0.32 * ease;
      const bh = h * 0.2;
      const spineH = bh * 0.12;

      // Book glow halo
      const halo = ctx.createRadialGradient(bookCx, bookCy, 0, bookCx, bookCy, bw * 1.1);
      const haloP = 0.25 + Math.sin(time * 1.5) * 0.1;
      halo.addColorStop(0, `rgba(212,168,83,${haloP})`);
      halo.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.beginPath();
      ctx.arc(bookCx, bookCy, bw * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      if (bw > 6) {
        // Two pages (left + right) as slanted quads
        const pageGrad = ctx.createLinearGradient(0, bookCy - bh / 2, 0, bookCy + bh / 2);
        pageGrad.addColorStop(0, 'rgba(245,238,220,0.95)');
        pageGrad.addColorStop(1, 'rgba(210,198,170,0.9)');
        // left page
        ctx.beginPath();
        ctx.moveTo(bookCx, bookCy - bh / 2 + spineH);
        ctx.lineTo(bookCx - bw, bookCy - bh / 2);
        ctx.lineTo(bookCx - bw, bookCy + bh / 2);
        ctx.lineTo(bookCx, bookCy + bh / 2 - spineH);
        ctx.closePath();
        ctx.fillStyle = pageGrad;
        ctx.fill();
        // right page
        ctx.beginPath();
        ctx.moveTo(bookCx, bookCy - bh / 2 + spineH);
        ctx.lineTo(bookCx + bw, bookCy - bh / 2);
        ctx.lineTo(bookCx + bw, bookCy + bh / 2);
        ctx.lineTo(bookCx, bookCy + bh / 2 - spineH);
        ctx.closePath();
        ctx.fillStyle = pageGrad;
        ctx.fill();

        // Spine
        ctx.strokeStyle = 'rgba(120,90,40,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bookCx, bookCy - bh / 2 + spineH);
        ctx.lineTo(bookCx, bookCy + bh / 2 - spineH);
        ctx.stroke();

        // Text lines on both pages
        ctx.strokeStyle = 'rgba(90,70,40,0.4)';
        ctx.lineWidth = 1;
        const lines = 6;
        for (let i = 0; i < lines; i++) {
          const ly = bookCy - bh / 2 + 10 + (i / lines) * (bh - 16);
          const prog = Math.max(0, Math.min(1, (time - 1.4 - i * 0.12) / 0.4));
          if (prog <= 0) continue;
          // highlight 4th line (the prophecy line)
          const isKey = i === 3;
          ctx.strokeStyle = isKey ? `rgba(45,212,168,${0.7 * prog})` : `rgba(90,70,40,${0.4 * prog})`;
          ctx.lineWidth = isKey ? 2 : 1;
          // left
          ctx.beginPath();
          ctx.moveTo(bookCx - bw + 12, ly);
          ctx.lineTo(bookCx - bw + 12 + (bw - 20) * 0.78 * prog, ly);
          ctx.stroke();
          // right
          ctx.beginPath();
          ctx.moveTo(bookCx + 8, ly);
          ctx.lineTo(bookCx + 8 + (bw - 20) * 0.78 * prog, ly);
          ctx.stroke();
        }
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

      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-4 left-0 right-0 text-center font-amiri text-lg text-[#c8b0ec] z-10 pointer-events-none"
        style={{ textShadow: '0 0 18px rgba(192,168,224,0.5)' }}
      >
        البشارة في الإنجيل
      </motion.p>

      {/* Transliteration chain */}
      <div className="absolute top-[26%] left-0 right-0 z-10 flex flex-col items-center gap-2 px-4 pointer-events-none">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { t: 'Parakletos', s: 'παράκλητος' },
            { t: 'Periklytos', s: 'περικλυτός' },
          ].map((x, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.6 + i * 0.5, duration: 0.5 }}
              className="text-center rounded-lg bg-[#1a1530]/70 border border-[#a090c0]/25 px-3 py-1 backdrop-blur-sm"
            >
              <p className="font-mono text-xs text-[#c8b0ec]">{x.t}</p>
              <p className="font-mono text-[9px] text-[#a090c0]/60">{x.s}</p>
            </motion.div>
          ))}
          <motion.svg
            viewBox="0 0 24 12" className="w-6 h-3"
            initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ delay: 2.4, duration: 1.4, repeat: Infinity }}
          >
            <path d="M2 6 H18 M14 2 L20 6 L14 10" fill="none" stroke="#d4a853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.8, type: 'spring', stiffness: 200 }}
            className="rounded-lg bg-gold-primary/10 border border-gold-primary/35 px-4 py-1"
            style={{ boxShadow: '0 0 22px rgba(212,168,83,0.25)' }}
          >
            <p className="font-amiri text-lg text-gold-primary">أحمد</p>
            <p className="text-[8px] text-text-muted font-tajawal text-center">الأكثر حمدًا</p>
          </motion.div>
        </div>
      </div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2, duration: 1.6 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xs md:text-sm text-verse-green/75 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}>
          وَمُبَشِّرًا بِرَسُولٍ يَأْتِي مِن بَعْدِي اسْمُهُ أَحْمَدُ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الصف : 6</p>
      </motion.div>
    </div>
  );
}
