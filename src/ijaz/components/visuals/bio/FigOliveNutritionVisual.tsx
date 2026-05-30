
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function FigOliveNutritionVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Molecular clusters for fig vs olive
    type Molecule = { x: number; y: number; vx: number; vy: number; side: 'fig' | 'olive'; size: number; phase: number };
    const molecules: Molecule[] = Array.from({ length: 30 }, (_, i) => ({
      x: i < 15 ? 0.1 + Math.random() * 0.35 : 0.55 + Math.random() * 0.35,
      y: 0.2 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      side: i < 15 ? 'fig' : 'olive',
      size: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#0a0600'; ctx.fillRect(0, 0, w, h);

      // Fig side gradient (left - purple-red)
      const figGrad = ctx.createLinearGradient(0, 0, w * 0.48, 0);
      figGrad.addColorStop(0, 'rgba(60,10,20,0.4)'); figGrad.addColorStop(1, 'rgba(40,8,15,0.1)');
      ctx.fillStyle = figGrad; ctx.fillRect(0, 0, w * 0.48, h);

      // Olive side gradient (right - green-gold)
      const oliveGrad = ctx.createLinearGradient(w * 0.52, 0, w, 0);
      oliveGrad.addColorStop(0, 'rgba(10,25,5,0.1)'); oliveGrad.addColorStop(1, 'rgba(20,40,5,0.4)');
      ctx.fillStyle = oliveGrad; ctx.fillRect(w * 0.52, 0, w * 0.48, h);

      // Center divider
      ctx.strokeStyle = 'rgba(140,120,80,0.1)'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h); ctx.stroke(); ctx.setLineDash([]);

      // Fig icon (large, left)
      const figX = w * 0.25, figY = h * 0.42;
      const figR = Math.min(w, h) * 0.1;
      const figBodyGrad = ctx.createRadialGradient(figX - figR * 0.2, figY - figR * 0.2, 0, figX, figY, figR);
      figBodyGrad.addColorStop(0, 'rgba(140,60,80,0.5)');
      figBodyGrad.addColorStop(0.7, 'rgba(100,30,50,0.3)');
      figBodyGrad.addColorStop(1, 'rgba(60,10,20,0.1)');
      ctx.beginPath(); ctx.arc(figX, figY, figR, 0, Math.PI * 2);
      ctx.fillStyle = figBodyGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(160,80,100,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      // Fig stem
      ctx.strokeStyle = 'rgba(80,120,40,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(figX, figY - figR); ctx.lineTo(figX, figY - figR - 12); ctx.stroke();
      ctx.font = `9px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,140,160,0.4)';
      ctx.fillText('تِين', figX, figY + figR + 12);

      // Fig nutrient labels
      [['Iron', '\u062d\u062f\u064a\u062f'], ['Fiber', '\u0623\u0644\u064a\u0627\u0641'], ['Ca', '\u0643\u0627\u0644\u0633\u064a\u0648\u0645']].forEach(([en, ar], i) => {
        const ly = figY - figR * 0.5 + i * 14;
        ctx.font = `6px monospace`; ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(200,140,160,${0.25 + Math.sin(time + i) * 0.1})`;
        ctx.fillText(en + ' / ' + ar, w * 0.04, ly);
      });

      // Olive icon (right)
      const oliveX = w * 0.75, oliveY = h * 0.42;
      const oliveR = Math.min(w, h) * 0.09;
      const oliveBodyGrad = ctx.createRadialGradient(oliveX - oliveR * 0.2, oliveY - oliveR * 0.2, 0, oliveX, oliveY, oliveR);
      oliveBodyGrad.addColorStop(0, 'rgba(80,140,40,0.5)');
      oliveBodyGrad.addColorStop(0.7, 'rgba(40,80,20,0.3)');
      oliveBodyGrad.addColorStop(1, 'rgba(20,50,5,0.1)');
      ctx.beginPath(); ctx.ellipse(oliveX, oliveY, oliveR * 0.7, oliveR, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = oliveBodyGrad; ctx.fill();
      ctx.strokeStyle = 'rgba(80,160,40,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = `9px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(140,200,100,0.4)';
      ctx.fillText('زَيْتُون', oliveX, oliveY + oliveR + 12);

      // Olive nutrient labels
      [['Oleic', '\u0623\u0648\u0644\u064a\u0643'], ['Vit E', '\u0641\u064a\u062a E'], ['Poly', '\u0645\u062a\u0639\u062f\u062f']].forEach(([en, ar], i) => {
        const ly = oliveY - oliveR * 0.5 + i * 14;
        ctx.font = `6px monospace`; ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(140,200,100,${0.25 + Math.sin(time + i + 1) * 0.1})`;
        ctx.fillText(en + ' / ' + ar, w * 0.96, ly);
      });

      // Floating molecules
      molecules.forEach((m) => {
        m.x += m.vx; m.y += m.vy;
        if (m.x < 0.05 || m.x > 0.95) m.vx *= -1;
        if (m.y < 0.1 || m.y > 0.9) m.vy *= -1;
        const alpha = Math.sin(time * 1.5 + m.phase) * 0.1 + 0.2;
        const color = m.side === 'fig' ? `rgba(200,100,120,${alpha})` : `rgba(100,180,60,${alpha})`;
        ctx.beginPath(); ctx.arc(m.x * w, m.y * h, m.size, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      });

      // verse label
      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,180,120,0.45)'; ctx.shadowColor = 'rgba(160,140,80,0.2)'; ctx.shadowBlur = 8;
      ctx.fillText('وَالتَّيْنِ وَالزَيْتُونِ', w * 0.5, h * 0.91);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#0a0600' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(10,6,0,0.9) 0%, rgba(10,6,0,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(220,200,160,0.92)', textShadow: '0 0 18px rgba(160,140,80,0.4)' }}>
          <span style={{ color: '#ffcc88', textShadow: '0 0 14px rgba(200,160,80,0.7)' }}>وَالتَّيْنِ وَالزَيْتُونِ</span>
          {' '}وَطُورِ سَيْنَاء
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,60,20,0.45)' }}>سورة التين · الآية ١–٢</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(10,6,0,0.92) 0%, rgba(10,6,0,0.5) 60%, rgba(10,6,0,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🍒', label: 'تين = calcium', sub: 'عظم وقلب' },
            { icon: '🫒', label: 'زيتون = Vit E', sub: 'antioxidant' },
            { icon: '🗄️', label: 'polyphenols', sub: 'مضاد إلتهاب' },
            { icon: '🧪', label: 'oleic acid', sub: 'omega-9' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(15,10,0,0.1)', border: '1px solid rgba(120,100,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(220,200,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(140,120,60,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
