
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ❤️ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ — Heart Neuroscience
// Ar-Ra'd 13:28 — hearts find rest (تطمئن) — Quran attributes cognition to heart
// Armour & Ardell 1994 — 40,000 neurons in heart = heart's own brain
// HeartMath 2009 — HRV coherence measurably improves cognition

export default function HeartNeuroscienceVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Neural signal particles from heart to brain
    type Signal = { t: number; lane: number; alpha: number; speed: number };
    const signals: Signal[] = Array.from({ length: 22 }, (_, i) => ({
      t: Math.random(), lane: i % 5, alpha: Math.random() * 0.6 + 0.3, speed: Math.random() * 0.004 + 0.003,
    }));

    // 40k neuron sparkles on heart surface
    type Neuron = { angle: number; r: number; alpha: number; phase: number };
    const neurons: Neuron[] = Array.from({ length: 80 }, () => ({
      angle: Math.random() * Math.PI * 2,
      r: Math.random() * 0.95 + 0.05,
      alpha: Math.random(),
      phase: Math.random() * Math.PI * 2,
    }));

    // ECG wave
    const ecgWave = (t: number): number => {
      const tc = t % 1;
      if (tc < 0.08) return tc * 3;
      if (tc < 0.12) return 0.24 - (tc - 0.08) * 4;
      if (tc < 0.16) return 0.08 - (tc - 0.12) * 0.5;
      if (tc < 0.22) return 0.06 + (tc - 0.16) * 15;
      if (tc < 0.25) return 0.96 - (tc - 0.22) * 30;
      if (tc < 0.30) return 0.06 - (tc - 0.25) * 1.0;
      if (tc < 0.35) return 0.01 + (tc - 0.30) * 3;
      if (tc < 0.40) return 0.16 - (tc - 0.35) * 2;
      return 0.06 * Math.exp(-(tc - 0.4) * 8);
    };

    const drawHeart = (cx: number, cy: number, size: number, beat: number) => {
      const s = size * (1 + beat * 0.07);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      // Heart parametric
      for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        const x = s * 16 * Math.pow(Math.sin(a), 3) / 16;
        const y = -s * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const hGrad = ctx.createRadialGradient(0, -s * 0.1, 0, 0, 0, s);
      hGrad.addColorStop(0, `rgba(255,80,80,${0.85 + beat * 0.15})`);
      hGrad.addColorStop(0.5, `rgba(200,30,60,${0.75 + beat * 0.1})`);
      hGrad.addColorStop(1, `rgba(100,0,30,0.6)`);
      ctx.fillStyle = hGrad; ctx.fill();
      ctx.strokeStyle = `rgba(255,120,120,${0.5 + beat * 0.3})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    };

    const drawBrain = (cx: number, cy: number, size: number, activity: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      // Brain outline (simplified)
      const bGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      bGrad.addColorStop(0, `rgba(100,140,255,${0.4 + activity * 0.3})`);
      bGrad.addColorStop(0.6, `rgba(60,90,200,${0.25 + activity * 0.2})`);
      bGrad.addColorStop(1, 'rgba(30,50,120,0.15)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.82, 0, 0, Math.PI * 2);
      ctx.fill();
      // Brain folds
      ctx.strokeStyle = `rgba(120,160,255,${0.2 + activity * 0.15})`; ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r1 = size * 0.45, r2 = size * 0.8;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.2, Math.sin(a) * size * 0.2, r1 * (0.4 + Math.sin(i) * 0.15), a, a + Math.PI * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0f0005');
      bgGrad.addColorStop(0.5, '#080010');
      bgGrad.addColorStop(1, '#030008');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      const heartX = w * 0.35, heartY = h * 0.55;
      const brainX = w * 0.72, brainY = h * 0.4;
      const heartSize = Math.min(w, h) * 0.085;
      const brainSize = Math.min(w, h) * 0.1;

      // Heartbeat cycle
      const beatCycle = (time % 1.4) / 1.4;
      const beat = beatCycle < 0.08 ? Math.sin(beatCycle / 0.08 * Math.PI) : 0;
      const brainActivity = 0.3 + Math.sin(time * 1.1) * 0.15;

      // ── EM Field of heart (60x stronger than brain) ──────────
      for (let ring = 1; ring <= 4; ring++) {
        const ringR = heartSize * (1.8 + ring * 1.1);
        const ringAlpha = (0.12 - ring * 0.025) * (1 + beat * 0.3);
        const fGrad = ctx.createRadialGradient(heartX, heartY, ringR - 10, heartX, heartY, ringR + 10);
        fGrad.addColorStop(0, `rgba(255,80,80,${ringAlpha})`);
        fGrad.addColorStop(0.5, `rgba(255,60,60,${ringAlpha * 0.5})`);
        fGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath(); ctx.arc(heartX, heartY, ringR, 0, Math.PI * 2); ctx.fill();
      }

      // ── Neural pathway heart→brain (bidirectional) ───────────
      // 5 lanes of signal paths
      for (let lane = 0; lane < 5; lane++) {
        const pathCurveY = heartY + (lane - 2) * 14;
        const cpt1X = heartX + (brainX - heartX) * 0.3;
        const cpt2X = heartX + (brainX - heartX) * 0.7;
        const cpt1Y = pathCurveY - 20;
        const cpt2Y = pathCurveY - 25;

        ctx.strokeStyle = `rgba(180,100,255,0.08)`; ctx.lineWidth = 2;
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.moveTo(heartX + heartSize * 0.6, heartY);
        ctx.bezierCurveTo(cpt1X, cpt1Y, cpt2X, cpt2Y, brainX - brainSize * 0.6, brainY);
        ctx.stroke(); ctx.setLineDash([]);
      }

      // Signal particles
      signals.forEach((sig) => {
        sig.t += sig.speed;
        if (sig.t > 1) { sig.t = 0; sig.alpha = Math.random() * 0.6 + 0.3; }
        const lane = sig.lane;
        const laneOffset = (lane - 2) * 14;
        const cpt1X = heartX + (brainX - heartX) * 0.3;
        const cpt2X = heartX + (brainX - heartX) * 0.7;
        // Bezier position
        const t2 = sig.t;
        const bx = Math.pow(1-t2,3) * (heartX + heartSize*0.6)
          + 3*Math.pow(1-t2,2)*t2 * cpt1X
          + 3*(1-t2)*t2*t2 * cpt2X
          + t2*t2*t2 * (brainX - brainSize*0.6);
        const by = Math.pow(1-t2,3) * heartY
          + 3*Math.pow(1-t2,2)*t2 * (heartY + laneOffset - 20)
          + 3*(1-t2)*t2*t2 * (heartY + laneOffset - 25)
          + t2*t2*t2 * brainY;
        ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,140,255,${sig.alpha})`; ctx.fill();
        ctx.shadowColor = 'rgba(200,100,255,0.7)'; ctx.shadowBlur = 6; ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── Brain render ─────────────────────────────────────────
      drawBrain(brainX, brainY, brainSize, brainActivity);

      // Brain activation glow when signal arrives
      const brainGlow = 0.2 + Math.sin(time * 1.3) * 0.12;
      ctx.fillStyle = `rgba(100,140,255,${brainGlow * 0.25})`;
      ctx.beginPath(); ctx.arc(brainX, brainY, brainSize * 1.4, 0, Math.PI * 2); ctx.fill();

      // ── Heart render ─────────────────────────────────────────
      drawHeart(heartX, heartY, heartSize, beat);

      // ── 40k neurons on heart surface ─────────────────────────
      const nFireTime = time * 2.5;
      neurons.forEach((n) => {
        const nx = heartX + Math.cos(n.angle) * heartSize * n.r * 0.85;
        const ny = heartY + Math.sin(n.angle) * heartSize * n.r * 0.65;
        const spark = Math.sin(nFireTime + n.phase) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(nx, ny, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,120,${n.alpha * spark * 0.7})`; ctx.fill();
      });

      // 40k label
      ctx.font = `bold ${9 * dpr}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,200,100,0.55)'; ctx.shadowColor = 'rgba(255,160,60,0.4)'; ctx.shadowBlur = 8;
      ctx.fillText('40,000 خلية عصبية', heartX, heartY + heartSize * 1.6);
      ctx.font = `${7.5 * dpr}px sans-serif`; ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(200,160,80,0.35)';
      ctx.fillText('دماغ القلب', heartX, heartY + heartSize * 1.85);

      // ── ECG waveform ──────────────────────────────────────────
      const ecgY = h * 0.88, ecgX1 = w * 0.08, ecgW = w * 0.84;
      const ecgH = h * 0.045;
      ctx.strokeStyle = 'rgba(255,80,80,0.3)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(ecgX1, ecgY); ctx.lineTo(ecgX1 + ecgW, ecgY); ctx.stroke();

      ctx.strokeStyle = 'rgba(255,100,100,0.65)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      const timeOffset = (time * 0.6) % 1;
      for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const waveT = (t + timeOffset) % 1;
        const x = ecgX1 + t * ecgW;
        const y = ecgY - ecgWave(waveT) * ecgH * 2.5;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // تطمئن label
      ctx.font = `bold ${11 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,160,160,0.65)'; ctx.shadowColor = 'rgba(255,80,80,0.5)'; ctx.shadowBlur = 12;
      ctx.fillText('تَطْمَئِنُّ', heartX, heartY - heartSize * 1.6);
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
      style={{ background: '#0f0005' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(15,0,5,0.9) 0%, rgba(15,0,5,0) 100%)' }}>
        <p className="font-amiri text-lg md:text-xl leading-snug text-center"
          style={{ color: 'rgba(255,200,200,0.92)', textShadow: '0 0 20px rgba(255,80,80,0.35)' }}>
          أَلَا بِذِكْرِ اللَّهِ{' '}
          <span style={{ color: '#ff8888', textShadow: '0 0 14px rgba(255,100,100,0.7)' }}>تَطْمَئِنُّ الْقُلُوبُ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(160,60,80,0.45)' }}>
          سورة الرعد · الآية ٢٨
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(15,0,5,0.92) 0%, rgba(15,0,5,0.5) 60%, rgba(15,0,5,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🧠', label: '40,000 خلية عصبية', sub: 'دماغ القلب' },
            { icon: '📡', label: 'القلب → الدماغ', sub: 'إشارات أكثر' },
            { icon: '💓', label: 'HRV — اطمئنان', sub: 'HeartMath 2009' },
            { icon: '⚡', label: 'Armour 1994', sub: 'Neurocardiology' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(80,10,20,0.1)', border: '1px solid rgba(180,40,60,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(255,180,180,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(200,100,120,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
