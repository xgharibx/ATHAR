
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚖️ Quran Word Balance — Perfect numerical symmetry of paired concepts
// حياة/موت=145 | دنيا/آخرة=115 | ملائكة/شياطين=88 | الرجل/المرأة=24 | اليوم=365

export default function QuranWordBalanceVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const pairs = [
      { a: 'حَيَاة', b: 'مَوْت', count: 145, colorA: '#7effc5', colorB: '#ff6655' },
      { a: 'الدُّنْيَا', b: 'الآخِرَة', count: 115, colorA: '#5599ff', colorB: '#cc88ff' },
      { a: 'الْمَلَائِكَة', b: 'الشَّيَاطِين', count: 88, colorA: '#ffe85a', colorB: '#ff5599' },
      { a: 'الرَّجُل', b: 'الْمَرْأَة', count: 24, colorA: '#55ccff', colorB: '#ff99aa' },
    ];

    // Stars
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random(), y: Math.random(), size: Math.random() * 1.5 + 0.3, alpha: Math.random() * 0.5 + 0.2,
      twinkle: Math.random() * Math.PI * 2, speed: Math.random() + 0.5,
    }));

    // Gold particles for balance celebration
    type GoldParticle = { x: number; y: number; vx: number; vy: number; life: number; size: number };
    let goldParticles: GoldParticle[] = [];
    let lastBurst = 0;

    const draw = () => {
      time += 0.006;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Background
      ctx.fillStyle = '#04020e'; ctx.fillRect(0, 0, w, h);

      // Nebula glow
      const neb = ctx.createRadialGradient(w * 0.5, h * 0.38, 0, w * 0.5, h * 0.38, w * 0.45);
      neb.addColorStop(0, 'rgba(80,50,180,0.12)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach((s) => {
        const t = Math.sin(time * s.speed + s.twinkle) * 0.3 + 0.7;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * t})`; ctx.fill();
      });

      // ── Scale structure ───────────────────────────────────────
      const pivotX = w * 0.5, pivotY = h * 0.38;
      const beamHalf = Math.min(w * 0.33, 150);

      // Pick current pair cycling every 3.5s
      const cycleT = time * (1 / 3.5);
      const pairIdx = Math.floor(cycleT) % pairs.length;
      const pair = pairs[pairIdx];
      const fracInCycle = (cycleT % 1);

      // Count up: 0→count over first 60% of cycle, then hold at balance
      const countFrac = Math.min(1, fracInCycle / 0.55);
      const displayCount = Math.round(pair.count * countFrac);
      const balanced = countFrac >= 0.98;

      // Scale tilt: before balance, slight oscillation; at balance, zero
      const tilt = balanced ? 0 : Math.sin(time * 3 + pairIdx) * (1 - countFrac) * 0.15;

      // Gold particles when balanced
      if (balanced && time - lastBurst > 3.5) {
        lastBurst = time;
        for (let i = 0; i < 22; i++) {
          goldParticles.push({
            x: pivotX, y: pivotY,
            vx: (Math.random() - 0.5) * 3, vy: -(Math.random() * 3 + 1),
            life: 1, size: Math.random() * 3 + 1,
          });
        }
      }

      // Update + draw gold particles
      goldParticles = goldParticles.filter(p => p.life > 0);
      goldParticles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 0.025;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,210,60,${p.life * 0.8})`; ctx.fill();
      });

      // Beam
      const beamGrad = ctx.createLinearGradient(pivotX - beamHalf, pivotY, pivotX + beamHalf, pivotY);
      const beamAlpha = balanced ? 1 : 0.7;
      beamGrad.addColorStop(0, `rgba(200,165,50,${beamAlpha * 0.4})`);
      beamGrad.addColorStop(0.5, `rgba(255,210,80,${beamAlpha})`);
      beamGrad.addColorStop(1, `rgba(200,165,50,${beamAlpha * 0.4})`);
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(tilt);
      ctx.strokeStyle = beamGrad; ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255,210,80,0.45)'; ctx.shadowBlur = balanced ? 18 : 6;
      ctx.beginPath(); ctx.moveTo(-beamHalf, 0); ctx.lineTo(beamHalf, 0); ctx.stroke();

      // Pan cords
      const panW = beamHalf * 0.3, panH = beamHalf * 0.52;
      const panDepth = 12;
      ctx.strokeStyle = `rgba(200,175,80,0.5)`; ctx.lineWidth = 1; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(-beamHalf, 0); ctx.lineTo(-beamHalf - panW / 2, panH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-beamHalf, 0); ctx.lineTo(-beamHalf + panW / 2, panH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(beamHalf, 0); ctx.lineTo(beamHalf - panW / 2, panH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(beamHalf, 0); ctx.lineTo(beamHalf + panW / 2, panH); ctx.stroke();

      // Pan plates
      [-1, 1].forEach((side) => {
        const px = side * beamHalf;
        const py = panH;
        ctx.beginPath();
        ctx.moveTo(px - panW / 2, py); ctx.lineTo(px + panW / 2, py);
        ctx.lineTo(px + panW * 0.4, py + panDepth);
        ctx.lineTo(px - panW * 0.4, py + panDepth);
        ctx.closePath();
        const pgGrad = ctx.createLinearGradient(px - panW / 2, py, px + panW / 2, py);
        pgGrad.addColorStop(0, 'rgba(180,145,40,0.3)');
        pgGrad.addColorStop(0.5, `rgba(255,215,80,${balanced ? 0.9 : 0.5})`);
        pgGrad.addColorStop(1, 'rgba(180,145,40,0.3)');
        ctx.fillStyle = pgGrad; ctx.fill();
        ctx.strokeStyle = `rgba(255,210,80,${balanced ? 0.8 : 0.4})`; ctx.lineWidth = 1;
        ctx.stroke();

        // Word on pan
        const word = side === -1 ? pair.a : pair.b;
        const wordColor = side === -1 ? pair.colorA : pair.colorB;
        ctx.font = `bold ${14 * dpr}px serif`;
        ctx.fillStyle = wordColor;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = wordColor; ctx.shadowBlur = 8;
        ctx.fillText(word, px, py + panDepth / 2);
        ctx.shadowBlur = 0;
      });

      // Pivot circle
      ctx.fillStyle = balanced ? 'rgba(255,210,80,0.95)' : 'rgba(200,175,60,0.6)';
      ctx.shadowColor = 'rgba(255,210,80,0.6)'; ctx.shadowBlur = balanced ? 20 : 8;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Pivot pillar
      ctx.strokeStyle = 'rgba(200,175,60,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, h * 0.25); ctx.stroke();

      ctx.restore();

      // ── Count numbers above pans ──────────────────────────────
      const leftPanX = pivotX - beamHalf * Math.cos(tilt);
      const rightPanX = pivotX + beamHalf * Math.cos(tilt);
      const panTopY = pivotY + beamHalf * Math.sin(Math.abs(tilt)) * 0.4 - 18;

      [-1, 1].forEach((side) => {
        const numX = side === -1 ? leftPanX : rightPanX;
        ctx.font = `bold ${20 * dpr}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        const col = side === -1 ? pair.colorA : pair.colorB;
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = balanced ? 12 : 4;
        ctx.fillText(String(displayCount), numX, panTopY);
        ctx.shadowBlur = 0;
      });

      // ── Balance message ───────────────────────────────────────
      if (balanced) {
        ctx.font = `bold ${11 * dpr}px sans-serif`;
        ctx.fillStyle = 'rgba(255,210,80,0.8)'; ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255,210,80,0.6)'; ctx.shadowBlur = 10;
        ctx.fillText(`${pair.count} = ${pair.count}  ✦  تساوٍ تام`, pivotX, pivotY - beamHalf * 0.45);
        ctx.shadowBlur = 0;
      }

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
      style={{ background: '#04020e' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* TOP verse */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(4,2,14,0.88) 0%, rgba(4,2,14,0) 100%)' }}>
        <p className="font-amiri text-lg md:text-xl leading-snug text-center"
          style={{ color: 'rgba(255,240,180,0.92)', textShadow: '0 0 20px rgba(220,180,60,0.4)' }}>
          أَفَلَا يَتَدَبَّرُونَ{' '}
          <span style={{ color: '#ffd85a', textShadow: '0 0 14px rgba(255,200,60,0.7)' }}>الْقُرْآنَ</span>
          {' '}وَلَوْ كَانَ مِنْ عِنْدِ غَيْرِ اللَّهِ لَوَجَدُوا فِيهِ اخْتِلَافًا كَثِيرًا
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(200,160,60,0.45)' }}>
          سورة النساء · الآية ٨٢
        </p>
      </motion.div>

      {/* Bottom chips */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-2 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(4,2,14,0.92) 0%, rgba(4,2,14,0.5) 60%, rgba(4,2,14,0) 100%)', paddingTop: 20 }}>
        <p className="text-[10px] font-tajawal text-center" style={{ color: 'rgba(240,220,160,0.75)' }}>
          تُعدّ كلمات القرآن فيكشف{' '}
          <span style={{ color: 'rgba(255,210,80,0.9)' }}>تناظراً عددياً معجزاً</span>
          {' '}في المفاهيم المتضادة
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚖️', label: 'حياة / موت', sub: '145 / 145' },
            { icon: '🌍', label: 'دنيا / آخرة', sub: '115 / 115' },
            { icon: '😇', label: 'ملائكة / شياطين', sub: '88 / 88' },
            { icon: '👥', label: 'رجل / امرأة', sub: '24 / 24' },
            { icon: '📅', label: 'اليوم', sub: '365 مرة' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(180,140,30,0.07)', border: '1px solid rgba(200,160,40,0.2)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(255,220,120,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(200,170,80,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
