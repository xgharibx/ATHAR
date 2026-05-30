
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚙️ وَأَنزَلْنَا الْحَدِيدَ فِيهِ بَأْسٌ شَدِيدٌ — Iron Sent Down from Stars
// Al-Hadid 57:25 — iron "sent down" — forged in supernovae
// Nuclear physics: only supernovae can forge Fe-56 — cannot form on Earth

export default function IronFromStarsVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Supernova explosion phases
    let phase: 'star' | 'collapse' | 'explosion' | 'rain' = 'star';
    let phaseTime = 0;

    // Iron atoms falling
    type IronAtom = { x: number; y: number; vy: number; alpha: number; spin: number };
    const ironAtoms: IronAtom[] = [];

    // Explosion particles
    type ExpPt = { x: number; y: number; vx: number; vy: number; alpha: number; color: string };
    const expPts: ExpPt[] = [];

    const draw = () => {
      time += 0.007;
      phaseTime += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      const starX = w * 0.5, starY = h * 0.38;

      ctx.fillStyle = '#020004'; ctx.fillRect(0, 0, w, h);

      // Background stars
      for (let i = 0; i < 200; i++) {
        const sx = (Math.sin(i * 47.3) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 31.7) * 0.5 + 0.5) * h * 0.8;
        const alpha = Math.sin(time * 0.5 + i) * 0.1 + 0.2;
        ctx.beginPath(); ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,200,255,${alpha})`; ctx.fill();
      }

      // Phase cycling: 4s star, 1s collapse, 3s explosion, 4s rain
      if (phase === 'star' && phaseTime > 4) { phase = 'collapse'; phaseTime = 0; }
      else if (phase === 'collapse' && phaseTime > 1.2) {
        phase = 'explosion'; phaseTime = 0;
        expPts.length = 0;
        for (let i = 0; i < 120; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = Math.random() * 4 + 1;
          expPts.push({ x: starX, y: starY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, alpha: 1, color: Math.random() < 0.5 ? 'rgba(255,200,80,' : 'rgba(200,100,255,' });
        }
      }
      else if (phase === 'explosion' && phaseTime > 3) { phase = 'rain'; phaseTime = 0; ironAtoms.length = 0; }
      else if (phase === 'rain' && phaseTime > 5) { phase = 'star'; phaseTime = 0; }

      // ── Draw based on phase ───────────────────────────────────
      if (phase === 'star') {
        const pulse = Math.sin(time * 1.5) * 0.08 + 1;
        const starR = Math.min(w, h) * 0.1 * pulse;
        const sGrad = ctx.createRadialGradient(starX, starY, 0, starX, starY, starR);
        sGrad.addColorStop(0, 'rgba(255,240,200,0.95)');
        sGrad.addColorStop(0.3, 'rgba(255,180,80,0.7)');
        sGrad.addColorStop(0.7, 'rgba(200,100,30,0.3)');
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad; ctx.fillRect(0, 0, w, h);
        ctx.beginPath(); ctx.arc(starX, starY, starR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.fill();
        ctx.font = `9px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,220,150,0.4)';
        ctx.fillText('نجم عملاق — Fe-56 يتراكم', starX, starY + starR * 0.55);
      } else if (phase === 'collapse') {
        const progress = phaseTime / 1.2;
        const starR = Math.min(w, h) * 0.1 * (1 - progress * 0.7);
        const sGrad = ctx.createRadialGradient(starX, starY, 0, starX, starY, starR);
        sGrad.addColorStop(0, `rgba(255,100,50,${0.8 + progress * 0.2})`);
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad; ctx.fillRect(0, 0, w, h);
        ctx.beginPath(); ctx.arc(starX, starY, starR * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,100,${0.8 + progress * 0.2})`; ctx.fill();
        ctx.font = `9px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,150,80,0.5)';
        ctx.fillText('انهيار — supernova', starX, starY + 60);
      } else if (phase === 'explosion') {
        expPts.forEach((p) => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.alpha -= 0.008;
          if (p.alpha <= 0) return;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color + p.alpha + ')'; ctx.fill();
        });
        ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,200,100,0.6)'; ctx.shadowColor = 'rgba(255,150,50,0.4)'; ctx.shadowBlur = 15;
        ctx.fillText('أُنزل الحديد', starX, starY);
        ctx.shadowBlur = 0;
      } else if (phase === 'rain') {
        if (ironAtoms.length < 40 && Math.random() < 0.4) {
          ironAtoms.push({ x: Math.random() * w, y: -10, vy: Math.random() * 2 + 1, alpha: 0.8, spin: Math.random() * Math.PI * 2 });
        }
        ironAtoms.forEach((a) => {
          a.y += a.vy; a.spin += 0.05;
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.spin);
          ctx.fillStyle = `rgba(180,140,100,${a.alpha})`;
          ctx.fillRect(-5, -5, 10, 10); // Iron cube symbol
          ctx.strokeStyle = `rgba(220,180,120,${a.alpha * 0.6})`; ctx.lineWidth = 0.5; ctx.strokeRect(-5, -5, 10, 10);
          ctx.restore();
          ctx.font = `6px monospace`; ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(200,160,100,${a.alpha * 0.6})`;
          ctx.fillText('Fe', a.x, a.y + 4);
        });
        ironAtoms.forEach((a, i) => { if (a.y > h + 10) ironAtoms.splice(i, 1); });
        // Earth
        const earthGrad = ctx.createRadialGradient(w * 0.5, h * 0.85, 0, w * 0.5, h * 0.85, w * 0.35);
        earthGrad.addColorStop(0, 'rgba(80,60,40,0.7)');
        earthGrad.addColorStop(0.6, 'rgba(60,40,20,0.5)');
        earthGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = earthGrad; ctx.fillRect(0, h * 0.7, w, h * 0.3);
      }

      // Phase label
      const phaseNames = { star: 'نجم عملاق', collapse: 'انهيار', explosion: 'انفجار سوبرنوفا', rain: 'المطر الحديد' };
      ctx.font = `8px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,180,150,0.3)';
      ctx.fillText(phaseNames[phase], w * 0.5, h * 0.9);

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
      style={{ background: '#020004' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(2,0,4,0.9) 0%, rgba(2,0,4,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(230,200,160,0.92)', textShadow: '0 0 18px rgba(200,150,60,0.4)' }}>
          <span style={{ color: '#ffcc66', textShadow: '0 0 14px rgba(255,200,80,0.7)' }}>وَأَنزَلْنَا الْحَدِيدَ</span>
          {' '}فِيهِ بَأْسٌ شَدِيدٌ وَمَنَافِعُ لِلنَّاسِ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(130,100,50,0.45)' }}>
          سورة الحديد · الآية ٢٥
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(2,0,4,0.92) 0%, rgba(2,0,4,0.5) 60%, rgba(2,0,4,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚙️', label: 'Fe-56', sub: 'أثقل عنصر نووي' },
            { icon: '💥', label: 'Supernova', sub: 'مصنع الحديد' },
            { icon: '🌍', label: 'أُنزل = sent down', sub: 'من الفضاء' },
            { icon: '🔭', label: '26 عدد ذري', sub: '26 Surah Hadid' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(30,20,5,0.1)', border: '1px solid rgba(160,120,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(230,200,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(160,130,70,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
