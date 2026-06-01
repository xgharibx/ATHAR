import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🫒 وَالتِّينِ وَالزَّيْتُونِ — Fig & Olive Nutrition (التين 1)
// ULTIMATE: a sliced fig revealing glittering seeds and a halved olive shedding a
// glistening oil droplet, each haloed by orbiting nutrient molecules in labeled
// rings, with a soft breathing motion and rising aroma particles.

export default function FigOliveNutritionVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // fig seeds (polar inside fig)
    const seeds = Array.from({ length: 46 }, () => ({
      ang: Math.random() * Math.PI * 2,
      rad: Math.random() * 0.82 + 0.05,
      tw: Math.random() * Math.PI * 2,
    }));

    // orbiting nutrients
    const figNutrients = ['Fe', 'Ca', 'Fiber'];
    const oliveNutrients = ['E', 'Oleic', 'Poly'];

    // aroma particles
    type Aroma = { x: number; y: number; vy: number; alpha: number; side: number };
    const aroma: Aroma[] = [];

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#0a0600'; ctx.fillRect(0, 0, w, h);

      // side gradients
      const figGrad = ctx.createLinearGradient(0, 0, w * 0.5, 0);
      figGrad.addColorStop(0, 'rgba(70,12,28,0.45)'); figGrad.addColorStop(1, 'rgba(40,8,15,0.05)');
      ctx.fillStyle = figGrad; ctx.fillRect(0, 0, w * 0.5, h);
      const oliveGrad = ctx.createLinearGradient(w * 0.5, 0, w, 0);
      oliveGrad.addColorStop(0, 'rgba(15,35,6,0.05)'); oliveGrad.addColorStop(1, 'rgba(25,50,8,0.45)');
      ctx.fillStyle = oliveGrad; ctx.fillRect(w * 0.5, 0, w * 0.5, h);

      const bob = Math.sin(time * 1.4) * 4;

      // ── FIG (sliced, left) ──
      const figX = w * 0.27, figY = h * 0.44 + bob;
      const figR = Math.min(w, h) * 0.13;
      // skin
      const skin = ctx.createRadialGradient(figX - figR * 0.3, figY - figR * 0.3, 0, figX, figY, figR);
      skin.addColorStop(0, 'rgba(150,70,95,0.9)');
      skin.addColorStop(0.7, 'rgba(95,30,55,0.85)');
      skin.addColorStop(1, 'rgba(55,15,30,0.9)');
      ctx.beginPath(); ctx.arc(figX, figY, figR, 0, Math.PI * 2);
      ctx.fillStyle = skin; ctx.fill();
      // inner flesh
      const flesh = ctx.createRadialGradient(figX, figY, 0, figX, figY, figR * 0.86);
      flesh.addColorStop(0, 'rgba(230,150,170,0.95)');
      flesh.addColorStop(0.6, 'rgba(200,110,140,0.85)');
      flesh.addColorStop(1, 'rgba(150,60,95,0.8)');
      ctx.beginPath(); ctx.arc(figX, figY, figR * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = flesh; ctx.fill();
      // glittering seeds
      seeds.forEach((s) => {
        const sx = figX + Math.cos(s.ang) * s.rad * figR * 0.82;
        const sy = figY + Math.sin(s.ang) * s.rad * figR * 0.82;
        const a = Math.sin(time * 3 + s.tw) * 0.3 + 0.6;
        ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,40,30,${a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(sx - 0.5, sy - 0.5, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,200,${a * 0.6})`; ctx.fill();
      });
      // stem
      ctx.strokeStyle = 'rgba(90,130,50,0.6)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(figX, figY - figR); ctx.lineTo(figX + 3, figY - figR - 12); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.font = '10px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(225,160,180,0.7)'; ctx.fillText('تِين', figX, figY + figR + 16);

      // fig nutrient orbit
      figNutrients.forEach((n, i) => {
        const a = time * (0.6 + i * 0.15) + i * (Math.PI * 2 / 3);
        const orx = figX + Math.cos(a) * figR * (1.35 + i * 0.12);
        const ory = figY + Math.sin(a) * figR * (1.0 + i * 0.1);
        ctx.beginPath(); ctx.arc(orx, ory, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80,20,40,0.7)';
        ctx.strokeStyle = 'rgba(220,130,160,0.7)'; ctx.lineWidth = 1;
        ctx.fill(); ctx.stroke();
        ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,200,215,0.95)';
        ctx.fillText(n, orx, ory);
        ctx.textBaseline = 'alphabetic';
      });

      // ── OLIVE (halved, right) ──
      const olX = w * 0.74, olY = h * 0.44 - bob;
      const olR = Math.min(w, h) * 0.11;
      ctx.save();
      ctx.translate(olX, olY);
      ctx.rotate(0.25);
      const olSkin = ctx.createRadialGradient(-olR * 0.3, -olR * 0.3, 0, 0, 0, olR);
      olSkin.addColorStop(0, 'rgba(120,170,60,0.9)');
      olSkin.addColorStop(0.7, 'rgba(70,110,30,0.85)');
      olSkin.addColorStop(1, 'rgba(35,65,12,0.9)');
      ctx.beginPath(); ctx.ellipse(0, 0, olR * 0.74, olR, 0, 0, Math.PI * 2);
      ctx.fillStyle = olSkin; ctx.fill();
      // flesh ring
      ctx.beginPath(); ctx.ellipse(0, 0, olR * 0.6, olR * 0.82, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(190,210,120,0.9)'; ctx.fill();
      // pit
      ctx.beginPath(); ctx.ellipse(0, 0, olR * 0.26, olR * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,90,40,0.95)'; ctx.fill();
      ctx.restore();
      ctx.font = '10px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,210,110,0.7)'; ctx.fillText('زَيْتُون', olX, olY + olR + 16);

      // dripping oil droplet
      const dripT = (time * 0.4) % 1;
      const dx = olX + olR * 0.5, dyTop = olY + olR * 0.7;
      const dy = dyTop + dripT * olR * 1.5;
      const dg = ctx.createRadialGradient(dx - 1, dy - 2, 0, dx, dy, 5);
      dg.addColorStop(0, 'rgba(255,235,140,0.95)');
      dg.addColorStop(1, 'rgba(200,170,40,0.6)');
      ctx.beginPath();
      ctx.moveTo(dx, dy - 6);
      ctx.quadraticCurveTo(dx + 4, dy - 1, dx, dy + 4);
      ctx.quadraticCurveTo(dx - 4, dy - 1, dx, dy - 6);
      ctx.fillStyle = dg; ctx.fill();

      // olive nutrient orbit
      oliveNutrients.forEach((n, i) => {
        const a = -time * (0.6 + i * 0.15) + i * (Math.PI * 2 / 3);
        const orx = olX + Math.cos(a) * olR * (1.5 + i * 0.12);
        const ory = olY + Math.sin(a) * olR * (1.15 + i * 0.1);
        ctx.beginPath(); ctx.arc(orx, ory, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(25,55,12,0.7)';
        ctx.strokeStyle = 'rgba(140,200,90,0.7)'; ctx.lineWidth = 1;
        ctx.fill(); ctx.stroke();
        ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(210,245,170,0.95)';
        ctx.fillText(n, orx, ory);
        ctx.textBaseline = 'alphabetic';
      });

      // aroma particles
      if (Math.random() < 0.2) {
        const side = Math.random() > 0.5 ? 1 : 0;
        aroma.push({ x: side ? olX : figX, y: (side ? olY : figY) - olR, vy: Math.random() * 0.4 + 0.3, alpha: 0.5, side });
      }
      for (let i = aroma.length - 1; i >= 0; i--) {
        const p = aroma[i];
        p.y -= p.vy; p.alpha -= 0.006;
        p.x += Math.sin(time * 2 + p.y * 0.05) * 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = p.side ? `rgba(160,210,110,${Math.max(0, p.alpha)})` : `rgba(220,140,165,${Math.max(0, p.alpha)})`;
        ctx.fill();
        if (p.alpha <= 0) aroma.splice(i, 1);
      }

      // verse label
      ctx.font = 'bold 12px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(210,190,130,0.55)';
      ctx.shadowColor = 'rgba(160,140,80,0.3)'; ctx.shadowBlur = 12;
      ctx.fillText('وَالتِّينِ وَالزَّيْتُونِ', w * 0.5, h * 0.93);
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
          <span style={{ color: '#ffcc88', textShadow: '0 0 14px rgba(200,160,80,0.7)' }}>وَالتِّينِ وَالزَّيْتُونِ</span>
          {' '}وَطُورِ سِينِينَ
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
