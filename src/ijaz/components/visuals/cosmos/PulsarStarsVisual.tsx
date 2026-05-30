
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⭐ النَّجْمُ الثَّاقِبُ — Pulsar: The Piercing Star
// At-Tariq 86:1-3 — thaqib = piercing/boring — pulsars emit drilling beams
// Bell Burnell 1967 — first pulsar CP 1919 discovered at Cambridge

export default function PulsarStarsVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Background stars
    type Star = { x: number; y: number; size: number; alpha: number };
    const stars: Star[] = Array.from({ length: 350 }, () => ({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 1.5 + 0.2, alpha: Math.random() * 0.6 + 0.15,
    }));

    // Pulsar beam sweep — 2 opposite beams rotating
    // Real pulsars: up to 700 Hz; we use ~0.8 Hz visually
    const PULSE_RATE = 0.8; // rotations per second at time += 0.007

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Dark space background
      ctx.fillStyle = '#01000a'; ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5, cy = h * 0.5;
      const maxR = Math.max(w, h) * 0.7;

      // Stars
      stars.forEach((s) => {
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.alpha})`; ctx.fill();
      });

      // Swept beam glow — rotating like a lighthouse
      const beamAngle = time * PULSE_RATE * Math.PI * 2;
      const beamWidth = 0.08; // radians

      // Two opposite beams (magnetic poles)
      for (let pole = 0; pole < 2; pole++) {
        const angle = beamAngle + pole * Math.PI;
        // Beam trail — fade out behind
        for (let trail = 0; trail < 25; trail++) {
          const trailAngle = angle - trail * 0.012;
          const trailAlpha = (1 - trail / 25) * 0.18;

          // Draw beam sector manually
          ctx.save();
          ctx.globalAlpha = trailAlpha;
          ctx.translate(cx, cy);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, maxR, trailAngle - beamWidth * 0.5, trailAngle + beamWidth * 0.5);
          ctx.closePath();
          const sectorColor = pole === 0 ? 'rgba(100,200,255,' : 'rgba(180,100,255,';
          ctx.fillStyle = `${sectorColor}1)`;
          ctx.fill();
          ctx.restore();
        }

        // Leading beam edge — bright
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = 0.7;
        const beamGrad = ctx.createLinearGradient(0, 0, Math.cos(angle) * maxR, Math.sin(angle) * maxR);
        beamGrad.addColorStop(0, pole === 0 ? 'rgba(200,240,255,0.9)' : 'rgba(240,180,255,0.9)');
        beamGrad.addColorStop(0.3, pole === 0 ? 'rgba(100,200,255,0.4)' : 'rgba(180,100,255,0.4)');
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, maxR, angle - beamWidth * 0.3, angle + beamWidth * 0.3);
        ctx.closePath();
        ctx.fillStyle = beamGrad;
        ctx.fill();
        ctx.restore();
      }

      // ── Pulsar core — neutron star ────────────────────────────
      const pulsePhase = (time * PULSE_RATE) % 1;
      const pulseGlow = pulsePhase < 0.15 ? pulsePhase / 0.15 : Math.max(0, 1 - (pulsePhase - 0.15) / 0.3);

      // Accretion / magnetosphere rings
      for (let ring = 1; ring <= 4; ring++) {
        const ringR = ring * 18 + pulseGlow * 6;
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,180,255,${0.15 - ring * 0.03})`; ctx.lineWidth = 1; ctx.stroke();
      }

      // Core star
      const starGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12 + pulseGlow * 4);
      starGrad.addColorStop(0, `rgba(255,255,255,${0.95 + pulseGlow * 0.05})`);
      starGrad.addColorStop(0.3, `rgba(180,220,255,${0.8 + pulseGlow * 0.2})`);
      starGrad.addColorStop(0.7, `rgba(100,160,255,${0.4})`);
      starGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = starGrad; ctx.beginPath(); ctx.arc(cx, cy, 12 + pulseGlow * 4, 0, Math.PI * 2); ctx.fill();

      // Glow corona on pulse
      const coronaGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 50 + pulseGlow * 40);
      coronaGrad.addColorStop(0, `rgba(150,200,255,${pulseGlow * 0.6})`);
      coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = coronaGrad; ctx.beginPath(); ctx.arc(cx, cy, 50 + pulseGlow * 40, 0, Math.PI * 2); ctx.fill();

      // Magnetic field lines
      ctx.strokeStyle = 'rgba(80,120,200,0.08)'; ctx.lineWidth = 0.8;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 20 + i * 5, a, a + Math.PI);
        ctx.stroke();
      }

      // ── الثَّاقِبُ label ───────────────────────────────────────
      ctx.font = `bold ${14 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,220,255,0.7)'; ctx.shadowColor = 'rgba(100,200,255,0.5)'; ctx.shadowBlur = 14;
      ctx.fillText('الثَّاقِبُ', cx, cy + 42 + pulseGlow * 3);
      ctx.font = `${8 * dpr}px sans-serif`; ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(120,160,220,0.4)';
      ctx.fillText('the piercing one', cx, cy + 54 + pulseGlow * 2);

      // Pulse rate label
      ctx.font = `${8 * dpr}px monospace`; ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(100,160,220,0.3)';
      ctx.fillText('716 Hz max', w * 0.96, h * 0.12);
      ctx.fillText('Bell Burnell 1967', w * 0.96, h * 0.16);

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
      style={{ background: '#01000a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,10,0.9) 0%, rgba(1,0,10,0) 100%)' }}>
        <p className="font-amiri text-base md:text-lg leading-snug text-center"
          style={{ color: 'rgba(180,220,255,0.92)', textShadow: '0 0 20px rgba(80,180,255,0.4)' }}>
          وَالسَّمَاءِ وَالطَّارِقِ ﴿١﴾ وَمَا أَدْرَاكَ مَا الطَّارِقُ ﴿٢﴾{' '}
          <span style={{ color: '#aaddff', textShadow: '0 0 14px rgba(120,200,255,0.7)' }}>النَّجْمُ الثَّاقِبُ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,100,160,0.45)' }}>
          سورة الطارق · الآيات ١–٣
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,10,0.92) 0%, rgba(1,0,10,0.5) 60%, rgba(1,0,10,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⭐', label: 'ثاقب = يخترق', sub: 'piercing beam' },
            { icon: '🌀', label: 'نجم نيوتروني', sub: 'neutron star' },
            { icon: '⚡', label: '716 Hz', sub: 'fastest pulsar' },
            { icon: '🔭', label: 'Bell Burnell 1967', sub: 'Nobel 1974' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(20,40,80,0.1)', border: '1px solid rgba(60,100,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(160,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(100,140,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
