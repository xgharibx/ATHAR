
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌍 شكل الأرض — Earth's Egg Shape (دحاها)
// "وَالْأَرْضَ بَعْدَ ذَٰلِكَ دَحَاهَا"
// دحو = egg-shaped (oblate spheroid) — not a perfect sphere
// Demonstrates the geoid shape of Earth with slight equatorial bulge

export default function EarthShapeVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Stars
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.3,
      twinkle: Math.random() * 3 + 1,
    }));

    const draw = () => {
      time += 0.005;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Space background
      ctx.fillStyle = '#030308';
      ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach((s) => {
        const t = Math.sin(time * s.twinkle) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * t, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * t})`;
        ctx.fill();
      });

      // Earth parameters — oblate spheroid
      const radiusX = Math.min(w, h) * 0.25; // Equatorial (wider)
      const radiusY = radiusX * 0.97; // Polar (slightly shorter) — oblate

      // Earth atmosphere glow
      const atmoGrad = ctx.createRadialGradient(cx, cy, radiusX * 0.9, cx, cy, radiusX * 1.3);
      atmoGrad.addColorStop(0, 'rgba(80, 150, 255, 0.1)');
      atmoGrad.addColorStop(0.5, 'rgba(80, 150, 255, 0.05)');
      atmoGrad.addColorStop(1, 'rgba(80, 150, 255, 0)');
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX * 1.3, radiusY * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Earth - oblate ellipse shape
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.clip();

      // Ocean base
      const earthGrad = ctx.createRadialGradient(cx - radiusX * 0.3, cy - radiusY * 0.3, 0, cx, cy, radiusX);
      earthGrad.addColorStop(0, '#2a6090');
      earthGrad.addColorStop(0.7, '#1a4060');
      earthGrad.addColorStop(1, '#0a2040');
      ctx.fillStyle = earthGrad;
      ctx.fillRect(cx - radiusX, cy - radiusY, radiusX * 2, radiusY * 2);

      // Continents (simplified shapes rotating)
      const rotation = time * 0.3;
      ctx.save();
      ctx.translate(cx, cy);

      // Simplified continents
      const drawContinent = (baseAngle: number, latOffset: number, sizeX: number, sizeY: number) => {
        const angle = baseAngle + rotation;
        const x = Math.cos(angle) * radiusX * 0.6;
        const y = latOffset;
        const visible = Math.cos(angle);
        if (visible < -0.2) return;
        const alpha = Math.max(0, visible) * 0.7;

        ctx.beginPath();
        ctx.ellipse(x, y, sizeX * visible, sizeY, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60, 120, 60, ${alpha})`;
        ctx.fill();
      };

      // Africa/Europe
      drawContinent(0, -radiusY * 0.1, 25, 35);
      // Americas
      drawContinent(Math.PI * 0.7, -radiusY * 0.2, 20, 40);
      // Asia
      drawContinent(-0.5, -radiusY * 0.3, 35, 25);
      // Australia
      drawContinent(-0.8, radiusY * 0.4, 15, 12);

      ctx.restore();

      // Cloud wisps
      for (let i = 0; i < 6; i++) {
        const cloudAngle = rotation * 1.1 + i * Math.PI / 3;
        const cloudX = cx + Math.cos(cloudAngle) * radiusX * 0.5;
        const cloudY = cy + Math.sin(i * 2) * radiusY * 0.3;
        const visible = Math.cos(cloudAngle);
        if (visible < 0) continue;
        ctx.beginPath();
        ctx.ellipse(cloudX, cloudY, 25 * visible, 8, 0.3 * i, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${visible * 0.12})`;
        ctx.fill();
      }

      ctx.restore();

      // Earth outline — ellipse to emphasize the shape
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(80, 150, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dimension annotations showing oblate shape
      const annAlpha = Math.sin(time * 2) * 0.1 + 0.35;

      // Equatorial radius line (horizontal — wider)
      ctx.beginPath();
      ctx.moveTo(cx - radiusX - 10, cy);
      ctx.lineTo(cx + radiusX + 10, cy);
      ctx.strokeStyle = `rgba(212, 168, 83, ${annAlpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '11px Tajawal';
      ctx.fillStyle = `rgba(212, 168, 83, ${annAlpha})`;
      ctx.textAlign = 'center';
      ctx.fillText('القطر الاستوائي: 12,756 كم', cx, cy + radiusY + 35);

      // Polar radius line (vertical — shorter)
      ctx.beginPath();
      ctx.moveTo(cx, cy - radiusY - 10);
      ctx.lineTo(cx, cy + radiusY + 10);
      ctx.strokeStyle = `rgba(45, 212, 168, ${annAlpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(45, 212, 168, ${annAlpha})`;
      ctx.textAlign = 'left';
      ctx.fillText('القطر القطبي: 12,714 كم', cx + radiusX + 20, cy);

      // Shape label
      ctx.font = 'bold 13px Amiri';
      ctx.fillStyle = `rgba(212, 168, 83, ${annAlpha + 0.2})`;
      ctx.textAlign = 'center';
      ctx.fillText('شكل بيضاوي (دَحَاهَا)', cx, cy - radiusY - 25);

      // Egg comparison — small diagram
      const eggX = w * 0.85;
      const eggY = h * 0.25;
      ctx.beginPath();
      ctx.ellipse(eggX, eggY, 18, 22, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(212, 168, 83, ${annAlpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = '10px Amiri';
      ctx.fillStyle = `rgba(212, 168, 83, ${annAlpha})`;
      ctx.textAlign = 'center';
      ctx.fillText('أُدْحِيَّة', eggX, eggY + 32);
      ctx.font = '8px Tajawal';
      ctx.fillText('(مبيض النعامة)', eggX, eggY + 42);

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
          وَالْأَرْضَ بَعْدَ ذَٰلِكَ دَحَاهَا
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">النازعات : 30</p>
      </motion.div>
    </div>
  );
}
