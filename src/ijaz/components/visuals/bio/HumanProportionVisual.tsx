
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🧑 لَقَدْ خَلَقْنَا الْإِنسَانَ فِي أَحْسَنِ تَقْوِيمٍ — Human Proportion
// At-Tin 95:4 — We created man in the best of form
// Golden ratio φ=1.618 in human body proportions

export default function HumanProportionVisual({ className }: MiracleVisualProps) {
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
      const cx = w * 0.5, cy = h * 0.5;
      const figH = Math.min(h * 0.72, w * 0.7);
      const figW = figH * 0.38;

      ctx.fillStyle = '#06030a'; ctx.fillRect(0, 0, w, h);

      // Soft radial glow behind figure
      const figGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, figH * 0.6);
      figGlow.addColorStop(0, 'rgba(160,100,200,0.04)');
      figGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = figGlow; ctx.fillRect(0, 0, w, h);

      // ── Human silhouette ──────────────────────────────────────
      const figAlpha = Math.sin(time * 1.2) * 0.04 + 0.18;
      const figY = cy - figH * 0.45;
      // Head
      const headR = figH * 0.1;
      ctx.beginPath(); ctx.arc(cx, figY + headR, headR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,160,255,${figAlpha * 3})`; ctx.fill();
      ctx.strokeStyle = `rgba(180,130,220,${figAlpha * 2})`; ctx.lineWidth = 1;
      ctx.stroke();
      // Body
      const bodyTop = figY + headR * 2;
      ctx.beginPath();
      ctx.moveTo(cx - figW * 0.25, bodyTop);
      ctx.lineTo(cx - figW * 0.5, bodyTop + figH * 0.35);
      ctx.lineTo(cx - figW * 0.3, bodyTop + figH * 0.6);
      ctx.lineTo(cx + figW * 0.3, bodyTop + figH * 0.6);
      ctx.lineTo(cx + figW * 0.5, bodyTop + figH * 0.35);
      ctx.lineTo(cx + figW * 0.25, bodyTop);
      ctx.closePath();
      ctx.fillStyle = `rgba(160,110,200,${figAlpha * 2.5})`; ctx.fill();
      ctx.strokeStyle = `rgba(180,130,220,${figAlpha * 1.5})`; ctx.lineWidth = 0.8; ctx.stroke();
      // Legs
      ctx.beginPath();
      ctx.moveTo(cx - figW * 0.3, bodyTop + figH * 0.6);
      ctx.lineTo(cx - figW * 0.35, bodyTop + figH);
      ctx.lineTo(cx - figW * 0.1, bodyTop + figH);
      ctx.lineTo(cx - figW * 0.05, bodyTop + figH * 0.6);
      ctx.closePath();
      ctx.fillStyle = `rgba(150,100,190,${figAlpha * 2})`; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + figW * 0.3, bodyTop + figH * 0.6);
      ctx.lineTo(cx + figW * 0.35, bodyTop + figH);
      ctx.lineTo(cx + figW * 0.1, bodyTop + figH);
      ctx.lineTo(cx + figW * 0.05, bodyTop + figH * 0.6);
      ctx.closePath();
      ctx.fillStyle = `rgba(150,100,190,${figAlpha * 2})`; ctx.fill();

      // ── Golden ratio lines ─────────────────────────────────
      const phi = 1.618;
      const feetY = bodyTop + figH;
      const totalH = feetY - figY;
      // Navel divides body in golden ratio
      const navelY = feetY - totalH / phi;
      ctx.strokeStyle = `rgba(255,220,100,${0.25 + Math.sin(time * 2) * 0.08})`; ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cx - figW * 0.6, navelY); ctx.lineTo(cx + figW * 0.6, navelY); ctx.stroke();
      ctx.setLineDash([]);
      // Phi label
      ctx.font = `7px monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(255,220,100,0.4)`;
      ctx.fillText('φ = 1.618', cx + figW * 0.65, navelY + 4);

      // Arm span = height lines
      const armY = bodyTop + figH * 0.18;
      ctx.strokeStyle = `rgba(100,200,255,0.2)`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx - figW * 1.4, armY); ctx.lineTo(cx + figW * 1.4, armY); ctx.stroke();
      ctx.font = `6px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100,200,255,0.3)';
      ctx.fillText('بسط اليدين = الطول', cx, armY - 5);

      // Fibonacci spiral hint
      let spR = 8; let spX = cx + figW * 0.1, spY = navelY;
      ctx.strokeStyle = `rgba(200,150,255,0.15)`; ctx.lineWidth = 0.6;
      for (let i = 0; i < 6; i++) {
        const startA = (i % 4) * (Math.PI / 2);
        ctx.beginPath(); ctx.arc(spX, spY, spR, startA, startA + Math.PI / 2); ctx.stroke();
        spX += Math.cos(startA + Math.PI / 2) * spR;
        spY += Math.sin(startA + Math.PI / 2) * spR;
        spR *= phi * 0.7;
      }

      // أحسن تقويم label
      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,160,255,0.5)'; ctx.shadowColor = 'rgba(160,100,255,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('أَحْسَنِ تَقْوِيمٍ', w * 0.5, h * 0.95);
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
      style={{ background: '#06030a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(6,3,10,0.9) 0%, rgba(6,3,10,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(210,180,255,0.92)', textShadow: '0 0 18px rgba(160,100,255,0.4)' }}>
          لَقَدْ خَلَقْنَا الْإِنسَانَ{' '}
          <span style={{ color: '#ddaaff', textShadow: '0 0 14px rgba(200,140,255,0.7)' }}>فِي أَحْسَنِ تَقْوِيمٍ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,50,120,0.45)' }}>
          سورة التين · الآية ٤
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(6,3,10,0.92) 0%, rgba(6,3,10,0.5) 60%, rgba(6,3,10,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🥇', label: 'φ = 1.618', sub: 'نسبة ذهبية' },
            { icon: '🧑', label: 'طول = بسط', sub: 'Vitruvian' },
            { icon: '🌀', label: 'دوامة فيبوناتشي', sub: 'في الجسم' },
            { icon: '🔢', label: 'نسب جسد', sub: 'ratios' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(15,5,25,0.1)', border: '1px solid rgba(100,60,160,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(210,180,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(130,90,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
