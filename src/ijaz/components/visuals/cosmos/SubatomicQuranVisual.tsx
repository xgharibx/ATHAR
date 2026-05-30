
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚛️ وَلَا أَصْغَرُ مِن ذَٰلِكَ — Things Smaller Than an Atom
// Saba 34:3 + Yunus 10:61 — 7th century stated subatomic particles exist
// Thomson 1897 | Rutherford 1911 | Gell-Mann 1964 quarks

export default function SubatomicQuranVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(), y: Math.random(), size: Math.random() * 1.4 + 0.2, alpha: Math.random() * 0.45 + 0.15,
      twinkle: Math.random() * Math.PI * 2, speed: Math.random() + 0.5,
    }));

    const PHASE_DUR = 4.5;
    const electrons = [
      { shell: 1, count: 2, offset: 0 },
      { shell: 2, count: 6, offset: Math.PI / 6 },
    ];
    const quarks = [
      { color: '#ff5544', label: 'u', baseAngle: Math.PI * 0.2 },
      { color: '#4488ff', label: 'u', baseAngle: Math.PI * 0.87 },
      { color: '#44ff88', label: 'd', baseAngle: Math.PI * 1.55 },
    ];
    const smParticles = [
      { name: 'كوارك', color: '#ff6655' }, { name: 'لبتون', color: '#55aaff' },
      { name: 'هيغز', color: '#ffcc44' }, { name: 'فوتون', color: '#ffffff' },
      { name: 'غلوون', color: '#55ff99' }, { name: 'W±', color: '#ff88cc' },
    ];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      const cx = w * 0.5, cy = h * 0.45;

      ctx.fillStyle = '#010308'; ctx.fillRect(0, 0, w, h);

      stars.forEach((s) => {
        const t = Math.sin(time * s.speed + s.twinkle) * 0.3 + 0.7;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.alpha * t})`; ctx.fill();
      });

      const totalCycle = time / PHASE_DUR;
      const phase = Math.floor(totalCycle) % 4;
      const phaseFrac = totalCycle % 1;
      const transAlpha = phaseFrac < 0.12 ? phaseFrac / 0.12 : phaseFrac > 0.88 ? (1 - phaseFrac) / 0.12 : 1;
      ctx.save(); ctx.globalAlpha = transAlpha;

      if (phase === 0) {
        const atomR = Math.min(w, h) * 0.09;
        const nucG = ctx.createRadialGradient(cx, cy, 0, cx, cy, atomR * 0.32);
        nucG.addColorStop(0, 'rgba(255,200,80,0.95)'); nucG.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = nucG; ctx.beginPath(); ctx.arc(cx, cy, atomR * 0.32, 0, Math.PI * 2); ctx.fill();
        electrons.forEach(({ shell, count, offset }) => {
          const r = atomR * (0.4 + shell * 0.38);
          ctx.strokeStyle = `rgba(100,160,255,0.12)`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + offset + time * (1.6 / shell);
            const ex = cx + Math.cos(angle) * r, ey = cy + Math.sin(angle) * r;
            ctx.beginPath(); ctx.arc(ex, ey, 2.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100,180,255,0.9)'; ctx.fill();
          }
        });
        ctx.font = `bold ${12 * dpr}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd85a'; ctx.shadowColor = '#ffd85a'; ctx.shadowBlur = 8;
        ctx.fillText('ذَرَّة — الذَّرة', cx, cy + atomR * 1.65);
        ctx.font = `${9 * dpr}px sans-serif`; ctx.fillStyle = 'rgba(180,180,200,0.6)'; ctx.shadowBlur = 0;
        ctx.fillText('"indivisible" — Greek & 7th century belief', cx, cy + atomR * 1.65 + 14 * dpr);

      } else if (phase === 1) {
        const nucR = Math.min(w, h) * 0.1;
        const gG = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucR * 1.2);
        gG.addColorStop(0, 'rgba(255,140,40,0.15)'); gG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gG; ctx.beginPath(); ctx.arc(cx, cy, nucR * 1.2, 0, Math.PI * 2); ctx.fill();
        [[-0.3, -0.22], [0.3, -0.22], [-0.15, 0.28], [0.15, 0.28]].forEach(([fx, fy]) => {
          const g2 = ctx.createRadialGradient(cx + fx * nucR, cy + fy * nucR, 0, cx + fx * nucR, cy + fy * nucR, nucR * 0.28);
          g2.addColorStop(0, 'rgba(255,80,60,0.9)'); g2.addColorStop(1, 'rgba(200,40,20,0)');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx + fx * nucR, cy + fy * nucR, nucR * 0.28, 0, Math.PI * 2); ctx.fill();
        });
        [[0, -0.1], [-0.34, 0.12], [0.34, 0.12]].forEach(([fx, fy]) => {
          const g2 = ctx.createRadialGradient(cx + fx * nucR, cy + fy * nucR, 0, cx + fx * nucR, cy + fy * nucR, nucR * 0.24);
          g2.addColorStop(0, 'rgba(150,180,255,0.8)'); g2.addColorStop(1, 'rgba(80,100,200,0)');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx + fx * nucR, cy + fy * nucR, nucR * 0.24, 0, Math.PI * 2); ctx.fill();
        });
        ctx.font = `bold ${12 * dpr}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = '#ff9966'; ctx.shadowColor = '#ff8844'; ctx.shadowBlur = 8;
        ctx.fillText('النواة — Nucleus', cx, cy + nucR * 1.65);
        ctx.font = `${9 * dpr}px sans-serif`; ctx.fillStyle = 'rgba(180,180,200,0.6)'; ctx.shadowBlur = 0;
        ctx.fillText('Rutherford 1911 — protons + neutrons inside atom', cx, cy + nucR * 1.65 + 14 * dpr);

      } else if (phase === 2) {
        const proR = Math.min(w, h) * 0.1;
        const pG = ctx.createRadialGradient(cx, cy, 0, cx, cy, proR);
        pG.addColorStop(0, 'rgba(255,100,60,0.22)'); pG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pG; ctx.beginPath(); ctx.arc(cx, cy, proR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,60,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, proR, 0, Math.PI * 2); ctx.stroke();
        quarks.forEach(({ color, label, baseAngle }) => {
          const angle = baseAngle + time * 0.65;
          const qx = cx + Math.cos(angle) * proR * 0.52;
          const qy = cy + Math.sin(angle) * proR * 0.52;
          quarks.forEach(({ baseAngle: oa }) => {
            const a2 = oa + time * 0.65;
            ctx.save(); ctx.globalAlpha = 0.15; ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 0.8;
            ctx.setLineDash([2, 4]); ctx.lineDashOffset = -(time * 12 % 6);
            ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(cx + Math.cos(a2) * proR * 0.52, cy + Math.sin(a2) * proR * 0.52); ctx.stroke();
            ctx.setLineDash([]); ctx.restore();
          });
          ctx.beginPath(); ctx.arc(qx, qy, 7, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.fill();
          ctx.shadowColor = color; ctx.shadowBlur = 10;
          ctx.font = `bold ${9 * dpr}px monospace`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
          ctx.fillText(label, qx, qy + 3 * dpr); ctx.shadowBlur = 0;
        });
        ctx.font = `bold ${12 * dpr}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcc44'; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 8;
        ctx.fillText('كواركات — Quarks', cx, cy + proR * 1.7);
        ctx.font = `${9 * dpr}px sans-serif`; ctx.fillStyle = 'rgba(180,180,200,0.6)'; ctx.shadowBlur = 0;
        ctx.fillText('Gell-Mann 1964 — smaller than proton', cx, cy + proR * 1.7 + 14 * dpr);

      } else {
        const fR = Math.min(w, h) * 0.2;
        for (let r = 0; r < 7; r++) {
          const a = Math.sin(time * 1.4 - r * 0.5) * 0.22 + 0.38;
          ctx.beginPath(); ctx.arc(cx, cy, fR * (0.22 + r * 0.12), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(80,200,255,${a * 0.4})`; ctx.lineWidth = 0.8; ctx.stroke();
        }
        smParticles.forEach(({ name, color }, i) => {
          const angle = (i / smParticles.length) * Math.PI * 2 + time * 0.28;
          const px = cx + Math.cos(angle) * fR * 0.58, py = cy + Math.sin(angle) * fR * 0.58;
          const a = Math.sin(time * 0.8 + i * 1.2) * 0.22 + 0.65;
          ctx.save(); ctx.globalAlpha = a;
          ctx.font = `${9 * dpr}px serif`; ctx.textAlign = 'center';
          ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 5;
          ctx.fillText(name, px, py); ctx.restore();
        });
        ctx.font = `bold ${11 * dpr}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(150,220,255,0.88)'; ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 8;
        ctx.fillText('17 جسيماً — القياسي', cx, cy + fR * 0.88);
        ctx.font = `${9 * dpr}px sans-serif`; ctx.fillStyle = 'rgba(180,180,200,0.6)'; ctx.shadowBlur = 0;
        ctx.fillText('All smaller than the Quran\'s ذرة', cx, cy + fR * 0.88 + 14 * dpr);
      }

      ctx.restore();

      // Phase dots
      const dotCx = cx, dotY = h * 0.9;
      for (let i = 0; i < 4; i++) {
        const active = i === phase;
        ctx.beginPath(); ctx.arc(dotCx + (i - 1.5) * 18, dotY, active ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = active ? 'rgba(255,210,80,0.85)' : 'rgba(80,100,180,0.45)'; ctx.fill();
      }

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
      style={{ background: '#010308' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* TOP verse */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,3,8,0.9) 0%, rgba(1,3,8,0) 100%)' }}>
        <p className="font-amiri text-lg md:text-xl leading-snug text-center"
          style={{ color: 'rgba(220,230,255,0.92)', textShadow: '0 0 20px rgba(100,150,255,0.4)' }}>
          وَلَا يَعْزُبُ عَنْهُ مِثْقَالُ{' '}
          <span style={{ color: '#ffd85a', textShadow: '0 0 14px rgba(255,210,80,0.7)' }}>ذَرَّةٍ</span>
          {' '}وَلَا{' '}
          <span style={{ color: '#88ddff', textShadow: '0 0 14px rgba(120,200,255,0.7)' }}>أَصْغَرُ مِن ذَٰلِكَ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(120,150,200,0.45)' }}>
          سورة سبأ · الآية ٣
        </p>
      </motion.div>

      {/* Bottom chips */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,3,8,0.92) 0%, rgba(1,3,8,0.5) 60%, rgba(1,3,8,0) 100%)', paddingTop: 28 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚛️', label: 'إلكترون 1897م', sub: 'J.J. Thomson' },
            { icon: '🔵', label: 'كوارك 1964م', sub: 'Gell-Mann' },
            { icon: '📋', label: '17 جسيماً', sub: 'النموذج القياسي' },
            { icon: '📅', label: '1300 عام قبل', sub: 'القرآن ← العلم' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(40,60,160,0.08)', border: '1px solid rgba(80,120,200,0.2)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(160,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,160,220,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
