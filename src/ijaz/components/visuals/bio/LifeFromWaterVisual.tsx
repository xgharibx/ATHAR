
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 💧 الحياة من الماء — Life from Water
// "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ"
// Water droplet → molecular bonds → cell formation → life emerging

export default function LifeFromWaterVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Water molecules
    const molecules = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001,
      size: Math.random() * 4 + 2,
      phase: Math.random() * Math.PI * 2,
    }));

    // Bubbles rising
    const bubbles = Array.from({ length: 25 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 15 + 5,
      speed: Math.random() * 0.0005 + 0.0002,
      wobble: Math.random() * Math.PI * 2,
    }));

    // Life cells emerging
    const cells = Array.from({ length: 12 }, () => ({
      x: 0.3 + Math.random() * 0.4,
      y: 0.3 + Math.random() * 0.4,
      size: Math.random() * 12 + 6,
      pulse: Math.random() * Math.PI * 2,
      hue: 120 + Math.random() * 60,
    }));

    const draw = () => {
      time += 0.008;
      const w = canvas.width;
      const h = canvas.height;

      // Deep water gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0a1a2a');
      bg.addColorStop(0.5, '#05152a');
      bg.addColorStop(1, '#021020');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Underwater caustics (light patterns)
      for (let i = 0; i < 5; i++) {
        const cx_ = w * (0.2 + 0.6 * Math.sin(time * 0.3 + i));
        const cy_ = h * 0.1;
        const cGrad = ctx.createRadialGradient(cx_, cy_, 0, cx_, cy_, h * 0.4);
        cGrad.addColorStop(0, `rgba(80, 200, 240, ${0.03 + Math.sin(time + i) * 0.01})`);
        cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Water molecules — H₂O swimming
      molecules.forEach((m) => {
        m.x += m.vx + Math.sin(time + m.phase) * 0.0002;
        m.y += m.vy + Math.cos(time * 0.7 + m.phase) * 0.0002;
        if (m.x < 0) m.x = 1;
        if (m.x > 1) m.x = 0;
        if (m.y < 0) m.y = 1;
        if (m.y > 1) m.y = 0;

        const mx = m.x * w;
        const my = m.y * h;

        // Oxygen atom (center)
        ctx.beginPath();
        ctx.arc(mx, my, m.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(60, 160, 220, 0.3)';
        ctx.fill();

        // Hydrogen atoms
        const angle1 = time * 0.5 + m.phase;
        const angle2 = angle1 + 1.9; // ~104.5° bond angle scaled
        const bondLen = m.size * 2;
        ctx.beginPath();
        ctx.arc(mx + Math.cos(angle1) * bondLen, my + Math.sin(angle1) * bondLen, m.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.25)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx + Math.cos(angle2) * bondLen, my + Math.sin(angle2) * bondLen, m.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Bubbles
      bubbles.forEach((b) => {
        b.y -= b.speed;
        if (b.y < -0.05) b.y = 1.05;
        const bx = b.x * w + Math.sin(time * 2 + b.wobble) * 10;
        const by = b.y * h;

        ctx.beginPath();
        ctx.arc(bx, by, b.size, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(150, 220, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Highlight
        ctx.beginPath();
        ctx.arc(bx - b.size * 0.3, by - b.size * 0.3, b.size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 240, 255, 0.15)';
        ctx.fill();
      });

      // Life cells emerging from water — the miracle
      const cellAppear = Math.min(1, time * 0.15); // Gradually appear
      cells.forEach((c) => {
        if (cellAppear < 0.3) return;
        const alpha = (cellAppear - 0.3) / 0.7;
        const cx_ = c.x * w + Math.sin(time * 0.5 + c.pulse) * 8;
        const cy_ = c.y * h + Math.cos(time * 0.3 + c.pulse) * 8;
        const pulse = Math.sin(time * 2 + c.pulse) * 0.2 + 1;
        const s = c.size * pulse;

        // Cell membrane
        ctx.beginPath();
        ctx.arc(cx_, cy_, s, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${c.hue}, 60%, 40%, ${alpha * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${c.hue}, 70%, 50%, ${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Nucleus
        ctx.beginPath();
        ctx.arc(cx_, cy_, s * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${c.hue + 30}, 50%, 30%, ${alpha * 0.5})`;
        ctx.fill();

        // Cell glow
        const cGrad = ctx.createRadialGradient(cx_, cy_, 0, cx_, cy_, s * 2);
        cGrad.addColorStop(0, `hsla(${c.hue}, 80%, 60%, ${alpha * 0.1})`);
        cGrad.addColorStop(1, `hsla(${c.hue}, 80%, 60%, 0)`);
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(cx_, cy_, s * 2, 0, Math.PI * 2);
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
        transition={{ delay: 1.5, duration: 2 }}
        className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xl md:text-2xl text-verse-green/80" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الأنبياء : 30</p>
      </motion.div>
    </div>
  );
}
