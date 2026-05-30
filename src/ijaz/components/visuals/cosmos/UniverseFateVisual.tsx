
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 📜 يَوْمَ نَطْوِي السَّمَاءَ كَطَيِّ السِّجِلِّ — Universe Folding
// Al-Anbiya 21:104 — spacetime folded like a scroll (كطي السجل)
// Penrose Conformal Cyclic Cosmology 2010 — cyclic universe rebirth

export default function UniverseFateVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Stars
    type Star = { x: number; y: number; size: number; alpha: number; color: string };
    const stars: Star[] = Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 1.8 + 0.3,
      alpha: Math.random() * 0.7 + 0.2,
      color: ['#ffffff', '#aaddff', '#ffccaa', '#ccaaff'][Math.floor(Math.random() * 4)],
    }));

    // Phase timing: 0 = expand, 1 = pause, 2 = fold, 3 = rebirth
    // Cycle every ~10 seconds at time += 0.007 (700 frames = 10s)
    const CYCLE = 700;

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      const cyclePos = (time % (CYCLE * 0.007)) / (CYCLE * 0.007); // 0-1

      // Background
      ctx.fillStyle = '#020008'; ctx.fillRect(0, 0, w, h);

      // Phase determination
      let phase: 'expand' | 'hold' | 'fold' | 'rebirth';
      let phaseT = 0;
      if (cyclePos < 0.25) { phase = 'expand'; phaseT = cyclePos / 0.25; }
      else if (cyclePos < 0.4) { phase = 'hold'; phaseT = (cyclePos - 0.25) / 0.15; }
      else if (cyclePos < 0.78) { phase = 'fold'; phaseT = (cyclePos - 0.4) / 0.38; }
      else { phase = 'rebirth'; phaseT = (cyclePos - 0.78) / 0.22; }

      const cx = w / 2, cy = h / 2;

      // ── Spacetime grid mesh ────────────────────────────────
      const GRID_LINES = 12;
      let foldAmount = 0;
      if (phase === 'fold') foldAmount = phaseT;
      if (phase === 'rebirth') foldAmount = 1 - phaseT * 0.5;

      const gridAlpha = phase === 'rebirth' ? Math.max(0.1, 1 - phaseT * 0.8) : 0.35;
      ctx.globalAlpha = gridAlpha;

      // Horizontal grid lines — fold inward from top & bottom
      for (let i = 0; i <= GRID_LINES; i++) {
        const t = i / GRID_LINES;
        const rawY = t * h;
        // As fold increases, lines compress toward center
        const dist = rawY - cy;
        const foldedDist = dist * (1 - foldAmount * 0.85);
        const gy = cy + foldedDist;

        const distFrac = Math.abs(t - 0.5) * 2;
        const lineAlpha = gridAlpha * (1 - distFrac * foldAmount * 0.6);
        ctx.strokeStyle = `rgba(60,80,180,${lineAlpha})`; ctx.lineWidth = 0.5;
        // Curve lines toward center as they fold
        ctx.beginPath();
        ctx.moveTo(0, gy);
        const bulge = Math.sin(time * 1.5 + i * 0.4) * 8 * (1 - foldAmount);
        ctx.bezierCurveTo(w * 0.25, gy + bulge, w * 0.75, gy - bulge, w, gy);
        ctx.stroke();
      }

      // Vertical grid lines — fold inward from sides
      for (let i = 0; i <= GRID_LINES; i++) {
        const t = i / GRID_LINES;
        const rawX = t * w;
        const dist = rawX - cx;
        const foldedDist = dist * (1 - foldAmount * 0.85);
        const gx = cx + foldedDist;

        const distFrac = Math.abs(t - 0.5) * 2;
        const lineAlpha = gridAlpha * (1 - distFrac * foldAmount * 0.6);
        ctx.strokeStyle = `rgba(60,80,180,${lineAlpha})`; ctx.lineWidth = 0.5;
        ctx.beginPath();
        const bulge = Math.sin(time * 1.2 + i * 0.5) * 8 * (1 - foldAmount);
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + bulge, h * 0.25, gx - bulge, h * 0.75, gx, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ── Stars — drawn before fold, swept in during fold ─────
      const starOpacity = phase === 'rebirth' ? phaseT : 1;
      stars.forEach((s) => {
        const sx = s.x * w, sy = s.y * h;
        // Stars sweep toward center as fold increases
        const pullX = (sx - cx) * foldAmount * 0.7;
        const pullY = (sy - cy) * foldAmount * 0.7;
        const fx = sx - pullX, fy = sy - pullY;
        ctx.beginPath(); ctx.arc(fx, fy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * starOpacity * (1 - foldAmount * 0.4);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // ── Scroll fold edges — visible as bright lines ─────────
      if (phase === 'fold' || phase === 'rebirth') {
        const edgeAlpha = phase === 'fold' ? phaseT : Math.max(0, 1 - phaseT);
        const edgeDist = foldAmount * h * 0.48;

        // Top edge fold
        const topGrad = ctx.createLinearGradient(0, cy - edgeDist - 8, 0, cy - edgeDist + 8);
        topGrad.addColorStop(0, 'rgba(0,0,0,0)');
        topGrad.addColorStop(0.5, `rgba(180,160,255,${edgeAlpha * 0.7})`);
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad; ctx.fillRect(0, cy - edgeDist - 8, w, 16);

        // Bottom edge fold
        const botGrad = ctx.createLinearGradient(0, cy + edgeDist - 8, 0, cy + edgeDist + 8);
        botGrad.addColorStop(0, 'rgba(0,0,0,0)');
        botGrad.addColorStop(0.5, `rgba(180,160,255,${edgeAlpha * 0.7})`);
        botGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = botGrad; ctx.fillRect(0, cy + edgeDist - 8, w, 16);
      }

      // ── كَطَيِّ السِّجِلِّ scroll label ───────────────────────
      if (phase === 'fold') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, phaseT * 2);
        ctx.font = `bold ${14 * dpr}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(200,180,255,0.9)'; ctx.shadowColor = 'rgba(180,140,255,0.7)'; ctx.shadowBlur = 18;
        ctx.fillText('كَطَيِّ السِّجِلِّ', cx, cy - 20 * dpr);
        ctx.font = `${9 * dpr}px sans-serif`; ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(140,120,200,0.5)';
        ctx.fillText('like a scroll being folded', cx, cy - 4 * dpr);
        ctx.restore();
      }

      // ── Rebirth — Big Bang nova ────────────────────────────
      if (phase === 'rebirth') {
        const rebirthR = phaseT * Math.min(w, h) * 0.55;
        const nova = ctx.createRadialGradient(cx, cy, 0, cx, cy, rebirthR);
        nova.addColorStop(0, `rgba(255,240,200,${phaseT * 0.9})`);
        nova.addColorStop(0.15, `rgba(255,200,100,${phaseT * 0.7})`);
        nova.addColorStop(0.5, `rgba(100,80,200,${phaseT * 0.35})`);
        nova.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nova; ctx.beginPath(); ctx.arc(cx, cy, rebirthR, 0, Math.PI * 2); ctx.fill();

        // نُعِيدُهُ label
        ctx.save();
        ctx.globalAlpha = Math.min(1, phaseT * 2.5);
        ctx.font = `bold ${16 * dpr}px serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,240,180,0.95)'; ctx.shadowColor = 'rgba(255,200,100,0.8)'; ctx.shadowBlur = 22;
        ctx.fillText('نُعِيدُهُ', cx, cy - 14 * dpr);
        ctx.font = `${9 * dpr}px sans-serif`; ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(200,180,120,0.5)';
        ctx.fillText('We shall bring it back', cx, cy + 2 * dpr);
        ctx.restore();
      }

      // Phase indicator dots at bottom
      const phases = ['توسع', 'ثبات', 'طيّ', 'إعادة'];
      const phaseIdx = phase === 'expand' ? 0 : phase === 'hold' ? 1 : phase === 'fold' ? 2 : 3;
      phases.forEach((label, i) => {
        const dotX = cx + (i - 1.5) * 40, dotY = h * 0.92;
        ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        ctx.fillStyle = i === phaseIdx ? 'rgba(200,180,255,0.9)' : 'rgba(80,60,120,0.4)'; ctx.fill();
        ctx.font = `${7 * dpr}px serif`; ctx.fillStyle = i === phaseIdx ? 'rgba(200,180,255,0.7)' : 'rgba(100,80,150,0.3)';
        ctx.textAlign = 'center'; ctx.fillText(label, dotX, dotY + 12 * dpr);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}
      style={{ background: '#020008' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(2,0,8,0.9) 0%, rgba(2,0,8,0) 100%)' }}>
        <p className="font-amiri text-base md:text-lg leading-snug text-center"
          style={{ color: 'rgba(200,180,255,0.92)', textShadow: '0 0 18px rgba(140,100,255,0.4)' }}>
          يَوْمَ نَطْوِي السَّمَاءَ{' '}
          <span style={{ color: '#ddccff', textShadow: '0 0 14px rgba(200,160,255,0.7)' }}>كَطَيِّ السِّجِلِّ</span>
          {' '}لِلْكُتُبِ كَمَا بَدَأْنَا أَوَّلَ خَلْقٍ{' '}
          <span style={{ color: '#ffe0aa', textShadow: '0 0 14px rgba(255,200,100,0.7)' }}>نُعِيدُهُ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(100,80,160,0.45)' }}>
          سورة الأنبياء · الآية ١٠٤
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(2,0,8,0.92) 0%, rgba(2,0,8,0.5) 60%, rgba(2,0,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '📜', label: 'كطي السجل', sub: 'scroll fold metaphor' },
            { icon: '⚡', label: 'Einstein GR 1916', sub: 'spacetime curvature' },
            { icon: '🔄', label: 'Penrose CCC 2010', sub: 'cyclic cosmology' },
            { icon: '💥', label: 'نُعِيدُهُ — إعادة', sub: 'cyclic rebirth' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(40,20,80,0.08)', border: '1px solid rgba(100,60,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(200,180,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(140,120,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
