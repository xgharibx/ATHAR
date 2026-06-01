
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic mention of clouds having immense weight —
// modern science confirms cumulus clouds can weigh hundreds of thousands of tons.
// Shows billowing cloud formations with rain, lightning, and weight indicators.

export default function CloudsWeightVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Cloud puffs
    const cloudPuffs = Array.from({ length: 30 }, (_, i) => ({
      x: 0.15 + (i % 10) * 0.07 + Math.random() * 0.05,
      y: 0.18 + Math.floor(i / 10) * 0.08 + Math.random() * 0.06,
      rx: 0.04 + Math.random() * 0.05,
      ry: 0.025 + Math.random() * 0.025,
      brightness: 0.6 + Math.random() * 0.4,
      drift: Math.random() * 0.0002,
      phase: Math.random() * Math.PI * 2,
    }));

    // Rain drops
    const raindrops = Array.from({ length: 120 }, () => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.4 + Math.random() * 0.2,
      speed: 0.004 + Math.random() * 0.006,
      length: 8 + Math.random() * 16,
      alpha: 0.2 + Math.random() * 0.4,
    }));

    // Wind streaks
    const windStreaks = Array.from({ length: 15 }, () => ({
      x: Math.random(),
      y: 0.1 + Math.random() * 0.3,
      len: 0.05 + Math.random() * 0.1,
      speed: 0.001 + Math.random() * 0.002,
      alpha: 0.05 + Math.random() * 0.1,
    }));

    // Lightning state
    let lightningActive = false;
    let lightningTimer = 0;
    let lightningX = 0.5;
    let lightningBranches: { x1: number; y1: number; x2: number; y2: number }[] = [];
    let flashAlpha = 0;
    let nextLightning = 200 + Math.random() * 200;

    // Weight indicators
    const weightTexts = ['٠٥٠ألف طن', '٨١٠أ مليون كيلو', '≈ وزن ١٠٠ فيل'];
    let currentWeightIdx = 0;
    let weightAlpha = 0;
    let weightTimer = 0;

    const generateLightning = () => {
      lightningX = 0.3 + Math.random() * 0.4;
      lightningBranches = [];
      let x = lightningX;
      let y = 0.38;
      for (let i = 0; i < 8; i++) {
        const nx = x + (Math.random() - 0.5) * 0.06;
        const ny = y + 0.05 + Math.random() * 0.04;
        lightningBranches.push({ x1: x, y1: y, x2: nx, y2: ny });
        // Side branch
        if (Math.random() > 0.5) {
          const bx = nx + (Math.random() - 0.5) * 0.05;
          const by = ny + 0.02 + Math.random() * 0.02;
          lightningBranches.push({ x1: nx, y1: ny, x2: bx, y2: by });
        }
        x = nx;
        y = ny;
      }
    };

    const draw = () => {
      time += 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Sky gradient background
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#0a0a20');
      sky.addColorStop(0.4, '#0e0e28');
      sky.addColorStop(1, '#060618');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Wind streaks
      for (const ws of windStreaks) {
        ws.x += ws.speed;
        if (ws.x > 1.1) ws.x = -ws.len;
        ctx.beginPath();
        ctx.moveTo(ws.x * w, ws.y * h);
        ctx.lineTo((ws.x + ws.len) * w, ws.y * h);
        ctx.strokeStyle = `rgba(170,204,255,${ws.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Cloud formations
      for (const cp of cloudPuffs) {
        const px = (cp.x + Math.sin(time * 0.005 + cp.phase) * 0.01 + time * cp.drift) % 1.1;
        const py = cp.y + Math.sin(time * 0.008 + cp.phase) * 0.005;
        const pulseBright = cp.brightness + Math.sin(time * 0.015 + cp.phase) * 0.1;

        // Cloud shadow
        const shadow = ctx.createRadialGradient(
          px * w, (py + 0.01) * h, 0,
          px * w, (py + 0.01) * h, cp.rx * w
        );
        shadow.addColorStop(0, `rgba(20,20,40,0.3)`);
        shadow.addColorStop(1, 'rgba(20,20,40,0)');
        ctx.beginPath();
        ctx.ellipse(px * w, (py + 0.01) * h, cp.rx * w, cp.ry * h, 0, 0, Math.PI * 2);
        ctx.fillStyle = shadow;
        ctx.fill();

        // Cloud body
        const cg = ctx.createRadialGradient(
          px * w, py * h, 0,
          px * w, py * h, cp.rx * w
        );
        const gray = Math.floor(180 * pulseBright);
        cg.addColorStop(0, `rgba(${gray + 40},${gray + 40},${gray + 50},0.8)`);
        cg.addColorStop(0.6, `rgba(${gray},${gray},${gray + 10},0.5)`);
        cg.addColorStop(1, `rgba(${gray - 30},${gray - 30},${gray},0)`);
        ctx.beginPath();
        ctx.ellipse(px * w, py * h, cp.rx * w, cp.ry * h, 0, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();
      }

      // Lightning check
      if (time > nextLightning) {
        lightningActive = true;
        lightningTimer = 12;
        flashAlpha = 0.8;
        generateLightning();
        nextLightning = time + 200 + Math.random() * 300;
        // Trigger weight display
        weightAlpha = 1;
        weightTimer = 120;
        currentWeightIdx = (currentWeightIdx + 1) % weightTexts.length;
      }

      // Lightning flash
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,200,${flashAlpha * 0.15})`;
        ctx.fillRect(0, 0, w, h);
        flashAlpha *= 0.85;
      }

      // Draw lightning
      if (lightningActive) {
        lightningTimer--;
        if (lightningTimer <= 0) lightningActive = false;

        for (const branch of lightningBranches) {
          const flicker = Math.random() > 0.3 ? 1 : 0.5;
          ctx.beginPath();
          ctx.moveTo(branch.x1 * w, branch.y1 * h);
          ctx.lineTo(branch.x2 * w, branch.y2 * h);
          ctx.strokeStyle = `rgba(255,204,0,${0.9 * flicker})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          // Glow line
          ctx.strokeStyle = `rgba(255,255,200,${0.3 * flicker})`;
          ctx.lineWidth = 8;
          ctx.stroke();
        }
      }

      // Raindrops
      for (const rd of raindrops) {
        rd.y += rd.speed;
        if (rd.y > 1.05) {
          rd.y = 0.35 + Math.random() * 0.1;
          rd.x = 0.1 + Math.random() * 0.8;
        }

        const rx = rd.x * w;
        const ry = rd.y * h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 1, ry + rd.length);
        ctx.strokeStyle = `rgba(170,204,255,${rd.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Weight indicator text
      if (weightTimer > 0) {
        weightTimer--;
        if (weightTimer < 20) weightAlpha *= 0.9;
        ctx.font = `bold ${Math.max(16, w * 0.045)}px Tajawal, monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255,204,0,${weightAlpha * 0.85})`;
        ctx.fillText(weightTexts[currentWeightIdx], w * 0.5, h * 0.6);

        // Downward arrows indicating weight
        const arrowAlpha = weightAlpha * 0.5;
        for (let a = 0; a < 3; a++) {
          const ax = w * (0.35 + a * 0.15);
          const ay = h * (0.65 + Math.sin(time * 0.08 + a) * 0.01);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - 8, ay - 12);
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + 8, ay - 12);
          ctx.strokeStyle = `rgba(255,204,0,${arrowAlpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.textAlign = 'start';
      }

      // Ground mist
      const mist = ctx.createLinearGradient(0, h * 0.85, 0, h);
      mist.addColorStop(0, 'rgba(170,204,255,0)');
      mist.addColorStop(1, 'rgba(170,204,255,0.05)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, h * 0.85, w, h * 0.15);

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className={`relative w-full h-full overflow-hidden ${className || ''}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-sm md:text-lg text-verse-green/80 px-4" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          حَتَّىٰ إِذَا أَقَلَّتْ سَحَابًا ثِقَالًا سُقْنَاهُ لِبَلَدٍ مَّيِّتٍ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الأعراف : 57</p>
      </motion.div>
    </motion.div>
  );
}
