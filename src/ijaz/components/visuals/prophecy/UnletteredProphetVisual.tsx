import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// النبي الأمي — The Unlettered Prophet (العنكبوت 48)
// Cinematic: a radiant source (the heart receiving revelation) pours streams of
// golden light that self-organize into glowing rows of "verses" — eloquence with
// no pen, no ink. A faint crossed-out quill marks the illiteracy.

export default function UnletteredProphetVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const particles = Array.from({ length: 140 }, () => ({
      tx: 0.18 + Math.random() * 0.64,
      row: Math.floor(Math.random() * 6),
      r: Math.random() * 1.6 + 0.8,
      delay: Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      const bg = ctx.createRadialGradient(w * 0.5, h * 0.8, 0, w * 0.5, h * 0.4, w * 0.85);
      bg.addColorStop(0, '#16100a');
      bg.addColorStop(1, '#070502');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const srcX = w * 0.5;
      const srcY = h * 0.8;
      const pulse = 0.5 + Math.sin(time * 1.8) * 0.3;
      const src = ctx.createRadialGradient(srcX, srcY, 0, srcX, srcY, w * 0.22);
      src.addColorStop(0, `rgba(255,235,180,${0.5 * pulse + 0.2})`);
      src.addColorStop(0.4, `rgba(212,168,83,${0.25 * pulse})`);
      src.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.beginPath();
      ctx.arc(srcX, srcY, w * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = src;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(srcX, srcY, 5 + pulse * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,245,210,0.95)';
      ctx.fill();

      const rowY = (row: number) => 0.22 + row * 0.075;
      const cx = srcX / w;
      for (const p of particles) {
        const t = ((time - p.delay) % 5) / 2.4;
        if (t < 0 || t > 1) continue;
        const ez = 1 - Math.pow(1 - t, 3);
        const targetY = rowY(p.row);
        const px = cx + (p.tx - cx) * ez;
        const py = 0.8 + (targetY - 0.8) * ez;
        const settle = Math.min(1, Math.max(0, (t - 0.7) / 0.3));
        const wob = Math.sin(time * 2 + p.phase) * 0.004 * (1 - settle);
        const fx = (px + wob) * w;
        const fy = py * h;
        const alpha = t < 0.1 ? t * 10 : (t > 0.9 ? (1 - t) * 10 : 1);
        ctx.beginPath();
        ctx.arc(fx, fy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,225,150,${alpha * 0.85})`;
        ctx.fill();
      }

      for (let row = 0; row < 6; row++) {
        const ry = rowY(row) * h;
        const grow = Math.min(1, Math.max(0, (time - 1 - row * 0.25) / 1.2));
        if (grow <= 0) continue;
        const rowW = (0.6 - row * 0.04) * w * grow;
        const lx = w * 0.5 - rowW / 2;
        const grd = ctx.createLinearGradient(lx, ry, lx + rowW, ry);
        grd.addColorStop(0, 'rgba(212,168,83,0)');
        grd.addColorStop(0.5, 'rgba(255,220,140,0.4)');
        grd.addColorStop(1, 'rgba(212,168,83,0)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(lx, ry);
        ctx.lineTo(lx + rowW, ry);
        ctx.stroke();
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
        className="absolute top-4 left-0 right-0 text-center font-amiri text-lg text-gold-primary z-10 pointer-events-none"
        style={{ textShadow: '0 0 18px rgba(212,168,83,0.4)' }}
      >
        النبي الأمي
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="absolute top-[14%] left-1/2 -translate-x-1/2 z-10 pointer-events-none flex items-center gap-2 rounded-full bg-black/30 border border-red-400/25 px-3 py-1 backdrop-blur-sm"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4">
          <path d="M3 16 L13 6 L17 10 L7 20 Z" fill="none" stroke="#b08050" strokeWidth="1.4" />
          <line x1="3" y1="3" x2="21" y2="21" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="font-amiri text-xs text-red-300/80">لا يقرأ ولا يكتب</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6, duration: 1 }}
        className="absolute bottom-[15%] left-0 right-0 text-center text-text-secondary text-xs font-tajawal px-6 z-10 pointer-events-none"
      >
        رجلٌ أُمّيّ لم يقرأ كتابًا قط — فجاء بأبلغ كلام عرفته البشرية
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 2 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xs md:text-sm text-verse-green/75 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}>
          وَمَا كُنتَ تَتْلُو مِن قَبْلِهِ مِن كِتَابٍ وَلَا تَخُطُّهُ بِيَمِينِكَ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">العنكبوت : 48</p>
      </motion.div>
    </div>
  );
}
