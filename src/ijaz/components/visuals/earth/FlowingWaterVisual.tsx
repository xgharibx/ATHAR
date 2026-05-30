
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function FlowingWaterVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    type LifeForm = { x: number; y: number; type: 'fish' | 'plant' | 'amoeba'; size: number; vx: number; vy: number; phase: number };
    const forms: LifeForm[] = [
      ...Array.from({ length: 6 }, (_, i) => ({ x: 0.2 + i * 0.12, y: 0.45 + (i % 2) * 0.08, type: 'fish' as const, size: 6 + i * 1.5, vx: 0.0006 + i * 0.0002, vy: 0, phase: i * 0.8 })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 0.1 + i * 0.18, y: 0.72 + Math.random() * 0.1, type: 'plant' as const, size: 8 + i * 2, vx: 0, vy: -0.0002, phase: i * 1.2 })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 0.3 + i * 0.15, y: 0.3 + Math.random() * 0.2, type: 'amoeba' as const, size: 3 + i, vx: (Math.random() - 0.5) * 0.0005, vy: (Math.random() - 0.5) * 0.0003, phase: i * 1.6 })),
    ];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // Deep ocean bg
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#001828'); bgGrad.addColorStop(0.4, '#000f1a'); bgGrad.addColorStop(1, '#000508');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // Water flow lines
      for (let row = 0; row < 8; row++) {
        const fy = h * (0.2 + row * 0.075);
        ctx.strokeStyle = `rgba(40,100,160,${0.06 - row * 0.005})`; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const dy = fy + Math.sin(x * 0.015 - time * 1.5 + row * 0.5) * 4;
          x === 0 ? ctx.moveTo(x, dy) : ctx.lineTo(x, dy);
        }
        ctx.stroke();
      }

      // H2O molecule animation center
      const molX = w * 0.5, molY = h * 0.22;
      const bondA = time * 0.3;
      // Oxygen atom
      const oGrad = ctx.createRadialGradient(molX, molY, 0, molX, molY, 12);
      oGrad.addColorStop(0, 'rgba(80,160,220,0.5)'); oGrad.addColorStop(1, 'rgba(40,80,160,0.1)');
      ctx.beginPath(); ctx.arc(molX, molY, 9, 0, Math.PI * 2);
      ctx.fillStyle = oGrad; ctx.fill();
      ctx.font = `7px bold sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.fillText('O', molX, molY + 3);
      // H atoms
      [-1, 1].forEach(side => {
        const hx = molX + side * 22 + Math.sin(bondA) * 3;
        const hy = molY + 14 + Math.cos(bondA) * 2;
        ctx.strokeStyle = 'rgba(100,180,220,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(molX, molY); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(60,120,200,0.25)'; ctx.fill();
        ctx.fillStyle = 'rgba(160,210,255,0.45)'; ctx.fillText('H', hx, hy + 3);
      });
      ctx.font = `7px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(60,120,200,0.25)';
      ctx.fillText('H\u2082O polar molecule', molX, molY + 32);

      // Life forms
      forms.forEach((f) => {
        f.x += f.vx; f.y += f.vy;
        if (f.x > 1.1) f.x = -0.05;
        if (f.x < -0.1) f.x = 1.05;
        if (f.y < 0.1 || f.y > 0.9) f.vy *= -1;
        const fx = f.x * w, fy = f.y * h;
        if (f.type === 'fish') {
          ctx.save(); ctx.translate(fx, fy + Math.sin(time * 2 + f.phase) * 5);
          ctx.beginPath(); ctx.ellipse(0, 0, f.size, f.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(60,160,200,0.2)`; ctx.fill();
          ctx.beginPath(); ctx.moveTo(-f.size, 0); ctx.lineTo(-f.size - 6, -4); ctx.lineTo(-f.size - 6, 4); ctx.closePath();
          ctx.fillStyle = 'rgba(50,140,180,0.2)'; ctx.fill();
          ctx.restore();
        } else if (f.type === 'plant') {
          ctx.strokeStyle = 'rgba(40,120,60,0.25)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(fx, fy);
          ctx.quadraticCurveTo(fx + Math.sin(time + f.phase) * 8, fy - f.size, fx, fy - f.size * 2); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(fx, fy, f.size, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(100,180,100,0.2)`; ctx.lineWidth = 1; ctx.stroke();
        }
      });

      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80,160,200,0.4)'; ctx.shadowColor = 'rgba(40,100,180,0.2)'; ctx.shadowBlur = 8;
      ctx.fillText('وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ', w * 0.5, h * 0.94);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#001828' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,24,40,0.9) 0%, rgba(0,24,40,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(120,200,240,0.92)', textShadow: '0 0 18px rgba(60,140,200,0.4)' }}>
          وَجَعَلْنَا{' '}
          <span style={{ color: '#88ddff', textShadow: '0 0 14px rgba(80,180,255,0.7)' }}>مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(20,70,100,0.45)' }}>سورة الأنبياء · الآية ٣٠</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(0,24,40,0.92) 0%, rgba(0,24,40,0.5) 60%, rgba(0,24,40,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '💧', label: 'H\u2082O polar', sub: 'hydrogen bonds' },
            { icon: '🦠', label: '70% body H\u2082O', sub: 'every cell' },
            { icon: '🐟', label: 'حياة بحرية', sub: '230k species' },
            { icon: '🧬', label: 'abiogenesis', sub: '3.8B years' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(0,20,35,0.1)', border: '1px solid rgba(20,80,140,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(100,200,240,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(40,120,180,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
