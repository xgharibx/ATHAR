
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🧬 الحمض النووي لغة تدل على الله — DNA Information Argument
// الانفطار 82:7-8 — خلق · سوّى · عدّل = برمجة، صياغة، تحسين
// Rotating 3D double helix with flowing base pairs (A-T / G-C)

const BASE_COLORS: Record<string, string> = {
  A: '#d4a853', // gold
  T: '#2dd4a8', // green
  G: '#60a5fa', // blue
  C: '#f472b6', // pink
};
const COMPLEMENT: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };

export default function DNAInformationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    // Fixed sequence of rungs so the "code" reads as real information, not noise.
    const SEQ = ['A', 'T', 'G', 'C', 'A', 'A', 'G', 'T', 'C', 'G', 'T', 'A', 'C', 'G', 'A', 'T', 'G', 'C', 'T', 'A', 'G', 'C', 'A', 'T'];
    const RUNGS = SEQ.length;

    // Drifting code letters in the background (genetic alphabet rain)
    const codeRain = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      ch: SEQ[Math.floor(Math.random() * SEQ.length)],
      speed: Math.random() * 0.04 + 0.012,
      alpha: Math.random() * 0.18 + 0.05,
      size: Math.random() * 8 + 8,
    }));

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w * 0.5;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0a0a1a');
      bg.addColorStop(0.5, '#0d1117');
      bg.addColorStop(1, '#0a1520');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Genetic alphabet rain
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      codeRain.forEach((c) => {
        c.y += c.speed * 0.01;
        if (c.y > 1.05) { c.y = -0.05; c.x = Math.random(); c.ch = SEQ[Math.floor(Math.random() * SEQ.length)]; }
        ctx.font = `${c.size}px monospace`;
        ctx.fillStyle = `rgba(120,180,160,${c.alpha})`;
        ctx.fillText(c.ch, c.x * w, c.y * h);
      });

      // ── Rotating double helix ──
      const helixTop = h * 0.16;
      const helixBottom = h * 0.66;
      const helixH = helixBottom - helixTop;
      const amp = Math.min(w * 0.26, 120); // horizontal radius
      const rot = time * 0.9; // rotation speed
      const turns = 2.2; // how many twists across the visible strand

      type Node = { x: number; y: number; z: number; base: string; idx: number; side: 0 | 1 };
      const nodes: Node[] = [];
      for (let i = 0; i < RUNGS; i++) {
        const t = i / (RUNGS - 1);
        const y = helixTop + t * helixH;
        const phase = t * Math.PI * 2 * turns + rot;
        // Strand A and complementary strand B (half turn opposite)
        nodes.push({ x: cx + Math.cos(phase) * amp, y, z: Math.sin(phase), base: SEQ[i], idx: i, side: 0 });
        nodes.push({ x: cx + Math.cos(phase + Math.PI) * amp, y, z: Math.sin(phase + Math.PI), base: COMPLEMENT[SEQ[i]], idx: i, side: 1 });
      }

      // Draw rungs (base-pair bridges) first, sorted back-to-front
      const rungIdx = Array.from({ length: RUNGS }, (_, i) => i).sort((a, b) => {
        const za = Math.sin(a / (RUNGS - 1) * Math.PI * 2 * turns + rot);
        const zb = Math.sin(b / (RUNGS - 1) * Math.PI * 2 * turns + rot);
        return za - zb;
      });

      rungIdx.forEach((i) => {
        const a = nodes[i * 2];
        const b = nodes[i * 2 + 1];
        const depth = (a.z + 1) / 2; // 0 (back) .. 1 (front)
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, BASE_COLORS[a.base]);
        grad.addColorStop(1, BASE_COLORS[b.base]);
        ctx.strokeStyle = grad;
        ctx.globalAlpha = 0.35 + depth * 0.5;
        ctx.lineWidth = 1.5 + depth * 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Draw backbone strands as smooth ribbons
      for (const side of [0, 1] as const) {
        ctx.beginPath();
        for (let i = 0; i < RUNGS; i++) {
          const n = nodes[i * 2 + side];
          if (i === 0) ctx.moveTo(n.x, n.y); else ctx.lineTo(n.x, n.y);
        }
        ctx.strokeStyle = side === 0 ? 'rgba(212,168,83,0.55)' : 'rgba(96,165,250,0.5)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = side === 0 ? 'rgba(212,168,83,0.6)' : 'rgba(96,165,250,0.6)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw base nodes (sorted by depth so front ones overlap back ones)
      const sorted = [...nodes].sort((a, b) => a.z - b.z);
      sorted.forEach((n) => {
        const depth = (n.z + 1) / 2;
        const r = 7 + depth * 7;
        const color = BASE_COLORS[n.base];
        ctx.globalAlpha = 0.45 + depth * 0.55;
        // node fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color + '33';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = depth * 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // letter (only when reasonably to the front so it stays legible)
        if (depth > 0.32) {
          ctx.fillStyle = color;
          ctx.font = `bold ${Math.round(9 + depth * 5)}px monospace`;
          ctx.globalAlpha = depth;
          ctx.fillText(n.base, n.x, n.y);
        }
      });
      ctx.globalAlpha = 1;

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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#0a0a1a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* TOP verse */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-6"
        style={{ background: 'linear-gradient(to bottom, rgba(10,10,26,0.92) 0%, rgba(10,10,26,0) 100%)' }}
      >
        <p className="font-amiri text-base md:text-lg leading-snug text-center" dir="rtl"
          style={{ color: 'rgba(235,225,200,0.95)', textShadow: '0 0 20px rgba(212,168,83,0.4)' }}>
          الَّذِي{' '}
          <span style={{ color: '#d4a853' }}>خَلَقَكَ</span>{' '}
          <span style={{ color: '#2dd4a8' }}>فَسَوَّاكَ</span>{' '}
          <span style={{ color: '#60a5fa' }}>فَعَدَلَكَ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(212,168,83,0.5)' }}>
          سورة الانفطار · الآيتان ٧–٨
        </p>
      </motion.div>

      {/* BOTTOM stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="absolute bottom-0 inset-x-0 z-10 px-4 pb-3 pt-6 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(10,10,26,0.94) 0%, rgba(10,10,26,0) 100%)' }}
      >
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          {[
            { label: 'زوج قاعدي', value: '٣.٢ مليار' },
            { label: 'أحماض أمينية', value: '٢٠' },
            { label: 'كودون', value: '٦٤' },
            { label: 'المصدر', value: 'الله' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-1.5 text-center"
              style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.2)' }}
            >
              <p className="text-gold-primary font-bold text-xs leading-tight">{stat.value}</p>
              <p className="text-gray-400 text-[9px] mt-0.5 font-tajawal">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[9px] font-tajawal mt-2" style={{ color: 'rgba(180,200,190,0.5)' }}>
          كود شبه مثالي · أفضل ١ في المليون متانة ضد الطفرات (Freeland &amp; Hurst 1998)
        </p>
      </motion.div>
    </div>
  );
}
