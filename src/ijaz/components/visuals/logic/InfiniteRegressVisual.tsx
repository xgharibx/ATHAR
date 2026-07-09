import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// برهان استحالة التسلسل — The Impossibility of Infinite Regress
// Cinematic: a chain of cause-orbs recedes toward a vanishing point on the left,
// fading into the dark with no start — an impossible, untraversable infinity —
// until it terminates on the right in a single radiant First Uncaused Cause.

export default function InfiniteRegressVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;
    const COUNT = 14;

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0a0815');
      bg.addColorStop(1, '#05040c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const baseY = h * 0.52;
      const anchorX = w * 0.86;
      const vanishX = w * -0.1;

      // First Uncaused Cause anchor on the right
      const pulse = 0.6 + Math.sin(time * 2) * 0.3;
      const ng = ctx.createRadialGradient(anchorX, baseY, 0, anchorX, baseY, w * 0.2);
      ng.addColorStop(0, `rgba(255,235,180,${0.55 * pulse + 0.2})`);
      ng.addColorStop(0.5, `rgba(212,168,83,${0.2 * pulse})`);
      ng.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.beginPath();
      ctx.arc(anchorX, baseY, w * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = ng;
      ctx.fill();

      // Chain of causes receding toward the vanishing point (perspective: spacing
      // and radius shrink geometrically, never actually reaching the left edge)
      for (let i = 0; i < COUNT; i++) {
        const tPos = i / COUNT; // 0 = near anchor, 1 = far into the regress
        const x = anchorX - (anchorX - vanishX) * (1 - Math.pow(1 - tPos, 2.2));
        const scale = 1 - tPos * 0.85;
        const radius = 13 * scale;
        const drift = Math.sin(time * 1.4 - i * 0.5) * 5 * scale;
        const y = baseY + drift;
        const fade = (1 - tPos) * 0.85 + 0.05;

        if (x < 0 || radius < 0.4) continue;

        const og = ctx.createRadialGradient(x, y, 0, x, y, radius);
        og.addColorStop(0, `rgba(190,180,230,${fade})`);
        og.addColorStop(1, 'rgba(120,110,170,0)');
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();

        // link to the next (closer-to-anchor) node
        if (i > 0) {
          const prevT = (i - 1) / COUNT;
          const prevX = anchorX - (anchorX - vanishX) * (1 - Math.pow(1 - prevT, 2.2));
          const prevY = baseY + Math.sin(time * 1.4 - (i - 1) * 0.5) * 5 * (1 - prevT * 0.85);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(prevX, prevY);
          ctx.strokeStyle = `rgba(150,140,200,${fade * 0.5})`;
          ctx.lineWidth = Math.max(0.5, 1.4 * scale);
          ctx.stroke();
        }
      }

      // Necessary Being core
      ctx.beginPath();
      ctx.arc(anchorX, baseY, 7 + pulse * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,245,210,0.98)';
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
        استحالة التسلسل
      </motion.p>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="absolute top-[28%] left-[6%] font-tajawal text-xs text-purple-200/60 z-10 pointer-events-none"
      >
        سلسلة أسباب تمتد إلى ما لا نهاية — لا يمكن عبورها أبداً
      </motion.span>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="absolute top-[62%] right-[8%] text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-base text-gold-primary" style={{ textShadow: '0 0 16px rgba(212,168,83,0.5)' }}>السبب الأول</p>
        <p className="font-tajawal text-[10px] text-gold-primary/60">غير مسبَّب</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-[15%] left-0 right-0 text-center text-text-secondary text-xs font-tajawal px-6 z-10 pointer-events-none"
      >
        لا يمكن عبور سلسلة لا نهائية من الأسباب — فلا بد من سبب أول غير مسبَّب
      </motion.p>
    </div>
  );
}
