
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌊 مَرَجَ الْبَحْرَيْنِ — Barriers Between Seas
// Ar-Rahman 55:19-20 — two seas meet, a barrier between them
// Haloclines, pycnoclines — Dr. Hay 1980s oceanography

export default function BarriersBetweenSeasVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Water particles for each sea
    type WaterPt = { x: number; y: number; vx: number; vy: number; sea: 0 | 1; alpha: number; phase: number };
    const pts: WaterPt[] = Array.from({ length: 180 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.55 + 0.2,
      vx: (Math.random() - 0.5) * 0.003, vy: (Math.random() - 0.5) * 0.002,
      sea: i < 90 ? 0 : 1, alpha: Math.random() * 0.3 + 0.4, phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const barrierX = w * 0.5;

      ctx.fillStyle = '#001428'; ctx.fillRect(0, 0, w, h);

      // Left sea (Atlantic — cool, blue, less saline)
      const leftGrad = ctx.createLinearGradient(0, 0, barrierX, 0);
      leftGrad.addColorStop(0, 'rgba(10,40,100,0.95)');
      leftGrad.addColorStop(1, 'rgba(20,60,140,0.85)');
      ctx.fillStyle = leftGrad; ctx.fillRect(0, 0, barrierX, h);

      // Right sea (Mediterranean — warm, green, saltier)
      const rightGrad = ctx.createLinearGradient(barrierX, 0, w, 0);
      rightGrad.addColorStop(0, 'rgba(0,80,80,0.85)');
      rightGrad.addColorStop(1, 'rgba(0,60,60,0.95)');
      ctx.fillStyle = rightGrad; ctx.fillRect(barrierX, 0, w - barrierX, h);

      // ── Water particles ─────────────────────────────────────
      pts.forEach((p) => {
        // Constrain each sea's particles
        const bound = p.sea === 0 ? [0.02, 0.48] : [0.52, 0.98];
        p.x += p.vx; p.y += p.vy;
        if (p.x < bound[0]) p.vx = Math.abs(p.vx);
        if (p.x > bound[1]) p.vx = -Math.abs(p.vx);
        if (p.y < 0.2 || p.y > 0.75) p.vy *= -1;
        const a = Math.sin(time + p.phase) * 0.08 + p.alpha;
        const color = p.sea === 0 ? `rgba(60,120,220,${a * 0.5})` : `rgba(40,180,160,${a * 0.5})`;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      });

      // ── Barrier line with halocline wave ──────────────────────
      ctx.strokeStyle = 'rgba(180,220,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = h * 0.15; y < h * 0.78; y += 2) {
        const bx = barrierX + Math.sin(y * 0.03 + time * 1.2) * 8;
        y === h * 0.15 ? ctx.moveTo(bx, y) : ctx.lineTo(bx, y);
      }
      ctx.stroke();

      // ── Labels ───────────────────────────────────────────────
      ctx.font = `8px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100,160,255,0.5)';
      ctx.fillText('بحر بارد | Atlantic', barrierX * 0.5, h * 0.3);
      ctx.fillStyle = 'rgba(60,220,200,0.5)';
      ctx.fillText('بحر دافئ | Mediterranean', barrierX + barrierX * 0.5, h * 0.3);

      // Salt difference arrow
      ctx.font = `7px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,220,255,0.35)';
      ctx.fillText('ملوحية 36‰', barrierX * 0.5, h * 0.45);
      ctx.fillText('ملوحية 39‰', barrierX + barrierX * 0.5, h * 0.45);

      // بَرْزَخٌ label
      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,220,255,0.6)'; ctx.shadowColor = 'rgba(120,180,255,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('بَيْنَهُمَا بَرْزَخٌ', barrierX, h * 0.88);
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
      style={{ background: '#001428' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,20,40,0.9) 0%, rgba(0,20,40,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(160,210,255,0.92)', textShadow: '0 0 18px rgba(80,160,255,0.4)' }}>
          <span style={{ color: '#88ccff', textShadow: '0 0 14px rgba(100,200,255,0.7)' }}>مَرَجَ الْبَحْرَيْنِ يَلْتَقِيَانِ</span>
          {' '}بَيْنَهُمَا{' '}
          <span style={{ color: '#66ffee', textShadow: '0 0 12px rgba(80,220,200,0.6)' }}>بَرْزَخٌ لَا يَبْغِيَانِ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,100,140,0.45)' }}>
          سورة الرحمن · الآيات ١٩–٢٠
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(0,20,40,0.92) 0%, rgba(0,20,40,0.5) 60%, rgba(0,20,40,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🌊', label: 'برزخ = حاجز', sub: 'halocline' },
            { icon: '🔬', label: 'Dr. Hay 1980', sub: 'ثبيت سبباً' },
            { icon: '🐟', label: 'ملوحية مختلفة', sub: 'لا تختلط' },
            { icon: '🌡️', label: 'درجة حرارة مختلفة', sub: 'pycnocline' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(0,20,50,0.1)', border: '1px solid rgba(40,100,160,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(140,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(80,140,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
