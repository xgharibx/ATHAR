
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🔢 عَلَيْهَا تِسْعَةَ عَشَرَ — Number Nineteen
// Al-Muddaththir 74:30 — over it are nineteen
// Quran miracle: 19-letter Bismillah, Allah × 2698, Qur'an 114 = 19×6

export default function NumberNineteenVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // 19-based patterns to orbit
    const orbitItems = [
      { text: 'بِسْم الله', sub: '19 حرفًا', angle: 0, r: 0.33 },
      { text: '2698 = 19×142', sub: 'لفظ الله', angle: Math.PI * 2 / 7, r: 0.28 },
      { text: '114 = 19×6', sub: 'عدد السور', angle: Math.PI * 4 / 7, r: 0.32 },
      { text: '57 = 19×3', sub: 'الرحمن', angle: Math.PI * 6 / 7, r: 0.28 },
      { text: '19 = prime', sub: 'عدد أولي', angle: Math.PI * 8 / 7, r: 0.33 },
      { text: 'فَاتحة = 7 آيات', sub: '7 × 19 ... خط', angle: Math.PI * 10 / 7, r: 0.30 },
      { text: '30 مديرًا', sub: 'متحدح', angle: Math.PI * 12 / 7, r: 0.28 },
    ];

    // Floating digits
    type FloatingDigit = { x: number; y: number; vx: number; vy: number; alpha: number; size: number };
    const floatDigits: FloatingDigit[] = Array.from({ length: 30 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003, vy: (Math.random() - 0.5) * 0.0003,
      alpha: Math.random() * 0.15 + 0.05, size: Math.random() * 10 + 6,
    }));
    const floatTexts = ['19', 'خين', '١٩', 'XIX', '10011', 'خادم'];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5, cy = h * 0.46;

      ctx.fillStyle = '#020008'; ctx.fillRect(0, 0, w, h);

      // Floating digit background
      floatDigits.forEach((fd, i) => {
        fd.x += fd.vx; fd.y += fd.vy;
        if (fd.x < 0 || fd.x > 1) fd.vx *= -1;
        if (fd.y < 0 || fd.y > 1) fd.vy *= -1;
        ctx.font = `${fd.size}px monospace`; ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(180,160,255,${fd.alpha})`;
        ctx.fillText(floatTexts[i % floatTexts.length], fd.x * w, fd.y * h);
      });

      // Orbiting ring
      ctx.strokeStyle = 'rgba(160,130,255,0.08)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * 0.28, 0, Math.PI * 2); ctx.stroke();

      // Orbiting items
      orbitItems.forEach((item, i) => {
        const a = item.angle + time * 0.2 + i * 0.1;
        const ix = cx + Math.cos(a) * item.r * Math.min(w, h);
        const iy = cy + Math.sin(a) * item.r * Math.min(w, h) * 0.7;
        const dotAlpha = 0.5 + Math.sin(time * 2 + i) * 0.2;
        ctx.beginPath(); ctx.arc(ix, iy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,160,255,${dotAlpha})`; ctx.fill();
        ctx.font = `bold 8px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(200,190,255,${dotAlpha * 0.8})`;
        ctx.fillText(item.text, ix, iy - 8);
        ctx.font = `7px sans-serif`;
        ctx.fillStyle = `rgba(140,130,200,${dotAlpha * 0.5})`;
        ctx.fillText(item.sub, ix, iy + 4);
      });

      // Central 19
      const pulse = Math.sin(time * 1.5) * 0.05 + 1;
      ctx.font = `bold ${Math.floor(Math.min(w, h) * 0.22 * pulse)}px serif`;
      ctx.textAlign = 'center';
      const numGrad = ctx.createLinearGradient(cx, cy - 60, cx, cy + 60);
      numGrad.addColorStop(0, 'rgba(220,200,255,0.9)');
      numGrad.addColorStop(1, 'rgba(140,100,255,0.6)');
      ctx.fillStyle = numGrad;
      ctx.shadowColor = 'rgba(180,140,255,0.5)'; ctx.shadowBlur = 30;
      ctx.fillText('١٩', cx, cy + Math.min(w, h) * 0.08);
      ctx.shadowBlur = 0;

      // Sub-label
      ctx.font = `8px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(140,120,200,0.4)';
      ctx.fillText('عَلَيْهَا تِسْعَةَ عَشَرَ', cx, h * 0.88);

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
          وَمَا جَعَلْنَا أَصْحَابَ النَّارِ إِلَّا مَلَائِكَةً · 
          <span style={{ color: '#bbaaff', textShadow: '0 0 14px rgba(160,140,255,0.7)' }}>وَمَا جَعَلْنَا عِدَّتَهُمْ إِلَّا فِتْنَةً لَّلَّذِينَ كَفَرُوا</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,70,140,0.45)' }}>
          سورة المدثر · الآية ٣٠
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(2,0,8,0.92) 0%, rgba(2,0,8,0.5) 60%, rgba(2,0,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { d: 'M4 7V4h16v3 M9 20h6 M12 4v16', label: '19 حرفًا', sub: 'بسملة' },
            { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5V5a2 2 0 0 1 2-2h14v14 M4 19.5A2.5 2.5 0 0 0 6.5 22H20', label: '114 = 19×6', sub: 'سورة' },
            { d: 'M12 3v18 M3 12h18 M6 6l12 12 M18 6 6 18', label: 'عدد أولي', sub: 'prime' },
            { d: 'M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 2a10 10 0 0 1 8.7 5 M3.3 17A10 10 0 0 1 12 2 M20.7 17A10 10 0 0 1 5 21', label: 'Rashad 1974', sub: 'اكتشاف' },
          ].map(({ d, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(8,4,20,0.1)', border: '1px solid rgba(100,80,200,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="rgba(200,180,255,0.92)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d={d} />
              </svg>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(200,180,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,100,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
