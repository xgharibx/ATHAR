
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⛈️ أَلَمْ تَرَ أَنَّ اللَّهَ يُزْجِي سَحَابًا — Cumulonimbus Formation
// An-Nur 24:43 — 4 precise stages: drive → gather → stack → rain+hail
// 20th century radar meteorology confirmed this exact sequence

export default function CloudFormationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Rain drops
    type Raindrop = { x: number; y: number; speed: number; length: number; alpha: number };
    const raindrops: Raindrop[] = Array.from({ length: 120 }, () => ({
      x: Math.random(), y: Math.random(),
      speed: Math.random() * 0.006 + 0.008, length: Math.random() * 14 + 8, alpha: Math.random() * 0.5 + 0.2,
    }));

    // Hail pieces
    type Hail = { x: number; y: number; speed: number; size: number; alpha: number };
    const hail: Hail[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * 0.5 + 0.25, y: Math.random() * 0.35 + 0.55,
      speed: Math.random() * 0.004 + 0.006, size: Math.random() * 3 + 2, alpha: Math.random() * 0.5 + 0.3,
    }));

    // Cloud particles
    type CloudParticle = { x: number; y: number; r: number; alpha: number; vx: number; vy: number };
    let particles: CloudParticle[] = [];
    const PARTICLE_COUNT = 200;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random(), y: Math.random() * 0.4 + 0.1,
        r: Math.random() * 22 + 10, alpha: Math.random() * 0.35 + 0.1,
        vx: (Math.random() - 0.5) * 0.0005, vy: -Math.random() * 0.0004 - 0.0001,
      });
    }

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0a0e1a');
      skyGrad.addColorStop(0.35, '#0d1525');
      skyGrad.addColorStop(0.65, '#1a2040');
      skyGrad.addColorStop(1, '#0a0e1a');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);

      // Horizon glow (lightning flashes)
      const flashAlpha = Math.max(0, Math.sin(time * 7) > 0.96 ? Math.sin(time * 7) * 0.3 : 0);
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(200,220,255,${flashAlpha})`; ctx.fillRect(0, 0, w, h);
      }

      // ── Cloud structure — cumulonimbus ────────────────────────
      const cloudCx = w * 0.5, cloudBotY = h * 0.62;

      // Storm base (anvil top)
      ctx.save();
      ctx.translate(cloudCx, cloudBotY);
      const anvilW = w * 0.42, anvilH = h * 0.28;

      // Build cloud from many circles
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < 0.05) { p.y = 0.42; p.x = Math.random(); }
        const px = (p.x - 0.5) * anvilW * 2.2;
        const py = -p.y * anvilH * 2.5 + anvilH * 0.4;
        const heightFrac = 1 - p.y * 2;
        // Color varies with height — icy white top, dark base
        const grayVal = Math.floor(180 + heightFrac * 60);
        const cGrad = ctx.createRadialGradient(px, py, 0, px, py, p.r);
        cGrad.addColorStop(0, `rgba(${grayVal},${grayVal+8},${grayVal+20},${p.alpha})`);
        cGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cGrad; ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI * 2); ctx.fill();
      });

      // Ice crystals at top
      const iceTop = -anvilH * 1.8;
      const iceGrad = ctx.createRadialGradient(0, iceTop, 0, 0, iceTop, anvilW * 0.7);
      iceGrad.addColorStop(0, 'rgba(220,235,255,0.25)');
      iceGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = iceGrad; ctx.beginPath(); ctx.ellipse(0, iceTop, anvilW * 0.7, anvilH * 0.5, 0, 0, Math.PI * 2); ctx.fill();

      // Dark storm base
      const baseGrad = ctx.createRadialGradient(0, anvilH * 0.1, 0, 0, anvilH * 0.1, anvilW * 0.8);
      baseGrad.addColorStop(0, 'rgba(30,35,55,0.7)');
      baseGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = baseGrad; ctx.beginPath(); ctx.ellipse(0, anvilH * 0.1, anvilW * 0.8, anvilH * 0.3, 0, 0, Math.PI * 2); ctx.fill();

      ctx.restore();

      // ── Rain ──────────────────────────────────────────────────
      raindrops.forEach((r) => {
        r.y += r.speed;
        if (r.y > 1.05) { r.y = 0.6; r.x = Math.random(); }
        const rx = r.x * w, ry = r.y * h;
        const rainAlpha = r.alpha * Math.min(1, (ry - h * 0.6) / 30);
        if (rainAlpha > 0) {
          ctx.strokeStyle = `rgba(150,200,255,${rainAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 1, ry + r.length); ctx.stroke();
        }
      });

      // ── Hail ──────────────────────────────────────────────────
      hail.forEach((h2) => {
        h2.y += h2.speed;
        if (h2.y > 1.05) { h2.y = 0.52; h2.x = Math.random() * 0.5 + 0.25; }
        const hx = h2.x * w, hy = h2.y * h;
        ctx.fillStyle = `rgba(200,230,255,${h2.alpha})`;
        ctx.beginPath(); ctx.arc(hx, hy, h2.size, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(180,210,255,${h2.alpha * 0.5})`; ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // ── Stage labels (4 Quranic stages) ──────────────────────
      const stages = [
        { arabic: 'يُزْجِي', desc: 'يدفع السحاب', en: 'Drives', x: 0.12, y: 0.35, color: '#88ccff' },
        { arabic: 'يُؤَلِّفُ', desc: 'يجمع الجزيئات', en: 'Gathers', x: 0.35, y: 0.25, color: '#aaddff' },
        { arabic: 'رُكَامًا', desc: 'يتراكم 15km', en: 'Stacks', x: 0.66, y: 0.22, color: '#cceeff' },
        { arabic: 'وَدْق + بَرَد', desc: 'مطر وبرد من داخله', en: 'Rain+Hail', x: 0.88, y: 0.7, color: '#88bbff' },
      ];

      stages.forEach(({ arabic, desc, x, y, color }) => {
        const sx = x * w, sy = y * h;
        const pulse = Math.sin(time * 1.1 + x * 5) * 0.12 + 0.8;
        ctx.save(); ctx.globalAlpha = pulse;
        ctx.font = `bold ${12 * dpr}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
        ctx.fillText(arabic, sx, sy);
        ctx.font = `${8 * dpr}px sans-serif`; ctx.fillStyle = 'rgba(160,180,220,0.6)'; ctx.shadowBlur = 0;
        ctx.fillText(desc, sx, sy + 13 * dpr);
        ctx.restore();

        // Small arrow indicator
        ctx.save(); ctx.globalAlpha = pulse * 0.35;
        ctx.strokeStyle = color; ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(sx, sy + 20 * dpr); ctx.lineTo(cloudCx * (0.6 + x * 0.8), cloudBotY - 20);
        ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      });

      // Height labels
      ctx.font = `${8 * dpr}px monospace`; ctx.textAlign = 'right';
      const cloudTopY = cloudBotY - h * 0.42;
      ctx.fillStyle = 'rgba(180,200,255,0.35)';
      ctx.fillText('15 km', w * 0.14, cloudTopY + 4);
      ctx.fillText('0 km', w * 0.14, cloudBotY + 4);
      ctx.strokeStyle = 'rgba(120,150,200,0.2)'; ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(w * 0.12, cloudTopY); ctx.lineTo(w * 0.22, cloudTopY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.12, cloudBotY); ctx.lineTo(w * 0.22, cloudBotY); ctx.stroke();
      ctx.setLineDash([]);

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
      style={{ background: '#0a0e1a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(10,14,26,0.9) 0%, rgba(10,14,26,0) 100%)' }}>
        <p className="font-amiri text-base md:text-lg leading-snug text-center"
          style={{ color: 'rgba(200,220,255,0.92)', textShadow: '0 0 18px rgba(100,150,255,0.4)' }}>
          أَلَمْ تَرَ أَنَّ اللَّهَ{' '}
          <span style={{ color: '#88ccff', textShadow: '0 0 12px rgba(120,180,255,0.7)' }}>يُزْجِي سَحَابًا</span>
          {' '}ثُمَّ{' '}
          <span style={{ color: '#aaddff', textShadow: '0 0 12px rgba(150,200,255,0.7)' }}>يُؤَلِّفُ بَيْنَهُ</span>
          {' '}ثُمَّ{' '}
          <span style={{ color: '#cceeff', textShadow: '0 0 12px rgba(180,220,255,0.7)' }}>يَجْعَلُهُ رُكَامًا</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(100,140,200,0.45)' }}>
          سورة النور · الآية ٤٣
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(10,14,26,0.92) 0%, rgba(10,14,26,0.5) 60%, rgba(10,14,26,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '💨', label: 'يُزجي = تيار صاعد', sub: 'updraft drive' },
            { icon: '🌧️', label: 'ودق = مطر من داخله', sub: 'internal rain' },
            { icon: '🧊', label: 'برد = جبال داخلية', sub: 'internal hail' },
            { icon: '📡', label: 'رادار دوبلر 1963م', sub: 'Browning' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(40,70,160,0.08)', border: '1px solid rgba(80,120,200,0.2)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(160,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,160,220,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
