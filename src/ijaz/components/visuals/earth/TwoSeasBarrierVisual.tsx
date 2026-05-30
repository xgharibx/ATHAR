
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌊 البحران يلتقيان — Two Seas Barrier
// "مَرَجَ الْبَحْرَيْنِ يَلْتَقِيَانِ ۝ بَيْنَهُمَا بَرْزَخٌ لَّا يَبْغِيَانِ"
// Two bodies of water meeting — one salt (blue), one fresh (teal) — with a visible barrier

export default function TwoSeasBarrierVisual({ className }: MiracleVisualProps) {
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
      time += 0.008;
      const w = canvas.width;
      const h = canvas.height;
      const barrierX = w * 0.5; // Center barrier

      ctx.fillStyle = '#040810';
      ctx.fillRect(0, 0, w, h);

      // LEFT SEA — Salt water (deep blue)
      const seaLeft = ctx.createLinearGradient(0, 0, barrierX, 0);
      seaLeft.addColorStop(0, '#0a2040');
      seaLeft.addColorStop(0.5, '#0d2850');
      seaLeft.addColorStop(1, '#103060');
      ctx.fillStyle = seaLeft;
      ctx.fillRect(0, h * 0.15, barrierX, h * 0.85);

      // RIGHT SEA — Fresh water (teal/green)
      const seaRight = ctx.createLinearGradient(barrierX, 0, w, 0);
      seaRight.addColorStop(0, '#0a3830');
      seaRight.addColorStop(0.5, '#0d4a40');
      seaRight.addColorStop(1, '#105540');
      ctx.fillStyle = seaRight;
      ctx.fillRect(barrierX, h * 0.15, w - barrierX, h * 0.85);

      // Water ripples — left (salt)
      for (let i = 0; i < 8; i++) {
        const ry = h * (0.25 + i * 0.08);
        ctx.beginPath();
        for (let x = 0; x < barrierX; x += 3) {
          const wave = Math.sin(x * 0.02 + time * 1.5 + i * 0.5) * 3;
          x === 0 ? ctx.moveTo(x, ry + wave) : ctx.lineTo(x, ry + wave);
        }
        ctx.strokeStyle = `rgba(50, 100, 180, ${0.1 - i * 0.01})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Water ripples — right (fresh)
      for (let i = 0; i < 8; i++) {
        const ry = h * (0.25 + i * 0.08);
        ctx.beginPath();
        for (let x = barrierX; x < w; x += 3) {
          const wave = Math.sin(x * 0.018 + time * 1.2 + i * 0.7) * 3;
          x === barrierX ? ctx.moveTo(x, ry + wave) : ctx.lineTo(x, ry + wave);
        }
        ctx.strokeStyle = `rgba(50, 150, 130, ${0.1 - i * 0.01})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Surface waves — left
      ctx.beginPath();
      for (let x = 0; x <= barrierX; x += 3) {
        const wave = Math.sin(x * 0.015 + time * 2) * 6 + Math.sin(x * 0.03 + time * 3) * 3;
        x === 0 ? ctx.moveTo(x, h * 0.15 + wave) : ctx.lineTo(x, h * 0.15 + wave);
      }
      ctx.strokeStyle = 'rgba(80, 140, 220, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Surface waves — right
      ctx.beginPath();
      for (let x = barrierX; x <= w; x += 3) {
        const wave = Math.sin(x * 0.013 + time * 1.8) * 5 + Math.sin(x * 0.025 + time * 2.5) * 3;
        x === barrierX ? ctx.moveTo(x, h * 0.15 + wave) : ctx.lineTo(x, h * 0.15 + wave);
      }
      ctx.strokeStyle = 'rgba(50, 180, 150, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ⚡ THE BARRIER (البرزخ) — the miracle
      const barrierWidth = 20 + Math.sin(time * 2) * 3;

      // Barrier glow
      const bGrad = ctx.createLinearGradient(barrierX - barrierWidth, 0, barrierX + barrierWidth, 0);
      bGrad.addColorStop(0, 'rgba(212, 168, 83, 0)');
      bGrad.addColorStop(0.3, 'rgba(212, 168, 83, 0.08)');
      bGrad.addColorStop(0.5, 'rgba(212, 168, 83, 0.15)');
      bGrad.addColorStop(0.7, 'rgba(212, 168, 83, 0.08)');
      bGrad.addColorStop(1, 'rgba(212, 168, 83, 0)');
      ctx.fillStyle = bGrad;
      ctx.fillRect(barrierX - barrierWidth, h * 0.12, barrierWidth * 2, h * 0.88);

      // Barrier center line — pulsing
      const lineAlpha = 0.3 + Math.sin(time * 3) * 0.1;
      ctx.beginPath();
      for (let y = h * 0.12; y < h; y += 3) {
        const wobble = Math.sin(y * 0.02 + time * 2) * 2;
        y === h * 0.12 ? ctx.moveTo(barrierX + wobble, y) : ctx.lineTo(barrierX + wobble, y);
      }
      ctx.strokeStyle = `rgba(212, 168, 83, ${lineAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Barrier energy particles
      for (let i = 0; i < 15; i++) {
        const py = h * (0.15 + (time * 0.05 + i * 0.07) % 0.85);
        const px = barrierX + Math.sin(time * 3 + i) * 5;
        const pAlpha = 0.3 + Math.sin(time * 2 + i) * 0.15;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 168, 83, ${pAlpha})`;
        ctx.fill();
      }

      // Salt particles — left side
      for (let i = 0; i < 30; i++) {
        const sx = Math.abs(Math.sin(i * 5.7 + time * 0.3)) * (barrierX - 30) + 15;
        const sy = h * 0.2 + Math.abs(Math.sin(i * 7.3)) * h * 0.7;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(150, 180, 220, 0.15)';
        ctx.fill();
      }

      // Fresh water particles — right side
      for (let i = 0; i < 25; i++) {
        const sx = barrierX + 15 + Math.abs(Math.sin(i * 4.3 + time * 0.3)) * (w - barrierX - 30);
        const sy = h * 0.2 + Math.abs(Math.sin(i * 6.1)) * h * 0.7;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 200, 170, 0.15)';
        ctx.fill();
      }

      // Labels
      ctx.font = '14px Amiri';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100, 160, 230, 0.6)';
      ctx.fillText('بحر مالح', barrierX * 0.5, h * 0.12);
      ctx.fillStyle = 'rgba(80, 200, 160, 0.6)';
      ctx.fillText('بحر عذب', barrierX + (w - barrierX) * 0.5, h * 0.12);

      // Barrier label
      ctx.fillStyle = 'rgba(212, 168, 83, 0.7)';
      ctx.font = 'bold 16px Amiri';
      ctx.fillText('بَرْزَخٌ', barrierX, h * 0.08);

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
        transition={{ delay: 1, duration: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-lg md:text-xl text-verse-green/80 leading-relaxed" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          مَرَجَ الْبَحْرَيْنِ يَلْتَقِيَانِ ۝ بَيْنَهُمَا بَرْزَخٌ لَّا يَبْغِيَانِ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الرحمن : 19-20</p>
      </motion.div>
    </div>
  );
}
