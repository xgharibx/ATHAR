
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function CamelAdaptationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Sand dunes
    const dunePoints: [number, number][] = [];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // Desert sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      skyGrad.addColorStop(0, '#0d0800'); skyGrad.addColorStop(0.5, '#1a1000'); skyGrad.addColorStop(1, '#2a1800');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h * 0.55);

      // Stars in sky
      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 47.3) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 31.7) * 0.5 + 0.5) * h * 0.45;
        const sa = Math.sin(time * 0.5 + i * 0.4) * 0.1 + 0.2;
        ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,230,180,${sa})`; ctx.fill();
      }

      // Sand
      const sandGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
      sandGrad.addColorStop(0, '#2a1800'); sandGrad.addColorStop(0.3, '#3a2008'); sandGrad.addColorStop(1, '#1a0e00');
      ctx.fillStyle = sandGrad; ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Dune waves
      for (let d = 0; d < 3; d++) {
        const dY = h * (0.55 + d * 0.12);
        ctx.strokeStyle = `rgba(80,50,10,${0.2 - d * 0.05})`; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 5) {
          const dy = dY + Math.sin(x * 0.015 + time * 0.2 + d) * 8;
          x === 0 ? ctx.moveTo(x, dy) : ctx.lineTo(x, dy);
        }
        ctx.stroke();
      }

      // ── Camel silhouette ────────────────────────────────────────────
      const camX = w * 0.42 + Math.sin(time * 0.15) * w * 0.02;
      const camY = h * 0.54;
      const sc = Math.min(w, h) * 0.0025;
      ctx.fillStyle = 'rgba(80,50,15,0.55)';
      ctx.strokeStyle = 'rgba(100,65,20,0.3)'; ctx.lineWidth = 1;
      // Body
      ctx.beginPath(); ctx.ellipse(camX, camY, 55 * sc * 10, 28 * sc * 10, 0.05, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Hump
      ctx.beginPath(); ctx.ellipse(camX + 8 * sc * 10, camY - 32 * sc * 10, 22 * sc * 10, 20 * sc * 10, -0.2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Neck
      ctx.beginPath();
      ctx.moveTo(camX + 30 * sc * 10, camY - 18 * sc * 10);
      ctx.quadraticCurveTo(camX + 55 * sc * 10, camY - 30 * sc * 10, camX + 60 * sc * 10, camY - 48 * sc * 10);
      ctx.lineWidth = 14 * sc * 10; ctx.strokeStyle = 'rgba(80,50,15,0.55)'; ctx.stroke();
      // Head
      ctx.beginPath(); ctx.ellipse(camX + 62 * sc * 10, camY - 52 * sc * 10, 12 * sc * 10, 9 * sc * 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      for (let l = 0; l < 4; l++) {
        const lx = camX - 35 * sc * 10 + l * 22 * sc * 10;
        const legWave = l < 2 ? Math.sin(time * 1.2) * 5 * sc * 10 : -Math.sin(time * 1.2) * 5 * sc * 10;
        ctx.strokeStyle = 'rgba(80,50,15,0.5)'; ctx.lineWidth = 7 * sc * 10;
        ctx.beginPath(); ctx.moveTo(lx, camY + 22 * sc * 10); ctx.lineTo(lx + legWave, camY + 52 * sc * 10); ctx.stroke();
      }

      // Temperature readout
      const tempPulse = Math.sin(time * 2) * 0.1 + 0.4;
      ctx.font = `8px monospace`; ctx.textAlign = 'right';
      ctx.fillStyle = `rgba(255,160,60,${tempPulse})`;
      ctx.fillText('~40 C', w * 0.97, h * 0.15);
      ctx.fillText('body temp', w * 0.97, h * 0.2);

      // Hump water label
      ctx.font = `7px sans-serif`; ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(180,140,80,0.3)`;
      ctx.fillText('دهون = طاقة', w * 0.04, h * 0.3);
      ctx.fillText('not water!', w * 0.04, h * 0.36);

      // main label
      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,160,80,0.45)'; ctx.shadowColor = 'rgba(160,120,40,0.2)'; ctx.shadowBlur = 8;
      ctx.fillText('أَفَلَا يَنظُرُونَ إِلَى الْإِبِلِ كَيْفَ خُلِقَتْ', w * 0.5, h * 0.95);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#0d0800' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(13,8,0,0.9) 0%, rgba(13,8,0,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(220,180,120,0.92)', textShadow: '0 0 18px rgba(160,120,60,0.4)' }}>
          أَفَلَا يَنظُرُونَ إِلَى{' '}
          <span style={{ color: '#ffcc88', textShadow: '0 0 14px rgba(200,160,80,0.7)' }}>الْإِبِلِ كَيْفَ خُلِقَتْ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,60,20,0.45)' }}>سورة الغاشية · الآية ١٧</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(13,8,0,0.92) 0%, rgba(13,8,0,0.5) 60%, rgba(13,8,0,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🐪', label: '8 تكيفات', sub: 'دم/كلى/جلد' },
            { icon: '👻', label: 'دهون ليس ماء', sub: 'hump = fat store' },
            { icon: '🌡️', label: '+/- 6 C', sub: 'temp tolerance' },
            { icon: '💧', label: 'يدخر 150L', sub: 'بول مركز' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(20,10,0,0.1)', border: '1px solid rgba(120,80,20,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(220,180,100,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(140,100,40,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
