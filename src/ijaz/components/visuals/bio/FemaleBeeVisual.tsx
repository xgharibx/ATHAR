
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🐝 وَأَوْحَىٰ رَبُّكَ إِلَى النَّحْلِ — The Female Bee Miracle
// Every verb is grammatically FEMININE (ي suffix)
// 1400 years before science confirmed all worker bees are XX females

export default function FemaleBeeVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const HEX_R = 32;
    const HEX_H = HEX_R * Math.sqrt(3);
    type HexCell = { cx: number; cy: number; phase: number; glow: number };
    const cells: HexCell[] = [];

    const buildGrid = (w: number, h: number) => {
      cells.length = 0;
      const cols = Math.ceil(w / (HEX_R * 1.5)) + 2;
      const rows = Math.ceil(h / HEX_H) + 2;
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          cells.push({
            cx: c * HEX_R * 3 + (r % 2) * HEX_R * 1.5,
            cy: r * HEX_H,
            phase: Math.random() * Math.PI * 2,
            glow: Math.random(),
          });
        }
      }
    };

    const pollen = Array.from({ length: 80 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0012,
      vy: -Math.random() * 0.001 - 0.0003,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.6 + 0.2,
      hue: Math.random() > 0.5 ? 48 : 38,
    }));

    const beePathFn = (t: number, w: number, h: number) => {
      const cx = w * 0.5, cy = h * 0.42;
      const rx = w * 0.13, ry = h * 0.09;
      const s = Math.sin(t * 0.35), c2 = Math.cos(t * 0.35);
      const d = 1 + s * s;
      return { x: cx + rx * c2 / d, y: cy + ry * s * c2 / d };
    };

    const drawHex = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
          : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
    };

    const drawBee = (x: number, y: number, angle: number, t: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const wf = Math.abs(Math.sin(t * 18)) * 0.4 + 0.6;
      // Wings
      ctx.globalAlpha = 0.22 * wf;
      ctx.fillStyle = 'rgba(200,230,255,0.9)';
      ctx.beginPath(); ctx.ellipse(-4, -8 * wf, 14, 7, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, 8 * wf, 11, 5.5, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = 'rgba(180,210,255,1)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(-4, -8 * wf, 14, 7, -0.4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      // Body
      const bg = ctx.createLinearGradient(-16, 0, 16, 0);
      bg.addColorStop(0, 'rgba(40,30,0,0.9)'); bg.addColorStop(0.25, 'rgba(220,160,20,0.95)');
      bg.addColorStop(0.5, 'rgba(30,20,0,0.9)'); bg.addColorStop(0.75, 'rgba(210,150,15,0.95)');
      bg.addColorStop(1, 'rgba(180,120,10,0.8)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(2, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
      // Head
      ctx.fillStyle = 'rgba(50,35,5,0.95)';
      ctx.beginPath(); ctx.arc(-16, 0, 7, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = 'rgba(0,200,100,0.6)';
      ctx.beginPath(); ctx.arc(-18, -3, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-18, 3, 2.5, 0, Math.PI * 2); ctx.fill();
      // Antennae
      ctx.strokeStyle = 'rgba(80,60,10,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-20, -3); ctx.quadraticCurveTo(-28, -14, -30, -18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-20, 3); ctx.quadraticCurveTo(-26, 14, -28, 18); ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,50,0.8)';
      ctx.beginPath(); ctx.arc(-30, -18, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-28, 18, 1.8, 0, Math.PI * 2); ctx.fill();
      // ♀ symbol
      ctx.fillStyle = '#ffd85a'; ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('♀', 2, 0);
      ctx.restore();
    };

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#040d01'); bg.addColorStop(0.5, '#061404'); bg.addColorStop(1, '#030b02');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Honeycomb
      cells.forEach((cell) => {
        const pulse = Math.sin(time * 1.2 + cell.phase) * 0.5 + 0.5;
        const g = cell.glow * pulse;
        drawHex(cell.cx, cell.cy, HEX_R - 1);
        const hg = ctx.createRadialGradient(cell.cx, cell.cy, 0, cell.cx, cell.cy, HEX_R);
        hg.addColorStop(0, `rgba(180,130,20,${0.07 + g * 0.08})`);
        hg.addColorStop(1, `rgba(80,60,5,0.03)`);
        ctx.fillStyle = hg; ctx.fill();
        drawHex(cell.cx, cell.cy, HEX_R - 1);
        ctx.strokeStyle = `rgba(200,150,30,${0.12 + g * 0.15})`; ctx.lineWidth = 0.8; ctx.stroke();
      });

      // Pollen
      pollen.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < -0.02 || p.x > 1.02) { p.x = Math.random(); p.y = 1.02; }
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},90%,65%,${p.alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},90%,65%,${p.alpha * 0.12})`; ctx.fill();
      });

      // Bee + trail
      const { x: bx, y: by } = beePathFn(time, w, h);
      const { x: bx2, y: by2 } = beePathFn(time + 0.04, w, h);
      const beeAngle = Math.atan2(by2 - by, bx2 - bx);
      for (let i = 1; i <= 22; i++) {
        const { x: tx, y: ty } = beePathFn(time - i * 0.018, w, h);
        ctx.beginPath(); ctx.arc(tx, ty, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,50,${(1 - i / 22) * 0.17})`; ctx.fill();
      }
      drawBee(bx, by, beeAngle, time);

      // Feminine verbs floating
      const verbs = [
        { text: 'اتَّخِذِي', x: 0.18, y: 0.73, color: '#7effc5' },
        { text: 'كُلِي',     x: 0.50, y: 0.81, color: '#ffd85a' },
        { text: 'اسْلُكِي', x: 0.80, y: 0.73, color: '#c4aaff' },
      ];
      verbs.forEach(({ text, x, y, color }, i) => {
        const alpha = Math.sin(time * 0.55 - i * 1.2) * 0.3 + 0.7;
        const fy = Math.sin(time * 0.9 + i * 1.5) * 5;
        const vx = x * w, vy = y * h + fy;
        // Glow halo
        ctx.save(); ctx.globalAlpha = alpha * 0.16; ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(vx, vy, 52, 18, 0, 0, Math.PI * 2); ctx.fill();
        // Pill
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = 'rgba(6,18,3,0.82)'; ctx.strokeStyle = `${color}44`; ctx.lineWidth = 1;
        ctx.beginPath(); (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(vx - 42, vy - 14, 84, 28, 8); ctx.fill(); ctx.stroke();
        // Text
        ctx.fillStyle = color; ctx.font = `bold ${13 * dpr}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, vx, vy - 1);
        // Glowing ي
        ctx.fillStyle = '#ffd85a'; ctx.font = `bold ${16 * dpr}px serif`;
        ctx.shadowColor = '#ffd85a'; ctx.shadowBlur = 10;
        ctx.fillText('ي', vx - 38, vy - 1);
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    let started = false;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGrid(canvas.offsetWidth, canvas.offsetHeight);
      if (!started) { started = true; draw(); }
    });
    observer.observe(canvas);
    return () => { cancelAnimationFrame(animId); observer.disconnect(); };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}
      style={{ background: '#040d01' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* TOP verse */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(4,13,1,0.88) 0%, rgba(4,13,1,0) 100%)' }}>
        <p className="font-amiri text-lg md:text-xl leading-snug text-center"
          style={{ color: 'rgba(230,255,220,0.92)', textShadow: '0 0 20px rgba(80,220,120,0.4)' }}>
          وَأَوْحَىٰ رَبُّكَ إِلَى النَّحْلِ أَنِ{' '}
          <span style={{ color: '#7effc5', textShadow: '0 0 14px rgba(120,255,180,0.7)' }}>اتَّخِذِي</span>
          {' '}… ثُمَّ{' '}
          <span style={{ color: '#ffd85a', textShadow: '0 0 14px rgba(255,210,80,0.7)' }}>كُلِي</span>
          {' '}… فَ<span style={{ color: '#c4aaff', textShadow: '0 0 14px rgba(180,150,255,0.7)' }}>اسْلُكِي</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(120,200,100,0.45)' }}>
          سورة النحل · الآيتان ٦٨–٦٩
        </p>
      </motion.div>

      {/* Bottom stat chips */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-2 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(4,13,1,0.9) 0%, rgba(4,13,1,0.5) 60%, rgba(4,13,1,0) 100%)', paddingTop: 20 }}>
        <p className="text-[10px] font-tajawal text-center" style={{ color: 'rgba(170,220,150,0.75)' }}>
          كل أفعال النحلة في القرآن{' '}
          <span style={{ color: 'rgba(255,215,80,0.9)' }}>مؤنثة</span>
          {' '}— اكتشف العلم أن جميع النحل العاملة إناث (XX)
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '♀', label: 'كل العاملات إناث', sub: '100%' },
            { icon: 'ي', label: 'صيغة مؤنثة', sub: 'اتخذي · كلي · اسلكي' },
            { icon: '🔬', label: 'تشارلز بتلر 1609م', sub: 'بعد القرآن بـ 1000 سنة' },
            { icon: '🧬', label: 'كروموسوم XX', sub: 'بيولوجياً إناث' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(80,180,50,0.07)', border: '1px solid rgba(80,200,60,0.18)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(160,255,120,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,180,90,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
