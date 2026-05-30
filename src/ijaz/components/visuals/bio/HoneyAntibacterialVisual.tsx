
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🍯 فِيهِ شِفَاءٌ لِلنَّاسِ — Honey as Healing
// An-Nahl 16:69 — honey contains healing for people
// H2O2, defensin-1, MGO, pH 3.2-4.5, osmotic — all antibacterial

export default function HoneyAntibacterialVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Hexagonal honeycomb grid
    type HexCell = { cx: number; cy: number; fill: number; bacteria: boolean };
    const hexCells: HexCell[] = [];

    // Honey particles (H2O2 and MGO)
    type HParticle = { x: number; y: number; vx: number; vy: number; type: 'h2o2' | 'mgo' | 'defensin'; alpha: number };
    const hParticles: HParticle[] = [];

    // Bacteria being destroyed
    type BacteriaCell = { x: number; y: number; size: number; dying: boolean; deathProgress: number; phase: number };
    const bacteriaCells: BacteriaCell[] = [];

    const buildHex = (w: number, h: number) => {
      hexCells.length = 0;
      const hexR = Math.min(w, h) * 0.06;
      const hexW = hexR * 2;
      const hexH = Math.sqrt(3) * hexR;
      const cols = Math.ceil(w / (hexW * 0.75)) + 1;
      const rows = Math.ceil(h * 0.55 / hexH) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c * hexW * 0.75;
          const cy = (r % 1 === 0 ? 0 : hexH * 0.5) + r * hexH + h * 0.1;
          const isOdd = c % 2 === 1;
          hexCells.push({ cx, cy: cy + (isOdd ? hexH * 0.5 : 0), fill: Math.random(), bacteria: Math.random() < 0.05 });
        }
      }
    };

    let lastW = 0, lastH = 0;

    const drawHex = (cx: number, cy: number, r: number, fillAmt: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
          : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
    };

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      if (w !== lastW || h !== lastH) { buildHex(w, h); lastW = w; lastH = h; }

      ctx.fillStyle = '#0f0800'; ctx.fillRect(0, 0, w, h);

      // ── Honeycomb background ──────────────────────────────────
      const hexR = Math.min(w, h) * 0.06;
      hexCells.forEach((cell) => {
        const honeyAlpha = 0.15 + cell.fill * 0.2 + Math.sin(time * 0.5 + cell.cx * 0.01) * 0.04;
        drawHex(cell.cx, cell.cy, hexR * 0.92, 0);
        const honeyGrad = ctx.createRadialGradient(cell.cx, cell.cy, 0, cell.cx, cell.cy, hexR);
        honeyGrad.addColorStop(0, `rgba(220,160,20,${honeyAlpha})`);
        honeyGrad.addColorStop(1, `rgba(160,100,10,${honeyAlpha * 0.5})`);
        ctx.fillStyle = honeyGrad; ctx.fill();
        ctx.strokeStyle = `rgba(180,130,30,${honeyAlpha * 0.8})`; ctx.lineWidth = 0.7; ctx.stroke();
      });

      // ── Honey glow center ─────────────────────────────────────
      const glowGrad = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.3);
      glowGrad.addColorStop(0, 'rgba(220,160,30,0.12)');
      glowGrad.addColorStop(0.5, 'rgba(180,120,20,0.06)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, w, h);

      // Spawn honey particles
      if (hParticles.length < 60 && Math.random() < 0.3) {
        const types: ('h2o2' | 'mgo' | 'defensin')[] = ['h2o2', 'mgo', 'defensin'];
        hParticles.push({
          x: Math.random() * w, y: Math.random() * h * 0.7 + h * 0.1,
          vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.6,
          type: types[Math.floor(Math.random() * 3)], alpha: 0.7,
        });
      }

      hParticles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < h * 0.1 || p.y > h * 0.75) p.vy *= -1;
        const colors = { h2o2: 'rgba(180,220,255,', mgo: 'rgba(255,180,60,', defensin: 'rgba(160,255,160,' };
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = colors[p.type] + p.alpha + ')'; ctx.fill();
        ctx.font = `5px monospace`; ctx.textAlign = 'center';
        ctx.fillStyle = colors[p.type] + p.alpha * 0.7 + ')';
        ctx.fillText(p.type === 'h2o2' ? 'H₂O₂' : p.type === 'mgo' ? 'MGO' : 'DEF', p.x, p.y - 6);
      });

      // شِفَاءٌ label
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,180,60,0.6)'; ctx.shadowColor = 'rgba(200,150,40,0.4)'; ctx.shadowBlur = 12;
      ctx.fillText('فِيهِ شِفَاءٌ لِلنَّاسِ', w * 0.5, h * 0.88);
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
      style={{ background: '#0f0800' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(15,8,0,0.9) 0%, rgba(15,8,0,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(240,210,140,0.92)', textShadow: '0 0 18px rgba(200,160,60,0.4)' }}>
          يَخْرُجُ مِن بُطُونِهَا شَرَابٌ مُّخْتَلِفٌ أَلْوَانُهُ{' '}
          <span style={{ color: '#ffd060', textShadow: '0 0 14px rgba(255,210,80,0.7)' }}>فِيهِ شِفَاءٌ لِلنَّاسِ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(130,100,30,0.45)' }}>
          سورة النحل · الآية ٦٩
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(15,8,0,0.92) 0%, rgba(15,8,0,0.5) 60%, rgba(15,8,0,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🍯', label: 'H₂O₂', sub: 'أكسجين مضاد' },
            { icon: '🔬', label: 'Defensin-1', sub: 'ببتيد مضاد' },
            { icon: '⚗️', label: 'pH 3.2–4.5', sub: 'حمضية قاتلة' },
            { icon: '💊', label: 'MGO مانوكا', sub: 'مضاد قوي' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(40,20,0,0.1)', border: '1px solid rgba(180,130,30,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(240,210,130,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(170,140,70,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
