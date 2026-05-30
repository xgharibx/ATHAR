
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⛰️ الجبال أوتاد — Mountains as Pegs
// "وَالْجِبَالَ أَوْتَادًا" / "أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا ۝ وَالْجِبَالَ أَوْتَادًا"
// Mountain cross-section: visible peak above ground, deep roots extending below — like tent pegs

export default function MountainsPegsVisual({ className }: MiracleVisualProps) {
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
      time += 0.005;
      const w = canvas.width;
      const h = canvas.height;
      const groundY = h * 0.45; // Ground line

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#0a1525');
      sky.addColorStop(0.6, '#152540');
      sky.addColorStop(1, '#1a3050');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, groundY);

      // Underground gradient — earth layers
      const ground = ctx.createLinearGradient(0, groundY, 0, h);
      ground.addColorStop(0, '#5a4030');
      ground.addColorStop(0.2, '#4a3020');
      ground.addColorStop(0.5, '#3a2515');
      ground.addColorStop(0.8, '#2a1a0a');
      ground.addColorStop(1, '#1a1005');
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Earth layer lines
      for (let i = 1; i <= 4; i++) {
        const ly = groundY + (h - groundY) * (i / 5);
        ctx.beginPath();
        ctx.moveTo(0, ly);
        for (let x = 0; x < w; x += 20) {
          ctx.lineTo(x, ly + Math.sin(x * 0.01 + time + i) * 3);
        }
        ctx.strokeStyle = `rgba(100, 70, 40, ${0.3 - i * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Ground surface
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      for (let x = 0; x <= w; x += 5) {
        ctx.lineTo(x, groundY + Math.sin(x * 0.02) * 3);
      }
      ctx.lineTo(w, groundY);
      ctx.strokeStyle = '#7a6040';
      ctx.lineWidth = 3;
      ctx.stroke();

      // "GROUND LEVEL" label
      ctx.font = '14px Tajawal';
      ctx.fillStyle = 'rgba(200, 180, 140, 0.4)';
      ctx.textAlign = 'left';
      ctx.fillText('سطح الأرض ←', 15, groundY - 8);

      // MOUNTAIN — above ground (the visible part)
      const peakX = w * 0.5;
      const peakY = groundY * 0.12;
      const baseLeft = w * 0.2;
      const baseRight = w * 0.8;

      // Mountain body
      ctx.beginPath();
      ctx.moveTo(baseLeft, groundY);
      ctx.lineTo(peakX - w * 0.05, peakY + 20);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + w * 0.05, peakY + 15);
      ctx.lineTo(baseRight, groundY);
      ctx.closePath();
      const mtGrad = ctx.createLinearGradient(peakX, peakY, peakX, groundY);
      mtGrad.addColorStop(0, '#8a9aaa');
      mtGrad.addColorStop(0.15, '#7a8a9a');
      mtGrad.addColorStop(0.5, '#6a7a6a');
      mtGrad.addColorStop(1, '#5a6a5a');
      ctx.fillStyle = mtGrad;
      ctx.fill();

      // Snow cap
      ctx.beginPath();
      ctx.moveTo(peakX - w * 0.04, peakY + 30);
      ctx.lineTo(peakX - w * 0.02, peakY + 10);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + w * 0.02, peakY + 8);
      ctx.lineTo(peakX + w * 0.035, peakY + 25);
      ctx.quadraticCurveTo(peakX, peakY + 35, peakX - w * 0.04, peakY + 30);
      ctx.fillStyle = 'rgba(230, 240, 255, 0.7)';
      ctx.fill();

      // Mountain ridges/texture
      for (let i = 0; i < 6; i++) {
        const ry = peakY + (groundY - peakY) * (i / 6) + 20;
        ctx.beginPath();
        ctx.moveTo(peakX - (baseRight - baseLeft) * (i / 12) - i * 10, ry);
        ctx.lineTo(peakX + (baseRight - baseLeft) * (i / 12) + i * 10, ry + 5);
        ctx.strokeStyle = 'rgba(80, 90, 80, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ROOT (وَتَد / PEG) — below ground — THE KEY VISUAL
      const rootDepth = h * 0.92;
      const rootLeftTop = w * 0.28;
      const rootRightTop = w * 0.72;
      const rootLeftBot = w * 0.38;
      const rootRightBot = w * 0.62;

      // Root body — tapering downward like a peg
      ctx.beginPath();
      ctx.moveTo(rootLeftTop, groundY);
      ctx.lineTo(rootLeftBot, rootDepth * 0.75);
      ctx.quadraticCurveTo(peakX, rootDepth, rootRightBot, rootDepth * 0.75);
      ctx.lineTo(rootRightTop, groundY);
      ctx.closePath();

      const rootGrad = ctx.createLinearGradient(peakX, groundY, peakX, rootDepth);
      rootGrad.addColorStop(0, 'rgba(100, 90, 70, 0.7)');
      rootGrad.addColorStop(0.5, 'rgba(80, 70, 55, 0.6)');
      rootGrad.addColorStop(1, 'rgba(60, 50, 40, 0.5)');
      ctx.fillStyle = rootGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 100, 70, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Root texture lines
      for (let i = 1; i < 5; i++) {
        const ry = groundY + (rootDepth - groundY) * (i / 5);
        const narrowing = (1 - i / 6);
        ctx.beginPath();
        ctx.moveTo(peakX - (rootRightTop - peakX) * narrowing, ry);
        ctx.lineTo(peakX + (rootRightTop - peakX) * narrowing, ry);
        ctx.strokeStyle = 'rgba(90, 80, 60, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // PEG analogy — dimension arrows
      const arrowAlpha = Math.sin(time * 2) * 0.1 + 0.3;

      // Above ground height arrow
      ctx.beginPath();
      ctx.moveTo(w * 0.85, peakY + 10);
      ctx.lineTo(w * 0.85, groundY - 5);
      ctx.strokeStyle = `rgba(100, 200, 150, ${arrowAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Arrow heads
      ctx.beginPath();
      ctx.moveTo(w * 0.84, peakY + 20);
      ctx.lineTo(w * 0.85, peakY + 10);
      ctx.lineTo(w * 0.86, peakY + 20);
      ctx.strokeStyle = `rgba(100, 200, 150, ${arrowAlpha})`;
      ctx.stroke();
      ctx.font = '11px Tajawal';
      ctx.fillStyle = `rgba(100, 200, 150, ${arrowAlpha + 0.2})`;
      ctx.textAlign = 'right';
      ctx.fillText('الجزء المرئي', w * 0.83, (peakY + groundY) / 2);

      // Below ground depth arrow
      ctx.beginPath();
      ctx.moveTo(w * 0.85, groundY + 5);
      ctx.lineTo(w * 0.85, rootDepth * 0.8);
      ctx.strokeStyle = `rgba(212, 168, 83, ${arrowAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.84, rootDepth * 0.8 - 10);
      ctx.lineTo(w * 0.85, rootDepth * 0.8);
      ctx.lineTo(w * 0.86, rootDepth * 0.8 - 10);
      ctx.strokeStyle = `rgba(212, 168, 83, ${arrowAlpha})`;
      ctx.stroke();
      ctx.fillStyle = `rgba(212, 168, 83, ${arrowAlpha + 0.2})`;
      ctx.fillText('الجذر (الوَتَد)', w * 0.83, (groundY + rootDepth * 0.8) / 2);

      // Pulsing highlight on the root
      const pulseR = 40 + Math.sin(time * 3) * 10;
      const pGrad = ctx.createRadialGradient(peakX, rootDepth * 0.65, 0, peakX, rootDepth * 0.65, pulseR);
      pGrad.addColorStop(0, 'rgba(212, 168, 83, 0.1)');
      pGrad.addColorStop(1, 'rgba(212, 168, 83, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(peakX, rootDepth * 0.65, pulseR, 0, Math.PI * 2);
      ctx.fill();

      // Stars in sky
      for (let i = 0; i < 30; i++) {
        const sx = (Math.sin(i * 7.3) * 0.5 + 0.5) * w;
        const sy = (Math.sin(i * 13.7) * 0.5 + 0.5) * groundY * 0.6;
        const twinkle = Math.sin(time * 2 + i) * 0.3 + 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.5})`;
        ctx.fill();
      }

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
        <p className="font-amiri text-xl md:text-2xl text-verse-green/80" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          وَالْجِبَالَ أَوْتَادًا
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">النبأ : 7</p>
      </motion.div>
    </div>
  );
}
