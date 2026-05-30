
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⛰️ وَالْجِبَالَ أَوْتَادًا — Mountains as Pegs (Isostasy)
// An-Naba 78:7 — mountains described as stakes/pegs
// Isostasy: mountains have deep roots 3-4x their visible height — Airy 1855

export default function MountainsStabilityVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Seismic waves
    type SeismicWave = { x: number; y: number; r: number; maxR: number; alpha: number };
    const seismicWaves: SeismicWave[] = [];
    const spawnWave = (x: number, y: number) => {
      seismicWaves.push({ x, y, r: 0, maxR: 80, alpha: 0.5 });
    };

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#060c04'; ctx.fillRect(0, 0, w, h);

      const surfaceY = h * 0.45; // Earth surface line
      const crustDepth = h * 0.15; // depth of crust shown

      // ── Sky ──────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, surfaceY);
      skyGrad.addColorStop(0, '#03080a');
      skyGrad.addColorStop(1, '#060f08');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, surfaceY);

      // ── Crust layer ───────────────────────────────────────────
      const crustGrad = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + crustDepth);
      crustGrad.addColorStop(0, '#1a2a10');
      crustGrad.addColorStop(0.5, '#142208');
      crustGrad.addColorStop(1, '#0d1a06');
      ctx.fillStyle = crustGrad;
      ctx.fillRect(0, surfaceY, w, crustDepth);

      // ── Mantle ────────────────────────────────────────────────
      const mantleGrad = ctx.createLinearGradient(0, surfaceY + crustDepth, 0, h);
      mantleGrad.addColorStop(0, '#1a0c02');
      mantleGrad.addColorStop(0.4, '#2a1404');
      mantleGrad.addColorStop(1, '#3a1c06');
      ctx.fillStyle = mantleGrad;
      ctx.fillRect(0, surfaceY + crustDepth, w, h - surfaceY - crustDepth);

      // ── 3 Mountains with roots ────────────────────────────────
      const mountains = [
        { xFrac: 0.22, aboveH: 0.22, rootDepth: 0.30 },
        { xFrac: 0.5, aboveH: 0.30, rootDepth: 0.38 },
        { xFrac: 0.78, aboveH: 0.18, rootDepth: 0.24 },
      ];

      mountains.forEach(({ xFrac, aboveH, rootDepth }, mi) => {
        const mx = xFrac * w;
        const mAbove = aboveH * h;
        const mRoot = rootDepth * h;
        const mWidth = aboveH * w * 0.55;

        // Above-ground mountain
        const mGrad = ctx.createLinearGradient(mx, surfaceY - mAbove, mx, surfaceY);
        mGrad.addColorStop(0, 'rgba(180,200,180,0.7)');
        mGrad.addColorStop(0.5, 'rgba(100,140,90,0.6)');
        mGrad.addColorStop(1, 'rgba(60,90,50,0.5)');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.moveTo(mx - mWidth, surfaceY);
        ctx.lineTo(mx, surfaceY - mAbove);
        ctx.lineTo(mx + mWidth, surfaceY);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(120,160,100,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();

        // Snow cap
        ctx.fillStyle = 'rgba(240,250,255,0.7)';
        ctx.beginPath();
        ctx.moveTo(mx - mWidth * 0.2, surfaceY - mAbove * 0.82);
        ctx.lineTo(mx, surfaceY - mAbove);
        ctx.lineTo(mx + mWidth * 0.2, surfaceY - mAbove * 0.82);
        ctx.closePath(); ctx.fill();

        // Root (peg below surface)
        const rootW = mWidth * 0.45;
        const rootGrad = ctx.createLinearGradient(mx, surfaceY, mx, surfaceY + mRoot);
        rootGrad.addColorStop(0, 'rgba(80,120,60,0.45)');
        rootGrad.addColorStop(0.5, 'rgba(60,90,40,0.35)');
        rootGrad.addColorStop(1, 'rgba(40,60,20,0.15)');
        ctx.fillStyle = rootGrad;
        ctx.beginPath();
        ctx.moveTo(mx - rootW, surfaceY);
        ctx.lineTo(mx - rootW * 0.4, surfaceY + mRoot * 0.7);
        ctx.lineTo(mx, surfaceY + mRoot);
        ctx.lineTo(mx + rootW * 0.4, surfaceY + mRoot * 0.7);
        ctx.lineTo(mx + rootW, surfaceY);
        ctx.closePath(); ctx.fill();

        // Dashed root outline
        ctx.strokeStyle = 'rgba(100,160,80,0.2)'; ctx.lineWidth = 0.7; ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(mx - rootW, surfaceY + 2);
        ctx.lineTo(mx - rootW * 0.4, surfaceY + mRoot * 0.7);
        ctx.lineTo(mx, surfaceY + mRoot);
        ctx.lineTo(mx + rootW * 0.4, surfaceY + mRoot * 0.7);
        ctx.lineTo(mx + rootW, surfaceY + 2);
        ctx.stroke(); ctx.setLineDash([]);

        // Height brace and label
        if (mi === 1) {
          ctx.strokeStyle = 'rgba(200,220,160,0.3)'; ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(mx + mWidth + 8, surfaceY - mAbove); ctx.lineTo(mx + mWidth + 8, surfaceY); ctx.stroke();
          ctx.font = `7px monospace`; ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(180,220,140,0.4)';
          ctx.fillText('جبل\n' + Math.round(aboveH * 1000) + 'm', mx + mWidth + 10, surfaceY - mAbove * 0.5);

          ctx.strokeStyle = 'rgba(120,180,100,0.2)'; ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(mx + mWidth + 8, surfaceY); ctx.lineTo(mx + mWidth + 8, surfaceY + mRoot); ctx.stroke();
          ctx.fillStyle = 'rgba(100,160,80,0.35)';
          ctx.fillText('وَتَد\n' + Math.round(rootDepth * 1000) + 'm', mx + mWidth + 10, surfaceY + mRoot * 0.45);
        }
      });

      // ── Surface line ──────────────────────────────────────────
      ctx.strokeStyle = 'rgba(100,140,80,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, surfaceY); ctx.lineTo(w, surfaceY); ctx.stroke();

      // ── Seismic waves ─────────────────────────────────────────
      if (Math.sin(time * 0.3) > 0.96 && seismicWaves.length < 6) {
        spawnWave(w * 0.5, surfaceY);
      }
      for (let i = seismicWaves.length - 1; i >= 0; i--) {
        const sw = seismicWaves[i];
        sw.r += 1.5; sw.alpha -= 0.008;
        if (sw.alpha <= 0) { seismicWaves.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(120,200,100,${sw.alpha * 0.4})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2); ctx.stroke();
      }

      // ── أَوْتَاد label ─────────────────────────────────────────
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,220,120,0.55)'; ctx.shadowColor = 'rgba(100,200,60,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('وَالْجِبَالَ أَوْتَادًا', w * 0.5, h * 0.87);
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
      style={{ background: '#060c04' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(6,12,4,0.9) 0%, rgba(6,12,4,0) 100%)' }}>
        <p className="font-amiri text-base md:text-lg leading-snug text-center"
          style={{ color: 'rgba(180,220,160,0.92)', textShadow: '0 0 18px rgba(100,180,60,0.4)' }}>
          أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا ﴿٦﴾{' '}
          <span style={{ color: '#9fdd77', textShadow: '0 0 14px rgba(140,220,80,0.7)' }}>وَالْجِبَالَ أَوْتَادًا</span>
          {' '}﴿٧﴾
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,120,50,0.45)' }}>
          سورة النبأ · الآيات ٦–٧
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(6,12,4,0.92) 0%, rgba(6,12,4,0.5) 60%, rgba(6,12,4,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⛰️', label: 'أوتاد = جذور', sub: '3-4x عمق' },
            { icon: '📐', label: 'Isostasy', sub: 'Airy 1855' },
            { icon: '🌊', label: 'تخفيف الزلازل', sub: 'امتصاص الطاقة' },
            { icon: '🔗', label: 'تثبيت القشرة', sub: 'stability' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(10,30,5,0.1)', border: '1px solid rgba(80,140,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(160,220,120,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(100,160,70,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
