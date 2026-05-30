
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🪐 الأفلاك — Celestial Orbits
// "كُلٌّ فِي فَلَكٍ يَسْبَحُونَ"
// Planets, moons, and stars each swimming in their own precise orbit

export default function CelestialOrbitsVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    const orbits = [
      { rx: 0.12, ry: 0.08, speed: 2.0, size: 6, color: '#a0a0a0', name: 'Mercury', tilt: 0.1 },
      { rx: 0.18, ry: 0.13, speed: 1.5, size: 8, color: '#e8c975', name: 'Venus', tilt: -0.05 },
      { rx: 0.25, ry: 0.18, speed: 1.0, size: 9, color: '#4A90D9', name: 'Earth', tilt: 0.02, hasTrail: true },
      { rx: 0.32, ry: 0.23, speed: 0.7, size: 7, color: '#c1440e', name: 'Mars', tilt: 0.08 },
      { rx: 0.42, ry: 0.30, speed: 0.4, size: 18, color: '#c88b3a', name: 'Jupiter', tilt: -0.03 },
      { rx: 0.52, ry: 0.37, speed: 0.25, size: 15, color: '#d4a853', name: 'Saturn', tilt: 0.06, hasRing: true },
    ];

    // Background stars
    const bgStars = Array.from({ length: 400 }, () => ({
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

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      // Background stars
      bgStars.forEach((s) => {
        const t = Math.sin(time * s.twinkle) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * t, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * t})`;
        ctx.fill();
      });

      // Central sun
      const sunSize = 25 + Math.sin(time * 3) * 3;
      const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunSize * 2);
      sunGrad.addColorStop(0, 'rgba(255, 220, 100, 1)');
      sunGrad.addColorStop(0.3, 'rgba(255, 180, 50, 0.8)');
      sunGrad.addColorStop(0.6, 'rgba(255, 120, 30, 0.3)');
      sunGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sunSize * 2, 0, Math.PI * 2);
      ctx.fill();

      // Sun core
      ctx.beginPath();
      ctx.arc(cx, cy, sunSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8e0';
      ctx.fill();

      // Draw orbits and planets
      orbits.forEach((orbit) => {
        const angle = time * orbit.speed;
        const orbitRx = orbit.rx * w;
        const orbitRy = orbit.ry * h;

        // Orbit path — dashed, ethereal
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(orbit.tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, orbitRx, orbitRy, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Planet position
        const px = cx + Math.cos(angle) * orbitRx * Math.cos(orbit.tilt) - Math.sin(angle) * orbitRy * Math.sin(orbit.tilt);
        const py = cy + Math.cos(angle) * orbitRx * Math.sin(orbit.tilt) + Math.sin(angle) * orbitRy * Math.cos(orbit.tilt);

        // Trail
        if (orbit.hasTrail) {
          for (let i = 0; i < 20; i++) {
            const trailAngle = angle - i * 0.03;
            const tx = cx + Math.cos(trailAngle) * orbitRx * Math.cos(orbit.tilt) - Math.sin(trailAngle) * orbitRy * Math.sin(orbit.tilt);
            const ty = cy + Math.cos(trailAngle) * orbitRx * Math.sin(orbit.tilt) + Math.sin(trailAngle) * orbitRy * Math.cos(orbit.tilt);
            ctx.beginPath();
            ctx.arc(tx, ty, orbit.size * (1 - i / 20) * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(74, 144, 217, ${0.3 * (1 - i / 20)})`;
            ctx.fill();
          }
        }

        // Saturn ring
        if (orbit.hasRing) {
          ctx.save();
          ctx.translate(px, py);
          ctx.beginPath();
          ctx.ellipse(0, 0, orbit.size * 2.2, orbit.size * 0.6, 0.3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212, 168, 83, 0.5)`;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }

        // Planet glow
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, orbit.size * 2.5);
        pGrad.addColorStop(0, orbit.color + '60');
        pGrad.addColorStop(1, orbit.color + '00');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, orbit.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Planet body
        ctx.beginPath();
        ctx.arc(px, py, orbit.size, 0, Math.PI * 2);
        ctx.fillStyle = orbit.color;
        ctx.fill();

        // Planet highlight
        ctx.beginPath();
        ctx.arc(px - orbit.size * 0.3, py - orbit.size * 0.3, orbit.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
      });

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
        className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xl md:text-2xl text-verse-green/80" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          كُلٌّ فِي فَلَكٍ يَسْبَحُونَ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">يس : 40</p>
      </motion.div>
    </div>
  );
}
