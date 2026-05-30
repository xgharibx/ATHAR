
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 💧 وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ — Water Origin of Life
// Al-Anbiya 21:30 — every living thing made from water
// NASA: "follow the water" — universal prerequisite for all known life

export default function WaterOriginLifeVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Water molecules
    type WaterMol = { x: number; y: number; vx: number; vy: number; phase: number };
    const waterMols: WaterMol[] = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random() * 0.5 + 0.15,
      vx: (Math.random() - 0.5) * 0.0015, vy: (Math.random() - 0.5) * 0.001,
      phase: Math.random() * Math.PI * 2,
    }));

    // Life forms emerging from water
    type LifeForm = { type: 'bacteria' | 'cell' | 'plant' | 'fish'; x: number; y: number; size: number; phase: number };
    const lifeForms: LifeForm[] = [
      { type: 'bacteria', x: 0.15, y: 0.4, size: 0.025, phase: 0 },
      { type: 'bacteria', x: 0.28, y: 0.45, size: 0.02, phase: 1.2 },
      { type: 'cell', x: 0.4, y: 0.38, size: 0.03, phase: 2.1 },
      { type: 'plant', x: 0.58, y: 0.42, size: 0.035, phase: 0.8 },
      { type: 'fish', x: 0.74, y: 0.4, size: 0.04, phase: 1.5 },
      { type: 'cell', x: 0.85, y: 0.45, size: 0.025, phase: 3.0 },
    ];

    // DNA helix strands in water
    type DNAPt = { angle: number; r: number };
    const dnaPoints: DNAPt[] = Array.from({ length: 30 }, (_, i) => ({
      angle: (i / 30) * Math.PI * 4, r: 0.012,
    }));

    const drawWaterMol = (x: number, y: number, size: number, alpha: number) => {
      // O atom
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(80,160,255,${alpha * 0.7})`; ctx.fill();
      ctx.strokeStyle = `rgba(140,200,255,${alpha * 0.4})`; ctx.lineWidth = 0.5; ctx.stroke();
      // H atoms
      const hAngle1 = -0.5, hAngle2 = -Math.PI + 0.5;
      const hDist = size * 1.4;
      [hAngle1, hAngle2].forEach((a) => {
        const hx = x + Math.cos(a) * hDist, hy = y + Math.sin(a) * hDist;
        ctx.beginPath(); ctx.arc(hx, hy, size * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,230,255,${alpha * 0.65})`; ctx.fill();
        ctx.strokeStyle = `rgba(120,180,255,${alpha * 0.3})`; ctx.lineWidth = 0.3; ctx.stroke();
        ctx.strokeStyle = `rgba(100,170,255,${alpha * 0.2})`; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke();
      });
    };

    const drawBacteria = (cx: number, cy: number, s: number, alpha: number) => {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(80,200,120,0.7)';
      ctx.beginPath(); ctx.ellipse(cx, cy, s, s * 0.5, time * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,240,160,0.4)'; ctx.lineWidth = 0.5; ctx.stroke();
      // Flagella
      ctx.strokeStyle = 'rgba(80,200,120,0.35)'; ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        const fa = (i / 3) * Math.PI - Math.PI * 0.5 + time * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(fa) * s, cy + Math.sin(fa) * s * 0.5);
        ctx.lineTo(cx + Math.cos(fa) * s * 2.5, cy + Math.sin(fa + 0.8) * s * 1.8);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawCell = (cx: number, cy: number, s: number, alpha: number) => {
      ctx.save(); ctx.globalAlpha = alpha;
      const cGrad = ctx.createRadialGradient(cx - s * 0.2, cy - s * 0.2, 0, cx, cy, s);
      cGrad.addColorStop(0, 'rgba(120,180,255,0.5)');
      cGrad.addColorStop(0.6, 'rgba(60,120,220,0.3)');
      cGrad.addColorStop(1, 'rgba(30,80,180,0.15)');
      ctx.fillStyle = cGrad;
      ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(100,160,255,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();
      // Nucleus
      ctx.fillStyle = 'rgba(80,140,255,0.4)';
      ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.1, s * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const drawPlant = (cx: number, cy: number, s: number, alpha: number) => {
      ctx.save(); ctx.globalAlpha = alpha;
      // Stem
      ctx.strokeStyle = 'rgba(60,180,60,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy + s); ctx.lineTo(cx, cy - s * 1.5); ctx.stroke();
      // Leaves
      for (let i = 0; i < 3; i++) {
        const ly = cy - i * s * 0.65;
        const side = i % 2 === 0 ? 1 : -1;
        ctx.fillStyle = 'rgba(80,200,80,0.6)';
        ctx.beginPath();
        ctx.moveTo(cx, ly);
        ctx.quadraticCurveTo(cx + side * s * 1.2, ly - s * 0.4, cx + side * s * 0.5, ly - s * 0.7);
        ctx.quadraticCurveTo(cx, ly - s * 0.8, cx, ly);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawFish = (cx: number, cy: number, s: number, alpha: number, t: number) => {
      ctx.save(); ctx.globalAlpha = alpha;
      const wobble = Math.sin(t * 2) * 0.15;
      ctx.translate(cx, cy); ctx.rotate(wobble);
      // Body
      const fGrad = ctx.createRadialGradient(-s * 0.1, 0, 0, 0, 0, s);
      fGrad.addColorStop(0, 'rgba(100,180,255,0.7)'); fGrad.addColorStop(1, 'rgba(40,120,200,0.4)');
      ctx.fillStyle = fGrad;
      ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      // Tail
      ctx.fillStyle = 'rgba(80,160,220,0.5)';
      ctx.beginPath(); ctx.moveTo(-s * 0.9, 0); ctx.lineTo(-s * 1.4, -s * 0.4); ctx.lineTo(-s * 1.4, s * 0.4); ctx.closePath(); ctx.fill();
      // Eye
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.05, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Dark ocean background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#00080f');
      bgGrad.addColorStop(0.3, '#001830');
      bgGrad.addColorStop(0.7, '#001a40');
      bgGrad.addColorStop(1, '#000d20');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // Water surface glow
      const waveGrad = ctx.createLinearGradient(0, h * 0.15, 0, h * 0.28);
      waveGrad.addColorStop(0, 'rgba(40,120,220,0.12)');
      waveGrad.addColorStop(0.5, 'rgba(60,160,255,0.07)');
      waveGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = waveGrad; ctx.fillRect(0, h * 0.15, w, h * 0.13);

      // ── Water molecules ───────────────────────────────────────
      waterMols.forEach((m) => {
        m.x += m.vx; m.y += m.vy;
        if (m.x < 0.02 || m.x > 0.98) m.vx *= -1;
        if (m.y < 0.15 || m.y > 0.65) m.vy *= -1;
        const alpha = (Math.sin(time * 0.8 + m.phase) * 0.15 + 0.45);
        const size = 4 * dpr;
        drawWaterMol(m.x * w, m.y * h, size, alpha);
      });

      // ── Life forms emerging ───────────────────────────────────
      lifeForms.forEach((lf) => {
        const alpha = Math.sin(time * 0.6 + lf.phase) * 0.15 + 0.75;
        const s = lf.size * Math.min(w, h);
        if (lf.type === 'bacteria') drawBacteria(lf.x * w, lf.y * h, s, alpha);
        else if (lf.type === 'cell') drawCell(lf.x * w, lf.y * h, s, alpha);
        else if (lf.type === 'plant') drawPlant(lf.x * w, lf.y * h, s, alpha);
        else if (lf.type === 'fish') drawFish(lf.x * w, lf.y * h, s, alpha, time + lf.phase);
      });

      // ── DNA in water (right side) ─────────────────────────────
      const dnaX = w * 0.88, dnaY = h * 0.42, dnaH = h * 0.25;
      dnaPoints.forEach((p, i) => {
        const t = i / dnaPoints.length;
        const y = dnaY - dnaH * 0.5 + t * dnaH;
        const x1 = dnaX + Math.cos(p.angle + time * 0.8) * w * 0.03;
        const x2 = dnaX + Math.cos(p.angle + time * 0.8 + Math.PI) * w * 0.03;
        const alpha = 0.3;
        ctx.beginPath(); ctx.arc(x1, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80,200,120,${alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,100,255,${alpha})`; ctx.fill();
        if (i % 3 === 0) {
          ctx.strokeStyle = `rgba(150,200,255,${alpha * 0.5})`; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        }
      });

      // H2O label
      ctx.font = `${10 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100,180,255,0.35)';
      ctx.fillText('H₂O', w * 0.5, h * 0.13);

      // كُلَّ شَيْءٍ حَيٍّ label
      ctx.font = `bold ${11 * dpr}px serif`;
      ctx.fillStyle = 'rgba(120,200,255,0.5)'; ctx.shadowColor = 'rgba(60,160,255,0.4)'; ctx.shadowBlur = 10;
      ctx.fillText('كُلَّ شَيْءٍ حَيٍّ', w * 0.5, h * 0.82);
      ctx.shadowBlur = 0;

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
    return () => { cancelAnimationFrame(animId); observer.disconnect(); };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}
      style={{ background: '#00080f' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,8,15,0.9) 0%, rgba(0,8,15,0) 100%)' }}>
        <p className="font-amiri text-base md:text-lg leading-snug text-center"
          style={{ color: 'rgba(140,210,255,0.92)', textShadow: '0 0 18px rgba(60,160,255,0.4)' }}>
          وَجَعَلْنَا مِنَ الْمَاءِ{' '}
          <span style={{ color: '#66ccff', textShadow: '0 0 14px rgba(80,200,255,0.7)' }}>كُلَّ شَيْءٍ حَيٍّ</span>
          {' '}ۖ أَفَلَا يُؤْمِنُونَ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(40,100,150,0.45)' }}>
          سورة الأنبياء · الآية ٣٠
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(0,8,15,0.92) 0%, rgba(0,8,15,0.5) 60%, rgba(0,8,15,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '💧', label: '70–90% ماء', sub: 'في كل خلية' },
            { icon: '🧬', label: 'DNA + بروتين', sub: 'يحتاج الماء' },
            { icon: '🚀', label: 'NASA: follow water', sub: 'بحث عن حياة' },
            { icon: '🔬', label: 'كيمياء حيوية', sub: 'مذيب عالمي' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(10,30,60,0.1)', border: '1px solid rgba(40,100,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(120,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(80,150,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
