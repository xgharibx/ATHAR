
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic mention of unique fingerprints —
// modern science confirms that every human has a unique fingerprint pattern.
// Shows fingerprint ridges forming from swirling particles.

export default function FingerprintsVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Free-floating particles that converge into fingerprint pattern
    const particles = Array.from({ length: 500 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.1 + Math.random() * 0.45;
      return {
        x: 0.5 + Math.cos(angle) * dist,
        y: 0.5 + Math.sin(angle) * dist,
        targetX: 0,
        targetY: 0,
        assigned: false,
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.002,
        size: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2,
      };
    });

    // Generate fingerprint ridge target positions (concentric elliptical ridges with a whorl)
    const ridgePoints: { x: number; y: number }[] = [];
    const cx = 0.5, cy = 0.5;
    for (let ring = 0; ring < 18; ring++) {
      const baseRadius = 0.03 + ring * 0.02;
      const points = 20 + ring * 4;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        // Whorl distortion
        const whorlShift = Math.sin(angle * 2 + ring * 0.3) * 0.015;
        const rx = baseRadius * 1.1 + whorlShift;
        const ry = baseRadius * 1.4 + whorlShift;
        ridgePoints.push({
          x: cx + Math.cos(angle + ring * 0.15) * rx,
          y: cy + Math.sin(angle + ring * 0.15) * ry,
        });
      }
    }

    // Assign targets to particles
    for (let i = 0; i < particles.length; i++) {
      if (i < ridgePoints.length) {
        particles[i].targetX = ridgePoints[i].x;
        particles[i].targetY = ridgePoints[i].y;
        particles[i].assigned = true;
      } else {
        // Extra particles orbit around
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.38 + Math.random() * 0.15;
        particles[i].targetX = cx + Math.cos(angle) * dist;
        particles[i].targetY = cy + Math.sin(angle) * dist;
        particles[i].assigned = false;
      }
    }

    // Glowing ridge lines — draw full ellipses
    const ridgeRings = Array.from({ length: 18 }, (_, ring) => ({
      baseRadius: 0.03 + ring * 0.02,
      offset: ring * 0.15,
      whorlFactor: ring * 0.3,
      alpha: 0,
    }));

    // Unique identifier symbols floating
    const symbols = ['∞', '≡', '◇', '⊕', '△', '⟨⟩'];
    const floatingSymbols = Array.from({ length: 8 }, (_, i) => ({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      symbol: symbols[i % symbols.length],
      phase: Math.random() * Math.PI * 2,
      size: 12 + Math.random() * 10,
    }));

    const convergenceStart = 100;
    const convergenceEnd = 350;

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
      bg.addColorStop(0, '#0a0a1e');
      bg.addColorStop(1, '#060612');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Convergence progress
      const convergence = Math.min(1, Math.max(0, (time - convergenceStart) / (convergenceEnd - convergenceStart)));
      const eased = convergence * convergence * (3 - 2 * convergence); // smoothstep

      // Update and draw particles
      for (const p of particles) {
        if (p.assigned && time > convergenceStart) {
          // Converge toward target
          p.x += (p.targetX - p.x) * 0.008 * eased;
          p.y += (p.targetY - p.y) * 0.008 * eased;
        } else {
          // Free float with orbiting motion
          const orbitAngle = Math.atan2(p.y - cy, p.x - cx);
          p.x += Math.cos(orbitAngle + Math.PI / 2) * 0.0008 + p.vx;
          p.y += Math.sin(orbitAngle + Math.PI / 2) * 0.0008 + p.vy;
          // Gentle pull toward center
          p.x += (cx - p.x) * 0.0003;
          p.y += (cy - p.y) * 0.0003;
        }

        const pulse = Math.sin(time * 0.03 + p.phase) * 0.3 + 0.7;
        const px = p.x * w;
        const py = p.y * h;

        // Particle glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
        glow.addColorStop(0, `rgba(0,191,255,${0.4 * pulse * (0.3 + eased * 0.7)})`);
        glow.addColorStop(1, 'rgba(0,191,255,0)');
        ctx.beginPath();
        ctx.arc(px, py, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.5 + eased * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(68,136,255,${0.6 + pulse * 0.4})`;
        ctx.fill();
      }

      // Ridge ring lines (appear as fingerprint forms)
      if (eased > 0.3) {
        const ridgeAlpha = (eased - 0.3) / 0.7;
        ctx.lineWidth = 1.2;
        for (const ring of ridgeRings) {
          ctx.beginPath();
          const pts = 80;
          for (let i = 0; i <= pts; i++) {
            const angle = (i / pts) * Math.PI * 2;
            const whorlShift = Math.sin(angle * 2 + ring.whorlFactor) * 0.015;
            const rx = (ring.baseRadius * 1.1 + whorlShift) * Math.min(w, h);
            const ry = (ring.baseRadius * 1.4 + whorlShift) * Math.min(w, h);
            const px = w * cx + Math.cos(angle + ring.offset) * rx;
            const py = h * cy + Math.sin(angle + ring.offset) * ry;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = `rgba(0,191,255,${ridgeAlpha * 0.2})`;
          ctx.stroke();
        }
      }

      // Floating unique identifier symbols
      for (const s of floatingSymbols) {
        const sx = s.x * w + Math.sin(time * 0.01 + s.phase) * 20;
        const sy = s.y * h + Math.cos(time * 0.012 + s.phase) * 15;
        const sAlpha = Math.sin(time * 0.015 + s.phase) * 0.2 + 0.25;
        ctx.font = `${s.size}px serif`;
        ctx.fillStyle = `rgba(255,215,0,${sAlpha})`;
        ctx.fillText(s.symbol, sx, sy);
      }

      // Central glow
      const centerGlow = ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, w * 0.05);
      centerGlow.addColorStop(0, `rgba(0,191,255,${0.1 + eased * 0.15})`);
      centerGlow.addColorStop(1, 'rgba(0,191,255,0)');
      ctx.beginPath();
      ctx.arc(w * cx, h * cy, w * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      // Outer scanning ring
      const scanAngle = time * 0.02;
      const scanR = 0.35 * Math.min(w, h);
      ctx.beginPath();
      ctx.arc(w * cx, h * cy, scanR, scanAngle, scanAngle + 0.8);
      ctx.strokeStyle = `rgba(0,191,255,${0.15 + Math.sin(time * 0.02) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Reset animation cycle
      if (time > 700) {
        time = 0;
        for (const p of particles) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 0.1 + Math.random() * 0.45;
          p.x = 0.5 + Math.cos(angle) * dist;
          p.y = 0.5 + Math.sin(angle) * dist;
        }
      }

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
