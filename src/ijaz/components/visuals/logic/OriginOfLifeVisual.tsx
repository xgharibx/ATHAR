import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚗️ نشأة الحياة معضلة معلومات — Origin of Life is an information problem
// Odometer count-up to 10^164 + amino-acid particles that try to assemble and collapse.

const Glyph = ({ d, color }: { d: string; color: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
    <path d={d} />
  </svg>
);

const layers = [
  { label: 'مشكلة الاحتمال', detail: 'بروتين وظيفي بالصدفة = ١ في ١٠^١٦٤', color: '#f472b6', d: 'M3 8l9-5 9 5v8l-9 5-9-5z M3 8l9 5 9-5 M12 13v8' },
  { label: 'معضلة الدجاجة والبيضة', detail: 'الـ DNA يحتاج بروتينات، والبروتينات تحتاج DNA', color: '#60a5fa', d: 'M21 12a9 9 0 1 1-3-6.7 M21 3v5h-5' },
  { label: 'الانتقاء الطبيعي يفشل', detail: 'لا انتقاء قبل وجود التكاثر الذاتي', color: '#fb923c', d: 'M18 6 6 18 M6 6l12 12' },
  { label: 'كل النماذج الطبيعية فشلت', detail: 'عالم RNA · الفوهات · الطين · البذر الكوني', color: '#a78bfa', d: 'M9 3h6 M10 3v6l-4 8a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-8V3' },
];

function Odometer() {
  const [exp, setExp] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const dur = 2600;
    const loop = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setExp(Math.round(eased * 164));
      if (p < 1) raf = requestAnimationFrame(loop);
      else { start = 0; setTimeout(() => { raf = requestAnimationFrame(loop); }, 1400); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span className="font-mono font-bold text-2xl text-white tabular-nums">
      1 in 10<sup className="text-pink-400">{exp}</sup>
    </span>
  );
}

export default function OriginOfLifeVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId = 0;
    let time = 0;

    const N = 22;
    type P = { x: number; y: number; vx: number; vy: number; hue: number };
    let parts: P[] = [];
    const seed = () => {
      parts = Array.from({ length: N }, () => ({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.002, vy: (Math.random() - 0.5) * 0.002,
        hue: [330, 210, 28, 265][Math.floor(Math.random() * 4)],
      }));
    };
    seed();

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // assembly phase 0..1 (try to line up into a chain), then collapse
      const cycle = time % 6;
      const assembling = cycle < 4;
      const phase = assembling ? cycle / 4 : 0; // 0..1 forming
      const cx = w * 0.5, cy = h * 0.5;
      const chainW = w * 0.6;

      parts.forEach((p, i) => {
        const targetX = cx - chainW / 2 + (i / (N - 1)) * chainW;
        const targetY = cy + Math.sin(i * 0.9) * 10;
        if (assembling) {
          // ease toward chain target
          const gx = (targetX / w - p.x) * 0.04 * phase;
          const gy = (targetY / h - p.y) * 0.04 * phase;
          p.x += gx; p.y += gy;
        } else {
          // collapse: scatter outward
          p.x += p.vx * 14; p.y += p.vy * 14;
        }
        p.x += p.vx * (assembling ? 1 : 0); p.y += p.vy * (assembling ? 1 : 0);
        if (!assembling && (p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1)) {
          // off-screen, will reseed at cycle restart
        }
      });
      if (cycle < 0.05) seed();

      // bonds (only meaningful while assembling & near)
      if (assembling) {
        for (let i = 0; i < N - 1; i++) {
          const a = parts[i], b = parts[i + 1];
          const dx = (a.x - b.x) * w, dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);
          if (dist < 60) {
            ctx.strokeStyle = `rgba(212,168,83,${(1 - dist / 60) * 0.5 * phase})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }

      parts.forEach((p) => {
        const x = p.x * w, y = p.y * h;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},75%,62%,0.85)`;
        ctx.shadowColor = `hsla(${p.hue},75%,62%,0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

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
    <div className={`relative w-full h-full flex flex-col items-center justify-start pt-8 gap-4 px-5 pb-6 select-none overflow-hidden ${className || ''}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a18] via-[#0d1117] to-[#101025] pointer-events-none" />
      {/* Collapsing protein-assembly particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70 pointer-events-none" />

      {/* Probability odometer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-10 rounded-2xl px-5 py-4 text-center backdrop-blur-sm"
        style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.3)' }}
      >
        <p className="text-gray-400 text-[11px] mb-1 font-tajawal">احتمال تكوّن بروتين وظيفي واحد بالصدفة</p>
        <Odometer />
        <p className="text-gray-500 text-[10px] mt-1 font-tajawal">
          ذرات الكون المنظور: ١٠^٨٠ — أي <span className="text-pink-400">أقل بـ٨٤ رتبة مقدار</span>
        </p>
      </motion.div>

      {/* Four problem layers */}
      <div className="relative z-10 flex flex-col gap-2 w-full max-w-sm">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1, duration: 0.45 }}
            className="flex items-start gap-2.5 rounded-lg px-3 py-2 backdrop-blur-sm"
            style={{ background: layer.color + '14', border: `1px solid ${layer.color}38` }}
            dir="rtl"
          >
            <Glyph d={layer.d} color={layer.color} />
            <div>
              <p className="text-[13px] font-semibold font-tajawal" style={{ color: layer.color }}>{layer.label}</p>
              <p className="text-gray-400 text-[11px] font-tajawal">{layer.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
