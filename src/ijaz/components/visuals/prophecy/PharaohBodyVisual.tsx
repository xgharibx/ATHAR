
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// Visualizes the Quranic prophecy about Pharaoh's body being preserved —
// modern archaeology confirms the mummy of Ramesses II was preserved.
// Shows a sarcophagus, floating hieroglyphs, golden dust, and preservation waves.

export default function PharaohBodyVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Hieroglyphic-like symbols
    const hieroglyphs = ['𓀀', '𓁹', '𓂀', '𓃭', '𓆣', '𓇳', '𓊝', '𓋴', '☥', '𓏏', '𓅃', '𓁿'];
    const floatingHiero = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      symbol: hieroglyphs[Math.floor(Math.random() * hieroglyphs.length)],
      size: 14 + Math.random() * 18,
      driftX: (Math.random() - 0.5) * 0.0003,
      driftY: -0.0001 - Math.random() * 0.0003,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.1 + Math.random() * 0.25,
    }));

    // Golden dust particles
    const dustParticles = Array.from({ length: 150 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 2,
      speed: 0.0002 + Math.random() * 0.0005,
      phase: Math.random() * Math.PI * 2,
      brightness: 0.3 + Math.random() * 0.7,
    }));

    // Preservation waves emanating from center
    const waves: { radius: number; alpha: number; maxRadius: number }[] = [];
    let waveTimer = 0;

    // Sand particles (time flowing effect)
    const sandParticles = Array.from({ length: 60 }, () => ({
      x: 0.35 + Math.random() * 0.3,
      y: -Math.random() * 0.2,
      speed: 0.001 + Math.random() * 0.002,
      size: 1 + Math.random() * 1.5,
      drift: (Math.random() - 0.5) * 0.001,
    }));

    const draw = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Background — dark warm tones
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0, '#141008');
      bg.addColorStop(0.6, '#0d0a06');
      bg.addColorStop(1, '#0a0806');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Ambient warm light from center
      const ambientGlow = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.4);
      ambientGlow.addColorStop(0, 'rgba(212,168,83,0.06)');
      ambientGlow.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, w, h);

      // Golden dust particles
      for (const dp of dustParticles) {
        dp.y -= dp.speed;
        dp.x += Math.sin(time * 0.01 + dp.phase) * 0.0002;
        if (dp.y < -0.05) { dp.y = 1.05; dp.x = Math.random(); }

        const pulse = Math.sin(time * 0.03 + dp.phase) * 0.3 + 0.7;
        const px = dp.x * w;
        const py = dp.y * h;

        const glow = ctx.createRadialGradient(px, py, 0, px, py, dp.size * 3);
        glow.addColorStop(0, `rgba(212,168,83,${dp.brightness * pulse * 0.4})`);
        glow.addColorStop(1, 'rgba(212,168,83,0)');
        ctx.beginPath();
        ctx.arc(px, py, dp.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, dp.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,100,${dp.brightness * pulse * 0.6})`;
        ctx.fill();
      }

      // SARCOPHAGUS shape — central element
      const cx = w * 0.5;
      const cy = h * 0.5;
      const sarcW = w * 0.12;
      const sarcH = h * 0.35;

      // Outer sarcophagus glow
      const sarcGlow = ctx.createRadialGradient(cx, cy, sarcW * 0.5, cx, cy, sarcW * 2);
      sarcGlow.addColorStop(0, 'rgba(212,168,83,0.15)');
      sarcGlow.addColorStop(1, 'rgba(139,105,20,0)');
      ctx.fillStyle = sarcGlow;
      ctx.beginPath();
      ctx.ellipse(cx, cy, sarcW * 2, sarcH * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sarcophagus body
      ctx.beginPath();
      // Rounded rectangular shape with head/foot tapering
      ctx.moveTo(cx - sarcW * 0.6, cy - sarcH * 0.45);
      ctx.quadraticCurveTo(cx - sarcW, cy - sarcH * 0.3, cx - sarcW, cy);
      ctx.quadraticCurveTo(cx - sarcW, cy + sarcH * 0.35, cx - sarcW * 0.5, cy + sarcH * 0.5);
      ctx.lineTo(cx + sarcW * 0.5, cy + sarcH * 0.5);
      ctx.quadraticCurveTo(cx + sarcW, cy + sarcH * 0.35, cx + sarcW, cy);
      ctx.quadraticCurveTo(cx + sarcW, cy - sarcH * 0.3, cx + sarcW * 0.6, cy - sarcH * 0.45);
      // Head area (rounded top)
      ctx.quadraticCurveTo(cx, cy - sarcH * 0.55, cx - sarcW * 0.6, cy - sarcH * 0.45);
      ctx.closePath();

      const sarcBody = ctx.createLinearGradient(cx - sarcW, cy - sarcH * 0.5, cx + sarcW, cy + sarcH * 0.5);
      sarcBody.addColorStop(0, '#d4a853');
      sarcBody.addColorStop(0.3, '#b88b30');
      sarcBody.addColorStop(0.5, '#d4a853');
      sarcBody.addColorStop(0.7, '#8b6914');
      sarcBody.addColorStop(1, '#4a3728');
      ctx.fillStyle = sarcBody;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,0,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Face area on sarcophagus
      const faceY = cy - sarcH * 0.28;
      ctx.beginPath();
      ctx.ellipse(cx, faceY, sarcW * 0.35, sarcW * 0.45, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,215,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Eyes
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.ellipse(cx + side * sarcW * 0.14, faceY - 2, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139,105,20,0.6)';
        ctx.fill();
      }

      // Decorative horizontal bands
      for (let b = 0; b < 5; b++) {
        const bandY = cy - sarcH * 0.1 + b * sarcH * 0.12;
        ctx.beginPath();
        ctx.moveTo(cx - sarcW * 0.9, bandY);
        ctx.lineTo(cx + sarcW * 0.9, bandY);
        ctx.strokeStyle = `rgba(255,215,0,${0.15 + Math.sin(time * 0.02 + b) * 0.08})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Preservation waves
      waveTimer++;
      if (waveTimer > 90) {
        waveTimer = 0;
        waves.push({ radius: sarcW * 0.5, alpha: 0.5, maxRadius: w * 0.35 });
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        wave.radius += 1.2;
        wave.alpha *= 0.99;
        if (wave.radius > wave.maxRadius || wave.alpha < 0.01) { waves.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.ellipse(cx, cy, wave.radius, wave.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,168,83,${wave.alpha * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Floating hieroglyphs
      for (const fh of floatingHiero) {
        fh.x += fh.driftX + Math.sin(time * 0.005 + fh.phase) * 0.0001;
        fh.y += fh.driftY;
        if (fh.y < -0.05) { fh.y = 1.05; fh.x = Math.random(); }
        if (fh.x < -0.05 || fh.x > 1.05) fh.x = Math.random();

        const pulse = Math.sin(time * 0.02 + fh.phase) * 0.15 + 0.85;
        ctx.font = `${fh.size}px serif`;
        ctx.fillStyle = `rgba(212,168,83,${fh.alpha * pulse})`;
        ctx.fillText(fh.symbol, fh.x * w, fh.y * h);
      }

      // Sand particles (time flowing effect — like hourglass)
      for (const sp of sandParticles) {
        sp.y += sp.speed;
        sp.x += sp.drift + Math.sin(time * 0.02 + sp.x * 10) * 0.0002;
        if (sp.y > 1.05) { sp.y = -0.05; sp.x = 0.35 + Math.random() * 0.3; }

        ctx.beginPath();
        ctx.arc(sp.x * w, sp.y * h, sp.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(194,154,80,${0.2 + Math.sin(time * 0.03 + sp.y * 10) * 0.1})`;
        ctx.fill();
      }

      // Corner decorative patterns (Egyptian style borders)
      const cornerSize = 30;
      ctx.strokeStyle = 'rgba(212,168,83,0.12)';
      ctx.lineWidth = 1;
      // Top-left
      for (let i = 0; i < 3; i++) {
        const offset = i * 8;
        ctx.strokeRect(10 + offset, 10 + offset, cornerSize - offset * 2, cornerSize - offset * 2);
      }
      // Top-right
      for (let i = 0; i < 3; i++) {
        const offset = i * 8;
        ctx.strokeRect(w - 10 - cornerSize + offset, 10 + offset, cornerSize - offset * 2, cornerSize - offset * 2);
      }
      // Bottom corners
      for (let i = 0; i < 3; i++) {
        const offset = i * 8;
        ctx.strokeRect(10 + offset, h - 10 - cornerSize + offset, cornerSize - offset * 2, cornerSize - offset * 2);
        ctx.strokeRect(w - 10 - cornerSize + offset, h - 10 - cornerSize + offset, cornerSize - offset * 2, cornerSize - offset * 2);
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
