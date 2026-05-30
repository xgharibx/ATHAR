
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⭐ وَهُوَ الَّذِي جَعَلَ لَكُمُ النُّجُومَ لِتَهْتَدُوا — Stars for Navigation
// Al-An'am 6:97 — stars as navigational guides
// Celestial navigation, GPS based on same principles, Polaris star

export default function StarsNavigationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Stars: x,y fractions, size, brightness
    type Star = { x: number; y: number; size: number; twinkle: number; constellation: number };
    const stars: Star[] = Array.from({ length: 300 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.75,
      size: Math.random() * 2.5 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
      constellation: i < 20 ? Math.floor(i / 5) : -1,
    }));

    // Ship heading
    let shipAngle = 0;

    // Constellation lines (simplified: Ursa Major, Cassiopeia, Orion, Southern Cross)
    const constellations = [
      // Ursa Major (Big Dipper)
      { name: 'Ursa Major', pts: [[0.12,0.18],[0.17,0.16],[0.22,0.15],[0.27,0.17],[0.26,0.22],[0.22,0.25],[0.18,0.23]] },
      // Cassiopeia (W shape)
      { name: 'Cassiopeia', pts: [[0.6,0.08],[0.65,0.14],[0.7,0.08],[0.75,0.14],[0.8,0.08]] },
      // Polaris connection
      { name: 'Polaris', pts: [[0.45,0.05]] },
    ];

    // Ship particles trail
    type TrailPt = { x: number; y: number; alpha: number };
    const trail: TrailPt[] = [];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // Deep space dark background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#010008');
      bgGrad.addColorStop(0.5, '#020010');
      bgGrad.addColorStop(1, '#050515');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // ── Stars ─────────────────────────────────────────────────
      stars.forEach((s) => {
        const alpha = Math.sin(time * 1.5 + s.twinkle) * 0.12 + (s.constellation >= 0 ? 0.85 : 0.45);
        const color = s.constellation >= 0 ? `rgba(255,230,140,${alpha})` : `rgba(200,210,255,${alpha})`;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h * 0.85, s.size * (s.constellation >= 0 ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        if (s.constellation >= 0) {
          ctx.beginPath(); ctx.arc(s.x * w, s.y * h * 0.85, s.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,220,100,${alpha * 0.08})`; ctx.fill();
        }
      });

      // ── Constellation lines ───────────────────────────────────
      constellations.forEach((c) => {
        if (c.pts.length < 2) return;
        ctx.strokeStyle = 'rgba(220,200,100,0.18)'; ctx.lineWidth = 0.7; ctx.setLineDash([3, 5]);
        ctx.beginPath();
        c.pts.forEach(([cx, cy], i) => i === 0 ? ctx.moveTo(cx * w, cy * h * 0.85) : ctx.lineTo(cx * w, cy * h * 0.85));
        ctx.stroke(); ctx.setLineDash([]);
        // Name label
        ctx.font = `7px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(220,200,100,0.3)';
        ctx.fillText(c.name, c.pts[Math.floor(c.pts.length / 2)][0] * w, c.pts[Math.floor(c.pts.length / 2)][1] * h * 0.85 - 8);
      });

      // Polaris special glow
      const polarisX = 0.45 * w, polarisY = 0.05 * h * 0.85;
      const pg = Math.sin(time * 2) * 0.1 + 0.7;
      ctx.beginPath(); ctx.arc(polarisX, polarisY, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,220,255,${pg * 0.15})`; ctx.fill();
      ctx.beginPath(); ctx.arc(polarisX, polarisY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,240,255,${pg})`; ctx.fill();
      ctx.font = `7px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,220,255,0.5)';
      ctx.fillText('القطبية', polarisX, polarisY - 8);

      // ── Ocean horizon ─────────────────────────────────────────
      const horizY = h * 0.75;
      const oceanGrad = ctx.createLinearGradient(0, horizY, 0, h);
      oceanGrad.addColorStop(0, 'rgba(10,30,60,0.9)');
      oceanGrad.addColorStop(1, 'rgba(5,15,40,1)');
      ctx.fillStyle = oceanGrad; ctx.fillRect(0, horizY, w, h - horizY);
      ctx.strokeStyle = 'rgba(40,100,160,0.2)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, horizY); ctx.lineTo(w, horizY); ctx.stroke();
      // Ocean shimmer
      for (let i = 0; i < 20; i++) {
        const ox = (i / 20 + Math.sin(time * 0.5 + i) * 0.02) * w;
        const oy = horizY + Math.sin(time * 1.2 + i * 0.8) * 3 + 8;
        ctx.strokeStyle = `rgba(80,160,220,${Math.sin(time + i) * 0.05 + 0.1})`; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 20, oy); ctx.stroke();
      }

      // ── Ship ──────────────────────────────────────────────────
      shipAngle = Math.sin(time * 0.3) * 0.15;
      const shipX = w * 0.5, shipY = horizY + 12;
      ctx.save(); ctx.translate(shipX, shipY); ctx.rotate(shipAngle);
      ctx.fillStyle = 'rgba(120,100,60,0.7)';
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(14, 12); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill();
      // Mast
      ctx.strokeStyle = 'rgba(140,120,70,0.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
      // Sail
      ctx.fillStyle = 'rgba(220,200,160,0.4)';
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(18, -10); ctx.lineTo(0, -5); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Polaris bearing line
      ctx.strokeStyle = 'rgba(160,220,255,0.12)'; ctx.lineWidth = 0.5; ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(shipX, shipY); ctx.lineTo(polarisX, polarisY); ctx.stroke(); ctx.setLineDash([]);

      // لِتَهْتَدُوا label
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,200,120,0.55)'; ctx.shadowColor = 'rgba(200,180,80,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('لِتَهْتَدُوا بِها', w * 0.5, h * 0.9);
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
      style={{ background: '#010008' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,8,0.9) 0%, rgba(1,0,8,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(230,210,160,0.92)', textShadow: '0 0 18px rgba(200,180,80,0.4)' }}>
          وَهُوَ الَّذِي جَعَلَ لَكُمُ النُّجُومَ{' '}
          <span style={{ color: '#ffdd88', textShadow: '0 0 14px rgba(255,220,100,0.7)' }}>لِتَهْتَدُوا بِهَا</span>
          {' '}فِي ظُلُمَاتِ الْبَرِّ وَالْبَحْرِ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(130,110,50,0.45)' }}>
          سورة الأنعام · الآية ٩٧
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,8,0.92) 0%, rgba(1,0,8,0.5) 60%, rgba(1,0,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⭐', label: 'الجدي = الشمال', sub: 'Polaris' },
            { icon: '🧭', label: 'ملاحة فلكية', sub: '3000 سنة' },
            { icon: '🚀', label: 'GPS عبر أقمار', sub: 'نفس المبدأ' },
            { icon: '🌌', label: 'Big Dipper', sub: 'دب أكبر' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(30,20,5,0.1)', border: '1px solid rgba(160,130,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(230,210,150,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(160,140,80,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
