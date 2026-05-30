
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function SexDeterminationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    type Sperm = { x: number; y: number; angle: number; speed: number; type: 'X' | 'Y'; wag: number; wagSpeed: number };
    const sperms: Sperm[] = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      angle: Math.random() * Math.PI * 2,
      speed: 0.0008 + Math.random() * 0.0006,
      type: i < 9 ? 'X' : 'Y',
      wag: 0, wagSpeed: 2 + Math.random() * 2,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5, cy = h * 0.42;

      ctx.fillStyle = '#060214'; ctx.fillRect(0, 0, w, h);

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5);
      bgGrad.addColorStop(0, 'rgba(60,20,80,0.08)'); bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      const eggR = Math.min(w, h) * 0.13;
      const eggGrad = ctx.createRadialGradient(cx - eggR * 0.3, cy - eggR * 0.3, 0, cx, cy, eggR);
      eggGrad.addColorStop(0, 'rgba(255,180,220,0.25)');
      eggGrad.addColorStop(0.6, 'rgba(200,100,160,0.12)');
      eggGrad.addColorStop(1, 'rgba(140,60,120,0.05)');
      ctx.beginPath(); ctx.arc(cx, cy, eggR, 0, Math.PI * 2);
      ctx.fillStyle = eggGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(220,140,200,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, eggR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,160,210,0.12)'; ctx.fill();
      ctx.font = `8px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,160,200,0.25)';
      ctx.fillText('بُويضة XX', cx, cy + eggR + 10);

      sperms.forEach((sp) => {
        sp.wag += sp.wagSpeed * 0.07;
        const wagAngle = Math.sin(sp.wag) * 0.4;
        sp.x += Math.cos(sp.angle + wagAngle) * sp.speed;
        sp.y += Math.sin(sp.angle + wagAngle) * sp.speed;
        if (sp.x < 0 || sp.x > 1) { sp.angle = Math.PI - sp.angle; sp.x = Math.max(0.01, Math.min(0.99, sp.x)); }
        if (sp.y < 0 || sp.y > 1) { sp.angle = -sp.angle; sp.y = Math.max(0.01, Math.min(0.99, sp.y)); }
        const sx = sp.x * w, sy = sp.y * h;
        const isX = sp.type === 'X';
        const color = isX ? 'rgba(160,120,255,' : 'rgba(80,200,200,';
        const tailLen = 14;
        ctx.strokeStyle = color + '0.25)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        for (let t = 1; t <= 4; t++) {
          ctx.lineTo(
            sx - Math.cos(sp.angle + wagAngle) * tailLen * t / 4 + Math.sin(sp.wag + t) * 3,
            sy - Math.sin(sp.angle + wagAngle) * tailLen * t / 4
          );
        }
        ctx.stroke();
        ctx.beginPath(); ctx.ellipse(sx, sy, 4, 3, sp.angle, 0, Math.PI * 2);
        ctx.fillStyle = color + '0.5)'; ctx.fill();
        ctx.font = `5px bold sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = color + '0.8)';
        ctx.fillText(sp.type, sx, sy - 6);
      });

      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,160,255,0.5)'; ctx.shadowColor = 'rgba(160,100,255,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('خَلَقَ الزَّوْجَيْنِ مِن نُطْفَةٍ إِذَا تُمْنَى', w * 0.5, h * 0.91);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#060214' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(6,2,20,0.9) 0%, rgba(6,2,20,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(210,180,255,0.92)', textShadow: '0 0 18px rgba(160,100,255,0.4)' }}>
          خَلَقَ الزَّوْجَيْنِ الذَّكَرَ وَالْأُنثَى{' '}
          <span style={{ color: '#bbaaff', textShadow: '0 0 14px rgba(180,150,255,0.7)' }}>مِن نُطْفَةٍ إِذَا تُمْنَى</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,40,100,0.45)' }}>سورة النجم · الآية ٤٥–٤٦</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(6,2,20,0.92) 0%, rgba(6,2,20,0.5) 60%, rgba(6,2,20,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '♂️', label: 'XY = ذكر', sub: 'sperm decides' },
            { icon: '♀️', label: 'XX = أنثى', sub: 'egg carries X' },
            { icon: '🧬', label: 'نُطْفَة', sub: 'Leeuwenhoek 1677' },
            { icon: '🔬', label: 'McClung 1902', sub: 'sex chromosome' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(10,4,25,0.1)', border: '1px solid rgba(80,50,160,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(200,170,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,90,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
