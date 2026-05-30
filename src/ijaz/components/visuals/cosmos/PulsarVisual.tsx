
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⭐ النجم الطارق — The Pulsar (Knocking Star)
// "وَالسَّمَاءِ وَالطَّارِقِ ۝ وَمَا أَدْرَاكَ مَا الطَّارِقُ ۝ النَّجْمُ الثَّاقِبُ"
// Rotating neutron star with intense beams of light — the cosmic "knocker"

export default function PulsarVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    const bgStars = Array.from({ length: 300 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.2 + 0.3,
      bright: Math.random(),
    }));

    const draw = () => {
      time += 0.02;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, w, h);

      // Background stars
      bgStars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 200, 255, ${s.bright * 0.4})`;
        ctx.fill();
      });

      const beamAngle = time * 3; // Fast rotation — the "knocking" frequency
      const pulsePhase = Math.sin(time * 6); // Pulsing intensity

      // Magnetic field lines (subtle)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(beamAngle * 0.1); // Slow precession
      for (let i = 0; i < 8; i++) {
        const fieldAngle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(100, 150, 255, 0.05)`;
        ctx.lineWidth = 1;
        for (let t = 0; t < Math.PI; t += 0.05) {
          const r = 120 * Math.sin(t);
          const fx = r * Math.cos(t + fieldAngle);
          const fy = r * Math.sin(t + fieldAngle);
          t === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
        }
        ctx.stroke();
      }
      ctx.restore();

      // BEAM 1 — the "knocking" jet
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(beamAngle);

      const beamLength = Math.max(w, h);
      const beamWidth = 15 + pulsePhase * 5;
      const beamIntensity = 0.6 + pulsePhase * 0.2;

      // Upper beam
      const bGrad1 = ctx.createLinearGradient(0, 0, 0, -beamLength);
      bGrad1.addColorStop(0, `rgba(180, 220, 255, ${beamIntensity})`);
      bGrad1.addColorStop(0.1, `rgba(100, 180, 255, ${beamIntensity * 0.6})`);
      bGrad1.addColorStop(0.5, `rgba(60, 120, 255, ${beamIntensity * 0.15})`);
      bGrad1.addColorStop(1, 'rgba(60, 120, 255, 0)');
      ctx.fillStyle = bGrad1;
      ctx.beginPath();
      ctx.moveTo(-beamWidth, 0);
      ctx.lineTo(-beamWidth * 3, -beamLength);
      ctx.lineTo(beamWidth * 3, -beamLength);
      ctx.lineTo(beamWidth, 0);
      ctx.closePath();
      ctx.fill();

      // Lower beam
      const bGrad2 = ctx.createLinearGradient(0, 0, 0, beamLength);
      bGrad2.addColorStop(0, `rgba(180, 220, 255, ${beamIntensity})`);
      bGrad2.addColorStop(0.1, `rgba(100, 180, 255, ${beamIntensity * 0.6})`);
      bGrad2.addColorStop(0.5, `rgba(60, 120, 255, ${beamIntensity * 0.15})`);
      bGrad2.addColorStop(1, 'rgba(60, 120, 255, 0)');
      ctx.fillStyle = bGrad2;
      ctx.beginPath();
      ctx.moveTo(-beamWidth, 0);
      ctx.lineTo(-beamWidth * 3, beamLength);
      ctx.lineTo(beamWidth * 3, beamLength);
      ctx.lineTo(beamWidth, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Neutron star core — tiny, incredibly bright
      const coreSize = 12 + Math.sin(time * 8) * 2; // Rapid pulsation

      // Accretion disk
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(beamAngle * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 60, 20, 0, 0, Math.PI * 2);
      const diskGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
      diskGrad.addColorStop(0, 'rgba(200, 180, 255, 0.4)');
      diskGrad.addColorStop(0.5, 'rgba(150, 100, 255, 0.15)');
      diskGrad.addColorStop(1, 'rgba(100, 50, 200, 0)');
      ctx.fillStyle = diskGrad;
      ctx.fill();
      ctx.restore();

      // Core glow
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 4);
      cGrad.addColorStop(0, 'rgba(200, 220, 255, 1)');
      cGrad.addColorStop(0.2, 'rgba(150, 180, 255, 0.7)');
      cGrad.addColorStop(0.5, 'rgba(100, 130, 255, 0.2)');
      cGrad.addColorStop(1, 'rgba(60, 80, 200, 0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize * 4, 0, Math.PI * 2);
      ctx.fill();

      // Core center
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#e8eeff';
      ctx.fill();

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
        transition={{ delay: 1.5, duration: 2 }}
        className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-lg md:text-2xl text-verse-green/80" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          وَالسَّمَاءِ وَالطَّارِقِ ۝ النَّجْمُ الثَّاقِبُ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الطارق : 1-3</p>
      </motion.div>
    </div>
  );
}
