
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌌 توسع الكون — The Expansion of the Universe
// "وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ وَإِنَّا لَمُوسِعُونَ"
// Stars and galaxies radiating outward from a center — endless expansion

export default function UniverseExpansionVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Generate stars that expand outward
    const stars = Array.from({ length: 600 }, () => ({
      angle: Math.random() * Math.PI * 2,
      baseDistance: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 0.3 + 0.1,
      size: Math.random() * 2.5 + 0.5,
      hue: Math.random() > 0.7 ? 40 + Math.random() * 20 : 200 + Math.random() * 60,
      brightness: Math.random() * 0.5 + 0.5,
      twinkleSpeed: Math.random() * 3 + 1,
    }));

    // Galaxies — larger spiral blobs expanding
    const galaxies = Array.from({ length: 15 }, () => ({
      angle: Math.random() * Math.PI * 2,
      baseDistance: Math.random() * 0.25 + 0.1,
      speed: Math.random() * 0.15 + 0.05,
      size: Math.random() * 20 + 10,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.5,
      hue: Math.random() > 0.5 ? 30 : 220,
    }));

    const draw = () => {
      time += 0.008;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.max(w, h) * 0.6;

      // Dark background with subtle radial gradient
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      // Central glow — origin of creation
      const originGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3);
      originGrad.addColorStop(0, 'rgba(212, 168, 83, 0.15)');
      originGrad.addColorStop(0.5, 'rgba(74, 144, 217, 0.05)');
      originGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = originGrad;
      ctx.fillRect(0, 0, w, h);

      // Expansion rings — pulsing outward
      for (let i = 0; i < 5; i++) {
        const ringPhase = (time * 0.3 + i * 0.2) % 1;
        const ringR = ringPhase * maxR * 0.8;
        const ringAlpha = (1 - ringPhase) * 0.08;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212, 168, 83, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw galaxies expanding outward
      galaxies.forEach((g) => {
        const dist = (g.baseDistance + time * g.speed * 0.1) % 0.8;
        const x = cx + Math.cos(g.angle) * dist * maxR;
        const y = cy + Math.sin(g.angle) * dist * maxR;
        const alpha = dist < 0.1 ? dist / 0.1 : dist > 0.6 ? (0.8 - dist) / 0.2 : 1;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(g.rotation + time * g.rotSpeed);

        // Spiral galaxy shape
        const gGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, g.size);
        const col = g.hue === 30 ? '212, 168, 83' : '74, 144, 217';
        gGrad.addColorStop(0, `rgba(${col}, ${alpha * 0.8})`);
        gGrad.addColorStop(0.5, `rgba(${col}, ${alpha * 0.3})`);
        gGrad.addColorStop(1, `rgba(${col}, 0)`);
        ctx.fillStyle = gGrad;

        ctx.beginPath();
        ctx.ellipse(0, 0, g.size, g.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw stars expanding outward
      stars.forEach((s) => {
        const dist = (s.baseDistance + time * s.speed * 0.05) % 0.9;
        const x = cx + Math.cos(s.angle) * dist * maxR;
        const y = cy + Math.sin(s.angle) * dist * maxR;
        const twinkle = Math.sin(time * s.twinkleSpeed) * 0.3 + 0.7;
        const alpha = dist < 0.05 ? dist / 0.05 : dist > 0.7 ? (0.9 - dist) / 0.2 : 1;

        ctx.beginPath();
        ctx.arc(x, y, s.size * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 80%, ${50 + s.brightness * 30}%, ${alpha * s.brightness * twinkle})`;
        ctx.fill();

        // Glow
        if (s.size > 1.5) {
          ctx.beginPath();
          ctx.arc(x, y, s.size * 3 * twinkle, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${s.hue}, 80%, 70%, ${alpha * 0.1 * twinkle})`;
          ctx.fill();
        }
      });

      // Central bright point — origin
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
      cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      cGrad.addColorStop(0.3, 'rgba(212, 168, 83, 0.5)');
      cGrad.addColorStop(1, 'rgba(212, 168, 83, 0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
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
      {/* Verse overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 2 }}
        className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xl md:text-2xl text-verse-green/80" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          وَإِنَّا لَمُوسِعُونَ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الذاريات : 47</p>
      </motion.div>
    </div>
  );
}
