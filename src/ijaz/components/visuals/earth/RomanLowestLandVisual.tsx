
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌍 أَدْنَى الْأَرْضِ — Romans at the Lowest Point on Earth
// Ar-Rum 30:2-4 — adna = lowest/nearest — Dead Sea region -430m
// Modern geodetic surveys confirmed lowest exposed land on Earth

export default function RomanLowestLandVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Jordan Rift Valley topographic cross-section
    // Sea level at 60% height; Dead Sea at -430m shown below

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      ctx.fillStyle = '#04080a'; ctx.fillRect(0, 0, w, h);

      const seaLevelY = h * 0.42; // sea level reference line
      const metersPerPx = 0.35; // meters per pixel

      // ── Sky ──────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, seaLevelY);
      skyGrad.addColorStop(0, '#050c15');
      skyGrad.addColorStop(1, '#0a1828');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, seaLevelY);

      // Stars
      for (let i = 0; i < 60; i++) {
        const sx = (Math.sin(i * 47.3) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 31.7) * 0.5 + 0.5) * seaLevelY * 0.85;
        const salpha = Math.sin(time * 0.8 + i) * 0.15 + 0.3;
        ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${salpha})`; ctx.fill();
      }

      // ── Terrain profile ───────────────────────────────────────
      // Cross-section of Jordan Rift Valley (simplified)
      // Left: Judean Mountains (800m above sea level)
      // Center: Jordan River valley → Dead Sea (-430m)
      // Right: Transjordanian Plateau (900m)

      const toY = (altitudeM: number) => seaLevelY - altitudeM / metersPerPx * (h * 0.0025);

      const terrainProfile: [number, number][] = [
        [0, 300], [0.05, 400], [0.1, 600], [0.18, 780], [0.22, 820],
        [0.28, 750], [0.34, 500], [0.38, 200], [0.42, 0],
        [0.44, -200], [0.47, -380], [0.50, -430], // Dead Sea bottom
        [0.52, -380], [0.55, -200], [0.58, 0],
        [0.62, 200], [0.66, 500], [0.72, 780], [0.78, 900],
        [0.84, 850], [0.9, 750], [0.95, 600], [1.0, 400],
      ];

      // Fill terrain
      const terrGrad = ctx.createLinearGradient(0, seaLevelY, 0, h);
      terrGrad.addColorStop(0, '#2a3a1a');
      terrGrad.addColorStop(0.4, '#1a2a12');
      terrGrad.addColorStop(1, '#0a1508');
      ctx.fillStyle = terrGrad;
      ctx.beginPath(); ctx.moveTo(0, h);
      terrainProfile.forEach(([xFrac, alt]) => ctx.lineTo(xFrac * w, toY(alt)));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();

      // Terrain stroke
      ctx.strokeStyle = 'rgba(80,140,60,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); terrainProfile.forEach(([xFrac, alt], i) => {
        i === 0 ? ctx.moveTo(xFrac * w, toY(alt)) : ctx.lineTo(xFrac * w, toY(alt));
      }); ctx.stroke();

      // ── Dead Sea fill ─────────────────────────────────────────
      const deadSeaL = 0.42 * w, deadSeaR = 0.58 * w;
      const deadSeaTopY = seaLevelY;
      const deadSeaBotY = toY(-430);

      const dseaGrad = ctx.createLinearGradient(0, deadSeaTopY, 0, deadSeaBotY);
      dseaGrad.addColorStop(0, 'rgba(20,60,120,0.5)');
      dseaGrad.addColorStop(0.5, 'rgba(10,40,100,0.7)');
      dseaGrad.addColorStop(1, 'rgba(5,20,60,0.8)');
      ctx.fillStyle = dseaGrad;
      ctx.beginPath(); ctx.moveTo(deadSeaL, deadSeaTopY);
      ctx.lineTo(deadSeaR, deadSeaTopY);
      ctx.lineTo(deadSeaR * 0.975, deadSeaBotY);
      ctx.lineTo(deadSeaL * 1.025, deadSeaBotY); ctx.closePath(); ctx.fill();

      // Dead Sea surface glimmer
      for (let i = 0; i < 8; i++) {
        const gx = deadSeaL + (deadSeaR - deadSeaL) * (i / 7);
        const gy = deadSeaTopY + Math.sin(time * 1.5 + i * 0.8) * 2;
        ctx.beginPath(); ctx.arc(gx, gy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,180,255,${Math.sin(time * 2 + i) * 0.1 + 0.2})`; ctx.fill();
      }

      // ── Sea level reference line ──────────────────────────────
      ctx.strokeStyle = 'rgba(100,160,220,0.25)'; ctx.lineWidth = 0.7;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(0, seaLevelY); ctx.lineTo(w, seaLevelY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `${7.5 * dpr}px monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(100,160,220,0.3)';
      ctx.fillText('مستوى سطح البحر 0m', w * 0.01, seaLevelY - 4);

      // -430m arrow
      const arrowY = toY(-430);
      ctx.strokeStyle = 'rgba(255,200,60,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w * 0.28, seaLevelY); ctx.lineTo(w * 0.28, arrowY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w * 0.28 - 4, arrowY + 8); ctx.lineTo(w * 0.28, arrowY); ctx.lineTo(w * 0.28 + 4, arrowY + 8); ctx.stroke();
      ctx.font = `${8 * dpr}px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,200,60,0.45)';
      ctx.fillText('−430 m', w * 0.28, arrowY - 5);

      // Dead Sea label
      ctx.font = `bold ${8.5 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(120,180,255,0.55)'; ctx.shadowColor = 'rgba(80,160,255,0.3)'; ctx.shadowBlur = 8;
      ctx.fillText('البحر الميت', w * 0.5, deadSeaTopY + (deadSeaBotY - deadSeaTopY) * 0.5);
      ctx.font = `${7 * dpr}px sans-serif`; ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(100,150,220,0.35)';
      ctx.fillText('أخفض نقطة على الأرض', w * 0.5, deadSeaTopY + (deadSeaBotY - deadSeaTopY) * 0.5 + 10 * dpr);

      // ── Roman battle markers ──────────────────────────────────
      const battleX = w * 0.36, battleY = toY(180);
      const markerPulse = Math.sin(time * 1.8) * 0.2 + 0.7;
      // Roman eagle symbol
      ctx.beginPath(); ctx.arc(battleX, battleY, 8 * (1 + markerPulse * 0.08), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200,80,60,${markerPulse * 0.6})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = `${10 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(220,100,80,${markerPulse * 0.8})`;
      ctx.fillText('⚔', battleX, battleY + 4 * dpr);

      // Battle label
      ctx.font = `${7.5 * dpr}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,120,100,0.45)';
      ctx.fillText('معركة 614م', battleX, battleY - 14 * dpr);

      // أدنى label
      ctx.font = `bold ${11 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,220,100,0.6)'; ctx.shadowColor = 'rgba(255,200,60,0.4)'; ctx.shadowBlur = 10;
      ctx.fillText('أَدْنَى الْأَرْضِ', w * 0.5, h * 0.88);
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
      style={{ background: '#04080a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(4,8,10,0.9) 0%, rgba(4,8,10,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(220,200,160,0.92)', textShadow: '0 0 18px rgba(200,160,80,0.4)' }}>
          غُلِبَتِ الرُّومُ ﴿٢﴾{' '}
          <span style={{ color: '#ffdd88', textShadow: '0 0 14px rgba(255,220,100,0.7)' }}>فِي أَدْنَى الْأَرْضِ</span>
          {' '}وَهُم مِّن بَعْدِ غَلَبِهِمْ سَيَغْلِبُونَ ﴿٣﴾ فِي بِضْعِ سِنِينَ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(140,120,60,0.45)' }}>
          سورة الروم · الآيات ٢–٤
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(4,8,10,0.92) 0%, rgba(4,8,10,0.5) 60%, rgba(4,8,10,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '📉', label: '−430 متر', sub: 'Dead Sea' },
            { icon: '🌍', label: 'أدنى = الأخفض', sub: 'lowest on Earth' },
            { icon: '⚔️', label: 'معركة 614م', sub: 'Persia vs Rome' },
            { icon: '🔮', label: 'نبوءة تحققت', sub: '622–628م' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(60,50,10,0.1)', border: '1px solid rgba(160,130,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(240,210,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(180,160,80,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
