
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic reference to the faculty of speech being given by Allah —
// modern neuroscience has identified Broca's and Wernicke's areas as language centers.
// Shows a brain with highlighted language regions, sound waves, and floating Arabic letters.

export default function SpeechFacultyVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Arabic letters for floating text particles
    const arabicLetters = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ر', 'ز', 'س', 'ش', 'ص', 'ع', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'];
    const floatingLetters = Array.from({ length: 25 }, () => ({
      x: Math.random(),
      y: Math.random(),
      letter: arabicLetters[Math.floor(Math.random() * arabicLetters.length)],
      size: 12 + Math.random() * 16,
      drift: (Math.random() - 0.5) * 0.0005,
      floatPhase: Math.random() * Math.PI * 2,
      alpha: 0.1 + Math.random() * 0.25,
    }));

    // Sound waves emanating from mouth area
    const soundWaves: { x: number; radius: number; alpha: number }[] = [];
    let soundWaveTimer = 0;

    // Neural firing particles
    const neuralFires: { x: number; y: number; targetX: number; targetY: number; progress: number; speed: number }[] = [];
    let neuralTimer = 0;

    // Connection lines between regions (neural pathways)
    // Broca's area: left frontal ~(0.32, 0.42), Wernicke's: left temporal ~(0.42, 0.58)
    const brocaX = 0.32, brocaY = 0.42;
    const wernickeX = 0.42, wernickeY = 0.58;
    const mouthX = 0.22, mouthY = 0.68;

    // Brain outline points (simplified side view)
    const brainOutline = [
      { x: 0.28, y: 0.25 },
      { x: 0.34, y: 0.2 },
      { x: 0.42, y: 0.18 },
      { x: 0.52, y: 0.2 },
      { x: 0.58, y: 0.25 },
      { x: 0.62, y: 0.32 },
      { x: 0.63, y: 0.42 },
      { x: 0.62, y: 0.52 },
      { x: 0.58, y: 0.6 },
      { x: 0.52, y: 0.65 },
      { x: 0.44, y: 0.67 },
      { x: 0.36, y: 0.65 },
      { x: 0.3, y: 0.6 },
      { x: 0.26, y: 0.52 },
      { x: 0.25, y: 0.42 },
      { x: 0.25, y: 0.32 },
    ];

    // Brain fold lines (sulci)
    const foldLines = [
      [{ x: 0.35, y: 0.2 }, { x: 0.38, y: 0.35 }, { x: 0.36, y: 0.5 }],
      [{ x: 0.45, y: 0.19 }, { x: 0.48, y: 0.32 }, { x: 0.5, y: 0.48 }],
      [{ x: 0.3, y: 0.42 }, { x: 0.4, y: 0.4 }, { x: 0.52, y: 0.44 }],
      [{ x: 0.55, y: 0.25 }, { x: 0.58, y: 0.38 }, { x: 0.56, y: 0.52 }],
      [{ x: 0.32, y: 0.55 }, { x: 0.42, y: 0.52 }, { x: 0.52, y: 0.57 }],
    ];

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background
      const bg = ctx.createRadialGradient(w * 0.43, h * 0.43, 0, w * 0.43, h * 0.43, w * 0.7);
      bg.addColorStop(0, '#0c0a18');
      bg.addColorStop(1, '#060610');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Draw brain outline
      ctx.beginPath();
      ctx.moveTo(brainOutline[0].x * w, brainOutline[0].y * h);
      for (let i = 1; i < brainOutline.length; i++) {
        const prev = brainOutline[i - 1];
        const curr = brainOutline[i];
        const cpx = (prev.x + curr.x) / 2 * w;
        const cpy = (prev.y + curr.y) / 2 * h;
        ctx.quadraticCurveTo(prev.x * w, prev.y * h, cpx, cpy);
      }
      ctx.quadraticCurveTo(
        brainOutline[brainOutline.length - 1].x * w,
        brainOutline[brainOutline.length - 1].y * h,
        brainOutline[0].x * w,
        brainOutline[0].y * h
      );
      ctx.closePath();

      // Brain fill
      const brainFill = ctx.createRadialGradient(w * 0.43, h * 0.42, 0, w * 0.43, h * 0.42, w * 0.2);
      brainFill.addColorStop(0, 'rgba(168,85,247,0.12)');
      brainFill.addColorStop(0.7, 'rgba(168,85,247,0.06)');
      brainFill.addColorStop(1, 'rgba(100,50,150,0.03)');
      ctx.fillStyle = brainFill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(168,85,247,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Brain folds (sulci lines)
      ctx.lineWidth = 1;
      for (const fold of foldLines) {
        ctx.beginPath();
        ctx.moveTo(fold[0].x * w, fold[0].y * h);
        for (let i = 1; i < fold.length; i++) {
          ctx.lineTo(fold[i].x * w, fold[i].y * h);
        }
        ctx.strokeStyle = 'rgba(168,85,247,0.15)';
        ctx.stroke();
      }

      // Broca's area glow
      const brocaPulse = Math.sin(time * 0.03) * 0.2 + 0.6;
      const brocaGlow = ctx.createRadialGradient(
        brocaX * w, brocaY * h, 0,
        brocaX * w, brocaY * h, w * 0.05
      );
      brocaGlow.addColorStop(0, `rgba(96,165,250,${brocaPulse * 0.6})`);
      brocaGlow.addColorStop(0.5, `rgba(96,165,250,${brocaPulse * 0.2})`);
      brocaGlow.addColorStop(1, 'rgba(96,165,250,0)');
      ctx.beginPath();
      ctx.arc(brocaX * w, brocaY * h, w * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = brocaGlow;
      ctx.fill();
      ctx.font = `${Math.max(10, w * 0.01)}px sans-serif`;
      ctx.fillStyle = `rgba(96,165,250,${brocaPulse * 0.7})`;
      ctx.fillText("Broca's", brocaX * w - 18, brocaY * h - w * 0.035);

      // Wernicke's area glow
      const wernPulse = Math.sin(time * 0.03 + 1.5) * 0.2 + 0.6;
      const wernGlow = ctx.createRadialGradient(
        wernickeX * w, wernickeY * h, 0,
        wernickeX * w, wernickeY * h, w * 0.05
      );
      wernGlow.addColorStop(0, `rgba(96,165,250,${wernPulse * 0.6})`);
      wernGlow.addColorStop(0.5, `rgba(96,165,250,${wernPulse * 0.2})`);
      wernGlow.addColorStop(1, 'rgba(96,165,250,0)');
      ctx.beginPath();
      ctx.arc(wernickeX * w, wernickeY * h, w * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = wernGlow;
      ctx.fill();
      ctx.fillStyle = `rgba(96,165,250,${wernPulse * 0.7})`;
      ctx.fillText("Wernicke's", wernickeX * w - 22, wernickeY * h + w * 0.045);

      // Connection arc between Broca's and Wernicke's (arcuate fasciculus)
      const arcPulse = Math.sin(time * 0.025) * 0.2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(brocaX * w, brocaY * h);
      ctx.quadraticCurveTo(
        (brocaX + wernickeX) / 2 * w + 30,
        (brocaY + wernickeY) / 2 * h - 40,
        wernickeX * w,
        wernickeY * h
      );
      ctx.strokeStyle = `rgba(96,165,250,${arcPulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Connection from Broca's to mouth area
      ctx.beginPath();
      ctx.moveTo(brocaX * w, brocaY * h);
      ctx.quadraticCurveTo(
        (brocaX + mouthX) / 2 * w - 10,
        (brocaY + mouthY) / 2 * h,
        mouthX * w,
        mouthY * h
      );
      ctx.strokeStyle = `rgba(96,165,250,${arcPulse * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mouth area indicator
      const mouthPulse = Math.sin(time * 0.04) * 0.15 + 0.35;
      ctx.beginPath();
      ctx.ellipse(mouthX * w, mouthY * h, 12, 8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(240,230,184,${mouthPulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sound waves from mouth
      soundWaveTimer++;
      if (soundWaveTimer > 30) {
        soundWaveTimer = 0;
        soundWaves.push({ x: mouthX, radius: 5, alpha: 0.6 });
      }
      for (let i = soundWaves.length - 1; i >= 0; i--) {
        const sw = soundWaves[i];
        sw.radius += 1.5;
        sw.alpha *= 0.97;
        if (sw.alpha < 0.01) { soundWaves.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(sw.x * w - sw.radius * 0.5, mouthY * h, sw.radius, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.strokeStyle = `rgba(240,230,184,${sw.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Neural firing particles traveling between areas
      neuralTimer++;
      if (neuralTimer > 15) {
        neuralTimer = 0;
        // Broca <-> Wernicke
        if (Math.random() > 0.3) {
          const fromBroca = Math.random() > 0.5;
          neuralFires.push({
            x: fromBroca ? brocaX : wernickeX,
            y: fromBroca ? brocaY : wernickeY,
            targetX: fromBroca ? wernickeX : brocaX,
            targetY: fromBroca ? wernickeY : brocaY,
            progress: 0,
            speed: 0.02 + Math.random() * 0.015,
          });
        }
        // Broca -> Mouth
        if (Math.random() > 0.5) {
          neuralFires.push({
            x: brocaX, y: brocaY,
            targetX: mouthX, targetY: mouthY,
            progress: 0,
            speed: 0.018 + Math.random() * 0.01,
          });
        }
      }
      for (let i = neuralFires.length - 1; i >= 0; i--) {
        const nf = neuralFires[i];
        nf.progress += nf.speed;
        if (nf.progress >= 1) { neuralFires.splice(i, 1); continue; }

        const nx = (nf.x + (nf.targetX - nf.x) * nf.progress) * w;
        const ny = (nf.y + (nf.targetY - nf.y) * nf.progress) * h;
        const nAlpha = Math.sin(nf.progress * Math.PI);

        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 8);
        ng.addColorStop(0, `rgba(96,165,250,${nAlpha * 0.8})`);
        ng.addColorStop(1, 'rgba(96,165,250,0)');
        ctx.beginPath();
        ctx.arc(nx, ny, 8, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${nAlpha})`;
        ctx.fill();
      }

      // Floating Arabic letters
      for (const fl of floatingLetters) {
        fl.x += fl.drift;
        fl.y += Math.sin(time * 0.008 + fl.floatPhase) * 0.0003;
        if (fl.x < -0.05) fl.x = 1.05;
        if (fl.x > 1.05) fl.x = -0.05;
        if (fl.y < -0.05) fl.y = 1.05;
        if (fl.y > 1.05) fl.y = -0.05;

        const pulse = Math.sin(time * 0.02 + fl.floatPhase) * 0.3 + 0.7;
        ctx.font = `${fl.size}px 'Arial'`;
        ctx.fillStyle = `rgba(240,230,184,${fl.alpha * pulse})`;
        ctx.fillText(fl.letter, fl.x * w, fl.y * h);
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
