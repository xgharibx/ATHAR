
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🧬 برهان التصميم — Design (Teleological) Argument
// The incredible complexity and fine-tuning of biological systems points to a Designer
// Visual: DNA helix + cellular machinery + probability numbers

export default function DesignArgumentVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    const draw = () => {
      time += 0.01;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      // DNA Double Helix — center of the visual
      const helixCx = cx;
      const helixTop = h * 0.1;
      const helixBot = h * 0.9;
      const helixWidth = 50;
      const rungs = 30;

      for (let i = 0; i < rungs; i++) {
        const t = i / rungs;
        const y = helixTop + t * (helixBot - helixTop);
        const phase = t * Math.PI * 6 + time * 2;

        // Backbone strands
        const x1 = helixCx + Math.sin(phase) * helixWidth;
        const x2 = helixCx + Math.sin(phase + Math.PI) * helixWidth;
        const depth1 = Math.cos(phase);
        const depth2 = Math.cos(phase + Math.PI);

        // Base pair rung
        const alpha = 0.15 + Math.abs(Math.cos(phase)) * 0.15;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = `rgba(212, 168, 83, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Base pair dots (A-T, C-G nucleotides)
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
        const midX = (x1 + x2) / 2;

        ctx.beginPath();
        ctx.arc(midX - 10, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % 4] + '60';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(midX + 10, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = colors[(i + 2) % 4] + '60';
        ctx.fill();

        // Backbone nodes
        if (depth1 > 0) {
          ctx.beginPath();
          ctx.arc(x1, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(74, 144, 217, ${0.3 + depth1 * 0.3})`;
          ctx.fill();
        }
        if (depth2 > 0) {
          ctx.beginPath();
          ctx.arc(x2, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(74, 144, 217, ${0.3 + depth2 * 0.3})`;
          ctx.fill();
        }
      }

      // Connect backbone vertically
      ctx.beginPath();
      for (let i = 0; i < 200; i++) {
        const t = i / 200;
        const y = helixTop + t * (helixBot - helixTop);
        const phase = t * Math.PI * 6 + time * 2;
        const x = helixCx + Math.sin(phase) * helixWidth;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(74, 144, 217, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < 200; i++) {
        const t = i / 200;
        const y = helixTop + t * (helixBot - helixTop);
        const phase = t * Math.PI * 6 + Math.PI + time * 2;
        const x = helixCx + Math.sin(phase) * helixWidth;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(74, 144, 217, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Gears / molecular machines — on the sides
      const drawGear = (gx: number, gy: number, r: number, teeth: number, rot: number) => {
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
          const angle = (i / (teeth * 2)) * Math.PI * 2 + rot;
          const radius = i % 2 === 0 ? r : r * 0.75;
          const x = gx + Math.cos(angle) * radius;
          const y = gy + Math.sin(angle) * radius;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gx, gy, r * 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.1)';
        ctx.stroke();
      };

      // Molecular machine gears (like ATP synthase)
      drawGear(w * 0.15, h * 0.3, 25, 8, time);
      drawGear(w * 0.15, h * 0.3 + 45, 20, 6, -time * 1.3);
      drawGear(w * 0.85, h * 0.6, 30, 10, -time * 0.7);
      drawGear(w * 0.85, h * 0.6 + 55, 22, 7, time * 0.9);

      // Information content label
      ctx.font = '11px Tajawal';
      ctx.fillStyle = 'rgba(212, 168, 83, 0.3)';
      ctx.textAlign = 'center';
      ctx.fillText('3.2 مليار حرف في الحمض النووي', cx, h * 0.05);
      ctx.fillText('= معلومات أكثر من موسوعة كاملة', cx, h * 0.05 + 16);

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

      {/* Probability overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1.5 }}
        className="absolute top-1/2 -translate-y-1/2 left-4 right-4 pointer-events-none z-10"
      >
        <div className="max-w-xs mx-auto text-center">
          <p className="text-text-muted text-[10px] font-tajawal">احتمال تكوّن بروتين واحد بالصدفة:</p>
          <p className="font-mono text-sm text-red-400/60 mt-1">1 / 10<sup>164</sup></p>
          <p className="text-text-muted text-[9px] font-tajawal mt-0.5">(أكبر من عدد ذرات الكون المرصود)</p>
        </div>
      </motion.div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-sm md:text-lg text-verse-green/70" style={{ textShadow: '0 0 20px rgba(45,212,168,0.2)' }}>
          صُنْعَ اللَّهِ الَّذِي أَتْقَنَ كُلَّ شَيْءٍ
        </p>
        <p className="text-gold-primary/40 text-xs font-tajawal mt-1">النمل : 88</p>
      </motion.div>
    </div>
  );
}
