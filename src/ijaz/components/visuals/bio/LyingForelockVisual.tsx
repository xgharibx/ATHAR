
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic reference to the "lying, sinful forelock" (nasiyah) —
// modern neuroscience confirms the prefrontal cortex controls decision-making and deception.
// Shows a brain cross-section with highlighted prefrontal cortex, neural pathways, and truth/lie pulses.

export default function LyingForelockVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Side-view brain outline
    const brainOutline = [
      { x: 0.3, y: 0.28 },
      { x: 0.36, y: 0.22 },
      { x: 0.44, y: 0.18 },
      { x: 0.52, y: 0.17 },
      { x: 0.6, y: 0.19 },
      { x: 0.66, y: 0.24 },
      { x: 0.7, y: 0.3 },
      { x: 0.72, y: 0.38 },
      { x: 0.72, y: 0.46 },
      { x: 0.7, y: 0.54 },
      { x: 0.66, y: 0.6 },
      { x: 0.6, y: 0.64 },
      { x: 0.52, y: 0.66 },
      { x: 0.44, y: 0.65 },
      { x: 0.38, y: 0.62 },
      { x: 0.33, y: 0.57 },
      { x: 0.3, y: 0.5 },
      { x: 0.28, y: 0.42 },
      { x: 0.28, y: 0.34 },
    ];

    // Prefrontal cortex region (front of brain)
    const pfcRegion = [
      { x: 0.3, y: 0.28 },
      { x: 0.36, y: 0.22 },
      { x: 0.4, y: 0.2 },
      { x: 0.42, y: 0.25 },
      { x: 0.38, y: 0.35 },
      { x: 0.33, y: 0.42 },
      { x: 0.3, y: 0.42 },
      { x: 0.28, y: 0.35 },
    ];

    // Forehead area (in front of the brain)
    const foreheadX = 0.22;
    const foreheadY = 0.32;

    // Neural pathways from PFC
    const pathways = [
      { from: { x: 0.36, y: 0.3 }, to: { x: 0.55, y: 0.35 } },
      { from: { x: 0.34, y: 0.35 }, to: { x: 0.5, y: 0.5 } },
      { from: { x: 0.38, y: 0.28 }, to: { x: 0.6, y: 0.28 } },
      { from: { x: 0.36, y: 0.38 }, to: { x: 0.62, y: 0.45 } },
      { from: { x: 0.35, y: 0.25 }, to: { x: 0.52, y: 0.22 } },
    ];

    // Neural fire particles
    const neuralFires: { pathIdx: number; progress: number; speed: number; isLie: boolean }[] = [];
    let fireTimer = 0;

    // Truth/Lie pulse indicators
    const pulseIndicators: { x: number; y: number; radius: number; alpha: number; isLie: boolean }[] = [];
    let pulseTimer = 0;

    // Brain fold details
    const folds = [
      [{ x: 0.42, y: 0.18 }, { x: 0.44, y: 0.3 }, { x: 0.42, y: 0.45 }],
      [{ x: 0.52, y: 0.18 }, { x: 0.54, y: 0.32 }, { x: 0.52, y: 0.5 }],
      [{ x: 0.6, y: 0.2 }, { x: 0.62, y: 0.35 }, { x: 0.6, y: 0.52 }],
      [{ x: 0.32, y: 0.48 }, { x: 0.45, y: 0.45 }, { x: 0.58, y: 0.5 }],
      [{ x: 0.65, y: 0.26 }, { x: 0.68, y: 0.38 }, { x: 0.66, y: 0.52 }],
    ];

    // Background neural network particles
    const bgNeurons = Array.from({ length: 40 }, () => ({
      x: 0.25 + Math.random() * 0.5,
      y: 0.15 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 2,
    }));

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background
      const bg = ctx.createRadialGradient(w * 0.4, h * 0.4, 0, w * 0.4, h * 0.4, w * 0.6);
      bg.addColorStop(0, '#0e0c18');
      bg.addColorStop(1, '#080810');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Background neural network dots
      for (const bn of bgNeurons) {
        const pulse = Math.sin(time * 0.02 + bn.phase) * 0.3 + 0.4;
        ctx.beginPath();
        ctx.arc(bn.x * w, bn.y * h, bn.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168,85,247,${pulse * 0.15})`;
        ctx.fill();
      }
      // Connect nearby neurons with faint lines
      for (let i = 0; i < bgNeurons.length; i++) {
        for (let j = i + 1; j < bgNeurons.length; j++) {
          const dx = bgNeurons[i].x - bgNeurons[j].x;
          const dy = bgNeurons[i].y - bgNeurons[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.12) {
            ctx.beginPath();
            ctx.moveTo(bgNeurons[i].x * w, bgNeurons[i].y * h);
            ctx.lineTo(bgNeurons[j].x * w, bgNeurons[j].y * h);
            ctx.strokeStyle = `rgba(168,85,247,${(0.12 - dist) * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw brain outline
      ctx.beginPath();
      ctx.moveTo(brainOutline[0].x * w, brainOutline[0].y * h);
      for (let i = 1; i < brainOutline.length; i++) {
        const prev = brainOutline[i - 1];
        const curr = brainOutline[i];
        ctx.quadraticCurveTo(
          prev.x * w, prev.y * h,
          (prev.x + curr.x) / 2 * w, (prev.y + curr.y) / 2 * h
        );
      }
      ctx.quadraticCurveTo(
        brainOutline[brainOutline.length - 1].x * w,
        brainOutline[brainOutline.length - 1].y * h,
        brainOutline[0].x * w,
        brainOutline[0].y * h
      );
      ctx.closePath();

      // Brain fill
      const brainGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.22);
      brainGrad.addColorStop(0, 'rgba(168,85,247,0.08)');
      brainGrad.addColorStop(1, 'rgba(100,50,180,0.03)');
      ctx.fillStyle = brainGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(168,85,247,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Brain folds
      for (const fold of folds) {
        ctx.beginPath();
        ctx.moveTo(fold[0].x * w, fold[0].y * h);
        for (let i = 1; i < fold.length; i++) {
          ctx.lineTo(fold[i].x * w, fold[i].y * h);
        }
        ctx.strokeStyle = 'rgba(168,85,247,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // PREFRONTAL CORTEX — highlighted pulsing region
      const pfcPulse = Math.sin(time * 0.025) * 0.2 + 0.5;
      ctx.beginPath();
      ctx.moveTo(pfcRegion[0].x * w, pfcRegion[0].y * h);
      for (let i = 1; i < pfcRegion.length; i++) {
        ctx.lineTo(pfcRegion[i].x * w, pfcRegion[i].y * h);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255,68,68,${pfcPulse * 0.25})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,68,68,${pfcPulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // PFC glow
      const pfcCx = 0.34 * w;
      const pfcCy = 0.32 * h;
      const pfcGlow = ctx.createRadialGradient(pfcCx, pfcCy, 0, pfcCx, pfcCy, w * 0.08);
      pfcGlow.addColorStop(0, `rgba(255,68,68,${pfcPulse * 0.2})`);
      pfcGlow.addColorStop(1, 'rgba(255,68,68,0)');
      ctx.beginPath();
      ctx.arc(pfcCx, pfcCy, w * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = pfcGlow;
      ctx.fill();

      // Label
      ctx.font = `${Math.max(10, w * 0.011)}px sans-serif`;
      ctx.fillStyle = `rgba(255,68,68,${pfcPulse * 0.7})`;
      ctx.fillText('Prefrontal Cortex', 0.27 * w, 0.16 * h);

      // FOREHEAD glow
      const fhPulse = Math.sin(time * 0.03 + 0.5) * 0.2 + 0.4;
      const fhGlow = ctx.createRadialGradient(
        foreheadX * w, foreheadY * h, 0,
        foreheadX * w, foreheadY * h, w * 0.06
      );
      fhGlow.addColorStop(0, `rgba(251,191,36,${fhPulse * 0.4})`);
      fhGlow.addColorStop(0.5, `rgba(251,191,36,${fhPulse * 0.15})`);
      fhGlow.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.beginPath();
      ctx.arc(foreheadX * w, foreheadY * h, w * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = fhGlow;
      ctx.fill();

      // Forehead label
      ctx.font = `${Math.max(9, w * 0.01)}px sans-serif`;
      ctx.fillStyle = `rgba(251,191,36,${fhPulse * 0.6})`;
      ctx.fillText('Forelock (Nasiyah)', foreheadX * w - 30, foreheadY * h - w * 0.04);

      // Connection from forehead to PFC
      ctx.beginPath();
      ctx.moveTo(foreheadX * w + 10, foreheadY * h);
      ctx.lineTo(pfcCx - 5, pfcCy);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `rgba(251,191,36,${fhPulse * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // NEURAL PATHWAYS from PFC
      for (const path of pathways) {
        const pathPulse = Math.sin(time * 0.02 + path.from.x * 10) * 0.15 + 0.25;
        ctx.beginPath();
        ctx.moveTo(path.from.x * w, path.from.y * h);
        ctx.lineTo(path.to.x * w, path.to.y * h);
        ctx.strokeStyle = `rgba(96,165,250,${pathPulse})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Neural fire particles
      fireTimer++;
      if (fireTimer > 12) {
        fireTimer = 0;
        const pathIdx = Math.floor(Math.random() * pathways.length);
        const isLie = Math.random() > 0.5;
        neuralFires.push({
          pathIdx,
          progress: 0,
          speed: 0.015 + Math.random() * 0.012,
          isLie,
        });
      }

      for (let i = neuralFires.length - 1; i >= 0; i--) {
        const nf = neuralFires[i];
        nf.progress += nf.speed;
        if (nf.progress >= 1) {
          // Spawn pulse at end
          const path = pathways[nf.pathIdx];
          pulseIndicators.push({
            x: path.to.x,
            y: path.to.y,
            radius: 3,
            alpha: 0.7,
            isLie: nf.isLie,
          });
          neuralFires.splice(i, 1);
          continue;
        }

        const path = pathways[nf.pathIdx];
        const nx = (path.from.x + (path.to.x - path.from.x) * nf.progress) * w;
        const ny = (path.from.y + (path.to.y - path.from.y) * nf.progress) * h;
        const nAlpha = Math.sin(nf.progress * Math.PI);

        const color = nf.isLie ? '255,68,68' : '96,165,250';
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 6);
        ng.addColorStop(0, `rgba(${color},${nAlpha * 0.8})`);
        ng.addColorStop(1, `rgba(${color},0)`);
        ctx.beginPath();
        ctx.arc(nx, ny, 6, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${nAlpha})`;
        ctx.fill();
      }

      // Truth/Lie pulse indicators
      for (let i = pulseIndicators.length - 1; i >= 0; i--) {
        const pi = pulseIndicators[i];
        pi.radius += 0.8;
        pi.alpha *= 0.96;
        if (pi.alpha < 0.01) { pulseIndicators.splice(i, 1); continue; }

        const color = pi.isLie ? '255,68,68' : '96,165,250';
        ctx.beginPath();
        ctx.arc(pi.x * w, pi.y * h, pi.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color},${pi.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Periodic truth/lie label flash
      pulseTimer++;
      if (pulseTimer > 100 && pulseTimer < 140) {
        const labelAlpha = Math.sin((pulseTimer - 100) / 40 * Math.PI);
        const isLying = Math.sin(time * 0.005) > 0;
        ctx.font = `bold ${Math.max(14, w * 0.018)}px sans-serif`;
        ctx.textAlign = 'center';
        if (isLying) {
          ctx.fillStyle = `rgba(255,68,68,${labelAlpha * 0.5})`;
          ctx.fillText('Deception', w * 0.5, h * 0.82);
        } else {
          ctx.fillStyle = `rgba(96,165,250,${labelAlpha * 0.5})`;
          ctx.fillText('Decision-Making', w * 0.5, h * 0.82);
        }
        ctx.textAlign = 'start';
      }
      if (pulseTimer > 200) pulseTimer = 0;

      // Ambient forehead rays
      for (let r = 0; r < 6; r++) {
        const angle = -Math.PI / 3 + (r / 5) * (2 * Math.PI / 3);
        const rayLen = 0.04 + Math.sin(time * 0.02 + r) * 0.01;
        const rx1 = foreheadX * w + Math.cos(angle) * 15;
        const ry1 = foreheadY * h + Math.sin(angle) * 15;
        const rx2 = foreheadX * w + Math.cos(angle) * (15 + rayLen * w);
        const ry2 = foreheadY * h + Math.sin(angle) * (15 + rayLen * w);
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.strokeStyle = `rgba(251,191,36,${0.1 + Math.sin(time * 0.03 + r) * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
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
