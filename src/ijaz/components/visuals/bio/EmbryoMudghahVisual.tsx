
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🧬 مُضْغَةً — Embryo: The Chewed Lump Stage
// Al-Mu'minun 23:14 — mudghah (chewed lump) = 4th-week embryo with somites
// Keith L. Moore 1986 — confirmed perfect match with somite-bearing embryo

export default function EmbryoMudghahVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Stage cycling: 0=nutfah (sperm), 1=alaqah (clot), 2=mudghah (chewed), 3=izaam (bones), 4=lahm (flesh)
    const STAGES = ['نُّطْفَة', 'عَلَقَة', 'مُضْغَة', 'عِظَام', 'لَحْم'];
    const COLORS = ['#88aaff', '#cc4455', '#cc8844', '#e8e8d0', '#ffaaaa'];
    const STAGE_DUR = 5.5; // seconds per stage

    // Cells for nutfah/alaqah display
    type Cell = { x: number; y: number; r: number; alpha: number; phase: number };
    const cells: Cell[] = Array.from({ length: 40 }, () => ({
      x: (Math.random() - 0.5) * 0.25 + 0.5, y: (Math.random() - 0.5) * 0.22 + 0.5,
      r: Math.random() * 0.012 + 0.007, alpha: Math.random() * 0.5 + 0.3, phase: Math.random() * Math.PI * 2,
    }));

    // Somite segments (the "chewed" pattern = 28-31 day embryo)
    const SOMITE_COUNT = 12;

    const drawNutfah = (cx: number, cy: number, s: number) => {
      // Sperm head + tail
      const hGrad = ctx.createRadialGradient(cx - s * 0.1, cy, 0, cx, cy, s * 0.35);
      hGrad.addColorStop(0, 'rgba(150,180,255,0.8)');
      hGrad.addColorStop(1, 'rgba(60,100,220,0.3)');
      ctx.fillStyle = hGrad;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.35, s * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
      // Tail
      ctx.strokeStyle = 'rgba(100,140,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.32, cy);
      for (let i = 0; i < 30; i++) {
        const tx = cx + s * 0.32 + i * s * 0.04;
        const ty = cy + Math.sin(i * 0.7 + time * 4) * s * 0.06;
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
    };

    const drawAlaqah = (cx: number, cy: number, s: number) => {
      // Blood clot / leech shape — elongated oval
      const aGrad = ctx.createRadialGradient(cx - s * 0.1, cy, 0, cx, cy, s * 0.55);
      aGrad.addColorStop(0, 'rgba(220,60,80,0.85)');
      aGrad.addColorStop(0.6, 'rgba(150,20,40,0.7)');
      aGrad.addColorStop(1, 'rgba(80,0,20,0.4)');
      ctx.fillStyle = aGrad;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.55, s * 0.3, 0.15, 0, Math.PI * 2); ctx.fill();
      // Segmentation lines (early cell division)
      ctx.strokeStyle = 'rgba(255,100,120,0.3)'; ctx.lineWidth = 0.8;
      for (let i = -2; i <= 2; i++) {
        const lx = cx + i * s * 0.15;
        ctx.beginPath(); ctx.moveTo(lx, cy - s * 0.25); ctx.lineTo(lx, cy + s * 0.25); ctx.stroke();
      }
    };

    const drawMudghah = (cx: number, cy: number, s: number) => {
      // Embryo body — irregular chewed-gum shape
      ctx.save();
      ctx.translate(cx, cy);

      // Main body
      const mGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.65);
      mGrad.addColorStop(0, 'rgba(200,120,60,0.9)');
      mGrad.addColorStop(0.5, 'rgba(160,80,40,0.8)');
      mGrad.addColorStop(1, 'rgba(100,50,20,0.5)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      // Irregular chewed shape with somite bulges
      ctx.moveTo(-s * 0.55, 0);
      for (let a = 0; a <= Math.PI * 2; a += 0.08) {
        const somiteIdx = Math.floor(((a / (Math.PI * 2)) * SOMITE_COUNT));
        const somiteBulge = Math.sin(a * SOMITE_COUNT * 0.5) > 0 ? 0.08 : 0;
        const r = s * (0.42 + Math.sin(a * 2.5) * 0.12 + somiteBulge + Math.cos(a * 1.5) * 0.08);
        ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.75);
        void somiteIdx;
      }
      ctx.closePath(); ctx.fill();

      // Somite segments on dorsal surface (the "tooth marks")
      ctx.strokeStyle = 'rgba(255,160,80,0.5)'; ctx.lineWidth = 1;
      for (let i = 0; i < SOMITE_COUNT; i++) {
        const si = i / SOMITE_COUNT;
        const sx2 = (si - 0.5) * s * 1.1;
        const topY = -s * 0.15 - Math.sin(si * Math.PI) * s * 0.1;
        const botY = s * 0.18 + Math.sin(si * Math.PI) * s * 0.05;
        ctx.beginPath();
        ctx.moveTo(sx2, topY); ctx.lineTo(sx2, botY);
        ctx.stroke();
        // Somite ridge
        const sGrad2 = ctx.createRadialGradient(sx2, topY + (botY - topY) * 0.4, 0, sx2, topY + (botY - topY) * 0.4, s * 0.055);
        sGrad2.addColorStop(0, 'rgba(255,180,100,0.3)');
        sGrad2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sGrad2;
        ctx.beginPath(); ctx.arc(sx2, topY + (botY - topY) * 0.4, s * 0.055, 0, Math.PI * 2); ctx.fill();
      }

      // Neural tube (top)
      ctx.strokeStyle = 'rgba(255,220,150,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, -s * 0.06);
      for (let x = -s * 0.45; x <= s * 0.45; x += 2) {
        ctx.lineTo(x, -s * 0.06 + Math.sin(x * 0.08) * s * 0.04);
      }
      ctx.stroke();

      // Size indicator
      ctx.font = `${6.5 * (window.devicePixelRatio || 1)}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,160,100,0.5)';
      ctx.fillText('4–6 mm', 0, s * 0.7);

      ctx.restore();
    };

    const drawIzaam = (cx: number, cy: number, s: number) => {
      // Bone structure — cartilage silhouette
      ctx.fillStyle = 'rgba(240,230,200,0.6)';
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.5, s * 0.32, 0.1, 0, Math.PI * 2); ctx.fill();
      // Vertebrae
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = `rgba(220,210,180,${0.4 + Math.abs(i) * 0.04})`;
        ctx.beginPath(); ctx.ellipse(cx + i * s * 0.12, cy, s * 0.06, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
      }
    };

    const drawLahm = (cx: number, cy: number, s: number) => {
      // Full fetus outline
      const fGrad = ctx.createRadialGradient(cx, cy - s * 0.1, 0, cx, cy, s * 0.7);
      fGrad.addColorStop(0, 'rgba(255,170,140,0.7)');
      fGrad.addColorStop(0.6, 'rgba(220,120,100,0.5)');
      fGrad.addColorStop(1, 'rgba(180,80,60,0.3)');
      ctx.fillStyle = fGrad;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.4, s * 0.65, -0.2, 0, Math.PI * 2); ctx.fill();
      // Head
      ctx.fillStyle = 'rgba(255,180,150,0.65)';
      ctx.beginPath(); ctx.arc(cx + s * 0.12, cy - s * 0.5, s * 0.22, 0, Math.PI * 2); ctx.fill();
    };

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      ctx.fillStyle = '#04010a'; ctx.fillRect(0, 0, w, h);

      const cycleTime = time % (STAGES.length * STAGE_DUR);
      const stageIdx = Math.floor(cycleTime / STAGE_DUR);
      const stageT = (cycleTime % STAGE_DUR) / STAGE_DUR;

      const cx = w * 0.5, cy = h * 0.52;
      const s = Math.min(w, h) * 0.22;

      // Transition alpha
      const fadeIn = stageT < 0.15 ? stageT / 0.15 : stageT > 0.85 ? 1 - (stageT - 0.85) / 0.15 : 1;

      ctx.save(); ctx.globalAlpha = fadeIn;
      if (stageIdx === 0) drawNutfah(cx, cy, s);
      else if (stageIdx === 1) drawAlaqah(cx, cy, s);
      else if (stageIdx === 2) drawMudghah(cx, cy, s);
      else if (stageIdx === 3) drawIzaam(cx, cy, s);
      else drawLahm(cx, cy, s);
      ctx.restore();

      // Stage label in center
      ctx.save(); ctx.globalAlpha = fadeIn;
      ctx.font = `bold ${18 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = COLORS[stageIdx]; ctx.shadowColor = COLORS[stageIdx]; ctx.shadowBlur = 16;
      ctx.fillText(STAGES[stageIdx], cx, cy - s * 0.88);
      ctx.restore();

      // Highlight for mudghah
      if (stageIdx === 2) {
        ctx.save(); ctx.globalAlpha = fadeIn * 0.7;
        ctx.font = `${9 * dpr}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,180,100,0.7)'; ctx.shadowBlur = 0;
        ctx.fillText('قطعة كالممضوغة — مؤكد من كيث مور 1986', cx, cy + s * 0.85);
        ctx.restore();
      }

      // Progress dots
      STAGES.forEach((_, i) => {
        const dotX = cx + (i - 2) * 30, dotY = h * 0.9;
        ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
        ctx.fillStyle = i === stageIdx ? COLORS[i] : 'rgba(60,50,80,0.4)'; ctx.fill();
      });

      // Cell particles background
      cells.forEach((c) => {
        const alpha = (Math.sin(time * 0.8 + c.phase) * 0.15 + 0.2) * (stageIdx < 2 ? 0.6 : 0.12);
        ctx.beginPath(); ctx.arc(c.x * w, c.y * h, c.r * Math.min(w, h) * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80,120,255,${alpha})`; ctx.fill();
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
      style={{ background: '#04010a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(4,1,10,0.9) 0%, rgba(4,1,10,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(255,200,160,0.92)', textShadow: '0 0 18px rgba(200,120,60,0.4)' }}>
          ثُمَّ خَلَقْنَا النُّطْفَةَ{' '}
          <span style={{ color: '#88aaff' }}>عَلَقَةً</span>
          {' '}فَخَلَقْنَا الْعَلَقَةَ{' '}
          <span style={{ color: '#ffcc88', textShadow: '0 0 14px rgba(255,180,80,0.7)' }}>مُضْغَةً</span>
          {' '}فَخَلَقْنَا الْمُضْغَةَ{' '}
          <span style={{ color: '#e8e8d0' }}>عِظَامًا</span>
          {' '}فَكَسَوْنَا الْعِظَامَ{' '}
          <span style={{ color: '#ffaaaa' }}>لَحْمًا</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(160,100,60,0.45)' }}>
          سورة المؤمنون · الآية ١٤
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(4,1,10,0.92) 0%, rgba(4,1,10,0.5) 60%, rgba(4,1,10,0) 100%)', paddingTop: 28 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🦷', label: 'مُضغة = ممضوغ', sub: '28–31 يوم' },
            { icon: '🔬', label: 'السوميتات', sub: 'teeth marks pattern' },
            { icon: '📏', label: '4–6 mm', sub: 'حجم اللقمة' },
            { icon: '🏥', label: 'Keith Moore 1986', sub: 'U of Toronto' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(80,40,10,0.1)', border: '1px solid rgba(180,100,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(255,200,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(200,140,80,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
