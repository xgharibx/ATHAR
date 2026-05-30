
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function LightningThunderVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    type Bolt = { points: [number, number][]; alpha: number; decay: number };
    const bolts: Bolt[] = [];

    const generateBolt = (startX: number, w: number, h: number): [number, number][] => {
      const pts: [number, number][] = [[startX, h * 0.22]];
      let x = startX, y = h * 0.22;
      while (y < h * 0.75) {
        x += (Math.random() - 0.5) * w * 0.1;
        y += h * 0.08 + Math.random() * h * 0.06;
        pts.push([Math.max(w * 0.1, Math.min(w * 0.9, x)), y]);
      }
      return pts;
    };

    const rain = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(),
      speed: 0.004 + Math.random() * 0.006, len: 5 + Math.random() * 10,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#050208'); skyGrad.addColorStop(0.4, '#080614'); skyGrad.addColorStop(1, '#030208');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 5; i++) {
        const cloudX = ((i / 5 + time * 0.006) % 1.3 - 0.15) * w;
        const cloudY = h * (0.1 + i * 0.025);
        const cloudR = w * 0.08 + i * 12;
        const cGrad = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, cloudR);
        cGrad.addColorStop(0, 'rgba(50,40,70,0.7)'); cGrad.addColorStop(1, 'rgba(20,15,30,0)');
        ctx.fillStyle = cGrad; ctx.fillRect(0, 0, w, h);
      }

      rain.forEach((r) => {
        r.y += r.speed; if (r.y > 1) r.y = 0;
        ctx.strokeStyle = 'rgba(120,160,255,0.15)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(r.x * w, r.y * h); ctx.lineTo(r.x * w - 1, r.y * h + r.len); ctx.stroke();
      });

      if (Math.random() < 0.02 && bolts.length < 3) {
        bolts.push({ points: generateBolt(w * (0.2 + Math.random() * 0.6), w, h), alpha: 1, decay: 0.06 + Math.random() * 0.04 });
      }

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.alpha -= b.decay;
        if (b.alpha <= 0) { bolts.splice(i, 1); continue; }
        if (b.alpha > 0.7) { ctx.fillStyle = `rgba(200,200,255,${(b.alpha - 0.7) * 0.08})`; ctx.fillRect(0, 0, w, h); }
        ctx.strokeStyle = `rgba(160,200,255,${b.alpha * 0.3})`; ctx.lineWidth = 4;
        ctx.beginPath(); b.points.forEach(([px, py], pi) => pi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)); ctx.stroke();
        ctx.strokeStyle = `rgba(240,240,255,${b.alpha * 0.9})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); b.points.forEach(([px, py], pi) => pi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)); ctx.stroke();
      }

      bolts.forEach(b => {
        if (b.alpha > 0.5 && b.points.length > 0) {
          const [bx, by] = b.points[b.points.length - 1];
          const gFlash = ctx.createRadialGradient(bx, by, 0, bx, by, 40);
          gFlash.addColorStop(0, `rgba(200,220,255,${b.alpha * 0.4})`); gFlash.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gFlash; ctx.fillRect(0, 0, w, h);
        }
      });

      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,200,255,0.5)'; ctx.shadowColor = 'rgba(100,160,255,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('وَيُسَبِّحُ الرَّعْدُ بِحَمْدِهِ', w * 0.5, h * 0.91);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#050208' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(5,2,8,0.9) 0%, rgba(5,2,8,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(180,200,255,0.92)', textShadow: '0 0 18px rgba(100,150,255,0.4)' }}>
          وَيُسَبِّحُ{' '}
          <span style={{ color: '#aaddff', textShadow: '0 0 14px rgba(140,200,255,0.7)' }}>الرَّعْدُ بِحَمْدِهِ</span>
          {' '}وَالْمَلَائِكَةُ مِنْ خِيفَتِهِ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(40,60,120,0.45)' }}>
          سورة الرعد · الآية ١٣
        </p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(5,2,8,0.92) 0%, rgba(5,2,8,0.5) 60%, rgba(5,2,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚡', label: '3e9 V', sub: 'جهد صاعقة' },
            { icon: '✨', label: '2000 C', sub: 'حرارة شرارة' },
            { icon: '🌩️', label: '1.4B/سنة', sub: 'صاعقة عالميا' },
            { icon: '🌋', label: 'plasma', sub: 'حالة رابعة' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(5,3,15,0.1)', border: '1px solid rgba(60,80,160,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(180,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(80,100,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
