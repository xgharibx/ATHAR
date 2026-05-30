
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic reference to skin containing pain receptors —
// modern science confirms that nerve endings in the skin are responsible for pain sensation.
// Shows a cross-section of skin layers with nerve endings that pulse with light.

export default function SkinPainReceptorsVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Nerve endings positioned in dermis layer
    const nerves = Array.from({ length: 14 }, (_, i) => ({
      x: 0.08 + (i / 13) * 0.84,
      baseY: 0.52 + Math.sin(i * 0.8) * 0.04,
      branches: Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2,
        len: 0.03 + Math.random() * 0.04,
      })),
      pulsePhase: Math.random() * Math.PI * 2,
      active: false,
      activeTimer: 0,
    }));

    // Pain signal dots traveling along nerves
    const signals: { x: number; y: number; targetX: number; targetY: number; progress: number; speed: number; active: boolean }[] = [];

    // Cellular texture dots
    const cells = Array.from({ length: 200 }, () => ({
      x: Math.random(),
      y: 0.3 + Math.random() * 0.65,
      r: Math.random() * 3 + 1,
      layer: Math.random(), // determines color by depth
    }));

    let nextSignalTime = 0;

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0a0508');
      bg.addColorStop(1, '#120810');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // EPIDERMIS layer (top)
      const epY = h * 0.35;
      const epGrad = ctx.createLinearGradient(0, h * 0.08, 0, epY + h * 0.08);
      epGrad.addColorStop(0, '#c4956a');
      epGrad.addColorStop(0.6, '#a87650');
      epGrad.addColorStop(1, '#884466');
      ctx.fillStyle = epGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, epY);
      // Wavy boundary
      for (let x = w; x >= 0; x -= 4) {
        const wave = Math.sin(x * 0.008 + time * 0.015) * 8 + Math.sin(x * 0.02) * 4;
        ctx.lineTo(x, epY + wave);
      }
      ctx.closePath();
      ctx.fill();

      // Epidermal texture
      ctx.globalAlpha = 0.15;
      for (let x = 0; x < w; x += 12) {
        for (let y = h * 0.1; y < epY - 10; y += 12) {
          const offset = Math.sin(x * 0.1 + y * 0.1 + time * 0.005) * 2;
          ctx.beginPath();
          ctx.arc(x + offset, y, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#dda88a';
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // DERMIS layer (middle)
      const dermGrad = ctx.createLinearGradient(0, epY, 0, h * 0.75);
      dermGrad.addColorStop(0, '#884466');
      dermGrad.addColorStop(0.5, '#663344');
      dermGrad.addColorStop(1, '#442233');
      ctx.fillStyle = dermGrad;
      ctx.fillRect(0, epY - 5, w, h * 0.4 + 10);

      // SUBCUTANEOUS layer (bottom)
      const subGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
      subGrad.addColorStop(0, '#442233');
      subGrad.addColorStop(1, '#220e18');
      ctx.fillStyle = subGrad;
      ctx.fillRect(0, h * 0.72, w, h * 0.3);

      // Layer labels
      ctx.font = `${Math.max(14, w * 0.014)}px sans-serif`;
      ctx.fillStyle = 'rgba(255,200,180,0.35)';
      ctx.fillText('Epidermis', w * 0.02, h * 0.2);
      ctx.fillText('Dermis', w * 0.02, h * 0.55);
      ctx.fillText('Subcutaneous', w * 0.02, h * 0.82);

      // Cellular texture
      for (const c of cells) {
        const depth = c.y < 0.5 ? 0.5 : c.y < 0.72 ? 0.3 : 0.15;
        ctx.beginPath();
        ctx.arc(c.x * w, c.y * h, c.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${180 + c.layer * 60},${100 + c.layer * 40},${120 + c.layer * 30},${depth * 0.3})`;
        ctx.fill();
      }

      // Draw nerve endings
      for (const nerve of nerves) {
        const nx = nerve.x * w;
        const ny = nerve.baseY * h;
        const pulseVal = Math.sin(time * 0.04 + nerve.pulsePhase) * 0.5 + 0.5;

        // Update activation
        if (nerve.active) {
          nerve.activeTimer--;
          if (nerve.activeTimer <= 0) nerve.active = false;
        }
        const brightness = nerve.active ? 1 : pulseVal * 0.3;

        // Main nerve trunk (vertical line going down)
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx, ny + h * 0.2);
        ctx.strokeStyle = `rgba(255,51,102,${0.2 + brightness * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Nerve branches reaching into epidermis
        for (const branch of nerve.branches) {
          const bx = nx + Math.cos(branch.angle) * branch.len * w;
          const by = ny + Math.sin(branch.angle) * branch.len * h;
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = `rgba(255,51,102,${0.3 + brightness * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Receptor bulb at tip
          const bulbGlow = ctx.createRadialGradient(bx, by, 0, bx, by, 8 + brightness * 6);
          bulbGlow.addColorStop(0, `rgba(255,51,102,${0.5 + brightness * 0.5})`);
          bulbGlow.addColorStop(1, 'rgba(255,51,102,0)');
          ctx.beginPath();
          ctx.arc(bx, by, 8 + brightness * 6, 0, Math.PI * 2);
          ctx.fillStyle = bulbGlow;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,100,140,${0.6 + brightness * 0.4})`;
          ctx.fill();
        }
      }

      // Spawn pain signals periodically
      if (time > nextSignalTime) {
        nextSignalTime = time + 20 + Math.random() * 40;
        const sourceNerve = nerves[Math.floor(Math.random() * nerves.length)];
        sourceNerve.active = true;
        sourceNerve.activeTimer = 60;
        signals.push({
          x: sourceNerve.x,
          y: sourceNerve.baseY,
          targetX: sourceNerve.x,
          targetY: sourceNerve.baseY + 0.2,
          progress: 0,
          speed: 0.015 + Math.random() * 0.01,
          active: true,
        });
      }

      // Draw & update signals
      for (let i = signals.length - 1; i >= 0; i--) {
        const sig = signals[i];
        sig.progress += sig.speed;
        if (sig.progress >= 1) { signals.splice(i, 1); continue; }

        const sx = (sig.x + (sig.targetX - sig.x) * sig.progress) * w;
        const sy = (sig.y + (sig.targetY - sig.y) * sig.progress) * h;
        const sAlpha = 1 - sig.progress;

        // Glow
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
        sg.addColorStop(0, `rgba(255,51,102,${sAlpha})`);
        sg.addColorStop(1, 'rgba(255,51,102,0)');
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fillStyle = sg;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,200,${sAlpha})`;
        ctx.fill();
      }

      // Ambient pulse overlay on active nerves
      const pulseGlobal = Math.sin(time * 0.03) * 0.08 + 0.08;
      ctx.fillStyle = `rgba(255,51,102,${pulseGlobal * 0.05})`;
      ctx.fillRect(0, h * 0.35, w, h * 0.4);

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className={`relative w-full h-full overflow-hidden ${className || ''}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </motion.div>
  );
}
