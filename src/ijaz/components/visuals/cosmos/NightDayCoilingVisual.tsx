
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌃 يُكَوِّرُ اللَّيْلَ عَلَى النَّهَارِ — Night Coiling on Day
// Az-Zumar 39:5 — yuk-awwiru: to coil/wrap like a turban
// Earth rotation: shadow wraps around sphere continuously

export default function NightDayCoilingVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const draw = () => {
      time += 0.005;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#010010'; ctx.fillRect(0, 0, w, h);

      // Stars
      for (let i = 0; i < 200; i++) {
        const sx = (Math.sin(i * 47.3) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 31.7) * 0.5 + 0.5) * h;
        const alpha = Math.sin(time * 0.5 + i * 0.3) * 0.1 + 0.25;
        ctx.beginPath(); ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${alpha})`; ctx.fill();
      }

      const earthX = w * 0.5, earthY = h * 0.45;
      const earthR = Math.min(w, h) * 0.22;
      const terminator = time * 0.5; // rotation angle

      // Sun glow (left side)
      const sunGrad = ctx.createRadialGradient(earthX - earthR * 1.8, earthY, 0, earthX - earthR * 1.8, earthY, earthR * 2);
      sunGrad.addColorStop(0, 'rgba(255,220,100,0.15)');
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad; ctx.fillRect(0, 0, w, h);

      // Earth base (day side)
      const dayGrad = ctx.createRadialGradient(earthX - earthR * 0.3, earthY - earthR * 0.3, 0, earthX, earthY, earthR);
      dayGrad.addColorStop(0, 'rgba(100,160,255,0.9)');
      dayGrad.addColorStop(0.4, 'rgba(60,120,200,0.8)');
      dayGrad.addColorStop(0.8, 'rgba(20,60,120,0.7)');
      dayGrad.addColorStop(1, 'rgba(10,30,80,0.5)');
      ctx.beginPath(); ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
      ctx.fillStyle = dayGrad; ctx.fill();

      // Night shadow (rotating, wrapping around)
      ctx.save(); ctx.translate(earthX, earthY); ctx.rotate(terminator);
      const nightGrad = ctx.createLinearGradient(-earthR, 0, earthR, 0);
      nightGrad.addColorStop(0, 'rgba(0,0,0,0)');
      nightGrad.addColorStop(0.42, 'rgba(0,0,0,0)');
      nightGrad.addColorStop(0.48, 'rgba(0,0,0,0.5)');
      nightGrad.addColorStop(0.52, 'rgba(0,0,0,0.85)');
      nightGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.beginPath(); ctx.arc(0, 0, earthR, 0, Math.PI * 2);
      ctx.fillStyle = nightGrad; ctx.fill();
      ctx.restore();

      // Earth outline
      ctx.strokeStyle = 'rgba(80,160,255,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2); ctx.stroke();

      // Atmosphere glow
      const atmGrad = ctx.createRadialGradient(earthX, earthY, earthR * 0.92, earthX, earthY, earthR * 1.08);
      atmGrad.addColorStop(0, 'rgba(80,160,255,0.08)');
      atmGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(earthX, earthY, earthR * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = atmGrad; ctx.fill();

      // Orbit arrow (showing rotation)
      ctx.strokeStyle = 'rgba(200,200,255,0.12)'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 8]);
      ctx.beginPath(); ctx.arc(earthX, earthY, earthR * 1.18, -Math.PI * 0.8, Math.PI * 0.8); ctx.stroke();
      ctx.setLineDash([]);

      // يُكَوِّرُ label
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,200,255,0.55)'; ctx.shadowColor = 'rgba(120,150,255,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('يُكَوِّرُ اللَّيْلَ عَلى النَّهَارِ', w * 0.5, h * 0.88);
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
      style={{ background: '#010010' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,16,0.9) 0%, rgba(1,0,16,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(180,200,255,0.92)', textShadow: '0 0 18px rgba(100,130,255,0.4)' }}>
          <span style={{ color: '#aabbff', textShadow: '0 0 14px rgba(140,160,255,0.7)' }}>يُكَوِّرُ اللَّيْلَ عَلى النَّهَارِ</span>
          {' '}وَيُكَوِّرُ النَّهَارَ عَلى اللَّيْلِ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,90,160,0.45)' }}>
          سورة الزمر · الآية ٥
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,16,0.92) 0%, rgba(1,0,16,0.5) 60%, rgba(1,0,16,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🌃', label: 'يكوِّر = يلفّ', sub: 'wraps like turban' },
            { icon: '🌍', label: 'دوران كروي', sub: '24 ساعة' },
            { icon: '⏱️', label: 'تسارع مستمر', sub: 'yuk-awwiru' },
            { icon: '☀️', label: 'تقصير النهار', sub: 'وتطويل الليل' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(5,5,30,0.1)', border: '1px solid rgba(80,90,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(180,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(110,120,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
