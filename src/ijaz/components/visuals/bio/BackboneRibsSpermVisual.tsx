
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function BackboneRibsSpermVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5;

      ctx.fillStyle = '#04080c'; ctx.fillRect(0, 0, w, h);

      // Soft glow center
      const cGlow = ctx.createRadialGradient(cx, h * 0.45, 0, cx, h * 0.45, Math.min(w, h) * 0.4);
      cGlow.addColorStop(0, 'rgba(60,100,140,0.06)'); cGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGlow; ctx.fillRect(0, 0, w, h);

      // ── Spine (vertebral column) center ─────────────────────────────
      const spineTop = h * 0.15, spineBot = h * 0.78;
      const vertebrae = 24;
      const vertebraH = (spineBot - spineTop) / vertebrae;

      for (let v = 0; v < vertebrae; v++) {
        const vy = spineTop + v * vertebraH;
        const vw = 12 + Math.sin(v * 0.5) * 4;
        const active = Math.floor(time * 2) % vertebrae === v;
        const alpha = active ? 0.45 : 0.2;
        ctx.fillStyle = `rgba(100,160,200,${alpha})`;
        ctx.fillRect(cx - vw / 2, vy + 1, vw, vertebraH - 2);
        ctx.strokeStyle = `rgba(80,140,180,${alpha * 0.6})`; ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - vw / 2, vy + 1, vw, vertebraH - 2);
        // Rib attachment points
        if (v >= 3 && v <= 14) {
          const ribLen = 18 + (v - 3) * 2.5 - Math.abs(v - 8.5) * 2;
          const ribAlpha = active ? 0.4 : 0.15;
          ctx.strokeStyle = `rgba(80,140,180,${ribAlpha})`; ctx.lineWidth = 1;
          // Left rib
          ctx.beginPath(); ctx.moveTo(cx - vw / 2, vy + vertebraH / 2);
          ctx.quadraticCurveTo(cx - vw / 2 - ribLen * 0.5, vy + vertebraH * 0.2, cx - vw / 2 - ribLen, vy + vertebraH);
          ctx.stroke();
          // Right rib  
          ctx.beginPath(); ctx.moveTo(cx + vw / 2, vy + vertebraH / 2);
          ctx.quadraticCurveTo(cx + vw / 2 + ribLen * 0.5, vy + vertebraH * 0.2, cx + vw / 2 + ribLen, vy + vertebraH);
          ctx.stroke();
        }
      }

      // Labels
      ctx.font = `7px sans-serif`; ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(80,140,180,0.3)';
      ctx.fillText('الصلب + الترائب', cx - 8, spineTop + (spineBot - spineTop) * 0.4);

      // Sperm origin label at sacrum
      ctx.font = `bold 8px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(100,180,220,${0.35 + Math.sin(time * 2) * 0.1})`;
      ctx.fillText('من بَيْنِ الصُّلْبِ وَالتَّرَائِبِ', cx, spineBot + 18);

      // Sperm cell showing origin from spine area
      const spermX = cx + Math.sin(time * 1.2) * w * 0.1;
      const spermY = spineBot - 30 + Math.cos(time * 0.8) * 10;
      ctx.beginPath(); ctx.ellipse(spermX, spermY, 5, 4, time * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,200,200,0.3)`; ctx.fill();
      ctx.strokeStyle = 'rgba(80,180,180,0.15)'; ctx.lineWidth = 0.8;
      for (let t = 1; t <= 4; t++) {
        ctx.beginPath(); ctx.moveTo(spermX + Math.cos(time * 0.5) * 5, spermY);
        ctx.lineTo(spermX + Math.cos(time * 0.5) * 5 - 14 * t / 4, spermY + Math.sin(time + t) * 3);
        ctx.stroke();
      }

      // main label
      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100,160,200,0.45)'; ctx.shadowColor = 'rgba(60,120,180,0.2)'; ctx.shadowBlur = 8;
      ctx.fillText('يَخْرُجُ مِن بَيْنِ الصُّلْبِ وَالتَّرَائِبِ', w * 0.5, h * 0.92);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#04080c' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(4,8,12,0.9) 0%, rgba(4,8,12,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(160,200,240,0.92)', textShadow: '0 0 18px rgba(80,140,200,0.4)' }}>
          يَخْرُجُ{' '}
          <span style={{ color: '#88ccff', textShadow: '0 0 14px rgba(100,180,255,0.7)' }}>مِن بَيْنِ الصُّلْبِ وَالتَّرَائِبِ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(40,80,120,0.45)' }}>سورة الطارق · الآية ٧</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(4,8,12,0.92) 0%, rgba(4,8,12,0.5) 60%, rgba(4,8,12,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🦴', label: 'صلب = vertebra', sub: 'عظم الظهر' },
            { icon: '🧲', label: 'ترائب = ribs', sub: 'sacrum area' },
            { icon: '🧬', label: 'sperm origin', sub: 'testes near spine' },
            { icon: '🔬', label: 'anatomy 1543', sub: 'Vesalius' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(5,10,18,0.1)', border: '1px solid rgba(40,80,130,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(140,190,230,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(70,120,170,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
