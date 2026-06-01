
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🍯 الشفاء في العسل — Honey Healing
// "يَخْرُجُ مِن بُطُونِهَا شَرَابٌ مُّخْتَلِفٌ أَلْوَانُهُ فِيهِ شِفَاءٌ لِّلنَّاسِ"
// Honeycomb, bees, golden honey dripping — healing properties

export default function HoneyHealingVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Honey drips
    const drips = Array.from({ length: 8 }, (_, i) => ({
      x: 0.15 + (i / 8) * 0.7 + Math.random() * 0.05,
      startY: 0.35 + Math.random() * 0.1,
      speed: Math.random() * 0.3 + 0.2,
      size: Math.random() * 6 + 4,
      delay: Math.random() * 3,
    }));

    // Flying bees
    const bees = Array.from({ length: 6 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.4 + 0.1,
      speedX: (Math.random() - 0.5) * 0.002,
      phase: Math.random() * Math.PI * 2,
      size: Math.random() * 4 + 3,
      wingPhase: Math.random() * Math.PI * 2,
    }));

    // Particles — golden sparkles
    const sparkles = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      twinkle: Math.random() * 4 + 2,
      phase: Math.random() * Math.PI * 2,
    }));

    const drawHexagon = (cx_: number, cy_: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx_ + r * Math.cos(angle);
        const y = cy_ + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const draw = () => {
      time += 0.01;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Warm amber background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#1a1408');
      bg.addColorStop(1, '#0d0a04');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Golden ambient glow
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, w * 0.4);
      glow.addColorStop(0, 'rgba(212, 168, 83, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Honeycomb grid
      const hexR = 22;
      const hexH = hexR * Math.sqrt(3);
      const startX = w * 0.1;
      const startY = h * 0.05;
      const cols = Math.ceil(w * 0.8 / (hexR * 1.5));
      const rows = Math.ceil(h * 0.35 / hexH);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx_ = startX + col * hexR * 3 + (row % 2 === 1 ? hexR * 1.5 : 0);
          const cy_ = startY + row * hexH * 0.87;

          // Honey fill level per cell (animated)
          const fillLevel = Math.sin(time * 0.5 + row * 0.3 + col * 0.2) * 0.15 + 0.7;
          const honeyAlpha = 0.3 + fillLevel * 0.4;

          // Filled honeycomb
          drawHexagon(cx_, cy_, hexR - 1);
          const cellGrad = ctx.createLinearGradient(cx_, cy_ - hexR, cx_, cy_ + hexR);
          cellGrad.addColorStop(0, `rgba(180, 130, 40, ${honeyAlpha * 0.5})`);
          cellGrad.addColorStop(1 - fillLevel, `rgba(220, 170, 60, ${honeyAlpha * 0.3})`);
          cellGrad.addColorStop(1, `rgba(240, 190, 80, ${honeyAlpha})`);
          ctx.fillStyle = cellGrad;
          ctx.fill();

          // Cell border
          drawHexagon(cx_, cy_, hexR);
          ctx.strokeStyle = 'rgba(200, 150, 50, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Honey dripping
      drips.forEach((d) => {
        const elapsed = (time - d.delay + 10) % 4;
        if (elapsed < 0) return;
        const dripY = d.startY + elapsed * d.speed * 0.05;
        if (dripY > 0.95) return;

        const dx = d.x * w;
        const dy = dripY * h;
        const stretch = Math.min(elapsed * 8, 20);

        // Drip trail
        const trail = ctx.createLinearGradient(dx, dy - stretch, dx, dy + d.size);
        trail.addColorStop(0, 'rgba(220, 170, 50, 0.1)');
        trail.addColorStop(0.5, 'rgba(230, 180, 60, 0.5)');
        trail.addColorStop(1, 'rgba(240, 190, 70, 0.7)');
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.ellipse(dx, dy, d.size * 0.6, d.size + stretch * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Drip head (teardrop)
        ctx.beginPath();
        ctx.arc(dx, dy + d.size, d.size, 0, Math.PI * 2);
        const dGrad = ctx.createRadialGradient(dx - 1, dy + d.size - 1, 0, dx, dy + d.size, d.size);
        dGrad.addColorStop(0, 'rgba(255, 220, 100, 0.8)');
        dGrad.addColorStop(1, 'rgba(200, 150, 40, 0.5)');
        ctx.fillStyle = dGrad;
        ctx.fill();
      });

      // Bees
      bees.forEach((b) => {
        b.x += b.speedX + Math.sin(time * 2 + b.phase) * 0.001;
        if (b.x < 0) b.x = 1;
        if (b.x > 1) b.x = 0;
        const by = b.y * h + Math.sin(time * 1.5 + b.phase) * 15;
        const bx = b.x * w;
        const wingFlap = Math.sin(time * 30 + b.wingPhase);

        ctx.save();
        ctx.translate(bx, by);

        // Wings
        ctx.beginPath();
        ctx.ellipse(-b.size * 0.3, -b.size * 0.8 * Math.abs(wingFlap), b.size * 0.8, b.size * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(b.size * 0.3, -b.size * 0.8 * Math.abs(wingFlap), b.size * 0.8, b.size * 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, b.size * 0.5, b.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#d4a020';
        ctx.fill();

        // Stripes
        for (let s = -1; s <= 1; s++) {
          ctx.beginPath();
          ctx.rect(-b.size * 0.5, s * b.size * 0.3 - 1, b.size, 2);
          ctx.fillStyle = 'rgba(30, 20, 0, 0.5)';
          ctx.fill();
        }

        ctx.restore();
      });

      // Golden sparkles — healing aura
      sparkles.forEach((s) => {
        const a = Math.sin(time * s.twinkle + s.phase) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * a, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 100, ${a * 0.4})`;
        ctx.fill();
      });

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 2 }}
        className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-lg md:text-xl text-verse-green/80 px-4" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          يَخْرُجُ مِن بُطُونِهَا شَرَابٌ مُّخْتَلِفٌ أَلْوَانُهُ فِيهِ شِفَاءٌ لِّلنَّاسِ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">النحل : 69</p>
      </motion.div>
    </div>
  );
}
