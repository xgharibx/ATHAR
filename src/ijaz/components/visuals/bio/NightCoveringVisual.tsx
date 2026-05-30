
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌙 وَجَعَلْنَا اللَّيْلَ لِبَاسًا — Night as a Biological Covering
// لِبَاسًا = a garment/cloak that envelops — exactly how darkness works biologically
// Nobel 2017 Circadian Rhythm · Nedergaard 2013 Glymphatic System

export default function NightCoveringVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(),
      size: Math.pow(Math.random(), 3) * 2.2 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.5 + 0.5,
    }));

    // Melatonin molecules — floating dots in clusters
    type Molecule = { x: number; y: number; vx: number; vy: number; size: number; alpha: number };
    const melatonin: Molecule[] = Array.from({ length: 40 }, () => ({
      x: 0.3 + Math.random() * 0.2, y: 0.25 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.0008, vy: -Math.random() * 0.0006 - 0.0002,
      size: Math.random() * 3 + 1.5, alpha: Math.random() * 0.6 + 0.2,
    }));

    // DNA repair sparkles on right side
    const dnaSparkles = Array.from({ length: 25 }, () => ({
      x: 0.62 + Math.random() * 0.22, y: 0.2 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2, speed: Math.random() * 2 + 1,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Deep night bg
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#010215');
      bg.addColorStop(0.5, '#020318');
      bg.addColorStop(1, '#010110');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach((s) => {
        const t = Math.sin(time * s.speed + s.twinkle) * 0.25 + 0.75;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * t})`; ctx.fill();
        if (s.size > 1.5 && s.alpha > 0.5) {
          ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,210,255,${s.alpha * t * 0.07})`; ctx.fill();
        }
      });

      // ── Earth (left half) — globe with terminator line ────────
      const earthCx = w * 0.28, earthCy = h * 0.45, earthR = Math.min(w, h) * 0.18;

      // Night side (full dark)
      const nightGrad = ctx.createRadialGradient(earthCx, earthCy, 0, earthCx, earthCy, earthR);
      nightGrad.addColorStop(0, 'rgba(5,8,30,0.95)');
      nightGrad.addColorStop(0.7, 'rgba(8,12,40,0.92)');
      nightGrad.addColorStop(1, 'rgba(15,20,60,0.88)');
      ctx.fillStyle = nightGrad;
      ctx.beginPath(); ctx.arc(earthCx, earthCy, earthR, 0, Math.PI * 2); ctx.fill();

      // City lights on night side
      const cityLights = [
        [0.25, 0.35], [0.45, 0.28], [0.6, 0.45], [0.3, 0.6], [0.5, 0.65],
        [0.7, 0.35], [0.35, 0.5], [0.55, 0.52], [0.4, 0.4], [0.65, 0.6],
      ];
      cityLights.forEach(([fx, fy]) => {
        const lx = earthCx + (fx - 0.5) * earthR * 1.6;
        const ly = earthCy + (fy - 0.5) * earthR * 1.6;
        const dx = lx - earthCx, dy = ly - earthCy;
        if (Math.sqrt(dx * dx + dy * dy) < earthR * 0.92) {
          const glow = Math.sin(time * 1.5 + fx * 8) * 0.2 + 0.8;
          ctx.beginPath(); ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,240,180,${glow * 0.65})`; ctx.fill();
          ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,220,120,${glow * 0.12})`; ctx.fill();
        }
      });

      // Terminator line (day/night boundary) — thin glowing arc
      const termAngle = -Math.PI * 0.28 + Math.sin(time * 0.08) * 0.12;
      ctx.save();
      ctx.translate(earthCx, earthCy);
      // Day side gradient
      const dayClip = ctx.createLinearGradient(-earthR, 0, earthR, 0);
      dayClip.addColorStop(0, 'rgba(60,100,180,0.0)');
      dayClip.addColorStop(0.4, 'rgba(60,100,180,0.0)');
      dayClip.addColorStop(0.5, 'rgba(80,140,220,0.3)');
      dayClip.addColorStop(0.65, 'rgba(120,180,255,0.5)');
      dayClip.addColorStop(0.8, 'rgba(160,210,255,0.55)');
      dayClip.addColorStop(1, 'rgba(180,220,255,0.4)');
      ctx.rotate(termAngle);
      ctx.fillStyle = dayClip;
      ctx.beginPath(); ctx.arc(0, 0, earthR, -Math.PI / 2, Math.PI / 2);
      ctx.closePath(); ctx.fill();

      // Terminator glow
      const termGrad = ctx.createLinearGradient(0, -earthR, 0, earthR);
      termGrad.addColorStop(0, 'rgba(100,160,255,0.0)');
      termGrad.addColorStop(0.5, 'rgba(120,180,255,0.55)');
      termGrad.addColorStop(1, 'rgba(100,160,255,0.0)');
      ctx.strokeStyle = termGrad; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -earthR); ctx.lineTo(0, earthR); ctx.stroke();
      ctx.restore();

      // Earth atmosphere ring
      const atmGrad = ctx.createRadialGradient(earthCx, earthCy, earthR * 0.9, earthCx, earthCy, earthR * 1.15);
      atmGrad.addColorStop(0, 'rgba(60,100,200,0.15)');
      atmGrad.addColorStop(0.5, 'rgba(40,80,160,0.06)');
      atmGrad.addColorStop(1, 'rgba(20,40,100,0)');
      ctx.fillStyle = atmGrad;
      ctx.beginPath(); ctx.arc(earthCx, earthCy, earthR * 1.15, 0, Math.PI * 2); ctx.fill();

      // Earth outline
      ctx.strokeStyle = 'rgba(80,120,200,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(earthCx, earthCy, earthR, 0, Math.PI * 2); ctx.stroke();

      // ── Night garment cloak (sweeping arc around Earth) ──────
      const cloakPulse = Math.sin(time * 0.5) * 0.04 + 0.96;
      ctx.save();
      ctx.globalAlpha = 0.18 * cloakPulse;
      const cloakGrad = ctx.createRadialGradient(earthCx, earthCy, earthR * 0.85, earthCx, earthCy, earthR * 1.6);
      cloakGrad.addColorStop(0, 'rgba(20,10,60,0.8)');
      cloakGrad.addColorStop(0.5, 'rgba(10,5,40,0.4)');
      cloakGrad.addColorStop(1, 'rgba(5,2,20,0)');
      ctx.fillStyle = cloakGrad;
      ctx.beginPath(); ctx.arc(earthCx, earthCy, earthR * 1.6, -Math.PI * 0.85, Math.PI * 0.85);
      ctx.closePath(); ctx.fill();
      ctx.restore();

      // ── Melatonin molecules rising from earth ─────────────────
      melatonin.forEach((m) => {
        m.x += m.vx; m.y += m.vy;
        const dx = m.x * w - earthCx, dy = m.y * h - earthCy;
        if (Math.sqrt(dx * dx + dy * dy) > earthR * 2.2 || m.y < 0.1) {
          m.x = earthCx / w + (Math.random() - 0.5) * 0.06;
          m.y = earthCy / h + (Math.random() - 0.5) * 0.08;
          m.vy = -Math.random() * 0.0006 - 0.0002;
        }
        ctx.beginPath(); ctx.arc(m.x * w, m.y * h, m.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,100,255,${m.alpha * 0.65})`; ctx.fill();
        ctx.beginPath(); ctx.arc(m.x * w, m.y * h, m.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150,80,220,${m.alpha * 0.1})`; ctx.fill();
      });

      // ── Right panel: biological systems activating ────────────
      const bioX = w * 0.72;

      // DNA helix on right side
      const helixY = h * 0.38, helixHeight = h * 0.28;
      for (let i = 0; i < 30; i++) {
        const t2 = i / 29;
        const y = helixY + t2 * helixHeight;
        const phase = t2 * Math.PI * 5 + time * 1.5;
        const x1 = bioX + Math.cos(phase) * 18;
        const x2 = bioX + Math.cos(phase + Math.PI) * 18;
        // Strand dots
        const repairGlow = Math.sin(time * 2 + t2 * 8) * 0.3 + 0.7;
        ctx.beginPath(); ctx.arc(x1, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80,220,160,${repairGlow * 0.7})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80,160,255,${repairGlow * 0.7})`; ctx.fill();
        // Cross-bar
        if (i % 3 === 0) {
          ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
          ctx.strokeStyle = `rgba(100,200,150,${repairGlow * 0.25})`; ctx.lineWidth = 1; ctx.stroke();
        }
      }

      // DNA repair sparkles
      dnaSparkles.forEach((sp) => {
        const sparkA = (Math.sin(time * sp.speed + sp.phase) * 0.5 + 0.5);
        const sx = sp.x * w, sy = sp.y * h;
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,255,200,${sparkA * 0.7})`; ctx.fill();
        if (sparkA > 0.7) {
          ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(80,220,160,${sparkA * 0.2})`; ctx.fill();
        }
      });

      // Brain waves (glymphatic) at top-right
      const waveY = h * 0.24;
      for (let wv = 0; wv < 3; wv++) {
        const wAlpha = Math.sin(time * 0.8 + wv * 1.2) * 0.2 + 0.5;
        ctx.save();
        ctx.globalAlpha = wAlpha * 0.6;
        ctx.strokeStyle = 'rgba(160,120,255,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= 60; x++) {
          const wx = w * 0.64 + x * 1.2;
          const wy = waveY + wv * 10 + Math.sin((x / 60) * Math.PI * 4 + time * 2 + wv) * 5;
          x === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Pineal gland glow
      const pinealX = w * 0.68, pinealY = h * 0.30;
      const pinealPulse = Math.sin(time * 1.8) * 0.3 + 0.7;
      const pinGrad = ctx.createRadialGradient(pinealX, pinealY, 0, pinealX, pinealY, 16);
      pinGrad.addColorStop(0, `rgba(200,120,255,${pinealPulse * 0.7})`);
      pinGrad.addColorStop(1, 'rgba(150,80,220,0)');
      ctx.fillStyle = pinGrad;
      ctx.beginPath(); ctx.arc(pinealX, pinealY, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(220,150,255,${pinealPulse * 0.9})`;
      ctx.beginPath(); ctx.arc(pinealX, pinealY, 4, 0, Math.PI * 2); ctx.fill();

      // Label: lباس (the cloak word)
      const libasAlpha = Math.sin(time * 0.6) * 0.15 + 0.7;
      ctx.save();
      ctx.globalAlpha = libasAlpha;
      ctx.font = `bold ${18 * dpr}px serif`;
      ctx.fillStyle = '#8899ff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#6677ee'; ctx.shadowBlur = 14;
      ctx.fillText('لِبَاسًا', earthCx, earthCy - earthR * 1.5);
      ctx.font = `${9 * dpr}px sans-serif`;
      ctx.fillStyle = 'rgba(140,160,255,0.5)'; ctx.shadowBlur = 0;
      ctx.fillText('garment · cloak · covering', earthCx, earthCy - earthR * 1.5 + 18 * dpr);
      ctx.restore();

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
      style={{ background: '#010215' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* TOP verse */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,2,21,0.88) 0%, rgba(1,2,21,0) 100%)' }}>
        <p className="font-amiri text-lg md:text-xl leading-snug text-center"
          style={{ color: 'rgba(200,220,255,0.92)', textShadow: '0 0 22px rgba(100,120,255,0.5)' }}>
          وَجَعَلْنَا النَّوْمَ سُبَاتًا{' '}وَجَعَلْنَا اللَّيْلَ{' '}
          <span style={{ color: '#aabbff', textShadow: '0 0 16px rgba(150,170,255,0.8)' }}>لِبَاسًا</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(120,140,220,0.45)' }}>
          سورة النبأ · الآيتان ٩–١٠
        </p>
      </motion.div>

      {/* Bottom chips */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-2 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,2,21,0.92) 0%, rgba(1,2,21,0.5) 60%, rgba(1,2,21,0) 100%)', paddingTop: 20 }}>
        <p className="text-[10px] font-tajawal text-center" style={{ color: 'rgba(180,200,240,0.75)' }}>
          الليل{' '}
          <span style={{ color: 'rgba(160,180,255,0.9)' }}>لِبَاسٌ</span>
          {' '}يلف كل خلايا الجسم — الميلاتونين وإصلاح DNA وتنظيف الدماغ
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🧬', label: 'إصلاح DNA', sub: 'فقط في الظلام' },
            { icon: '🌀', label: 'ميلاتونين', sub: 'الغدة الصنوبرية' },
            { icon: '🧠', label: 'جهاز لمفي دماغي', sub: 'نيدرغارد 2013م' },
            { icon: '🏅', label: 'نوبل 2017م', sub: 'الإيقاع اليومي' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(60,80,180,0.08)', border: '1px solid rgba(80,100,200,0.2)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(180,200,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(140,160,220,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
