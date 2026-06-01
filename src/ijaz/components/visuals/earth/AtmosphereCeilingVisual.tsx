
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌍 سَقْفًا مَّحْفُوظًا — Atmosphere as Protected Ceiling
// Al-Anbiya 21:32 — sky = roof + protected/guarding (mahfuz)
// Multi-layer shield: ozone UV, Van Allen cosmic rays, meteor ablation

export default function AtmosphereCeilingVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Meteors being burned up
    type Meteor = { x: number; y: number; vx: number; vy: number; trail: number; size: number; alive: boolean };
    const meteors: Meteor[] = [];
    let nextMeteor = 0;

    // Stars
    type Star = { x: number; y: number; size: number; alpha: number };
    const stars: Star[] = Array.from({ length: 250 }, () => ({
      x: Math.random(), y: Math.random() * 0.35,
      size: Math.random() * 1.4 + 0.2, alpha: Math.random() * 0.6 + 0.15,
    }));

    // Radiation particles blocked by ozone
    type Particle = { x: number; y: number; vy: number; alpha: number; color: string };
    const uvParticles: Particle[] = Array.from({ length: 25 }, () => ({
      x: Math.random(), y: Math.random() * 0.15,
      vy: Math.random() * 0.003 + 0.002, alpha: Math.random() * 0.5 + 0.3,
      color: `hsl(${260 + Math.random() * 40}, 90%, 65%)`,
    }));

    const layers = [
      { name: 'الغلاف المغناطيسي', nameEn: 'Magnetosphere', yFrac: 0.12, color: 'rgba(60,80,200,', height: 0.06 },
      { name: 'الأيونوسفير', nameEn: 'Ionosphere', yFrac: 0.22, color: 'rgba(80,120,220,', height: 0.04 },
      { name: 'طبقة الأوزون', nameEn: 'Ozone Layer', yFrac: 0.34, color: 'rgba(80,180,80,', height: 0.03 },
      { name: 'الستراتوسفير', nameEn: 'Stratosphere', yFrac: 0.42, color: 'rgba(60,100,180,', height: 0.04 },
      { name: 'التروبوسفير', nameEn: 'Troposphere', yFrac: 0.52, color: 'rgba(80,140,220,', height: 0.06 },
    ];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Space background
      ctx.fillStyle = '#000a1a'; ctx.fillRect(0, 0, w, h);

      // Stars in space
      stars.forEach((s) => {
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,230,255,${s.alpha})`; ctx.fill();
      });

      // Earth surface (bottom)
      const earthGrad = ctx.createLinearGradient(0, h * 0.68, 0, h);
      earthGrad.addColorStop(0, 'rgba(20,60,20,0.9)');
      earthGrad.addColorStop(0.3, 'rgba(15,40,15,0.95)');
      earthGrad.addColorStop(1, '#040a04');
      ctx.fillStyle = earthGrad; ctx.fillRect(0, h * 0.68, w, h);

      // ── Atmospheric layers ────────────────────────────────────
      layers.forEach(({ yFrac, color, height }) => {
        const pulse = Math.sin(time * 0.5) * 0.01 + 0.14;
        const layerGrad = ctx.createLinearGradient(0, yFrac * h, 0, (yFrac + height) * h);
        layerGrad.addColorStop(0, `${color}0)`);
        layerGrad.addColorStop(0.3, `${color}${pulse})`);
        layerGrad.addColorStop(0.7, `${color}${pulse * 0.8})`);
        layerGrad.addColorStop(1, `${color}0)`);
        ctx.fillStyle = layerGrad; ctx.fillRect(0, yFrac * h, w, height * h);
      });

      // Layer labels
      layers.forEach(({ name, yFrac, height, color }) => {
        const midY = (yFrac + height / 2) * h;
        const c = color.replace('rgba(', '').split(',');
        ctx.font = `${7.5 * dpr}px sans-serif`; ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.45)`;
        ctx.fillText(name, w * 0.03, midY + 3 * dpr);
      });

      // ── UV particles blocked by ozone ────────────────────────
      uvParticles.forEach((p) => {
        p.y += p.vy;
        const ozoneY = layers[2].yFrac + layers[2].height;
        if (p.y > ozoneY) {
          // Blocked — reset above
          p.y = Math.random() * 0.05; p.x = Math.random(); p.alpha = Math.random() * 0.5 + 0.3;
        } else {
          // Fade near ozone
          const fadeStart = ozoneY - 0.04;
          const fadeAlpha = p.y > fadeStart ? (ozoneY - p.y) / 0.04 * p.alpha : p.alpha;
          ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,100,255,${fadeAlpha})`; ctx.fill();
          ctx.shadowColor = 'rgba(180,100,255,0.5)'; ctx.shadowBlur = 4; ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // ── Meteors burning up in atmosphere ─────────────────────
      if (time - nextMeteor > 1.2) {
        nextMeteor = time;
        meteors.push({
          x: Math.random() * 0.7 + 0.15, y: 0.18 + Math.random() * 0.08,
          vx: Math.random() * 0.006 + 0.003, vy: Math.random() * 0.004 + 0.002,
          trail: 20 + Math.random() * 20, size: Math.random() * 2 + 1, alive: true,
        });
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx; m.y += m.vy;

        // Burn up effect
        const burnAlpha = Math.max(0, 1 - (m.y - 0.2) / 0.15);
        if (burnAlpha <= 0.05) { meteors.splice(i, 1); continue; }

        // Trail
        ctx.strokeStyle = `rgba(255,180,60,${burnAlpha * 0.6})`; ctx.lineWidth = m.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(m.x * w - m.vx * m.trail * w, m.y * h - m.vy * m.trail * h);
        ctx.lineTo(m.x * w, m.y * h); ctx.stroke();
        // Head glow
        ctx.beginPath(); ctx.arc(m.x * w, m.y * h, m.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,100,${burnAlpha})`; ctx.fill();
      }

      // ── Ozone UV shield highlight ─────────────────────────────
      const ozoneY = (layers[2].yFrac + layers[2].height * 0.5) * h;
      ctx.strokeStyle = `rgba(80,200,80,${0.2 + Math.sin(time) * 0.05})`; ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(0, ozoneY); ctx.lineTo(w, ozoneY); ctx.stroke();
      ctx.setLineDash([]);

      // UV shield label
      ctx.font = `${8 * dpr}px sans-serif`; ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(80,200,80,0.35)';
      ctx.fillText('أوزون — UV shield', w * 0.97, ozoneY - 4 * dpr);

      // ── سقفًا محفوظًا label ───────────────────────────────────
      ctx.font = `bold ${12 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,220,255,0.55)'; ctx.shadowColor = 'rgba(100,160,255,0.4)'; ctx.shadowBlur = 12;
      ctx.fillText('سَقْفًا مَّحْفُوظًا', w * 0.5, h * 0.28);
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
      style={{ background: '#000a1a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,10,26,0.9) 0%, rgba(0,10,26,0) 100%)' }}>
        <p className="font-amiri text-base md:text-lg leading-snug text-center"
          style={{ color: 'rgba(160,210,255,0.92)', textShadow: '0 0 18px rgba(80,160,255,0.4)' }}>
          وَجَعَلْنَا السَّمَاءَ{' '}
          <span style={{ color: '#88ccff', textShadow: '0 0 14px rgba(100,180,255,0.7)' }}>سَقْفًا مَّحْفُوظًا</span>
          {' '}وَهُمْ عَنْ آيَاتِهَا مُعْرِضُونَ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,100,160,0.45)' }}>
          سورة الأنبياء · الآية ٣٢
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(0,10,26,0.92) 0%, rgba(0,10,26,0.5) 60%, rgba(0,10,26,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'سقف = roof', sub: 'structural term' },
            { d: 'M12 2v3 M12 19v3 M5 12H2 M22 12h-3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', label: 'أوزون UV', sub: '97–99% blocked' },
            { d: 'M3 12c4-6 14-6 18 0 M5 12l-2 4 M19 12l2 4 M12 12v6', label: '100 طن/يوم', sub: 'meteor ablation' },
            { d: 'M6 4v6a6 6 0 0 0 12 0V4 M6 4h3 M15 4h3 M12 16v4 M9 20h6', label: 'Van Allen', sub: 'cosmic ray shield' },
          ].map(({ d, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(20,40,80,0.1)', border: '1px solid rgba(60,100,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="rgba(160,210,255,0.92)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d={d} />
              </svg>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(160,210,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(100,150,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
