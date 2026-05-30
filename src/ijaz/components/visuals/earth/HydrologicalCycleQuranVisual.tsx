
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 💧 أَلَمْ تَرَ أَنَّ اللَّهَ يُزْجِي سَحَابًا — Hydrological Cycle in Quran
// Az-Zumar 39:21 — water descends from sky, springs from earth
// Complete water cycle: evaporation, cloud, rain, aquifer

export default function HydrologicalCycleQuranVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Evaporation particles
    type EvapPt = { x: number; y: number; vy: number; alpha: number; phase: number };
    const evapPts: EvapPt[] = Array.from({ length: 30 }, () => ({
      x: Math.random(), y: 0.7 + Math.random() * 0.1,
      vy: -(Math.random() * 0.003 + 0.001), alpha: 0.5, phase: Math.random() * Math.PI * 2,
    }));

    // Rain drops
    type RainDrop = { x: number; y: number; vy: number; alpha: number };
    const rainDrops: RainDrop[] = [];

    // Underground water
    type UGPt = { x: number; y: number; vx: number; alpha: number };
    const ugPts: UGPt[] = Array.from({ length: 20 }, () => ({
      x: Math.random(), y: 0.85 + Math.random() * 0.08,
      vx: (Math.random() - 0.5) * 0.002, alpha: Math.random() * 0.3 + 0.2,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#04080e');
      bgGrad.addColorStop(0.55, '#060f12');
      bgGrad.addColorStop(0.7, '#0a1408');
      bgGrad.addColorStop(1, '#050c04');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // Sky
      ctx.fillStyle = 'rgba(5,15,30,0.8)'; ctx.fillRect(0, 0, w, h * 0.55);
      // Ground
      const groundGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
      groundGrad.addColorStop(0, 'rgba(30,50,20,0.7)');
      groundGrad.addColorStop(0.3, 'rgba(20,35,12,0.8)');
      groundGrad.addColorStop(1, 'rgba(10,20,5,0.9)');
      ctx.fillStyle = groundGrad; ctx.fillRect(0, h * 0.55, w, h * 0.45);

      // Ground line
      ctx.strokeStyle = 'rgba(60,100,40,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h * 0.55); ctx.lineTo(w, h * 0.55); ctx.stroke();

      // ── Cloud ───────────────────────────────────────────────
      const cloudX = w * 0.5 + Math.sin(time * 0.3) * w * 0.05;
      const cloudY = h * 0.2;
      const cloudR = Math.min(w, h) * 0.07;
      const cAlpha = 0.45 + Math.sin(time * 0.4) * 0.05;
      [[-0.6,0,1],[-0.3,-0.3,1.2],[0,0,1.4],[0.3,-0.2,1.1],[0.6,0,1]].forEach(([dx,dy,sc]) => {
        const cloudGrad = ctx.createRadialGradient(cloudX + dx * cloudR, cloudY + dy * cloudR, 0, cloudX + dx * cloudR, cloudY + dy * cloudR, cloudR * sc as number);
        cloudGrad.addColorStop(0, `rgba(140,170,200,${cAlpha})`);
        cloudGrad.addColorStop(1, `rgba(80,110,150,0)`);
        ctx.fillStyle = cloudGrad;
        ctx.beginPath(); ctx.arc(cloudX + dx * cloudR, cloudY + dy * cloudR, cloudR * sc as number, 0, Math.PI * 2); ctx.fill();
      });

      // ── Evaporation particles (ocean to cloud) ─────────────────
      evapPts.forEach((p) => {
        p.y += p.vy;
        if (p.y < 0.2) { p.y = 0.7 + Math.random() * 0.1; p.x = Math.random(); }
        const alpha = (0.7 - p.y) * 1.2 * 0.3;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,160,220,${Math.max(0, alpha)})`; ctx.fill();
      });

      // ── Rain drops ────────────────────────────────────────
      if (rainDrops.length < 40 && Math.random() < 0.3) {
        rainDrops.push({ x: cloudX + (Math.random() - 0.5) * cloudR * 3, y: cloudY + cloudR, vy: Math.random() * 3 + 2, alpha: 0.6 });
      }
      for (let i = rainDrops.length - 1; i >= 0; i--) {
        const rd = rainDrops[i];
        rd.y += rd.vy;
        ctx.strokeStyle = `rgba(100,160,220,${rd.alpha * 0.5})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(rd.x, rd.y - rd.vy * 1.5); ctx.lineTo(rd.x, rd.y); ctx.stroke();
        if (rd.y > h * 0.55) rainDrops.splice(i, 1);
      }

      // ── Underground aquifer ────────────────────────────────
      const aquiferY = h * 0.82;
      ctx.strokeStyle = 'rgba(60,100,160,0.15)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, aquiferY); ctx.lineTo(w, aquiferY); ctx.stroke();
      ugPts.forEach((p) => {
        p.x += p.vx; if (p.x < 0 || p.x > 1) p.vx *= -1;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60,120,200,${p.alpha})`; ctx.fill();
      });
      ctx.font = `7px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(80,140,220,0.3)';
      ctx.fillText('ينابيع — aquifer', w * 0.5, aquiferY - 6);

      // ── Cycle arrows ───────────────────────────────────────
      ctx.strokeStyle = 'rgba(100,180,255,0.12)'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.85, h * 0.7); ctx.quadraticCurveTo(w * 0.95, h * 0.3, cloudX + cloudR, cloudY);
      ctx.stroke(); ctx.setLineDash([]);

      // أَنزَلَ label
      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(120,180,255,0.55)'; ctx.shadowColor = 'rgba(80,140,220,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('أَنزَلَ مِنَ السَّمَاءِ مَاءً', w * 0.5, h * 0.9);
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
      style={{ background: '#04080e' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(4,8,14,0.9) 0%, rgba(4,8,14,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(160,210,255,0.92)', textShadow: '0 0 18px rgba(80,160,255,0.4)' }}>
          أَلَمْ تَرَ أَنَّ اللَّهَ{' '}
          <span style={{ color: '#88ccff', textShadow: '0 0 14px rgba(100,200,255,0.7)' }}>أَنزَلَ مِنَ السَّمَاءِ مَاءً</span>
          {' '}فَسَلَكَهُ{' '}
          <span style={{ color: '#66aaee', textShadow: '0 0 12px rgba(80,160,240,0.6)' }}>يَنَابِيعَ فِي الْأَرْضِ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,100,160,0.45)' }}>
          سورة الزمر · الآية ٢١
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(4,8,14,0.92) 0%, rgba(4,8,14,0.5) 60%, rgba(4,8,14,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '☁️', label: 'تبخّر → سحاب', sub: 'evaporation' },
            { icon: '🌧️', label: 'مطر → تربة', sub: 'infiltration' },
            { icon: '💧', label: 'ينابيع', sub: 'aquifer' },
            { icon: '🔄', label: 'دورة متكاملة', sub: 'Halley 1690' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(5,15,30,0.1)', border: '1px solid rgba(50,100,160,0.22)', backdropFilter: 'blur(8px)' }}>
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
