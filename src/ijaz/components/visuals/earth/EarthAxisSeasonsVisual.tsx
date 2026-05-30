
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌍 Earth Axis Seasons
// Quran / earth design — tilted axis causes seasons
// 23.5° tilt produces equinoxes, solstices, 4 seasons

export default function EarthAxisSeasonsVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Star background
    const stars = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), size: Math.random() * 1.2 + 0.2, phase: Math.random() * Math.PI * 2 }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5, cy = h * 0.45;

      ctx.fillStyle = '#010010'; ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach(s => {
        const a = Math.sin(time * 0.4 + s.phase) * 0.08 + 0.25;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${a})`; ctx.fill();
      });

      // Sun
      const sunR = Math.min(w, h) * 0.07;
      const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR);
      sunGrad.addColorStop(0, 'rgba(255,250,200,0.95)');
      sunGrad.addColorStop(0.5, 'rgba(255,200,80,0.7)');
      sunGrad.addColorStop(0.8, 'rgba(200,120,20,0.3)');
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad; ctx.fillRect(0, 0, w, h);
      ctx.beginPath(); ctx.arc(cx, cy, sunR * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,250,220,0.9)'; ctx.fill();

      // Earth orbit ellipse
      const orbA = Math.min(w, h) * 0.34, orbB = Math.min(w, h) * 0.22;
      ctx.strokeStyle = 'rgba(100,150,220,0.08)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, orbA, orbB, 0, 0, Math.PI * 2); ctx.stroke();

      // Earth position on orbit
      const eAngle = time * 0.18;
      const ex = cx + Math.cos(eAngle) * orbA;
      const ey = cy + Math.sin(eAngle) * orbB;

      // Season colors
      const seasonAngle = (eAngle % (Math.PI * 2)) / (Math.PI * 2);
      const seasonColors = [
        [80, 180, 80],   // spring
        [230, 180, 20],  // summer
        [200, 100, 20],  // autumn
        [100, 160, 220], // winter
      ];
      const si = Math.floor(seasonAngle * 4) % 4;
      const [sr, sg, sb] = seasonColors[si];
      const seasonNames = ['الربيع ⛰️', 'الصيف ☀️', 'الخريف 🍂', 'الشتاء ❄️'];

      // Sun ray to Earth
      ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.12)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();

      // Earth itself
      const eR = Math.min(w, h) * 0.055;
      const earthGrad = ctx.createRadialGradient(ex - eR * 0.3, ey - eR * 0.3, 0, ex, ey, eR);
      earthGrad.addColorStop(0, `rgba(${sr},${sg},${sb * 2},0.9)`);
      earthGrad.addColorStop(0.5, `rgba(${sr * 0.4},${sg * 0.5},${sb},0.8)`);
      earthGrad.addColorStop(1, `rgba(${sr * 0.2},${sg * 0.25},${sb * 0.5},0.5)`);
      ctx.beginPath(); ctx.arc(ex, ey, eR, 0, Math.PI * 2);
      ctx.fillStyle = earthGrad; ctx.fill();

      // Axial tilt line (23.5°)
      const tiltAngle = -Math.PI / 2 + 0.41; // 23.5° from vertical
      ctx.strokeStyle = 'rgba(200,200,255,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(tiltAngle) * eR * 1.6, ey + Math.sin(tiltAngle) * eR * 1.6);
      ctx.lineTo(ex - Math.cos(tiltAngle) * eR * 1.6, ey - Math.sin(tiltAngle) * eR * 1.6);
      ctx.stroke();

      // 23.5° label near Earth
      ctx.font = `6px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,180,255,0.4)';
      ctx.fillText('23.5°', ex + eR * 1.8, ey - eR * 0.5);

      // Current season label
      ctx.font = `bold 9px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(${sr},${sg},${sb},0.7)`;
      ctx.fillText(seasonNames[si], ex, ey + eR + 14);

      // 4 season position dots
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const dx = cx + Math.cos(a) * orbA, dy = cy + Math.sin(a) * orbB;
        ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${seasonColors[i][0]},${seasonColors[i][1]},${seasonColors[i][2]},0.4)`; ctx.fill();
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
      style={{ background: '#010010' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,16,0.9) 0%, rgba(1,0,16,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(180,200,255,0.92)', textShadow: '0 0 18px rgba(80,120,220,0.4)' }}>
          يُكَوِّرُ اللَّيْلَ عَلَى النَّهَارِ{' '}
          <span style={{ color: '#88ccff', textShadow: '0 0 14px rgba(100,180,255,0.7)' }}>وَسَخَّرَ الشَّمْسَ وَالْقَمَرَ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(40,60,120,0.45)' }}>
          سورة الزمر · الآية ٥
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,16,0.92) 0%, rgba(1,0,16,0.5) 60%, rgba(1,0,16,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🌍', label: '23.5° ميل', sub: 'تخلق فصولاً' },
            { icon: '☔', label: 'الانقلابين', sub: 'solstices' },
            { icon: '🌃', label: '4 فصول', sub: 'تنوع بيئي' },
            { icon: '📐', label: 'تصميم دقيق', sub: 'precision' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(4,2,25,0.1)', border: '1px solid rgba(40,80,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(160,190,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(80,110,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
