
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic reference to wind as a means of pollination —
// modern botany confirms wind carries pollen between plants.
// Shows stylized plants with golden pollen drifting on visible wind currents.

export default function WindPollinationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Plants/flowers at the bottom
    const plants = Array.from({ length: 8 }, (_, i) => ({
      x: 0.08 + i * 0.12,
      stemHeight: 0.15 + Math.random() * 0.12,
      swayPhase: Math.random() * Math.PI * 2,
      hasFlower: Math.random() > 0.3,
      petalColor: Math.random() > 0.5 ? '#ff6b9d' : '#ffaa44',
      leafCount: 2 + Math.floor(Math.random() * 3),
      bloomPhase: Math.random() * Math.PI * 2,
    }));

    // Pollen particles
    const pollenParticles = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: 0.3 + Math.random() * 0.4,
      size: 1.5 + Math.random() * 2.5,
      vx: 0.0005 + Math.random() * 0.001,
      vy: (Math.random() - 0.5) * 0.0005,
      phase: Math.random() * Math.PI * 2,
      brightness: 0.6 + Math.random() * 0.4,
      active: true,
    }));

    // Wind current lines
    const windLines = Array.from({ length: 25 }, () => ({
      x: -Math.random() * 0.3,
      y: 0.15 + Math.random() * 0.55,
      length: 0.08 + Math.random() * 0.15,
      speed: 0.002 + Math.random() * 0.003,
      alpha: 0.03 + Math.random() * 0.08,
      curve: (Math.random() - 0.5) * 0.05,
    }));

    // Ground vegetation (grass blades)
    const grass = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      height: 10 + Math.random() * 25,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background gradient — warm dark green
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#061208');
      bg.addColorStop(0.6, '#040a04');
      bg.addColorStop(1, '#0a1808');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Ambient light rays from top
      for (let i = 0; i < 5; i++) {
        const rayX = (0.2 + i * 0.15) * w;
        const rayAlpha = 0.02 + Math.sin(time * 0.008 + i) * 0.01;
        ctx.beginPath();
        ctx.moveTo(rayX - 20, 0);
        ctx.lineTo(rayX + 60, h * 0.7);
        ctx.lineTo(rayX - 60, h * 0.7);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,200,${rayAlpha})`;
        ctx.fill();
      }

      // Wind current visualization
      for (const wl of windLines) {
        wl.x += wl.speed;
        if (wl.x > 1.2) {
          wl.x = -wl.length;
          wl.y = 0.15 + Math.random() * 0.55;
        }
        ctx.beginPath();
        const startX = wl.x * w;
        const startY = wl.y * h;
        const endX = (wl.x + wl.length) * w;
        const midY = startY + wl.curve * h + Math.sin(time * 0.02 + wl.x * 10) * 8;
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, midY, endX, startY + wl.curve * h * 0.5);
        ctx.strokeStyle = `rgba(136,204,136,${wl.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Ground
      const ground = ctx.createLinearGradient(0, h * 0.78, 0, h);
      ground.addColorStop(0, '#1a3a1a');
      ground.addColorStop(0.3, '#163016');
      ground.addColorStop(1, '#0a1a0a');
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.82);
      for (let x = 0; x <= w; x += 8) {
        const gy = h * 0.82 + Math.sin(x * 0.01 + time * 0.005) * 4;
        ctx.lineTo(x, gy);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Grass blades
      for (const g of grass) {
        const gx = g.x * w;
        const baseY = h * 0.82;
        const sway = Math.sin(time * 0.03 + g.phase) * 6;
        ctx.beginPath();
        ctx.moveTo(gx, baseY);
        ctx.quadraticCurveTo(gx + sway * 0.5, baseY - g.height * 0.5, gx + sway, baseY - g.height);
        ctx.strokeStyle = `rgba(74,222,128,${0.3 + Math.random() * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw plants with stems, leaves, and flowers
      for (const plant of plants) {
        const baseX = plant.x * w;
        const baseY = h * 0.82;
        const sway = Math.sin(time * 0.02 + plant.swayPhase) * 8;
        const topX = baseX + sway;
        const topY = baseY - plant.stemHeight * h;

        // Stem
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(baseX + sway * 0.3, (baseY + topY) / 2, topX, topY);
        ctx.strokeStyle = '#2d8a4e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Leaves
        for (let l = 0; l < plant.leafCount; l++) {
          const ly = baseY - (plant.stemHeight * h * (0.3 + l * 0.2));
          const lx = baseX + sway * (0.3 + l * 0.15);
          const leafDir = l % 2 === 0 ? 1 : -1;
          const leafSway = Math.sin(time * 0.025 + l) * 3;

          ctx.beginPath();
          ctx.ellipse(
            lx + leafDir * 15 + leafSway,
            ly,
            12, 5,
            leafDir * 0.4 + leafSway * 0.02, 0, Math.PI * 2
          );
          ctx.fillStyle = `rgba(136,204,136,${0.6 + Math.sin(time * 0.01 + l) * 0.2})`;
          ctx.fill();
        }

        // Flower
        if (plant.hasFlower) {
          const bloom = Math.sin(time * 0.005 + plant.bloomPhase) * 0.3 + 0.7;
          const petalSize = 6 + bloom * 4;
          for (let p = 0; p < 6; p++) {
            const angle = (p / 6) * Math.PI * 2 + time * 0.005;
            const px = topX + Math.cos(angle) * petalSize;
            const py = topY + Math.sin(angle) * petalSize;
            ctx.beginPath();
            ctx.ellipse(px, py, 5 * bloom, 3 * bloom, angle, 0, Math.PI * 2);
            ctx.fillStyle = plant.petalColor;
            ctx.globalAlpha = 0.7 + bloom * 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          // Center
          ctx.beginPath();
          ctx.arc(topX, topY, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();

          // Emit pollen from flowers
          if (time % 60 === 0 && Math.random() > 0.5) {
            for (let ep = 0; ep < 3; ep++) {
              pollenParticles.push({
                x: plant.x + sway / w,
                y: topY / h,
                size: 1.5 + Math.random() * 2,
                vx: 0.0008 + Math.random() * 0.001,
                vy: (Math.random() - 0.5) * 0.001,
                phase: Math.random() * Math.PI * 2,
                brightness: 0.8 + Math.random() * 0.2,
                active: true,
              });
            }
          }
        }
      }

      // Pollen particles
      for (const pp of pollenParticles) {
        if (!pp.active) continue;
        // Wind-driven movement
        pp.x += pp.vx + Math.sin(time * 0.01 + pp.phase) * 0.0003;
        pp.y += pp.vy + Math.sin(time * 0.015 + pp.phase * 2) * 0.0004;

        if (pp.x > 1.1) { pp.x = -0.02; pp.y = 0.3 + Math.random() * 0.4; }

        const px = pp.x * w;
        const py = pp.y * h;
        const pulse = Math.sin(time * 0.04 + pp.phase) * 0.3 + 0.7;

        // Pollen glow
        const pg = ctx.createRadialGradient(px, py, 0, px, py, pp.size * 4);
        pg.addColorStop(0, `rgba(251,191,36,${0.5 * pulse * pp.brightness})`);
        pg.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.beginPath();
        ctx.arc(px, py, pp.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();

        // Pollen core
        ctx.beginPath();
        ctx.arc(px, py, pp.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${0.7 * pp.brightness})`;
        ctx.fill();
      }

      // Limit particles
      while (pollenParticles.length > 150) pollenParticles.shift();

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
