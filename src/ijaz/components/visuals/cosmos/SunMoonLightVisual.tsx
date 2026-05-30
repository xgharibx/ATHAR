
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function SunMoonLightVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const stars = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), size: Math.random() * 1.2 + 0.2, phase: Math.random() * Math.PI * 2 }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const midX = w * 0.5;

      const sunSkyGrad = ctx.createLinearGradient(0, 0, midX, 0);
      sunSkyGrad.addColorStop(0, '#0d0600'); sunSkyGrad.addColorStop(1, '#1a0e00');
      ctx.fillStyle = sunSkyGrad; ctx.fillRect(0, 0, midX, h);

      const moonSkyGrad = ctx.createLinearGradient(midX, 0, w, 0);
      moonSkyGrad.addColorStop(0, '#050510'); moonSkyGrad.addColorStop(1, '#000510');
      ctx.fillStyle = moonSkyGrad; ctx.fillRect(midX, 0, midX, h);

      stars.forEach(s => {
        if (s.x < 0.5) return;
        const a = Math.sin(time * 0.4 + s.phase) * 0.08 + 0.25;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${a})`; ctx.fill();
      });

      const sunX = w * 0.27, sunY = h * 0.4;
      const sunR = Math.min(w, h) * 0.12;

      for (let r = 0; r < 12; r++) {
        const rayA = (r / 12) * Math.PI * 2 + time * 0.3;
        const rayLen = sunR * (1.5 + Math.sin(time * 3 + r * 0.6) * 0.3);
        const rayGrad = ctx.createLinearGradient(
          sunX + Math.cos(rayA) * sunR, sunY + Math.sin(rayA) * sunR,
          sunX + Math.cos(rayA) * rayLen, sunY + Math.sin(rayA) * rayLen
        );
        rayGrad.addColorStop(0, 'rgba(255,220,80,0.3)'); rayGrad.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.strokeStyle = rayGrad; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sunX + Math.cos(rayA) * sunR, sunY + Math.sin(rayA) * sunR);
        ctx.lineTo(sunX + Math.cos(rayA) * rayLen, sunY + Math.sin(rayA) * rayLen); ctx.stroke();
      }
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 1.5);
      sunGrad.addColorStop(0, 'rgba(255,250,200,0.95)'); sunGrad.addColorStop(0.3, 'rgba(255,200,80,0.7)');
      sunGrad.addColorStop(0.7, 'rgba(220,120,20,0.2)'); sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad; ctx.fillRect(0, 0, midX, h);
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,250,220,0.95)'; ctx.fill();
      ctx.font = `bold 14px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,200,80,0.7)'; ctx.shadowColor = 'rgba(255,160,40,0.4)'; ctx.shadowBlur = 12;
      ctx.fillText('ضِيَاءً', sunX, sunY + sunR * 0.55 + 18); ctx.shadowBlur = 0;

      const moonX = w * 0.73, moonY = h * 0.4;
      const moonR = Math.min(w, h) * 0.1;

      const moonGrad = ctx.createRadialGradient(moonX - moonR * 0.2, moonY - moonR * 0.2, 0, moonX, moonY, moonR);
      moonGrad.addColorStop(0, 'rgba(220,220,240,0.7)'); moonGrad.addColorStop(0.6, 'rgba(160,165,200,0.4)'); moonGrad.addColorStop(1, 'rgba(80,85,130,0.1)');
      ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fillStyle = moonGrad; ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + moonR * 0.4, moonY, moonR * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,2,10,0.7)'; ctx.fill();
      const moonGlow2 = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 1.6);
      moonGlow2.addColorStop(0, 'rgba(180,185,220,0.1)'); moonGlow2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = moonGlow2; ctx.fillRect(midX, 0, midX, h);
      ctx.font = `bold 14px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,190,240,0.65)'; ctx.shadowColor = 'rgba(140,160,220,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('نُورًا', moonX, moonY + moonR * 0.55 + 18); ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(140,130,200,0.12)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(midX, 0); ctx.lineTo(midX, h); ctx.stroke(); ctx.setLineDash([]);

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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#07050a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(7,5,10,0.9) 0%, rgba(7,5,10,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(220,210,255,0.92)', textShadow: '0 0 18px rgba(160,140,255,0.4)' }}>
          هُوَ الَّذِي جَعَلَ الشَّمْسَ{' '}
          <span style={{ color: '#ffdd88', textShadow: '0 0 14px rgba(255,200,80,0.7)' }}>ضِيَاءً</span>
          {' '}وَالْقَمَرَ{' '}
          <span style={{ color: '#aabbff', textShadow: '0 0 14px rgba(150,180,255,0.7)' }}>نُورًا</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,50,100,0.45)' }}>سورة يونس · الآية ٥</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(7,5,10,0.92) 0%, rgba(7,5,10,0.5) 60%, rgba(7,5,10,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '☀️', label: 'ضياء = مصدر', sub: 'emitter' },
            { icon: '🌕', label: 'نور = عاكس', sub: 'reflector' },
            { icon: '💬', label: 'فرق دلالي', sub: '7th century' },
            { icon: '🔭', label: 'spectroscopy', sub: '1859 CE' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(10,8,20,0.1)', border: '1px solid rgba(100,80,160,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(220,210,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(130,110,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
