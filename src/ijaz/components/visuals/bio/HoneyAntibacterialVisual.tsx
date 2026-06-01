import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🍯 فِيهِ شِفَاءٌ لِلنَّاسِ — Honey as Healing (النحل 69)
// ULTIMATE: a living honeycomb glows and drips; antibacterial agents (H₂O₂, MGO,
// Defensin-1) actively hunt bacteria across the field, strike them, and detonate
// them in golden bursts — a visible immune battle inside the honey.

export default function HoneyAntibacterialVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    type HexCell = { cx: number; cy: number; fill: number };
    const hexCells: HexCell[] = [];

    type Agent = { x: number; y: number; type: 'h2o2' | 'mgo' | 'defensin'; target: number; speed: number };
    const agents: Agent[] = [];

    type Bacteria = { x: number; y: number; size: number; phase: number; dying: number; alive: boolean };
    const bacteria: Bacteria[] = [];

    type Burst = { x: number; y: number; life: number };
    const bursts: Burst[] = [];

    type Drip = { x: number; y: number; vy: number; len: number };
    const drips: Drip[] = [];

    const COLORS = { h2o2: '180,220,255', mgo: '255,180,60', defensin: '160,255,160' };
    const LABEL = { h2o2: 'H₂O₂', mgo: 'MGO', defensin: 'DEF' };

    const buildHex = (w: number, h: number) => {
      hexCells.length = 0;
      const hexR = Math.min(w, h) * 0.06;
      const hexW = hexR * 2;
      const hexH = Math.sqrt(3) * hexR;
      const cols = Math.ceil(w / (hexW * 0.75)) + 1;
      const rows = Math.ceil(h / hexH) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = c * hexW * 0.75;
          const isOdd = c % 2 === 1;
          const cy = r * hexH + (isOdd ? hexH * 0.5 : 0);
          hexCells.push({ cx, cy, fill: Math.random() });
        }
      }
    };

    let lastW = 0, lastH = 0;

    const drawHex = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
    };

    const spawnBacteria = (w: number, h: number) => {
      bacteria.push({
        x: Math.random() * w * 0.8 + w * 0.1,
        y: Math.random() * h * 0.55 + h * 0.12,
        size: Math.random() * 4 + 5,
        phase: Math.random() * Math.PI * 2,
        dying: 0,
        alive: true,
      });
    };

    const spawnAgent = (w: number, h: number) => {
      const types: ('h2o2' | 'mgo' | 'defensin')[] = ['h2o2', 'mgo', 'defensin'];
      agents.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.6 + h * 0.1,
        type: types[Math.floor(Math.random() * 3)],
        target: -1,
        speed: Math.random() * 0.6 + 0.9,
      });
    };

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      if (w !== lastW || h !== lastH) {
        buildHex(w, h); lastW = w; lastH = h;
        bacteria.length = 0; agents.length = 0;
        for (let i = 0; i < 6; i++) spawnBacteria(w, h);
        for (let i = 0; i < 14; i++) spawnAgent(w, h);
      }

      ctx.fillStyle = '#0f0800'; ctx.fillRect(0, 0, w, h);

      // Honeycomb with pulsing golden fill
      const hexR = Math.min(w, h) * 0.06;
      hexCells.forEach((cell) => {
        const a = 0.14 + cell.fill * 0.18 + Math.sin(time * 1.2 + cell.cx * 0.02 + cell.cy * 0.02) * 0.06;
        drawHex(cell.cx, cell.cy, hexR * 0.92);
        const g = ctx.createRadialGradient(cell.cx, cell.cy, 0, cell.cx, cell.cy, hexR);
        g.addColorStop(0, `rgba(230,170,30,${a})`);
        g.addColorStop(1, `rgba(150,95,10,${a * 0.5})`);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = `rgba(190,140,35,${a})`; ctx.lineWidth = 0.8; ctx.stroke();
      });

      // Central honey glow
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.35);
      glow.addColorStop(0, 'rgba(230,170,40,0.14)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

      // Honey drips
      if (Math.random() < 0.04) drips.push({ x: Math.random() * w, y: h * 0.62, vy: 0.3, len: 0 });
      for (let i = drips.length - 1; i >= 0; i--) {
        const d = drips[i];
        d.vy += 0.02; d.y += d.vy; d.len = Math.min(d.len + 0.5, 18);
        const grd = ctx.createLinearGradient(d.x, d.y - d.len, d.x, d.y);
        grd.addColorStop(0, 'rgba(230,170,40,0)');
        grd.addColorStop(1, 'rgba(245,195,70,0.7)');
        ctx.strokeStyle = grd; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(d.x, d.y - d.len); ctx.lineTo(d.x, d.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(d.x, d.y, 2.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(250,205,80,0.8)'; ctx.fill();
        if (d.y > h) drips.splice(i, 1);
      }

      // Maintain populations
      if (bacteria.filter(b => b.alive).length < 5 && Math.random() < 0.03) spawnBacteria(w, h);

      // Bacteria
      bacteria.forEach((b) => {
        if (!b.alive) return;
        if (b.dying > 0) {
          b.dying += 0.05;
          const p = b.dying;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size * (1 + p), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,210,90,${Math.max(0, 1 - p)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          if (b.dying >= 1) { b.alive = false; bursts.push({ x: b.x, y: b.y, life: 0 }); }
          return;
        }
        b.x += Math.sin(time * 0.8 + b.phase) * 0.4;
        b.y += Math.cos(time * 0.6 + b.phase) * 0.3;
        // rod-shaped bacterium
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.phase + time * 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, b.size, b.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120,180,90,0.55)';
        ctx.strokeStyle = 'rgba(150,220,110,0.8)';
        ctx.lineWidth = 1;
        ctx.fill(); ctx.stroke();
        ctx.restore();
      });

      // Agents hunt nearest living bacterium
      agents.forEach((ag) => {
        // pick target
        if (ag.target < 0 || !bacteria[ag.target]?.alive || bacteria[ag.target]?.dying > 0) {
          let best = -1, bestD = Infinity;
          bacteria.forEach((b, idx) => {
            if (!b.alive || b.dying > 0) return;
            const d = Math.hypot(b.x - ag.x, b.y - ag.y);
            if (d < bestD) { bestD = d; best = idx; }
          });
          ag.target = best;
        }
        const tgt = ag.target >= 0 ? bacteria[ag.target] : null;
        if (tgt && tgt.alive) {
          const dx = tgt.x - ag.x, dy = tgt.y - ag.y;
          const d = Math.hypot(dx, dy) || 1;
          ag.x += (dx / d) * ag.speed;
          ag.y += (dy / d) * ag.speed;
          if (d < tgt.size + 3 && tgt.dying === 0) tgt.dying = 0.01;
        } else {
          ag.x += Math.sin(time + ag.y) * 0.3;
          ag.y += Math.cos(time + ag.x) * 0.3;
        }
        const col = COLORS[ag.type];
        ctx.beginPath();
        ctx.arc(ag.x, ag.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},0.9)`;
        ctx.shadowColor = `rgba(${col},0.8)`; ctx.shadowBlur = 6;
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.font = '5px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(${col},0.7)`;
        ctx.fillText(LABEL[ag.type], ag.x, ag.y - 6);
      });

      // Bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const bu = bursts[i];
        bu.life += 0.04;
        const p = bu.life;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const rr = p * 24;
          ctx.beginPath();
          ctx.arc(bu.x + Math.cos(a) * rr, bu.y + Math.sin(a) * rr, 2 * (1 - p), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,215,100,${Math.max(0, 1 - p)})`;
          ctx.fill();
        }
        if (bu.life >= 1) bursts.splice(i, 1);
      }

      // شِفَاءٌ label
      ctx.font = 'bold 13px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(225,185,65,0.65)';
      ctx.shadowColor = 'rgba(200,150,40,0.5)'; ctx.shadowBlur = 14;
      ctx.fillText('فِيهِ شِفَاءٌ لِلنَّاسِ', w * 0.5, h * 0.9);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#0f0800' }}>
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
