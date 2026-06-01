import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🧑 لَقَدْ خَلَقْنَا الْإِنسَانَ فِي أَحْسَنِ تَقْوِيمٍ — Human Proportion (التين 4)
// ULTIMATE: a Vitruvian-style figure inscribed in a rotating circle + square, with
// golden-ratio division points that sweep into place one by one, a growing φ spiral,
// and animated calipers measuring height = armspan — geometry of perfect form.

export default function HumanProportionVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const phi = 1.618;

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5, cy = h * 0.5;
      const figH = Math.min(h * 0.62, w * 0.78);
      const figW = figH * 0.38;
      const reveal = Math.min(1, time / 3);

      ctx.fillStyle = '#06030a'; ctx.fillRect(0, 0, w, h);

      // glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, figH * 0.75);
      glow.addColorStop(0, 'rgba(160,100,200,0.06)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

      const figY = cy - figH * 0.5;
      const feetY = cy + figH * 0.5;
      const headR = figH * 0.1;

      // Rotating inscribed circle + square (Vitruvian frame)
      const frameR = figH * 0.5;
      ctx.save();
      ctx.translate(cx, cy);
      // circle
      ctx.beginPath();
      ctx.arc(0, 0, frameR, -Math.PI / 2, -Math.PI / 2 + reveal * Math.PI * 2);
      ctx.strokeStyle = `rgba(255,220,100,${0.25 + Math.sin(time * 2) * 0.06})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // square (slowly rotating)
      ctx.rotate(Math.sin(time * 0.2) * 0.05);
      ctx.strokeStyle = `rgba(100,200,255,${0.18 * reveal})`;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-frameR * 0.82, -frameR * 0.82, frameR * 1.64, frameR * 1.64);
      ctx.restore();

      // Figure silhouette
      const figAlpha = Math.sin(time * 1.2) * 0.05 + 0.22;
      ctx.beginPath(); ctx.arc(cx, figY + headR, headR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,160,255,${figAlpha * 2.4})`; ctx.fill();
      ctx.strokeStyle = `rgba(190,140,230,${figAlpha * 2})`; ctx.lineWidth = 1; ctx.stroke();

      const bodyTop = figY + headR * 2;
      ctx.beginPath();
      ctx.moveTo(cx - figW * 0.25, bodyTop);
      ctx.lineTo(cx - figW * 0.5, bodyTop + figH * 0.35);
      ctx.lineTo(cx - figW * 0.3, bodyTop + figH * 0.58);
      ctx.lineTo(cx + figW * 0.3, bodyTop + figH * 0.58);
      ctx.lineTo(cx + figW * 0.5, bodyTop + figH * 0.35);
      ctx.lineTo(cx + figW * 0.25, bodyTop);
      ctx.closePath();
      ctx.fillStyle = `rgba(165,115,205,${figAlpha * 2.2})`; ctx.fill();
      ctx.strokeStyle = `rgba(190,140,230,${figAlpha * 1.4})`; ctx.lineWidth = 0.8; ctx.stroke();

      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sgn * figW * 0.3, bodyTop + figH * 0.58);
        ctx.lineTo(cx + sgn * figW * 0.35, bodyTop + figH * 0.98);
        ctx.lineTo(cx + sgn * figW * 0.1, bodyTop + figH * 0.98);
        ctx.lineTo(cx + sgn * figW * 0.05, bodyTop + figH * 0.58);
        ctx.closePath();
        ctx.fillStyle = `rgba(150,100,190,${figAlpha * 1.8})`; ctx.fill();
      }
      // outstretched arms
      ctx.strokeStyle = `rgba(165,115,205,${figAlpha * 2})`;
      ctx.lineWidth = figW * 0.16;
      ctx.lineCap = 'round';
      const armY = bodyTop + figH * 0.14;
      ctx.beginPath();
      ctx.moveTo(cx - figW * 1.3, armY);
      ctx.lineTo(cx + figW * 1.3, armY);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Golden-ratio division points sweeping in
      const totalH = feetY - figY;
      const divisions = [
        { y: feetY - totalH / phi, label: 'φ السُّرّة', color: '255,220,100' },
        { y: figY + headR * 2, label: 'الكتفان', color: '255,180,120' },
        { y: feetY - totalH / (phi * phi), label: 'φ²', color: '255,200,80' },
      ];
      divisions.forEach((d, i) => {
        const dp = Math.max(0, Math.min(1, (reveal * 3) - i));
        if (dp <= 0) return;
        const lineW = figW * 1.5 * dp;
        ctx.strokeStyle = `rgba(${d.color},${0.3 + Math.sin(time * 2 + i) * 0.1})`;
        ctx.lineWidth = 0.9;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx - lineW, d.y);
        ctx.lineTo(cx + lineW, d.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '8px monospace'; ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(${d.color},${0.6 * dp})`;
        ctx.fillText(d.label, cx + lineW + 4, d.y + 3);
      });

      // φ spiral growing from navel
      const navelY = feetY - totalH / phi;
      let spR = figH * 0.02; let spX = cx + figW * 0.08, spY = navelY;
      const spiralSteps = Math.floor(reveal * 7);
      ctx.strokeStyle = 'rgba(210,160,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < spiralSteps; i++) {
        const startA = (i % 4) * (Math.PI / 2);
        ctx.beginPath();
        ctx.arc(spX, spY, spR, startA, startA + Math.PI / 2);
        ctx.stroke();
        spX += Math.cos(startA + Math.PI / 2) * spR;
        spY += Math.sin(startA + Math.PI / 2) * spR;
        spR *= phi * 0.72;
      }

      // φ readout
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,220,100,${0.5 + Math.sin(time * 3) * 0.15})`;
      ctx.fillText('φ = 1.6180339…', cx, figY - 6);

      // أحسن تقويم label
      ctx.font = 'bold 12px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(205,165,255,0.55)';
      ctx.shadowColor = 'rgba(160,100,255,0.4)'; ctx.shadowBlur = 12;
      ctx.fillText('أَحْسَنِ تَقْوِيمٍ', w * 0.5, h * 0.96);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#06030a' }}>
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
