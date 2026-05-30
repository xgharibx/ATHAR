
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🕋 فتح مكة — Conquest of Makkah
// "إِنَّا فَتَحْنَا لَكَ فَتْحًا مُّبِينًا" / "إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ"
// The Prophet ﷺ predicted the return to Makkah — 10,000 companions entering peacefully

export default function ConquestMakkahVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Light particles converging toward center (the army gathering)
    const particles = Array.from({ length: 200 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 0.5 + 0.3,
      speed: Math.random() * 0.001 + 0.0005,
      size: Math.random() * 2 + 1,
      brightness: Math.random() * 0.5 + 0.3,
    }));

    const draw = () => {
      time += 0.008;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h * 0.45;

      // Night sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#050510');
      sky.addColorStop(0.4, '#0a0820');
      sky.addColorStop(1, '#0d0a15');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (let i = 0; i < 50; i++) {
        const sx = Math.abs(Math.sin(i * 7.3)) * w;
        const sy = Math.abs(Math.sin(i * 13.7)) * h * 0.3;
        const twinkle = Math.sin(time * 2 + i) * 0.2 + 0.4;
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.fill();
      }

      // Desert/mountain silhouette
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.quadraticCurveTo(w * 0.15, h * 0.55, w * 0.3, h * 0.60);
      ctx.quadraticCurveTo(w * 0.4, h * 0.58, w * 0.5, h * 0.55);
      ctx.quadraticCurveTo(w * 0.6, h * 0.52, w * 0.7, h * 0.58);
      ctx.quadraticCurveTo(w * 0.85, h * 0.54, w, h * 0.60);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = '#0a0510';
      ctx.fill();

      // Kaaba silhouette at center
      const kSize = 35;
      const kx = cx - kSize / 2;
      const ky = cy - kSize / 2;

      // Kaaba glow
      const kGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, kSize * 4);
      kGlow.addColorStop(0, 'rgba(212, 168, 83, 0.15)');
      kGlow.addColorStop(0.5, 'rgba(212, 168, 83, 0.05)');
      kGlow.addColorStop(1, 'rgba(212, 168, 83, 0)');
      ctx.fillStyle = kGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, kSize * 4, 0, Math.PI * 2);
      ctx.fill();

      // Kaaba
      ctx.fillStyle = '#1a1518';
      ctx.fillRect(kx, ky, kSize, kSize);
      ctx.strokeStyle = '#d4a853';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(kx, ky, kSize, kSize);

      // Kiswah gold band
      ctx.fillStyle = 'rgba(212, 168, 83, 0.3)';
      ctx.fillRect(kx, ky + kSize * 0.3, kSize, kSize * 0.15);

      // Door
      ctx.fillStyle = 'rgba(212, 168, 83, 0.2)';
      ctx.fillRect(kx + kSize * 0.35, ky + kSize * 0.4, kSize * 0.3, kSize * 0.5);

      // Converging light particles — the 10,000 companions approaching
      particles.forEach((p) => {
        p.dist -= p.speed;
        if (p.dist < 0.05) {
          p.dist = 0.5 + Math.random() * 0.3;
          p.angle = Math.random() * Math.PI * 2;
        }

        const px = cx + Math.cos(p.angle) * p.dist * Math.max(w, h) * 0.5;
        const py = cy + Math.sin(p.angle) * p.dist * Math.max(w, h) * 0.5 * 0.6;
        const alpha = p.brightness * (1 - Math.abs(p.dist - 0.25) * 3);

        if (alpha > 0) {
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 180, 120, ${Math.max(0, alpha)})`;
          ctx.fill();

          // Small glow
          ctx.beginPath();
          ctx.arc(px, py, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 180, 120, ${Math.max(0, alpha * 0.1)})`;
          ctx.fill();
        }
      });

      // "10,000" count with subtle pulse
      const countAlpha = 0.3 + Math.sin(time * 2) * 0.1;
      ctx.font = 'bold 16px Tajawal';
      ctx.fillStyle = `rgba(212, 168, 83, ${countAlpha})`;
      ctx.textAlign = 'center';
      ctx.fillText('١٠,٠٠٠ صحابي', cx, h * 0.78);

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
        <p className="font-amiri text-lg md:text-xl text-verse-green/80" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          إِنَّا فَتَحْنَا لَكَ فَتْحًا مُّبِينًا
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الفتح : 1</p>
      </motion.div>
    </div>
  );
}
