
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🕸️ وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ — The Built Universe / Cosmic Web
// Adh-Dhariyat 51:47 — we built the heaven with might
// Cosmic web: filaments, voids, galaxy clusters — structure of universe

export default function CosmicWebVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Filament nodes (galaxy clusters)
    type Node = { x: number; y: number; size: number; brightness: number; phase: number };
    const nodes: Node[] = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 3 + 1,
      brightness: Math.random() * 0.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));

    // Connections (filaments) — connect nearby nodes
    type Edge = { a: number; b: number; strength: number };
    const edges: Edge[] = [];
    nodes.forEach((a, i) => {
      nodes.forEach((b, j) => {
        if (i >= j) return;
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.18) edges.push({ a: i, b: j, strength: 1 - dist / 0.18 });
      });
    });

    // Dark matter flow particles along filaments
    type FlowPt = { edgeIdx: number; t: number; speed: number; alpha: number };
    const flowPts: FlowPt[] = Array.from({ length: 120 }, () => ({
      edgeIdx: Math.floor(Math.random() * edges.length),
      t: Math.random(), speed: Math.random() * 0.004 + 0.001, alpha: Math.random() * 0.3 + 0.1,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#010004'; ctx.fillRect(0, 0, w, h);

      // ── Cosmic void shading ───────────────────────────────────
      const voidGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
      voidGrad.addColorStop(0, 'rgba(10,5,30,0)');
      voidGrad.addColorStop(0.5, 'rgba(5,2,15,0)');
      voidGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = voidGrad; ctx.fillRect(0, 0, w, h);

      // ── Filament edges ────────────────────────────────────────
      if (edges.length > 0) {
        edges.forEach((e) => {
          const na = nodes[e.a], nb = nodes[e.b];
          const alpha = e.strength * 0.2 * (Math.sin(time * 0.5 + na.phase) * 0.08 + 0.9);
          ctx.strokeStyle = `rgba(120,80,200,${alpha})`; ctx.lineWidth = e.strength * 0.8;
          ctx.beginPath(); ctx.moveTo(na.x * w, na.y * h); ctx.lineTo(nb.x * w, nb.y * h); ctx.stroke();
        });

        // ── Flow particles along filaments ────────────────────────
        flowPts.forEach((fp) => {
          if (fp.edgeIdx >= edges.length) return;
          fp.t = (fp.t + fp.speed) % 1;
          const e = edges[fp.edgeIdx];
          const na = nodes[e.a], nb = nodes[e.b];
          const px = na.x * w + (nb.x - na.x) * w * fp.t;
          const py = na.y * h + (nb.y - na.y) * h * fp.t;
          ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,140,255,${fp.alpha})`; ctx.fill();
        });
      }

      // ── Galaxy cluster nodes ──────────────────────────────────
      nodes.forEach((n) => {
        const alpha = n.brightness + Math.sin(time * 0.8 + n.phase) * 0.1;
        ctx.beginPath(); ctx.arc(n.x * w, n.y * h, n.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,100,220,${alpha * 0.08})`; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x * w, n.y * h, n.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,180,255,${alpha})`; ctx.fill();
      });

      // بَنَيْنَاهَا label
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,130,255,0.5)'; ctx.shadowColor = 'rgba(120,80,255,0.3)'; ctx.shadowBlur = 12;
      ctx.fillText('وَالسَّمَاءَ بَنَيْنَاهَا', w * 0.5, h * 0.89);
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
      style={{ background: '#010004' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,4,0.9) 0%, rgba(1,0,4,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(200,180,255,0.92)', textShadow: '0 0 18px rgba(140,100,255,0.4)' }}>
          <span style={{ color: '#c8aaff', textShadow: '0 0 14px rgba(180,140,255,0.7)' }}>وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ</span>
          {' '}وَإِنَّا لَمُوسِعُونَ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(100,80,160,0.45)' }}>
          سورة الذاريات · الآية ٤٧
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,4,0.92) 0%, rgba(1,0,4,0.5) 60%, rgba(1,0,4,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🕸️', label: 'الشبكة الكونية', sub: 'Cosmic Web' },
            { icon: '🌌', label: 'خيوط بلا مادة', sub: 'dark matter' },
            { icon: '🔭', label: 'Sloan 2003', sub: 'SDSS' },
            { icon: '🫧', label: 'فراغات كونية', sub: 'voids' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(20,10,40,0.1)', border: '1px solid rgba(100,70,180,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(200,180,255,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(130,110,200,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
