
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌊 ظُلُمَاتٌ بَعْضُهَا فَوْقَ بَعْضٍ — Deep Ocean Darkness
// An-Nur 24:40 — layers of darkness in deep ocean
// Ocean zones: photic/mesopelagic/bathyal — Cousteau 1960s

export default function DeepOceanDarknessVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Bioluminescent creatures
    type BioCreature = { x: number; y: number; vx: number; vy: number; zone: number; phase: number };
    const creatures: BioCreature[] = Array.from({ length: 20 }, (_, i) => ({
      x: Math.random(), y: 0.3 + Math.random() * 0.6,
      vx: (Math.random() - 0.5) * 0.001, vy: (Math.random() - 0.5) * 0.0005,
      zone: Math.floor(Math.random() * 3) + 1, phase: Math.random() * Math.PI * 2,
    }));

    // Ocean layers
    const layers = [
      { name: 'منطقة ضوئية', depth: '0–200 m', yStart: 0.05, yEnd: 0.28, color: [10, 80, 160] },
      { name: 'منطقة خافتة', depth: '200–1000 m', yStart: 0.28, yEnd: 0.52, color: [5, 30, 80] },
      { name: 'منطقة ظلام', depth: '1000–4000 m', yStart: 0.52, yEnd: 0.72, color: [2, 10, 30] },
      { name: 'منطقة حالكة', depth: '4000m+', yStart: 0.72, yEnd: 0.92, color: [1, 3, 8] },
    ];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#000208'; ctx.fillRect(0, 0, w, h);

      // Surface wave
      const surfY = h * 0.07;
      const surfGrad = ctx.createLinearGradient(0, 0, 0, surfY);
      surfGrad.addColorStop(0, 'rgba(20,100,200,0.4)');
      surfGrad.addColorStop(1, 'rgba(10,60,160,0.2)');
      ctx.fillStyle = surfGrad; ctx.fillRect(0, 0, w, surfY);
      // Wave shimmer
      for (let i = 0; i < 15; i++) {
        const wx = (i / 15 + Math.sin(time * 0.6 + i * 0.5) * 0.02) * w;
        ctx.strokeStyle = `rgba(100,180,255,${Math.sin(time + i * 0.6) * 0.05 + 0.1})`; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(wx, surfY - 3); ctx.lineTo(wx + 15, surfY - 3); ctx.stroke();
      }

      // ── Ocean depth layers ───────────────────────────────────
      layers.forEach((layer) => {
        const [r, g, b] = layer.color;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, layer.yStart * h, w, (layer.yEnd - layer.yStart) * h);
        // Label
        ctx.font = `7px sans-serif`; ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(${Math.min(r + 100, 255)},${Math.min(g + 80, 255)},${Math.min(b + 80, 200)},0.25)`;
        ctx.fillText(layer.name + ' · ' + layer.depth, w * 0.97, (layer.yStart + 0.03) * h + 6);
      });

      // Layer dividers (wavy)
      [0.28, 0.52, 0.72].forEach((yFrac) => {
        ctx.strokeStyle = 'rgba(40,100,160,0.12)'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = yFrac * h + Math.sin(x * 0.03 + time) * 3;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // ── Bioluminescent creatures ────────────────────────────
      creatures.forEach((c) => {
        c.x += c.vx; c.y += c.vy;
        if (c.x < 0 || c.x > 1) c.vx *= -1;
        if (c.y < 0.25 || c.y > 0.9) c.vy *= -1;
        const bioAlpha = Math.sin(time * 2 + c.phase) * 0.15 + 0.4;
        const zColors = ['rgba(60,220,200,', 'rgba(100,100,255,', 'rgba(200,100,255,'];
        ctx.beginPath(); ctx.arc(c.x * w, c.y * h, 3, 0, Math.PI * 2);
        ctx.fillStyle = zColors[c.zone % 3] + bioAlpha + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(c.x * w, c.y * h, 8, 0, Math.PI * 2);
        ctx.fillStyle = zColors[c.zone % 3] + bioAlpha * 0.08 + ')'; ctx.fill();
      });

      // Light ray from surface
      const lightGrad = ctx.createLinearGradient(0, surfY, 0, h * 0.38);
      lightGrad.addColorStop(0, 'rgba(80,160,255,0.08)');
      lightGrad.addColorStop(1, 'rgba(80,160,255,0)');
      ctx.fillStyle = lightGrad; ctx.fillRect(w * 0.3, surfY, w * 0.4, h * 0.31);

      // ظُلُمَاتٌ label
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80,140,200,0.5)'; ctx.shadowColor = 'rgba(40,100,180,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('ظُلُمَاتٌ بَعْضُهَا فَوْقَ بَعْضٍ', w * 0.5, h * 0.96);
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
      style={{ background: '#000208' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,2,8,0.9) 0%, rgba(0,2,8,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(120,180,255,0.92)', textShadow: '0 0 18px rgba(60,120,220,0.4)' }}>
          <span style={{ color: '#88aaff', textShadow: '0 0 14px rgba(100,150,255,0.7)' }}>ظُلُمَاتٌ بَعْضُهَا فَوْقَ بَعْضٍ</span>
          {' '}إِذَا أَخْرَجَ يَدَهُ لَمْ يَكَادْ يَرَاهَا
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(40,80,140,0.45)' }}>
          سورة النور · الآية ٤٠
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(0,2,8,0.92) 0%, rgba(0,2,8,0.5) 60%, rgba(0,2,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🌊', label: '3 طبقات ظلام', sub: 'zones' },
            { icon: '🔦', label: 'أحياء مضيئة', sub: 'bioluminescence' },
            { icon: '🚶‍♂️', label: 'لا يرى بلا مضيء', sub: 'Cousteau 1960' },
            { icon: '🌋', label: 'أمواج داخلية', sub: 'internal waves' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(0,5,20,0.1)', border: '1px solid rgba(30,70,130,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(120,180,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(60,120,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
