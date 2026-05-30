
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🦶 كُلَّمَا نَضِجَتْ جُلُودُهُمْ — Pain Receptors in Skin
// An-Nisa 4:56 — fire replaced with new skins to taste punishment
// Nociceptors discovered 1906; pain requires functional skin nerve endings

export default function PainReceptorsSkinVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Skin layers
    // Nociceptor dendrites
    type Nociceptor = { x: number; y: number; branches: [number, number][] };
    const nociceptors: Nociceptor[] = Array.from({ length: 6 }, (_, i) => ({
      x: 0.12 + i * 0.15,
      y: 0.48,
      branches: [
        [0, -0.08], [-0.03, -0.12], [0.03, -0.12],
        [-0.05, -0.06], [0.05, -0.06],
      ],
    }));

    // Pain signals — traveling up nerve fiber
    type PainSignal = { x: number; y: number; progress: number; branch: number };
    const painSignals: PainSignal[] = [];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#0f0403'; ctx.fillRect(0, 0, w, h);

      // ── Skin layers ─────────────────────────────────────────
      // Epidermis
      const epiGrad = ctx.createLinearGradient(0, h * 0.32, 0, h * 0.48);
      epiGrad.addColorStop(0, 'rgba(200,140,100,0.6)');
      epiGrad.addColorStop(1, 'rgba(160,100,70,0.5)');
      ctx.fillStyle = epiGrad; ctx.fillRect(0, h * 0.32, w, h * 0.16);
      ctx.strokeStyle = 'rgba(180,120,80,0.2)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h * 0.32); ctx.lineTo(w, h * 0.32); ctx.stroke();
      ctx.fillStyle = 'rgba(180,120,80,0.25)'; ctx.font = `7px sans-serif`; ctx.textAlign = 'right';
      ctx.fillText('بشرة — epidermis', w * 0.96, h * 0.37);

      // Dermis
      const derGrad = ctx.createLinearGradient(0, h * 0.48, 0, h * 0.72);
      derGrad.addColorStop(0, 'rgba(140,80,60,0.6)');
      derGrad.addColorStop(1, 'rgba(100,50,40,0.5)');
      ctx.fillStyle = derGrad; ctx.fillRect(0, h * 0.48, w, h * 0.24);
      ctx.strokeStyle = 'rgba(160,80,50,0.2)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h * 0.48); ctx.lineTo(w, h * 0.48); ctx.stroke();
      ctx.fillStyle = 'rgba(160,80,50,0.2)'; ctx.font = `7px sans-serif`; ctx.textAlign = 'right';
      ctx.fillText('أدمة — dermis', w * 0.96, h * 0.57);

      // Subcutaneous
      ctx.fillStyle = 'rgba(80,50,30,0.5)'; ctx.fillRect(0, h * 0.72, w, h * 0.28);

      // ── Nociceptors ────────────────────────────────────────
      nociceptors.forEach((nc, ni) => {
        const active = Math.sin(time * 1.5 + ni * 1.1) > 0.3;
        const ncAlpha = active ? 0.8 : 0.3;
        // Main fiber (vertical downward)
        ctx.strokeStyle = `rgba(255,140,60,${ncAlpha})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(nc.x * w, nc.y * h); ctx.lineTo(nc.x * w, h * 0.78); ctx.stroke();
        // Dendrite branches
        nc.branches.forEach(([bx, by]) => {
          ctx.strokeStyle = `rgba(255,160,80,${ncAlpha * 0.7})`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(nc.x * w, nc.y * h);
          ctx.lineTo((nc.x + bx) * w, (nc.y + by) * h); ctx.stroke();
        });
        // Nociceptor dot
        ctx.beginPath(); ctx.arc(nc.x * w, nc.y * h, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,120,40,${ncAlpha})`; ctx.fill();
        if (active && Math.random() < 0.05) {
          painSignals.push({ x: nc.x * w, y: nc.y * h, progress: 0, branch: ni });
        }
      });

      // ── Pain signals traveling up nerve ─────────────────────
      for (let i = painSignals.length - 1; i >= 0; i--) {
        const ps = painSignals[i];
        ps.progress += 0.04;
        const py = ps.y + ps.progress * (h * 0.78 - ps.y);
        ctx.beginPath(); ctx.arc(ps.x, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,80,20,${(1 - ps.progress) * 0.7})`; ctx.fill();
        if (ps.progress >= 1) painSignals.splice(i, 1);
      }

      // Nerve bundle at bottom
      ctx.strokeStyle = 'rgba(255,120,40,0.25)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.78); ctx.lineTo(w * 0.7, h * 0.78); ctx.stroke();

      // نَضِجَتْ label
      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,160,80,0.55)'; ctx.shadowColor = 'rgba(255,120,40,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('كُلَّمَا نَضِجَتْ جُلُودُهُمْ', w * 0.5, h * 0.12);
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
      style={{ background: '#0f0403' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(15,4,3,0.9) 0%, rgba(15,4,3,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(250,200,160,0.92)', textShadow: '0 0 18px rgba(200,120,60,0.4)' }}>
          <span style={{ color: '#ff9955', textShadow: '0 0 14px rgba(255,150,80,0.7)' }}>كُلَّمَا نَضِجَتْ جُلُودُهُمْ</span>
          {' '}بَدَّلْنَاهُمْ جُلُودًا غَيْرَهَا
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(140,70,40,0.45)' }}>
          سورة النساء · الآية ٥٦
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(15,4,3,0.92) 0%, rgba(15,4,3,0.5) 60%, rgba(15,4,3,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🦶', label: 'nociceptors', sub: 'Sherrington 1906' },
            { icon: '⚡', label: 'ألم = جلد', sub: 'ليس عظم' },
            { icon: '🔥', label: 'تجديد = إحساس', sub: 'regenerate pain' },
            { icon: '🔬', label: 'TRPV1', sub: 'حرارة = ألم' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(30,8,4,0.1)', border: '1px solid rgba(180,80,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(255,180,120,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(180,100,60,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
