import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// لبنًا خالصًا — Pure Milk (النحل 66)
// Cinematic: two flowing channels — brown chyme (فرث) and red blood (دم) — run
// alongside, and from between them a stream of pure white milk is extracted and
// flows forward, glowing and clean. Animated particle flow conveys the process.

export default function MilkProductionVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    type P = { x: number; y: number; r: number; sp: number; lane: number };
    const mk = (lane: number): P => ({
      x: Math.random(),
      y: 0,
      r: Math.random() * 2 + 1,
      sp: Math.random() * 0.12 + 0.06,
      lane,
    });
    // lane 0 = فرث (top), lane 1 = دم (bottom), lane 2 = milk (middle out)
    const parts: P[] = [
      ...Array.from({ length: 40 }, () => mk(0)),
      ...Array.from({ length: 40 }, () => mk(1)),
      ...Array.from({ length: 50 }, () => mk(2)),
    ];

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, w, h);

      const topY = h * 0.3;
      const midY = h * 0.5;
      const botY = h * 0.7;

      // channel glows
      const drawChannel = (cy: number, col: string) => {
        const g = ctx.createLinearGradient(0, cy - 26, 0, cy + 26);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, cy - 26, w, 52);
      };
      drawChannel(topY, 'rgba(150,95,55,0.28)');   // فرث
      drawChannel(botY, 'rgba(170,45,55,0.28)');   // دم
      // milk central glow
      const mg = ctx.createLinearGradient(0, midY - 22, 0, midY + 22);
      mg.addColorStop(0, 'rgba(255,255,255,0)');
      mg.addColorStop(0.5, 'rgba(245,245,255,0.5)');
      mg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(0, midY - 22, w, 44);

      // flowing particles
      for (const p of parts) {
        p.x += p.sp * 0.016 * 12;
        if (p.x > 1.05) p.x = -0.05;
        let cy: number, col: string;
        if (p.lane === 0) {
          cy = topY + Math.sin(p.x * 12 + time) * 8;
          col = '160,100,55';
        } else if (p.lane === 1) {
          cy = botY + Math.sin(p.x * 12 + time + 1) * 8;
          col = '190,55,65';
        } else {
          cy = midY + Math.sin(p.x * 10 + time * 1.4) * 5;
          col = '255,255,255';
        }
        const px = p.x * w;
        ctx.beginPath();
        ctx.arc(px, cy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${p.lane === 2 ? 0.9 : 0.6})`;
        if (p.lane === 2) {
          ctx.shadowColor = 'rgba(255,255,255,0.8)';
          ctx.shadowBlur = 6;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // convergence node where milk is "extracted from between"
      const cxNode = w * 0.4;
      const pulse = 0.6 + Math.sin(time * 3) * 0.3;
      const ng = ctx.createRadialGradient(cxNode, midY, 0, cxNode, midY, 30);
      ng.addColorStop(0, `rgba(255,255,255,${pulse})`);
      ng.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cxNode, midY, 30, 0, Math.PI * 2);
      ctx.fillStyle = ng;
      ctx.fill();
      // feed lines from the two channels into the node
      ctx.strokeStyle = 'rgba(200,200,210,0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cxNode, topY);
      ctx.lineTo(cxNode, midY);
      ctx.moveTo(cxNode, botY);
      ctx.lineTo(cxNode, midY);
      ctx.stroke();

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
        لبنٌ خالصٌ سائغ
      </motion.p>

      {/* Channel labels */}
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="absolute top-[26%] right-4 font-amiri text-sm text-orange-300/80 z-10 pointer-events-none"
      >
        فَرْث
      </motion.span>
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="absolute top-[66%] right-4 font-amiri text-sm text-red-300/80 z-10 pointer-events-none"
      >
        دَم
      </motion.span>
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute top-[46%] left-4 font-amiri text-sm text-white z-10 pointer-events-none"
        style={{ textShadow: '0 0 12px rgba(255,255,255,0.7)' }}
      >
        لبنٌ خالص
      </motion.span>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1.2 }}
        className="absolute bottom-4 left-0 right-0 text-center font-amiri text-xs md:text-sm text-verse-green/80 px-4 z-10 pointer-events-none"
        style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}
      >
        مِّن بَيْنِ فَرْثٍ وَدَمٍ لَّبَنًا خَالِصًا سَائِغًا لِّلشَّارِبِينَ — النحل : 66
      </motion.p>
    </div>
  );
}
