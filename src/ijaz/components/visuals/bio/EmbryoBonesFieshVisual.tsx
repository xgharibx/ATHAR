
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🦴 فَكَسَوْنَا الْعِظَامَ لَحْمًا — Bones Clothed in Flesh
// Al-Mu'minun 23:14 — bones formed THEN clothed in flesh
// Embryology: ossification precedes myogenesis — confirmed by Keith Moore

export default function EmbryoBonesFieshVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // 2-phase animation: bone formation then muscle coverage
    let phase: 'bones' | 'flesh' | 'complete' = 'bones';
    let phaseTime = 0;
    let boneProgress = 0;
    let fleshProgress = 0;

    const draw = () => {
      time += 0.007;
      phaseTime += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#080004'; ctx.fillRect(0, 0, w, h);

      // Phase cycling
      if (phase === 'bones') { boneProgress = Math.min(boneProgress + 0.005, 1); if (boneProgress >= 1 && phaseTime > 3) { phase = 'flesh'; phaseTime = 0; } }
      else if (phase === 'flesh') { fleshProgress = Math.min(fleshProgress + 0.004, 1); if (fleshProgress >= 1 && phaseTime > 3) { phase = 'complete'; phaseTime = 0; } }
      else if (phaseTime > 2) { phase = 'bones'; phaseTime = 0; boneProgress = 0; fleshProgress = 0; }

      const cx = w * 0.5, cy = h * 0.43;
      const scale = Math.min(w, h) * 0.0012;

      // Fetal silhouette (very simplified)
      ctx.save(); ctx.translate(cx, cy);

      // ── Bones (always show based on boneProgress) ─────────────────
      ctx.globalAlpha = boneProgress;
      const boneColor = 'rgba(220,210,180,';
      // Spine segments
      for (let i = 0; i < 10; i++) {
        const sy = -80 * scale + i * 16 * scale;
        ctx.fillStyle = boneColor + '0.7)';
        ctx.fillRect(-6 * scale, sy, 12 * scale, 12 * scale);
        ctx.strokeStyle = boneColor + '0.4)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(-6 * scale, sy, 12 * scale, 12 * scale);
      }
      // Skull
      ctx.fillStyle = boneColor + '0.7)';
      ctx.beginPath(); ctx.ellipse(0, -100 * scale, 22 * scale, 26 * scale, 0, 0, Math.PI * 2); ctx.fill();
      // Ribs
      for (let r = 0; r < 6; r++) {
        const ry = -40 * scale + r * 14 * scale;
        [-1, 1].forEach((side) => {
          ctx.strokeStyle = boneColor + '0.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(6 * scale * side, ry);
          ctx.bezierCurveTo(30 * scale * side, ry - 5 * scale, 35 * scale * side, ry + 8 * scale, 25 * scale * side, ry + 14 * scale); ctx.stroke();
        });
      }
      // Limb bones
      ctx.strokeStyle = boneColor + '0.6)'; ctx.lineWidth = 5 * scale;
      [-1, 1].forEach((s) => {
        // Arm
        ctx.beginPath(); ctx.moveTo(30 * scale * s, -60 * scale); ctx.lineTo(55 * scale * s, -20 * scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(55 * scale * s, -20 * scale); ctx.lineTo(60 * scale * s, 20 * scale); ctx.stroke();
        // Leg
        ctx.beginPath(); ctx.moveTo(12 * scale * s, 60 * scale); ctx.lineTo(20 * scale * s, 100 * scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20 * scale * s, 100 * scale); ctx.lineTo(18 * scale * s, 140 * scale); ctx.stroke();
      });

      // ── Flesh overlay (grows over bones) ─────────────────────
      if (fleshProgress > 0) {
        ctx.globalAlpha = fleshProgress * 0.7;
        const fleshGrad = ctx.createRadialGradient(0, 10 * scale, 0, 0, 10 * scale, 80 * scale);
        fleshGrad.addColorStop(0, 'rgba(180,100,80,0.6)');
        fleshGrad.addColorStop(0.5, 'rgba(160,80,60,0.4)');
        fleshGrad.addColorStop(1, 'rgba(140,60,40,0.1)');
        // Body outline
        ctx.fillStyle = 'rgba(180,100,80,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 10 * scale, 45 * scale, 90 * scale, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -100 * scale, 25 * scale, 28 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180,100,80,0.35)'; ctx.fill();
      }

      ctx.restore();

      // Phase label
      const labels = { bones: 'عظام — bone formation', flesh: 'لحم — flesh clothing', complete: 'فَكَسَوْنَا الْعظام' };
      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,180,140,0.55)'; ctx.shadowColor = 'rgba(180,120,80,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText(labels[phase], w * 0.5, h * 0.88);
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
      style={{ background: '#080004' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(8,0,4,0.9) 0%, rgba(8,0,4,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(230,200,160,0.92)', textShadow: '0 0 18px rgba(180,120,60,0.4)' }}>
          <span style={{ color: '#e8c87a', textShadow: '0 0 14px rgba(220,190,100,0.7)' }}>فَخَلَقْنَا الْعلَقَةَ مُضغَةً فَخَلَقْنَا الْمُضغَةَ عِظَامًا</span>
          {' '}فَكَسَوْنَا الْعِظَامَ{' '}
          <span style={{ color: '#e8b09a', textShadow: '0 0 12px rgba(220,160,120,0.6)' }}>لَحْمًا</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(130,90,50,0.45)' }}>
          سورة المؤمنون · الآية ١٤
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(8,0,4,0.92) 0%, rgba(8,0,4,0.5) 60%, rgba(8,0,4,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🦴', label: 'عظام ثم لحم', sub: 'تسلسل دقيق' },
            { icon: '🔬', label: 'Keith Moore 1986', sub: 'embryology' },
            { icon: '👶', label: 'أسبوع 28–31', sub: 'ossification' },
            { icon: '💪', label: 'myogenesis', sub: 'بعد العظام' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(30,10,5,0.1)', border: '1px solid rgba(160,100,60,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(230,190,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(160,120,80,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
