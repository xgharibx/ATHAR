import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 📖 إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ — Quran Preservation (الحجر 9)
// ULTIMATE: a central radiant Quran emits Arabic-letter rain and is wrapped in a
// pulsing protective dome (لَحَافِظُونَ). Four ancient manuscripts orbit it and fire
// verification beams that confirm "= مطابق" (100% match) one after another.

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
      { name: 'Birmingham', date: '568–645م', ang: -Math.PI * 0.75 },
      { name: 'Sana\'a', date: '7th c.', ang: -Math.PI * 0.25 },
      { name: 'Topkapi', date: '8th c.', ang: Math.PI * 0.25 },
      { name: 'Samarkand', date: '8th c.', ang: Math.PI * 0.75 },
    ];

    const arabicChars = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
    type Drop = { x: number; y: number; char: string; alpha: number; speed: number; size: number };
    const drops: Drop[] = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      char: arabicChars[Math.floor(Math.random() * arabicChars.length)],
      alpha: Math.random() * 0.18 + 0.04,
      speed: 0.0008 + Math.random() * 0.0014,
      size: 8 + Math.random() * 6,
    }));

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5, cy = h * 0.46;

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.7);
      bg.addColorStop(0, '#0a0814');
      bg.addColorStop(1, '#030206');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Arabic letter rain
      drops.forEach((p) => {
        p.y += p.speed; if (p.y > 1) { p.y = -0.05; p.x = Math.random(); }
        ctx.font = `${p.size + Math.sin(time + p.x * 10) * 1.5}px serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(190,170,235,${p.alpha})`;
        ctx.fillText(p.char, p.x * w, p.y * h);
      });

      const orbit = Math.min(w, h) * 0.3;

      // Verification beams (sequential)
      mss.forEach((ms, i) => {
        const mx = cx + Math.cos(ms.ang) * orbit;
        const my = cy + Math.sin(ms.ang) * orbit * 0.85;
        const active = (Math.sin(time * 1.2 - i * 1.4) * 0.5 + 0.5);
        // beam
        ctx.strokeStyle = `rgba(120,220,150,${0.12 + active * 0.4})`;
        ctx.lineWidth = 1 + active * 1.2;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -(time * 40 % 10);
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.setLineDash([]);
        // traveling verify pulse
        const tp = (time * 0.5 + i * 0.25) % 1;
        const ppx = mx + (cx - mx) * tp, ppy = my + (cy - my) * tp;
        ctx.beginPath(); ctx.arc(ppx, ppy, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150,255,180,${0.7})`; ctx.fill();

        // manuscript card
        ctx.save();
        ctx.translate(mx, my);
        const cardW = Math.min(w, h) * 0.16, cardH = cardW * 0.66;
        ctx.fillStyle = 'rgba(60,50,90,0.55)';
        ctx.strokeStyle = `rgba(160,140,220,${0.5 + active * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: number[]) => void }).roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 4);
        ctx.fill(); ctx.stroke();
        // manuscript text lines
        ctx.strokeStyle = 'rgba(200,185,255,0.35)';
        ctx.lineWidth = 0.6;
        for (let l = 0; l < 4; l++) {
          const ly = -cardH / 2 + 6 + l * (cardH - 12) / 4;
          ctx.beginPath();
          ctx.moveTo(-cardW / 2 + 5, ly);
          ctx.lineTo(cardW / 2 - 5 - (l % 2) * 6, ly);
          ctx.stroke();
        }
        ctx.restore();
        // labels
        ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(205,190,255,0.9)';
        ctx.fillText(ms.name, mx, my + cardH * 0.5 + 12);
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(140,120,200,0.7)';
        ctx.fillText(ms.date, mx, my + cardH * 0.5 + 22);
        if (active > 0.7) {
          ctx.font = 'bold 7px sans-serif';
          ctx.fillStyle = 'rgba(140,240,170,0.9)';
          ctx.fillText('✓ مطابق', mx, my - cardH * 0.5 - 6);
        }
      });

      // Protective dome (لَحَافِظُونَ)
      const domePulse = Math.sin(time * 1.6) * 0.12 + 0.5;
      for (let d = 0; d < 3; d++) {
        ctx.beginPath();
        ctx.arc(cx, cy, orbit * (0.62 + d * 0.07), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150,200,255,${(0.18 - d * 0.04) * domePulse + 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Central radiant Quran
      const bookGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbit * 0.5);
      bookGlow.addColorStop(0, `rgba(255,225,140,${0.4 + domePulse * 0.2})`);
      bookGlow.addColorStop(0.5, 'rgba(212,168,83,0.15)');
      bookGlow.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.beginPath(); ctx.arc(cx, cy, orbit * 0.5, 0, Math.PI * 2); ctx.fillStyle = bookGlow; ctx.fill();

      // open book shape
      const bw = Math.min(w, h) * 0.2, bh = bw * 0.62;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(245,235,205,0.95)';
      ctx.strokeStyle = 'rgba(212,168,83,0.9)';
      ctx.lineWidth = 1.4;
      // left page
      ctx.beginPath();
      ctx.moveTo(0, -bh * 0.46);
      ctx.quadraticCurveTo(-bw * 0.5, -bh * 0.5, -bw * 0.5, -bh * 0.3);
      ctx.lineTo(-bw * 0.5, bh * 0.42);
      ctx.quadraticCurveTo(-bw * 0.5, bh * 0.5, 0, bh * 0.46);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // right page
      ctx.beginPath();
      ctx.moveTo(0, -bh * 0.46);
      ctx.quadraticCurveTo(bw * 0.5, -bh * 0.5, bw * 0.5, -bh * 0.3);
      ctx.lineTo(bw * 0.5, bh * 0.42);
      ctx.quadraticCurveTo(bw * 0.5, bh * 0.5, 0, bh * 0.46);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // text lines
      ctx.strokeStyle = 'rgba(120,90,40,0.4)'; ctx.lineWidth = 0.7;
      for (let l = 0; l < 5; l++) {
        const ly = -bh * 0.3 + l * bh * 0.15;
        ctx.beginPath(); ctx.moveTo(-bw * 0.42, ly); ctx.lineTo(-bw * 0.08, ly); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bw * 0.08, ly); ctx.lineTo(bw * 0.42, ly); ctx.stroke();
      }
      ctx.restore();

      // verse label
      ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(190,170,235,0.5)';
      ctx.shadowColor = 'rgba(140,120,200,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('وَإِنَّا لَهُ لَحَافِظُونَ', w * 0.5, h * 0.92);
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
          إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ{' '}
          <span style={{ color: '#bbaaff', textShadow: '0 0 14px rgba(180,150,255,0.7)' }}>وَإِنَّا لَهُ لَحَافِظُونَ</span>
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
