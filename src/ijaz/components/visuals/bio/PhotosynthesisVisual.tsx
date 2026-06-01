import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌿 فَأَخْرَجْنَا بِهِ نَبَاتَ كُلِّ شَيْءٍ — Photosynthesis (الأنعام 99)
// ULTIMATE: golden sunbeams pour onto a glowing leaf; CO₂ enters through stomata,
// pulsing chloroplasts fire green light-reactions, sugar (C₆H₁₂O₆) assembles, O₂
// streams out, water rises through the stem, and the equation glows beneath.

export default function PhotosynthesisVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    type Photon = { x: number; y: number; vy: number; alpha: number; col: string };
    const photons: Photon[] = Array.from({ length: 26 }, () => ({
      x: 0.1 + Math.random() * 0.8,
      y: Math.random(),
      vy: 0.004 + Math.random() * 0.004,
      alpha: 0.5 + Math.random() * 0.5,
      col: Math.random() > 0.5 ? '255,235,120' : '255,210,90',
    }));

    // gas particles: CO2 entering bottom, O2 leaving
    type Gas = { x: number; y: number; t: number; sp: number; kind: 'CO2' | 'O2' };
    const gases: Gas[] = [];

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#06210a');
      bg.addColorStop(0.5, '#021205');
      bg.addColorStop(1, '#010a03');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // sunbeams from top
      for (let i = 0; i < 6; i++) {
        const bx = (i / 6 + 0.08) * w;
        ctx.save();
        ctx.translate(bx, 0);
        ctx.rotate(0.1 + Math.sin(time * 0.4 + i) * 0.02);
        const beam = ctx.createLinearGradient(0, 0, 0, h * 0.55);
        beam.addColorStop(0, 'rgba(255,225,120,0.14)');
        beam.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(34, h * 0.55); ctx.lineTo(-34, h * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // photons falling
      photons.forEach((p) => {
        p.y += p.vy; if (p.y > 1) { p.y = 0; p.x = 0.1 + Math.random() * 0.8; }
        const g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, 5);
        g.addColorStop(0, `rgba(${p.col},${p.alpha * 0.7})`);
        g.addColorStop(1, `rgba(${p.col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.col},${p.alpha})`; ctx.fill();
      });

      // ── stem rising from bottom ──
      const stemX = w * 0.5;
      ctx.strokeStyle = 'rgba(50,140,50,0.6)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(stemX, h);
      ctx.quadraticCurveTo(stemX + Math.sin(time * 0.5) * 6, h * 0.78, stemX, h * 0.62);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // water rising up stem
      for (let k = 0; k < 4; k++) {
        const t = (time * 0.5 + k * 0.25) % 1;
        const wy = h - t * (h * 0.38);
        ctx.beginPath(); ctx.arc(stemX + Math.sin(t * 6) * 3, wy, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120,200,255,0.55)'; ctx.fill();
      }

      // ── leaf ──
      const lx = w * 0.5, ly = h * 0.46;
      const lW = Math.min(w, h) * 0.72, lH = Math.min(w, h) * 0.42;
      // leaf body
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(lx - lW * 0.5, ly);
      ctx.quadraticCurveTo(lx - lW * 0.25, ly - lH * 0.55, lx + lW * 0.45, ly - lH * 0.32);
      ctx.quadraticCurveTo(lx + lW * 0.55, ly, lx + lW * 0.45, ly + lH * 0.32);
      ctx.quadraticCurveTo(lx - lW * 0.25, ly + lH * 0.55, lx - lW * 0.5, ly);
      ctx.closePath();
      const leafGrad = ctx.createLinearGradient(lx - lW * 0.5, ly - lH * 0.5, lx + lW * 0.5, ly + lH * 0.5);
      leafGrad.addColorStop(0, 'rgba(45,140,50,0.55)');
      leafGrad.addColorStop(0.5, 'rgba(30,100,35,0.5)');
      leafGrad.addColorStop(1, 'rgba(20,75,25,0.55)');
      ctx.fillStyle = leafGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(70,180,70,0.4)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.clip();

      // veins
      ctx.strokeStyle = 'rgba(120,200,90,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx - lW * 0.48, ly); ctx.lineTo(lx + lW * 0.44, ly - lH * 0.05); ctx.stroke();
      ctx.lineWidth = 0.8;
      for (let v = 0; v < 6; v++) {
        const vx = lx - lW * 0.32 + v * lW * 0.14;
        ctx.beginPath(); ctx.moveTo(vx, ly - lH * 0.01 * v); ctx.lineTo(vx - lW * 0.06, ly - lH * 0.34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(vx, ly + lH * 0.01 * v); ctx.lineTo(vx - lW * 0.06, ly + lH * 0.34); ctx.stroke();
      }

      // chloroplasts (pulsing light reactions)
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 7; c++) {
          const cx2 = lx - lW * 0.36 + c * lW * 0.12;
          const cy2 = ly - lH * 0.2 + r * lH * 0.2 + Math.sin(time + r + c * 0.5) * 3;
          const pulse = Math.sin(time * 2 + r * 1.3 + c * 0.8) * 0.5 + 0.5;
          ctx.beginPath(); ctx.ellipse(cx2, cy2, 11, 7, 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${40 + pulse * 60},${130 + pulse * 90},${50},${0.3 + pulse * 0.3})`;
          ctx.fill();
          if (pulse > 0.7) {
            const gl = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 10);
            gl.addColorStop(0, `rgba(150,255,110,${(pulse - 0.7) * 0.8})`);
            gl.addColorStop(1, 'rgba(150,255,110,0)');
            ctx.fillStyle = gl;
            ctx.beginPath(); ctx.arc(cx2, cy2, 10, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();

      // stomata (bottom edge) emitting/absorbing
      const stomata = [lx - lW * 0.2, lx + lW * 0.05, lx + lW * 0.28];
      stomata.forEach((sx, i) => {
        const sy = ly + lH * (0.34 + Math.sin(i) * 0.02);
        ctx.beginPath(); ctx.ellipse(sx, sy, 4, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20,60,20,0.7)'; ctx.fill();
        // spawn gases
        if (Math.random() < 0.04) gases.push({ x: sx, y: sy, t: 0, sp: 0.4 + Math.random() * 0.4, kind: 'CO2' });
        if (Math.random() < 0.04) gases.push({ x: sx, y: sy, t: 0, sp: 0.4 + Math.random() * 0.4, kind: 'O2' });
      });

      // gas particles
      for (let i = gases.length - 1; i >= 0; i--) {
        const g = gases[i];
        g.t += 0.01;
        const gx = g.x + Math.sin(g.t * 4 + i) * 8;
        // O2 floats up out of the leaf; CO2 drifts up into the leaf
        const yy = g.kind === 'O2' ? g.y - g.t * 60 : g.y + 30 - g.t * 60;
        ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        const a = Math.max(0, 0.7 - g.t * 0.6);
        ctx.fillStyle = g.kind === 'O2' ? `rgba(120,200,255,${a})` : `rgba(210,190,110,${a})`;
        ctx.fillText(g.kind === 'O2' ? 'O₂' : 'CO₂', gx, yy);
        if (g.t > 1.1) gases.splice(i, 1);
      }

      // sugar assembling glow at center
      const sugarPulse = Math.sin(time * 1.2) * 0.5 + 0.5;
      ctx.font = `bold ${9 + sugarPulse * 2}px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,240,150,${0.4 + sugarPulse * 0.4})`;
      ctx.shadowColor = 'rgba(255,220,100,0.5)'; ctx.shadowBlur = 8;
      ctx.fillText('C₆H₁₂O₆', lx, ly + 4);
      ctx.shadowBlur = 0;

      // equation strip
      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(120,210,120,0.5)';
      ctx.fillText('6CO₂ + 6H₂O + ☀ → C₆H₁₂O₆ + 6O₂', w * 0.5, h * 0.86);

      // verse label
      ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(130,220,130,0.55)';
      ctx.shadowColor = 'rgba(50,160,50,0.3)'; ctx.shadowBlur = 12;
      ctx.fillText('فَأَخْرَجْنَا بِهِ نَبَاتَ كُلِّ شَيْءٍ', w * 0.5, h * 0.95);
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };

    let started = false;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!started) { started = true; draw(); }
    });
    observer.observe(canvas);
    return () => { cancelAnimationFrame(animId); observer.disconnect(); };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#010e04' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,14,4,0.9) 0%, rgba(1,14,4,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(140,220,140,0.92)', textShadow: '0 0 18px rgba(60,160,60,0.4)' }}>
          فَأَخْرَجْنَا بِهِ{' '}
          <span style={{ color: '#88ff88', textShadow: '0 0 14px rgba(80,220,80,0.7)' }}>نَبَاتَ كُلِّ شَيْءٍ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(20,80,20,0.45)' }}>سورة الأنعام · الآية ٩٩</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,14,4,0.92) 0%, rgba(1,14,4,0.5) 60%, rgba(1,14,4,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🌞', label: 'photons', sub: 'chlorophyll absorb' },
            { icon: '🌿', label: 'C\u2086H\u2081\u2082O\u2086', sub: 'سكر = طاقة' },
            { icon: '💨', label: 'O\u2082 out', sub: 'byproduct' },
            { icon: '🐧', label: '3.5B yrs', sub: 'photosynthesis' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(2,12,3,0.1)', border: '1px solid rgba(30,100,30,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(130,220,130,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(60,140,60,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
