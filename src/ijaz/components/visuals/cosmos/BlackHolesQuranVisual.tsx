
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚫ BlackHoles
// At-Takwir 81:15-16 — فَلَا أُقْسِمُ بِالخُنَّسِ الجَوَارِ الكُنَّسِ
// Recede (khanasa) + run (jawari) + hide (kunnas) = black hole behavior

export default function BlackHolesQuranVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Stars being pulled in
    type Star = { angle: number; dist: number; speed: number; size: number; alpha: number };
    const stars: Star[] = Array.from({ length: 120 }, (_, i) => ({
      angle: (i / 120) * Math.PI * 2 + Math.random() * 0.3,
      dist: 0.12 + Math.random() * 0.35,
      speed: 0.002 + Math.random() * 0.004,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
    }));

    // Background stars
    const bgStars = Array.from({ length: 200 }, () => ({ x: Math.random(), y: Math.random(), size: Math.random() * 1.2 + 0.2, phase: Math.random() * Math.PI * 2 }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5, cy = h * 0.46;
      const bhR = Math.min(w, h) * 0.12;

      ctx.fillStyle = '#010003'; ctx.fillRect(0, 0, w, h);

      // Background stars
      bgStars.forEach(s => {
        const a = Math.sin(time * 0.3 + s.phase) * 0.1 + 0.3;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${a})`; ctx.fill();
      });

      // Accretion disk (rotating ellipse glow)
      [-0.15, -0.08, 0, 0.08, 0.15].forEach((off, idx) => {
        const diskGrad = ctx.createLinearGradient(cx - bhR * 2.5, cy, cx + bhR * 2.5, cy);
        diskGrad.addColorStop(0, 'rgba(0,0,0,0)');
        diskGrad.addColorStop(0.2, `rgba(255,150,30,0.05)`);
        diskGrad.addColorStop(0.45, `rgba(255,200,80,${0.2 - Math.abs(off)})`);
        diskGrad.addColorStop(0.55, `rgba(255,200,80,${0.2 - Math.abs(off)})`);
        diskGrad.addColorStop(0.8, `rgba(255,150,30,0.05)`);
        diskGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 0.3);
        ctx.fillStyle = diskGrad;
        ctx.fillRect(-bhR * 2.5, off * bhR - 3, bhR * 5, 6); ctx.restore();
      });

      // Gravitational lensing ring
      ctx.strokeStyle = 'rgba(255,200,80,0.12)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, bhR * 1.6, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,80,0.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, bhR * 2.1, 0, Math.PI * 2); ctx.stroke();

      // Stars spiraling inward
      stars.forEach(s => {
        s.angle += s.speed * (1 + (0.25 - s.dist) * 8);
        s.dist -= 0.0003;
        if (s.dist < 0.04) { s.dist = 0.15 + Math.random() * 0.25; s.angle = Math.random() * Math.PI * 2; }
        const sx = cx + Math.cos(s.angle) * s.dist * Math.min(w, h);
        const sy = cy + Math.sin(s.angle) * s.dist * Math.min(w, h) * 0.75;
        const distFade = Math.min(1, (s.dist - 0.04) / 0.06);
        ctx.beginPath(); ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,230,200,${s.alpha * distFade})`; ctx.fill();
      });

      // Black hole core (photon sphere)
      const phGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bhR * 1.4);
      phGrad.addColorStop(0, 'rgba(0,0,0,1)');
      phGrad.addColorStop(0.7, 'rgba(0,0,0,0.97)');
      phGrad.addColorStop(0.88, 'rgba(20,10,5,0.6)');
      phGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = phGrad; ctx.fillRect(0, 0, w, h);

      // الخنَّس label
      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,160,255,0.5)'; ctx.shadowColor = 'rgba(140,100,255,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('الخُنَّس · الجَوَارِ · الكُنَّس', w * 0.5, h * 0.91);
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
      style={{ background: '#010003' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,3,0.9) 0%, rgba(1,0,3,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(200,190,255,0.92)', textShadow: '0 0 18px rgba(140,100,255,0.4)' }}>
          فَلَا أُقْسِمُ{' '}
          <span style={{ color: '#ccbbff', textShadow: '0 0 14px rgba(180,140,255,0.7)' }}>بِالخُنَّسِ الجَوَارِ الكُنَّسِ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,40,100,0.45)' }}>
          سورة التكوير · الآية ١٥–١٦
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,3,0.92) 0%, rgba(1,0,3,0.5) 60%, rgba(1,0,3,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚫', label: 'خنس = يتقهقر', sub: 'recede' },
            { icon: '🌀', label: 'جوار = تجري', sub: 'orbit' },
            { icon: '🕳️', label: 'كنس = تختفي', sub: 'hide' },
            { icon: '🔭', label: 'EHT 2019', sub: 'first image' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(5,3,15,0.1)', border: '1px solid rgba(80,60,160,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
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
