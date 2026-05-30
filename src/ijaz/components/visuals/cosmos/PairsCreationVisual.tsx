
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚛️ وَمِن كُلِّ شَيْءٍ خَلَقْنَا زَوْجَيْنِ — Pairs in Everything
// Adh-Dhariyat 51:49 — all things created in pairs
// Matter/antimatter, male/female, +/-, particle/antiparticle

export default function PairsCreationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Pair types to cycle through
    const pairTypes = [
      { label1: 'مادة', label2: 'مضاد للمادة', color1: 'rgba(100,180,255,', color2: 'rgba(255,100,100,' },
      { label1: 'e⁻', label2: 'e⁺', color1: 'rgba(80,200,180,', color2: 'rgba(255,140,80,' },
      { label1: 'N قطب', label2: 'S قطب', color1: 'rgba(100,140,255,', color2: 'rgba(255,80,80,' },
      { label1: 'ذكر', label2: 'أنثى', color1: 'rgba(100,160,255,', color2: 'rgba(255,140,200,' },
    ];

    // Pair particles spawning
    type Pair = { x: number; y: number; vx1: number; vx2: number; vy1: number; vy2: number; life: number; typeIdx: number };
    const pairs: Pair[] = [];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#020008'; ctx.fillRect(0, 0, w, h);

      // Background particles
      for (let i = 0; i < 150; i++) {
        const bx = (Math.sin(i * 47.3) * 0.5 + 0.5) * w;
        const by = (Math.cos(i * 31.7) * 0.5 + 0.5) * h;
        const ba = Math.sin(time * 0.5 + i * 0.3) * 0.08 + 0.12;
        ctx.beginPath(); ctx.arc(bx, by, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,160,255,${ba})`; ctx.fill();
      }

      // Spawn pairs from center
      if (Math.random() < 0.05 && pairs.length < 12) {
        const a = Math.random() * Math.PI * 2;
        const spd = Math.random() * 1.5 + 0.5;
        pairs.push({
          x: w * 0.5, y: h * 0.45,
          vx1: Math.cos(a) * spd, vy1: Math.sin(a) * spd,
          vx2: -Math.cos(a) * spd, vy2: -Math.sin(a) * spd,
          life: 0, typeIdx: Math.floor(Math.random() * pairTypes.length),
        });
      }

      // Central creation flash
      const flashA = Math.sin(time * 3) * 0.03 + 0.06;
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.45, 18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,200,255,${flashA})`; ctx.fill();

      // Draw and update pairs
      pairs.forEach((p) => {
        p.life += 0.018;
        const x1 = p.x + p.vx1 * p.life * 60, y1 = p.y + p.vy1 * p.life * 60;
        const x2 = p.x + p.vx2 * p.life * 60, y2 = p.y + p.vy2 * p.life * 60;
        const alpha = 1 - p.life;
        if (alpha <= 0) return;
        const pt = pairTypes[p.typeIdx];

        // Connection line
        ctx.strokeStyle = `rgba(180,180,255,${alpha * 0.12})`; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

        // Particle 1
        ctx.beginPath(); ctx.arc(x1, y1, 6, 0, Math.PI * 2);
        ctx.fillStyle = pt.color1 + alpha * 0.7 + ')'; ctx.fill();
        ctx.font = `7px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = pt.color1 + alpha * 0.9 + ')';
        ctx.fillText(pt.label1, x1, y1 - 10);

        // Particle 2
        ctx.beginPath(); ctx.arc(x2, y2, 6, 0, Math.PI * 2);
        ctx.fillStyle = pt.color2 + alpha * 0.7 + ')'; ctx.fill();
        ctx.fillStyle = pt.color2 + alpha * 0.9 + ')';
        ctx.fillText(pt.label2, x2, y2 - 10);
      });

      // Remove dead pairs
      for (let i = pairs.length - 1; i >= 0; i--) if (pairs[i].life >= 1) pairs.splice(i, 1);

      // زَوْجَيْنِ label
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,180,255,0.55)'; ctx.shadowColor = 'rgba(140,140,255,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('خَلَقْنَا زَوْجَيْنِ', w * 0.5, h * 0.89);
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
      style={{ background: '#020008' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(2,0,8,0.9) 0%, rgba(2,0,8,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(200,190,255,0.92)', textShadow: '0 0 18px rgba(140,120,255,0.4)' }}>
          وَمِن كُلِّ شَيْءٍ{' '}
          <span style={{ color: '#aaaaff', textShadow: '0 0 14px rgba(160,160,255,0.7)' }}>خَلَقْنَا زَوْجَيْنِ</span>
          {' '}لَعَلَّكُمْ تَذَكَّرُونَ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,80,150,0.45)' }}>
          سورة الذاريات · الآية ٤٩
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(2,0,8,0.92) 0%, rgba(2,0,8,0.5) 60%, rgba(2,0,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚛️', label: '+/− جسيمات', sub: 'antimatter' },
            { icon: '🦲', label: 'ذكر/أنثى', sub: 'كل كائن' },
            { icon: '🔌', label: '+/− شحنة', sub: 'Dirac 1928' },
            { icon: '🌌', label: 'N/S مغناطيس', sub: 'Higgs pairs' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(10,8,25,0.1)', border: '1px solid rgba(100,100,200,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(200,190,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,110,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
