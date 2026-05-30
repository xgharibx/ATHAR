
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function PhotosynthesisVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    type Photon = { x: number; y: number; vy: number; alpha: number };
    const photons: Photon[] = Array.from({ length: 12 }, (_, i) => ({
      x: 0.2 + i * 0.055,
      y: Math.random() * 0.4,
      vy: 0.003 + Math.random() * 0.002,
      alpha: 0.6 + Math.random() * 0.4,
    }));

    type GasParticle = { x: number; y: number; vx: number; vy: number; type: 'CO2' | 'O2'; alpha: number };
    const gases: GasParticle[] = [
      ...Array.from({ length: 5 }, () => ({ x: 0.05 + Math.random() * 0.2, y: 0.3 + Math.random() * 0.5, vx: 0.0008, vy: (Math.random() - 0.5) * 0.0005, type: 'CO2' as const, alpha: 0.35 })),
      ...Array.from({ length: 5 }, () => ({ x: 0.75 + Math.random() * 0.2, y: 0.3 + Math.random() * 0.5, vx: 0.0008, vy: (Math.random() - 0.5) * 0.0005, type: 'O2' as const, alpha: 0.35 })),
    ];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // Deep green bg
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#010e04'); bgGrad.addColorStop(0.5, '#000a02'); bgGrad.addColorStop(1, '#010e04');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // Leaf cross-section outline
      const lx = w * 0.5, ly = h * 0.5;
      const lW = w * 0.75, lH = h * 0.45;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(lx, ly, lW * 0.5, lH * 0.5, 0, 0, Math.PI * 2);
      ctx.clip();

      // Leaf tissues
      const leafGrad = ctx.createLinearGradient(0, ly - lH * 0.5, 0, ly + lH * 0.5);
      leafGrad.addColorStop(0, 'rgba(20,80,20,0.3)');
      leafGrad.addColorStop(0.3, 'rgba(10,50,10,0.2)');
      leafGrad.addColorStop(0.6, 'rgba(15,60,15,0.15)');
      leafGrad.addColorStop(1, 'rgba(20,70,20,0.3)');
      ctx.fillStyle = leafGrad; ctx.fillRect(0, 0, w, h);

      // Chloroplast cells (ovals in mesophyll)
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          const cx2 = lx - lW * 0.35 + c * lW * 0.14;
          const cy2 = ly - lH * 0.15 + r * lH * 0.15 + Math.sin(time + r * 1.5 + c * 0.7) * 3;
          const active = (Math.floor(time * 1.2) + r + c) % 3 === 0;
          ctx.beginPath(); ctx.ellipse(cx2, cy2, 14, 10, 0.3, 0, Math.PI * 2);
          ctx.fillStyle = active ? 'rgba(40,160,60,0.35)' : 'rgba(20,80,30,0.2)';
          ctx.fill();
          ctx.strokeStyle = active ? 'rgba(60,200,80,0.3)' : 'rgba(40,120,50,0.15)';
          ctx.lineWidth = 0.8; ctx.stroke();
          if (active) {
            ctx.beginPath(); ctx.arc(cx2, cy2, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(120,255,80,0.25)'; ctx.fill();
          }
        }
      }

      // Leaf vein (midrib)
      ctx.strokeStyle = 'rgba(40,120,30,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx - lW * 0.45, ly); ctx.lineTo(lx + lW * 0.45, ly); ctx.stroke();
      for (let v = 0; v < 5; v++) {
        const vx2 = lx - lW * 0.3 + v * lW * 0.15;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(vx2, ly); ctx.lineTo(vx2 - 20, ly - lH * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(vx2, ly); ctx.lineTo(vx2 - 20, ly + lH * 0.3); ctx.stroke();
      }

      ctx.restore();

      // Leaf outline
      ctx.strokeStyle = 'rgba(40,120,40,0.2)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(lx, ly, lW * 0.5, lH * 0.5, 0, 0, Math.PI * 2); ctx.stroke();

      // Photons coming from above
      photons.forEach((p) => {
        p.y += p.vy; if (p.y > 0.75) p.y = 0;
        const inLeaf = p.y > 0.28 && p.y < 0.72;
        if (inLeaf) p.alpha *= 0.97; else p.alpha = Math.min(0.9, p.alpha + 0.01);
        const pGrad = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, 5);
        pGrad.addColorStop(0, `rgba(255,230,80,${p.alpha * 0.7})`);
        pGrad.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = pGrad; ctx.fillRect(0, 0, w, h);
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,100,${p.alpha * 0.8})`; ctx.fill();
      });

      // CO2 / O2 particles
      gases.forEach((g) => {
        g.x += g.vx; g.y += g.vy;
        if (g.x > 1.1) g.x = g.type === 'CO2' ? -0.05 : 0.5;
        if (g.y < 0.1 || g.y > 0.9) g.vy *= -1;
        const col = g.type === 'O2' ? `rgba(120,200,255,${g.alpha})` : `rgba(200,180,100,${g.alpha})`;
        ctx.font = `6px bold monospace`; ctx.textAlign = 'center';
        ctx.fillStyle = col; ctx.fillText(g.type, g.x * w, g.y * h);
      });

      // Equation strip
      ctx.font = `7px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80,180,80,0.3)';
      ctx.fillText('6CO\u2082 + 6H\u2082O + light \u2192 C\u2086H\u2081\u2082O\u2086 + 6O\u2082', w * 0.5, h * 0.88);

      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80,180,80,0.4)'; ctx.shadowColor = 'rgba(40,140,40,0.2)'; ctx.shadowBlur = 8;
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
