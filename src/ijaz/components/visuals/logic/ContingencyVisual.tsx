import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// حجة الإمكان والوجوب — The Argument from Contingency
// Cinematic: a chain of contingent orbs, each leaning on the next, ripples in an
// endless regress that can never support itself — until it terminates in a single
// radiant, self-sufficient Necessary Being that anchors the whole chain.

export default function ContingencyVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;
    const COUNT = 7;

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
      const startX = w * 0.16;
      const endX = w * 0.82;
      const step = (endX - startX) / COUNT;

      // The Necessary Being anchor on the right
      const nbX = w * 0.88;
      const nbY = baseY;
      const pulse = 0.6 + Math.sin(time * 2) * 0.3;
      const ng = ctx.createRadialGradient(nbX, nbY, 0, nbX, nbY, w * 0.18);
      ng.addColorStop(0, `rgba(255,235,180,${0.55 * pulse + 0.2})`);
      ng.addColorStop(0.5, `rgba(212,168,83,${0.2 * pulse})`);
      ng.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.beginPath();
      ctx.arc(nbX, nbY, w * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = ng;
      ctx.fill();

      // connecting dependency arrows + contingent orbs
      for (let i = 0; i < COUNT; i++) {
        const x = startX + step * i + step * 0.5;
        // ripple wave traveling from the anchor back along the chain
        const wavePhase = time * 1.6 - (COUNT - i) * 0.4;
        const wob = Math.sin(wavePhase) * 6;
        const y = baseY + wob;

        // arrow to the next (depends-on) node toward the anchor
        const nx = i === COUNT - 1 ? nbX : startX + step * (i + 1) + step * 0.5;
        const ny = i === COUNT - 1 ? nbY : baseY + Math.sin(time * 1.6 - (COUNT - i - 1) * 0.4) * 6;
        ctx.beginPath();
        ctx.moveTo(x + 12, y);
        ctx.lineTo(nx - 12, ny);
        const fade = 0.2 + 0.3 * (0.5 + Math.sin(wavePhase) * 0.5);
        ctx.strokeStyle = `rgba(150,140,200,${fade})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // arrowhead
        const ang = Math.atan2(ny - y, nx - x);
        ctx.beginPath();
        ctx.moveTo(nx - 12, ny);
        ctx.lineTo(nx - 12 - Math.cos(ang - 0.5) * 6, ny - Math.sin(ang - 0.5) * 6);
        ctx.lineTo(nx - 12 - Math.cos(ang + 0.5) * 6, ny - Math.sin(ang + 0.5) * 6);
        ctx.closePath();
        ctx.fillStyle = `rgba(150,140,200,${fade})`;
        ctx.fill();

        // contingent orb (faint, dependent)
        const og = ctx.createRadialGradient(x, y, 0, x, y, 14);
        og.addColorStop(0, 'rgba(190,180,230,0.7)');
        og.addColorStop(1, 'rgba(120,110,170,0)');
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(210,205,240,0.9)';
        ctx.fill();
      }

      // Necessary Being core
      ctx.beginPath();
      ctx.arc(nbX, nbY, 7 + pulse * 3, 0, Math.PI * 2);
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
        الإمكان والوجوب
      </motion.p>

      {/* Labels */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="absolute top-[30%] left-[10%] font-tajawal text-xs text-purple-200/70 z-10 pointer-events-none"
      >
        ممكنات يعتمد بعضها على بعض
      </motion.span>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="absolute top-[60%] right-[6%] text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-base text-gold-primary" style={{ textShadow: '0 0 16px rgba(212,168,83,0.5)' }}>واجب الوجود</p>
        <p className="font-tajawal text-[10px] text-gold-primary/60">قائمٌ بذاته</p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-[15%] left-0 right-0 text-center text-text-secondary text-xs font-tajawal px-6 z-10 pointer-events-none"
      >
        لا يصحّ التسلسل إلى ما لا نهاية — فلا بدّ من وجودٍ واجبٍ لذاته
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1.2 }}
        className="absolute bottom-4 left-0 right-0 text-center font-amiri text-xs md:text-sm text-verse-green/75 px-4 z-10 pointer-events-none"
        style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}
      >
        يَا أَيُّهَا النَّاسُ أَنتُمُ الْفُقَرَاءُ إِلَى اللَّهِ وَاللَّهُ هُوَ الْغَنِيُّ — فاطر : 15
      </motion.p>
    </div>
  );
}
