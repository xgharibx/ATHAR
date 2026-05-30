
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic reference to the "lowest point on earth" (Dead Sea region) —
// modern geography confirms the Dead Sea depression is the lowest land point.
// Shows terrain cross-section with elevation markers and the Dead Sea depression.

export default function LowestPointVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Terrain profile points (normalized 0–1 for x, elevation as fraction)
    const terrainPoints = [
      { x: 0, elev: 0.35 },
      { x: 0.08, elev: 0.3 },
      { x: 0.15, elev: 0.2 },  // mountain
      { x: 0.22, elev: 0.25 },
      { x: 0.3, elev: 0.32 },
      { x: 0.38, elev: 0.4 },
      { x: 0.42, elev: 0.55 },
      { x: 0.46, elev: 0.68 },  // Dead Sea depression start
      { x: 0.5, elev: 0.75 },   // Lowest point!
      { x: 0.54, elev: 0.68 },
      { x: 0.58, elev: 0.55 },
      { x: 0.63, elev: 0.4 },
      { x: 0.7, elev: 0.3 },
      { x: 0.78, elev: 0.22 },  // mountain
      { x: 0.85, elev: 0.18 },
      { x: 0.9, elev: 0.25 },
      { x: 1, elev: 0.32 },
    ];

    // Salt crystal sparkles at the bottom of the depression
    const saltCrystals = Array.from({ length: 40 }, () => ({
      x: 0.4 + Math.random() * 0.2,
      y: 0.65 + Math.random() * 0.12,
      size: 1 + Math.random() * 2.5,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    }));

    // Battle particles (shields/swords as simple shapes)
    const battleParticles = Array.from({ length: 18 }, () => ({
      x: 0.35 + Math.random() * 0.3,
      y: 0.2 + Math.random() * 0.25,
      type: Math.random() > 0.5 ? 'shield' : 'sword',
      drift: (Math.random() - 0.5) * 0.0004,
      floatPhase: Math.random() * Math.PI * 2,
      alpha: 0.15 + Math.random() * 0.2,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
    }));

    // Water shimmer
    const waterRipples: { x: number; radius: number; maxRadius: number; alpha: number }[] = [];

    // Depth markers
    const depthMarkers = [
      { elev: 0.5, label: 'Sea Level' },
      { elev: 0.6, label: '-200m' },
      { elev: 0.7, label: '-400m' },
      { elev: 0.75, label: '-430m (Lowest)' },
    ];

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#080810');
      bg.addColorStop(0.5, '#0a0a16');
      bg.addColorStop(1, '#060610');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Stars in sky area
      for (let i = 0; i < 50; i++) {
        const sx = (Math.sin(i * 73.7) * 0.5 + 0.5) * w;
        const sy = (Math.sin(i * 37.3) * 0.5 + 0.5) * h * 0.3;
        const twinkle = Math.sin(time * 0.02 + i * 2.3) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.5})`;
        ctx.fill();
      }

      // Draw terrain cross-section
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < terrainPoints.length; i++) {
        const tp = terrainPoints[i];
        ctx.lineTo(tp.x * w, tp.elev * h);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      // Terrain gradient
      const terrainGrad = ctx.createLinearGradient(0, h * 0.15, 0, h);
      terrainGrad.addColorStop(0, '#886644');
      terrainGrad.addColorStop(0.3, '#775533');
      terrainGrad.addColorStop(0.5, '#cc8833');
      terrainGrad.addColorStop(0.8, '#664422');
      terrainGrad.addColorStop(1, '#332211');
      ctx.fillStyle = terrainGrad;
      ctx.fill();

      // Terrain texture lines
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < terrainPoints.length - 1; i++) {
        const p1 = terrainPoints[i];
        const p2 = terrainPoints[i + 1];
        for (let j = 0; j < 4; j++) {
          const ly = p1.elev + (1 - p1.elev) * (j * 0.25);
          const ly2 = p2.elev + (1 - p2.elev) * (j * 0.25);
          ctx.beginPath();
          ctx.moveTo(p1.x * w, ly * h);
          ctx.lineTo(p2.x * w, ly2 * h);
          ctx.strokeStyle = '#aa8855';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Dead Sea water in depression
      const waterTop = 0.56;
      const waterGrad = ctx.createLinearGradient(0, waterTop * h, 0, 0.76 * h);
      waterGrad.addColorStop(0, 'rgba(40,100,200,0.6)');
      waterGrad.addColorStop(0.5, 'rgba(30,80,180,0.5)');
      waterGrad.addColorStop(1, 'rgba(20,60,140,0.3)');
      ctx.beginPath();
      ctx.moveTo(0.38 * w, waterTop * h);
      // Water surface with gentle waves
      for (let x = 0.38; x <= 0.62; x += 0.005) {
        const wave = Math.sin(x * 40 + time * 0.03) * 2;
        ctx.lineTo(x * w, waterTop * h + wave);
      }
      // Follow terrain down and back
      for (let i = terrainPoints.length - 1; i >= 0; i--) {
        const tp = terrainPoints[i];
        if (tp.x >= 0.38 && tp.x <= 0.62) {
          ctx.lineTo(tp.x * w, tp.elev * h);
        }
      }
      ctx.closePath();
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Water surface shimmer
      for (let x = 0.39; x < 0.61; x += 0.02) {
        const shimmer = Math.sin(time * 0.04 + x * 30) * 0.3 + 0.3;
        ctx.beginPath();
        ctx.moveTo(x * w, waterTop * h + Math.sin(x * 40 + time * 0.03) * 2);
        ctx.lineTo((x + 0.015) * w, waterTop * h + Math.sin((x + 0.015) * 40 + time * 0.03) * 2);
        ctx.strokeStyle = `rgba(100,180,255,${shimmer})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Water ripples
      if (time % 80 === 0) {
        waterRipples.push({
          x: 0.42 + Math.random() * 0.16,
          radius: 0,
          maxRadius: 15 + Math.random() * 20,
          alpha: 0.4,
        });
      }
      for (let i = waterRipples.length - 1; i >= 0; i--) {
        const rip = waterRipples[i];
        rip.radius += 0.3;
        rip.alpha *= 0.98;
        if (rip.alpha < 0.01) { waterRipples.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.ellipse(rip.x * w, waterTop * h, rip.radius, rip.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,180,255,${rip.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Sea level line
      const seaLevelY = 0.5 * h;
      ctx.beginPath();
      ctx.setLineDash([8, 6]);
      ctx.moveTo(0, seaLevelY);
      ctx.lineTo(w, seaLevelY);
      ctx.strokeStyle = 'rgba(68,136,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Depth markers
      ctx.font = `${Math.max(11, w * 0.012)}px monospace`;
      for (const dm of depthMarkers) {
        const my = dm.elev * h;
        const isLowest = dm.label.includes('Lowest');
        const mAlpha = isLowest ? 0.6 + Math.sin(time * 0.04) * 0.3 : 0.35;
        ctx.beginPath();
        ctx.setLineDash([3, 4]);
        ctx.moveTo(w * 0.02, my);
        ctx.lineTo(w * 0.12, my);
        ctx.strokeStyle = isLowest ? `rgba(255,215,0,${mAlpha})` : `rgba(68,136,255,${mAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = isLowest ? `rgba(255,215,0,${mAlpha})` : `rgba(68,136,255,${mAlpha})`;
        ctx.fillText(dm.label, w * 0.02, my - 4);
      }

      // Salt crystals
      for (const sc of saltCrystals) {
        const twinkle = Math.sin(time * 0.03 * sc.speed + sc.twinkle) * 0.5 + 0.5;
        const sx = sc.x * w;
        const sy = sc.y * h;
        ctx.beginPath();
        // Diamond shape
        ctx.moveTo(sx, sy - sc.size);
        ctx.lineTo(sx + sc.size, sy);
        ctx.lineTo(sx, sy + sc.size);
        ctx.lineTo(sx - sc.size, sy);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.4})`;
        ctx.fill();

        // Sparkle glow
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sc.size * 3);
        sg.addColorStop(0, `rgba(255,255,200,${twinkle * 0.2})`);
        sg.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.beginPath();
        ctx.arc(sx, sy, sc.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = sg;
        ctx.fill();
      }

      // Battle particles (ancient Roman/Persian imagery)
      for (const bp of battleParticles) {
        bp.x += bp.drift;
        const floatY = Math.sin(time * 0.012 + bp.floatPhase) * 0.01;
        const bx = bp.x * w;
        const by = (bp.y + floatY) * h;
        const s = bp.size;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(bp.rotation + time * 0.003);
        ctx.globalAlpha = bp.alpha;

        if (bp.type === 'shield') {
          // Simple round shield
          ctx.beginPath();
          ctx.arc(0, 0, s, 0, Math.PI * 2);
          ctx.strokeStyle = '#cc8833';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(204,136,51,0.3)';
          ctx.fill();
        } else {
          // Simple sword shape
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(0, s);
          ctx.strokeStyle = '#aaaacc';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-s * 0.4, -s * 0.1);
          ctx.lineTo(s * 0.4, -s * 0.1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // Reset if drifted off
        if (bp.x > 1.1 || bp.x < -0.1) bp.drift *= -1;
      }

      // Lowest point highlight glow
      const lpx = 0.5 * w;
      const lpy = 0.75 * h;
      const lpPulse = Math.sin(time * 0.03) * 0.15 + 0.25;
      const lpGlow = ctx.createRadialGradient(lpx, lpy, 0, lpx, lpy, 40);
      lpGlow.addColorStop(0, `rgba(255,215,0,${lpPulse})`);
      lpGlow.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.beginPath();
      ctx.arc(lpx, lpy, 40, 0, Math.PI * 2);
      ctx.fillStyle = lpGlow;
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
