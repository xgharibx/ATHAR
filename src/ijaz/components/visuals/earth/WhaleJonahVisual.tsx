import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🐳 فَالْتَقَمَهُ الْحُوتُ وَهُوَ مُلِيمٌ — Whale & Jonah (الصافات 142)
// ULTIMATE: layered deep-ocean darknesses with surface god-rays, drifting
// bioluminescent plankton, a swimming sperm whale with animated flukes, a school
// of fish scattering, and Jonah glowing inside with his dua of repentance.

export default function WhaleJonahVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    type Bubble = { x: number; y: number; r: number; speed: number; alpha: number };
    const bubbles: Bubble[] = Array.from({ length: 28 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 1 + Math.random() * 3, speed: 0.0012 + Math.random() * 0.0016, alpha: Math.random() * 0.18 + 0.05,
    }));

    const plankton = Array.from({ length: 50 }, () => ({
      x: Math.random(), y: Math.random(),
      ph: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.0003,
    }));

    const fish = Array.from({ length: 14 }, () => ({
      x: Math.random(), y: 0.15 + Math.random() * 0.5,
      sp: 0.0008 + Math.random() * 0.0012,
      sz: 2 + Math.random() * 2,
    }));

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // ocean depth gradient (three darknesses)
      const ocean = ctx.createLinearGradient(0, 0, 0, h);
      ocean.addColorStop(0, '#063a66');
      ocean.addColorStop(0.28, '#022647');
      ocean.addColorStop(0.6, '#01142a');
      ocean.addColorStop(1, '#000308');
      ctx.fillStyle = ocean; ctx.fillRect(0, 0, w, h);

      // surface god-rays
      for (let i = 0; i < 7; i++) {
        const baseX = ((i / 7 + time * 0.02) % 1.1 - 0.05) * w;
        ctx.save();
        ctx.translate(baseX, 0);
        ctx.rotate(0.12 + Math.sin(time * 0.3 + i) * 0.03);
        const ray = ctx.createLinearGradient(0, 0, 0, h * 0.65);
        ray.addColorStop(0, 'rgba(90,170,230,0.12)');
        ray.addColorStop(1, 'rgba(90,170,230,0)');
        ctx.fillStyle = ray;
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(40, h * 0.65); ctx.lineTo(-40, h * 0.65);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // darkness band labels
      ['ظُلْمَة البحر', 'ظُلْمَة الحوت', 'ظُلْمَة الليل'].forEach((t, i) => {
        ctx.font = '7px serif'; ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(80,140,200,${0.18 + Math.sin(time + i) * 0.05})`;
        ctx.fillText(t, w * 0.03, h * (0.3 + i * 0.22));
      });

      // plankton
      plankton.forEach((p) => {
        p.x += p.drift; p.ph += 0.04;
        const a = (Math.sin(p.ph) * 0.5 + 0.5) * 0.4;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,230,255,${a})`; ctx.fill();
      });

      // fish school
      fish.forEach((f) => {
        f.x += f.sp; if (f.x > 1.05) { f.x = -0.05; f.y = 0.15 + Math.random() * 0.5; }
        const fx = f.x * w, fy = f.y * h + Math.sin(time * 2 + f.x * 20) * 4;
        ctx.beginPath();
        ctx.ellipse(fx, fy, f.sz, f.sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120,170,210,0.35)'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fx - f.sz, fy); ctx.lineTo(fx - f.sz * 2, fy - f.sz * 0.6); ctx.lineTo(fx - f.sz * 2, fy + f.sz * 0.6);
        ctx.closePath(); ctx.fill();
      });

      // bubbles
      bubbles.forEach((b) => {
        b.y -= b.speed; if (b.y < 0) { b.y = 1; b.x = Math.random(); }
        const bx = b.x * w + Math.sin(time * 3 + b.y * 10) * 2;
        ctx.beginPath(); ctx.arc(bx, b.y * h, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(140,200,240,${b.alpha})`; ctx.lineWidth = 0.6; ctx.stroke();
      });

      // ── sperm whale ──
      const whaleX = w * 0.52 + Math.sin(time * 0.18) * w * 0.08;
      const whaleY = h * 0.55 + Math.sin(time * 0.5) * 6;
      const wW = Math.min(w, h) * 0.62, wH = Math.min(w, h) * 0.2;
      const tailFlap = Math.sin(time * 1.6) * 0.25;

      ctx.save();
      ctx.translate(whaleX, whaleY);
      const body = ctx.createLinearGradient(0, -wH * 0.5, 0, wH * 0.5);
      body.addColorStop(0, 'rgba(40,62,86,0.92)');
      body.addColorStop(1, 'rgba(14,26,40,0.95)');
      // big squared head (sperm whale)
      ctx.beginPath();
      ctx.moveTo(wW * 0.46, -wH * 0.28);
      ctx.quadraticCurveTo(wW * 0.5, -wH * 0.5, wW * 0.4, -wH * 0.5);
      ctx.lineTo(wW * 0.12, -wH * 0.46);
      ctx.quadraticCurveTo(-wW * 0.2, -wH * 0.4, -wW * 0.4, -wH * 0.16);
      // tail base
      ctx.quadraticCurveTo(-wW * 0.5, 0, -wW * 0.4, wH * 0.16);
      ctx.quadraticCurveTo(-wW * 0.2, wH * 0.4, wW * 0.12, wH * 0.46);
      ctx.lineTo(wW * 0.4, wH * 0.5);
      ctx.quadraticCurveTo(wW * 0.5, wH * 0.5, wW * 0.46, wH * 0.28);
      ctx.quadraticCurveTo(wW * 0.52, 0, wW * 0.46, -wH * 0.28);
      ctx.closePath();
      ctx.fillStyle = body; ctx.fill();
      ctx.strokeStyle = 'rgba(60,100,150,0.3)'; ctx.lineWidth = 1; ctx.stroke();

      // jaw line
      ctx.strokeStyle = 'rgba(20,35,55,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(wW * 0.5, wH * 0.18);
      ctx.lineTo(wW * 0.2, wH * 0.26);
      ctx.stroke();

      // eye
      ctx.beginPath(); ctx.arc(wW * 0.16, -wH * 0.06, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,210,240,0.7)'; ctx.fill();
      ctx.beginPath(); ctx.arc(wW * 0.16, -wH * 0.06, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,20,35,0.9)'; ctx.fill();

      // flipper
      ctx.save();
      ctx.translate(wW * 0.05, wH * 0.36);
      ctx.rotate(0.5 + Math.sin(time * 1.6) * 0.1);
      ctx.beginPath(); ctx.ellipse(0, 0, wW * 0.12, wH * 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(22,38,58,0.9)'; ctx.fill();
      ctx.restore();

      // tail flukes (animated)
      ctx.save();
      ctx.translate(-wW * 0.4, 0);
      ctx.rotate(tailFlap);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-wW * 0.08, -wH * 0.1, -wW * 0.16, -wH * 0.42);
      ctx.quadraticCurveTo(-wW * 0.06, -wH * 0.2, 0, -wH * 0.04);
      ctx.quadraticCurveTo(-wW * 0.06, wH * 0.2, -wW * 0.16, wH * 0.42);
      ctx.quadraticCurveTo(-wW * 0.08, wH * 0.1, 0, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(24,40,60,0.95)'; ctx.fill();
      ctx.strokeStyle = 'rgba(60,100,150,0.3)'; ctx.stroke();
      ctx.restore();

      // Jonah glow inside
      const glowA = Math.sin(time * 1.5) * 0.04 + 0.12;
      const glow = ctx.createRadialGradient(wW * 0.02, 0, 0, wW * 0.02, 0, wH * 0.5);
      glow.addColorStop(0, `rgba(255,210,110,${glowA})`);
      glow.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(wW * 0.02, 0, wH * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 8px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,210,120,${glowA * 3.5})`;
      ctx.fillText('يُونُس ﷺ', wW * 0.02, -2);
      ctx.font = '6px serif';
      ctx.fillStyle = `rgba(255,200,120,${glowA * 2.6})`;
      ctx.fillText('لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ', wW * 0.02, 9);
      ctx.restore();

      // verse label
      ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(90,160,220,0.55)';
      ctx.shadowColor = 'rgba(40,100,180,0.3)'; ctx.shadowBlur = 12;
      ctx.fillText('فَالْتَقَمَهُ الْحُوتُ وَهُوَ مُلِيمٌ', w * 0.5, h * 0.94);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#001530' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,21,48,0.9) 0%, rgba(0,21,48,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(120,180,240,0.92)', textShadow: '0 0 18px rgba(60,120,200,0.4)' }}>
          فَالْتَقَمَهُ{' '}
          <span style={{ color: '#66aaff', textShadow: '0 0 14px rgba(80,150,255,0.7)' }}>الْحُوتُ</span>
          {' '}وَهُوَ مُلِيمٌ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(30,70,120,0.45)' }}>سورة الصافات · الآية ١٤٢</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(0,21,48,0.92) 0%, rgba(0,21,48,0.5) 60%, rgba(0,21,48,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🐳', label: 'sperm whale', sub: 'largest predator' },
            { icon: '🪣', label: 'يبتلع كاملاً', sub: 'whole humans' },
            { icon: '💡', label: 'نجاة يونس', sub: 'معجزة' },
            { icon: '🌊', label: 'deep ocean', sub: 'darkness layers' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(0,15,35,0.1)', border: '1px solid rgba(30,70,140,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(120,180,240,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(60,110,180,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
