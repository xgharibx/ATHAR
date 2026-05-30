
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🕸️ وَإِنَّ أَوْهَنَ الْبُيُوتِ لَبَيْتُ الْعَنكَبُوتِ — Spider Web Weakness
// Al-Ankabut 29:41 — spider web = weakest house
// Materials science: spider silk strong but the WEB structure is fragile

export default function SpiderWebWeaknessVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let breakProgress = 0;
    let breaking = false;

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const cx = w * 0.5, cy = h * 0.44;
      const maxR = Math.min(w, h) * 0.32;
      const rings = 8, spokes = 16;

      ctx.fillStyle = '#030c05'; ctx.fillRect(0, 0, w, h);

      // Background foliage hints
      for (let i = 0; i < 20; i++) {
        const lx = (Math.sin(i * 37.1) * 0.5 + 0.5) * w;
        const ly = (Math.cos(i * 29.3) * 0.5 + 0.5) * h;
        ctx.beginPath(); ctx.arc(lx, ly, 4 + Math.sin(i) * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30,60,20,0.3)`; ctx.fill();
      }

      // Break cycle: every 8s
      if (Math.sin(time * 0.2) > 0.99) breaking = true;
      if (breaking) {
        breakProgress += 0.012;
        if (breakProgress >= 1) { breaking = false; breakProgress = 0; }
      }

      // ── Web structure ─────────────────────────────────────────
      const webAlpha = breaking ? (1 - breakProgress) * 0.6 : 0.5;
      const webColor = `rgba(220,210,200,${webAlpha})`;

      // Radial spokes
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2;
        ctx.strokeStyle = webColor; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR); ctx.stroke();
      }

      // Spiral rings
      for (let r = 1; r <= rings; r++) {
        const radius = (r / rings) * maxR;
        const sag = breaking ? breakProgress * 5 * (r / rings) : 0; // drooping
        ctx.strokeStyle = webColor; ctx.lineWidth = r === 1 ? 1 : 0.5;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
          const px = cx + Math.cos(a) * radius;
          const py = cy + Math.sin(a) * radius + sag * Math.sin(a + 1) * 2;
          a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Web anchor points
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR, 2, 0, Math.PI * 2);
        ctx.fillStyle = webColor; ctx.fill();
      }

      // Spider at center
      const spiderPulse = Math.sin(time * 2) * 0.05 + 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, 8 * spiderPulse, 6 * spiderPulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,60,40,0.7)'; ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,60,0.4)'; ctx.lineWidth = 0.5; ctx.stroke();
      // Spider legs
      for (let l = 0; l < 8; l++) {
        const la = (l / 8) * Math.PI * 2 + time * 0.1;
        ctx.strokeStyle = 'rgba(80,60,40,0.35)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(la) * 8, cy + Math.sin(la) * 6);
        ctx.lineTo(cx + Math.cos(la) * 20, cy + Math.sin(la) * 14); ctx.stroke();
      }

      // Break label
      if (breaking) {
        ctx.font = `bold 10px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255,200,100,${breakProgress * 0.7})`;
        ctx.fillText('أوهن بيت', cx, cy + maxR + 20);
      }

      // أَوْهَنَ label
      ctx.font = `bold 11px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,200,160,0.5)'; ctx.shadowColor = 'rgba(100,150,60,0.3)'; ctx.shadowBlur = 8;
      ctx.fillText('أَوْهَنَ الْبُيُوتِ بَيْتُ الْعَنكَبُوتِ', w * 0.5, h * 0.91);
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
      style={{ background: '#030c05' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(3,12,5,0.9) 0%, rgba(3,12,5,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(200,220,180,0.92)', textShadow: '0 0 18px rgba(100,160,60,0.4)' }}>
          إِنَّ أَوْهَنَ الْبُيُوتِ{' '}
          <span style={{ color: '#88cc66', textShadow: '0 0 14px rgba(120,200,80,0.7)' }}>لَبَيْتُ الْعَنكَبُوتِ</span>
          {' '}لَوْ كَانُوا يَعْلَمُونَ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,100,40,0.45)' }}>
          سورة العنكبوت · الآية ٤١
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(3,12,5,0.92) 0%, rgba(3,12,5,0.5) 60%, rgba(3,12,5,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🕸️', label: 'بيت = هيكل', sub: 'ليس خيطان' },
            { icon: '🔬', label: 'خيط = أقوى فولاذ', sub: 'per kg' },
            { icon: '🧵', label: 'هيكل = أضعف', sub: 'structure' },
            { icon: '⚡', label: 'Silk ≠ Web', sub: 'الفرق مهم' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(5,20,3,0.1)', border: '1px solid rgba(80,120,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(180,220,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(100,160,70,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
