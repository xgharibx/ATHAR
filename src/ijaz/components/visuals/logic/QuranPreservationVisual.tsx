
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function QuranPreservationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const mss = [
      { name: 'Birmingham Quran', date: '568-645 CE', y: 0.28, alpha: 0 },
      { name: 'Topkapi MSS', date: '8th century', y: 0.44, alpha: 0 },
      { name: "Sana'a MSS", date: '7th century', y: 0.60, alpha: 0 },
      { name: 'Samarkand Codex', date: '8th century', y: 0.76, alpha: 0 },
    ];

    const arabicChars = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
    type Particle = { x: number; y: number; char: string; alpha: number; speed: number };
    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(),
      char: arabicChars[Math.floor(Math.random() * arabicChars.length)],
      alpha: Math.random() * 0.1 + 0.02,
      speed: 0.0003 + Math.random() * 0.0003,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#050408'); bgGrad.addColorStop(1, '#030206');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      particles.forEach(p => {
        p.y -= p.speed; if (p.y < 0) p.y = 1;
        ctx.font = `${8 + Math.sin(time + p.x * 10) * 2}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(180,160,220,${p.alpha})`;
        ctx.fillText(p.char, p.x * w, p.y * h);
      });

      mss.forEach((ms, i) => {
        ms.alpha = Math.min(1, ms.alpha + 0.005);
        const y = ms.y * h;
        const barW = (w * 0.75) * ms.alpha;
        const barGrad = ctx.createLinearGradient(w * 0.1, 0, w * 0.1 + barW, 0);
        barGrad.addColorStop(0, `rgba(80,60,130,${ms.alpha * 0.18})`);
        barGrad.addColorStop(1, `rgba(80,60,130,0)`);
        ctx.fillStyle = barGrad; ctx.fillRect(w * 0.1, y - 12, barW, 24);
        ctx.fillStyle = `rgba(160,140,220,${ms.alpha * 0.5})`; ctx.fillRect(w * 0.1, y - 12, 2, 24);
        ctx.font = `bold 9px sans-serif`; ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(200,185,255,${ms.alpha * 0.8})`;
        ctx.fillText(ms.name, w * 0.14, y + 2);
        ctx.font = `7px monospace`;
        ctx.fillStyle = `rgba(140,120,200,${ms.alpha * 0.55})`;
        ctx.fillText(ms.date, w * 0.14, y + 12);
        if (ms.alpha > 0.9) {
          ctx.font = `7px sans-serif`; ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(120,220,140,0.5)';
          ctx.fillText('= مطابق', w * 0.88, y + 4);
        }
      });

      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,160,220,0.4)'; ctx.shadowColor = 'rgba(140,120,200,0.2)'; ctx.shadowBlur = 8;
      ctx.fillText('إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافظُونَ', w * 0.5, h * 0.91);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#050408' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(5,4,8,0.9) 0%, rgba(5,4,8,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(200,185,255,0.92)', textShadow: '0 0 18px rgba(140,120,255,0.4)' }}>
          إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ{' '}
          <span style={{ color: '#bbaaff', textShadow: '0 0 14px rgba(180,150,255,0.7)' }}>وَإِنَّا لَهُ لَحَافظُونَ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(70,55,120,0.45)' }}>سورة الحجر · الآية ٩</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(5,4,8,0.92) 0%, rgba(5,4,8,0.5) 60%, rgba(5,4,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5V5a2 2 0 0 1 2-2h14v14 M4 19.5A2.5 2.5 0 0 0 6.5 22H20', label: 'Birmingham', sub: '568-645 CE' },
            { d: 'M2 5c3-1.5 6-1.5 10 0v15c-4-1.5-7-1.5-10 0z M22 5c-3-1.5-6-1.5-10 0v15c4-1.5 7-1.5 10 0z', label: '114 سورة', sub: 'متطابقة' },
            { d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-5-5', label: 'carbon dated', sub: "Sana'a 1972" },
            { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3', label: 'لا تغيير', sub: '14 قرنا' },
          ].map(({ d, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(10,8,20,0.1)', border: '1px solid rgba(80,60,160,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="rgba(200,185,255,0.92)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d={d} />
              </svg>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(200,185,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,100,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
