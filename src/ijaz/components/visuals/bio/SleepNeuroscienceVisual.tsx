
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 😴 اللَّهُ يَتَوَفَّى الْأَنفُسَ — Sleep as Minor Death
// Az-Zumar 39:42 — soul taken at death & in sleep (wafah)
// Glymphatic system, brain waves, memory consolidation — Nedergaard 2013

export default function SleepNeuroscienceVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Sleep stages cycling
    const stages = ['يقظة\nAWAKE', 'NREM1\nخفيف', 'NREM2\nمتوسط', 'NREM3\nعميق', 'REM\nأحلام'];
    const stageColors = ['rgba(255,200,80,0.7)', 'rgba(120,180,255,0.6)', 'rgba(80,140,220,0.6)', 'rgba(40,80,200,0.7)', 'rgba(140,80,220,0.7)'];

    // Glymphatic flow particles
    type GParticle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number };
    const gParticles: GParticle[] = [];
    const spawnGlymph = (w: number, h: number) => {
      gParticles.push({
        x: Math.random() * w * 0.4 + w * 0.3,
        y: Math.random() * h * 0.28 + h * 0.12,
        vx: (Math.random() - 0.5) * 0.8, vy: Math.random() * 0.6 + 0.2,
        life: 0, maxLife: 80 + Math.random() * 60,
      });
    };

    // Synaptic sparks
    type Spark = { x: number; y: number; alpha: number; size: number };
    const sparks: Spark[] = Array.from({ length: 40 }, () => ({
      x: 0, y: 0, alpha: 0, size: 0,
    }));

    const drawBrain = (cx: number, cy: number, r: number, alpha: number) => {
      // Left hemisphere
      ctx.save(); ctx.globalAlpha = alpha;
      const bGrad = ctx.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r);
      bGrad.addColorStop(0, 'rgba(60,40,100,0.6)');
      bGrad.addColorStop(0.6, 'rgba(30,20,60,0.4)');
      bGrad.addColorStop(1, 'rgba(10,5,20,0.2)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.5);
      ctx.bezierCurveTo(cx - r * 1.2, cy + r * 0.3, cx - r * 1.3, cy - r * 0.6, cx - r * 0.6, cy - r * 0.9);
      ctx.bezierCurveTo(cx - r * 0.2, cy - r * 1.1, cx + r * 0.2, cy - r * 1.1, cx + r * 0.6, cy - r * 0.9);
      ctx.bezierCurveTo(cx + r * 1.3, cy - r * 0.6, cx + r * 1.2, cy + r * 0.3, cx, cy + r * 0.5);
      ctx.fill();
      // Brain folds
      ctx.strokeStyle = 'rgba(120,80,200,0.25)'; ctx.lineWidth = 1.5;
      for (let f = 0; f < 5; f++) {
        const fy = cy - r * 0.5 + f * r * 0.22;
        const fx0 = cx - r * 0.8, fx1 = cx + r * 0.8;
        ctx.beginPath();
        ctx.moveTo(fx0 + r * 0.1, fy);
        ctx.bezierCurveTo(fx0 + r * 0.4, fy - r * 0.08, fx1 - r * 0.4, fy + r * 0.08, fx1 - r * 0.1, fy);
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Deep dark sleep background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#020008');
      bgGrad.addColorStop(0.5, '#060015');
      bgGrad.addColorStop(1, '#03000f');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // ── Brain ─────────────────────────────────────────────────
      const brainCX = w * 0.5, brainCY = h * 0.36;
      const brainR = Math.min(w, h) * 0.13;
      drawBrain(brainCX, brainCY, brainR, 0.85);

      // ── Brain wave EEG ────────────────────────────────────────
      const stageIdx = Math.floor((time * 0.12) % stages.length);
      const waveFreq = [5, 3, 2, 0.8, 4][stageIdx];
      const waveAmp = [12, 8, 10, 16, 6][stageIdx] * dpr;
      const waveColor = stageColors[stageIdx];

      const waveY = h * 0.67;
      ctx.strokeStyle = waveColor.replace('0.', '0.'); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let px = 0; px < w; px += 2) {
        const t = px / w;
        const y = waveY + Math.sin(t * waveFreq * Math.PI * 2 + time * 2.5) * waveAmp
          * (stageIdx === 3 ? (0.5 + Math.sin(t * Math.PI) * 0.5) : 1);
        px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();

      // EEG label
      ctx.font = `${8 * dpr}px monospace`; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(120,100,200,0.45)';
      ctx.fillText('EEG', w * 0.02, waveY - waveAmp - 8);

      // ── Glymphatic particles ──────────────────────────────────
      if (stageIdx >= 2 && Math.random() < 0.25 && gParticles.length < 80) spawnGlymph(w, h);
      for (let i = gParticles.length - 1; i >= 0; i--) {
        const gp = gParticles[i];
        gp.x += gp.vx; gp.y += gp.vy; gp.life++;
        const a = (gp.life < gp.maxLife * 0.3) ? gp.life / (gp.maxLife * 0.3) : (1 - (gp.life - gp.maxLife * 0.3) / (gp.maxLife * 0.7));
        ctx.beginPath(); ctx.arc(gp.x, gp.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,200,255,${a * 0.45})`; ctx.fill();
        if (gp.life >= gp.maxLife) gParticles.splice(i, 1);
      }

      // ── Synaptic sparks in brain ──────────────────────────────
      sparks.forEach((sp, i) => {
        if (Math.random() < 0.03) {
          sp.x = brainCX + (Math.random() - 0.5) * brainR * 1.8;
          sp.y = brainCY + (Math.random() - 0.5) * brainR * 1.0;
          sp.alpha = 1; sp.size = Math.random() * 3 + 1;
        }
        if (sp.alpha > 0) {
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          const sc = ['rgba(200,160,255,', 'rgba(120,200,255,', 'rgba(180,120,255,'][i % 3];
          ctx.fillStyle = sc + sp.alpha * 0.5 + ')'; ctx.fill();
          sp.alpha -= 0.04;
        }
      });

      // ── Stage indicator ───────────────────────────────────────
      const stageW = w * 0.7, stageH = 16 * dpr;
      const stageX = w * 0.15, stageY = h * 0.78;
      stages.forEach((s, i) => {
        const sx = stageX + (stageW / stages.length) * i;
        const sw = stageW / stages.length;
        const active = i === stageIdx;
        ctx.fillStyle = active ? stageColors[i] : 'rgba(40,30,70,0.3)';
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(sx + 2, stageY, sw - 4, stageH, 4);
        ctx.fill();
        ctx.font = `${active ? 7.5 : 6.5}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillStyle = active ? 'rgba(255,255,255,0.9)' : 'rgba(120,100,180,0.4)';
        const line = s.split('\n');
        ctx.fillText(line[1] || '', sx + sw / 2, stageY + stageH * 0.65);
      });

      // Stage name
      ctx.font = `bold ${10 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = stageColors[stageIdx]; ctx.shadowColor = stageColors[stageIdx].replace('0.', '0.3,'); ctx.shadowBlur = 12;
      ctx.fillText(stages[stageIdx].split('\n')[0], w * 0.5, h * 0.86);
      ctx.shadowBlur = 0;

      // وَفَاة صُغْرَى label
      ctx.font = `bold ${11 * dpr}px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,150,255,0.5)'; ctx.shadowColor = 'rgba(140,100,255,0.3)'; ctx.shadowBlur = 8;
      ctx.fillText('وَفَاة صُغْرَى', w * 0.5, h * 0.1);
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
      style={{ background: '#020008' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(2,0,8,0.9) 0%, rgba(2,0,8,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(200,180,255,0.92)', textShadow: '0 0 18px rgba(140,100,255,0.4)' }}>
          اللَّهُ{' '}
          <span style={{ color: '#c89fff', textShadow: '0 0 14px rgba(180,140,255,0.7)' }}>يَتَوَفَّى الْأَنفُسَ</span>
          {' '}حِينَ مَوْتِهَا وَالَّتِي لَمْ تَمُتْ{' '}
          <span style={{ color: '#a070ff', textShadow: '0 0 12px rgba(160,100,255,0.6)' }}>فِي مَنَامِهَا</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(100,80,160,0.45)' }}>
          سورة الزمر · الآية ٤٢
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(2,0,8,0.92) 0%, rgba(2,0,8,0.5) 60%, rgba(2,0,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🧠', label: 'الجليمفاوي', sub: 'Nedergaard 2013' },
            { icon: '💜', label: 'NREM3 عميق', sub: 'وفاة صغرى' },
            { icon: '🔬', label: 'DNA إصلاح', sub: 'ذروة النوم العميق' },
            { icon: '💭', label: 'ذاكرة REM', sub: 'الهيبوكامبس' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(30,10,60,0.1)', border: '1px solid rgba(100,60,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(200,170,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(130,100,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
