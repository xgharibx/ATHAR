
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🐜 قَالَتْ نَمْلَةٌ — Ant Communication & Female Grammar
// An-Naml 27:18 — feminine verb for ant → all workers are female (XX)
// E.O. Wilson 1971 — pheromone alarm communication confirmed

export default function AntCommunicationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Ant colony underground structure
    const chambers = [
      { x: 0.5, y: 0.65, r: 0.055, label: 'غرفة الملكة', labelEn: 'Queen Chamber' },
      { x: 0.3, y: 0.55, r: 0.04, label: 'تخزين', labelEn: 'Food Storage' },
      { x: 0.7, y: 0.55, r: 0.038, label: 'الحضانة', labelEn: 'Brood' },
      { x: 0.38, y: 0.75, r: 0.032, label: 'فطر', labelEn: 'Fungus' },
      { x: 0.62, y: 0.76, r: 0.032, label: 'نفايات', labelEn: 'Waste' },
    ];

    // Tunnels connecting chambers
    const tunnels: [number, number, number, number][] = [
      [0.5, 0.45, 0.5, 0.65], // entrance to queen
      [0.3, 0.55, 0.5, 0.65],
      [0.7, 0.55, 0.5, 0.65],
      [0.38, 0.75, 0.5, 0.65],
      [0.62, 0.76, 0.5, 0.65],
      [0.3, 0.55, 0.38, 0.75],
      [0.7, 0.55, 0.62, 0.76],
    ];

    // Ants walking along tunnels
    type Ant = { tunnel: number; progress: number; speed: number; dir: 1 | -1; carryingFood: boolean };
    const ants: Ant[] = Array.from({ length: 28 }, (_, i) => ({
      tunnel: i % tunnels.length,
      progress: Math.random(),
      speed: Math.random() * 0.003 + 0.002,
      dir: Math.random() > 0.5 ? 1 : -1,
      carryingFood: Math.random() > 0.6,
    }));

    // Pheromone trail particles
    type Pheromone = { x: number; y: number; alpha: number; r: number };
    const pheromones: Pheromone[] = [];
    let lastPheromone = 0;

    // Warning ant on surface
    const warnAnt = { x: 0.5, y: 0.42 };

    const drawAnt = (x: number, y: number, angle: number, size: number, withFood: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Body
      ctx.fillStyle = 'rgba(80,50,20,0.9)';
      ctx.beginPath(); ctx.ellipse(0, 0, size * 1.2, size * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      // Head
      ctx.beginPath(); ctx.arc(size * 1.4, 0, size * 0.65, 0, Math.PI * 2); ctx.fill();
      // Abdomen
      ctx.beginPath(); ctx.ellipse(-size * 1.3, 0, size * 1, size * 0.75, 0, 0, Math.PI * 2); ctx.fill();
      // Antennae
      ctx.strokeStyle = 'rgba(60,40,10,0.7)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(size * 1.8, -size * 0.2); ctx.lineTo(size * 2.8, -size * 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(size * 1.8, size * 0.2); ctx.lineTo(size * 2.8, size * 1.2); ctx.stroke();
      // Legs
      for (let i = -1; i <= 1; i++) {
        const ly = i * size * 0.5;
        ctx.beginPath(); ctx.moveTo(-size * 0.3, ly); ctx.lineTo(-size * 1.5, ly - size * 0.8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(size * 0.3, ly); ctx.lineTo(size * 1.5, ly - size * 0.8); ctx.stroke();
      }
      if (withFood) {
        ctx.fillStyle = 'rgba(200,150,50,0.8)';
        ctx.beginPath(); ctx.arc(size * 1.4, -size, size * 0.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;

      // Background — earth soil
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0a1a00');
      bgGrad.addColorStop(0.38, '#1a1200');
      bgGrad.addColorStop(0.42, '#2a1800');
      bgGrad.addColorStop(1, '#150d00');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // Surface grass/soil line
      const surfaceY = h * 0.42;
      ctx.fillStyle = 'rgba(40,80,20,0.5)';
      ctx.beginPath(); ctx.rect(0, surfaceY - 4, w, 8); ctx.fill();
      // Grass blades
      for (let i = 0; i < 40; i++) {
        const gx = (i / 40) * w + Math.sin(time + i) * 2;
        const gh = 8 + Math.sin(i * 1.7 + time * 0.5) * 4;
        ctx.strokeStyle = `rgba(50,${100 + Math.floor(i * 2)},30,0.6)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx, surfaceY - 3); ctx.lineTo(gx + Math.sin(i) * 3, surfaceY - 3 - gh); ctx.stroke();
      }

      // Soil texture dots
      for (let i = 0; i < 60; i++) {
        const tx = Math.sin(i * 47.3) * 0.5 + 0.5, ty = (Math.cos(i * 31.7) * 0.3 + 0.7);
        ctx.beginPath(); ctx.arc(tx * w, ty * h, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,70,30,0.15)`; ctx.fill();
      }

      // ── Underground tunnels ──────────────────────────────────
      tunnels.forEach(([x1, y1, x2, y2]) => {
        ctx.strokeStyle = 'rgba(100,70,30,0.3)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x1 * w, y1 * h); ctx.lineTo(x2 * w, y2 * h); ctx.stroke();
        ctx.strokeStyle = 'rgba(60,40,15,0.5)'; ctx.lineWidth = 4;
        ctx.stroke();
      });

      // Entrance hole
      ctx.fillStyle = 'rgba(30,20,5,0.8)';
      ctx.beginPath(); ctx.ellipse(w * 0.5, surfaceY, 8, 5, 0, 0, Math.PI * 2); ctx.fill();

      // ── Chambers ─────────────────────────────────────────────
      chambers.forEach(({ x, y, r, label }) => {
        const cx2 = x * w, cy2 = y * h, radius = r * Math.min(w, h);
        const cGrad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, radius);
        cGrad.addColorStop(0, 'rgba(80,55,20,0.7)');
        cGrad.addColorStop(1, 'rgba(40,25,5,0.4)');
        ctx.fillStyle = cGrad; ctx.beginPath(); ctx.arc(cx2, cy2, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,85,30,0.4)'; ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = `${7.5 * dpr}px sans-serif`; ctx.fillStyle = 'rgba(200,170,100,0.6)'; ctx.textAlign = 'center';
        ctx.fillText(label, cx2, cy2 + 3 * dpr);
      });

      // ── Pheromone emission from warning ant ──────────────────
      if (time - lastPheromone > 0.18) {
        lastPheromone = time;
        pheromones.push({
          x: warnAnt.x * w, y: warnAnt.y * h,
          alpha: 0.7, r: 2 + Math.random() * 2,
        });
      }
      for (let i = pheromones.length - 1; i >= 0; i--) {
        const ph = pheromones[i];
        ph.r += 0.4; ph.alpha -= 0.012; ph.y -= 0.5;
        if (ph.alpha <= 0) { pheromones.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(ph.x, ph.y, ph.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,200,50,${ph.alpha})`; ctx.lineWidth = 0.8; ctx.stroke();
      }

      // ── Ants ─────────────────────────────────────────────────
      ants.forEach((ant) => {
        ant.progress += ant.speed * ant.dir;
        if (ant.progress > 1) { ant.progress = 0; ant.dir = -ant.dir as 1 | -1; }
        if (ant.progress < 0) { ant.progress = 1; ant.dir = -ant.dir as 1 | -1; }
        const [x1, y1, x2, y2] = tunnels[ant.tunnel];
        const ax = (x1 + (x2 - x1) * ant.progress) * w;
        const ay = (y1 + (y2 - y1) * ant.progress) * h;
        const angle = Math.atan2((y2 - y1), (x2 - x1)) + (ant.dir === -1 ? Math.PI : 0);
        drawAnt(ax, ay, angle, 3.5 * dpr, ant.carryingFood);
      });

      // ── Warning ant on surface ────────────────────────────────
      const warnPulse = Math.sin(time * 2.5) * 0.1 + 0.9;
      ctx.save(); ctx.globalAlpha = warnPulse;
      drawAnt(warnAnt.x * w, warnAnt.y * h, Math.PI * 0.1 + Math.sin(time) * 0.15, 4.5 * dpr, false);
      ctx.restore();

      // Warning ant speech bubble
      const bubbleX = warnAnt.x * w + 28, bubbleY = warnAnt.y * h - 22;
      ctx.save();
      ctx.globalAlpha = Math.sin(time * 1.2) * 0.15 + 0.8;
      ctx.fillStyle = 'rgba(8,20,2,0.88)'; ctx.strokeStyle = 'rgba(100,180,60,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (...a: number[]) => void }).roundRect(bubbleX, bubbleY - 18, 70, 22, 6);
      ctx.fill(); ctx.stroke();
      ctx.font = `bold ${9 * dpr}px serif`; ctx.fillStyle = 'rgba(150,230,100,0.9)'; ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(80,200,50,0.5)'; ctx.shadowBlur = 6;
      ctx.fillText('ادْخُلُوا مَسَاكِنَكُمْ', bubbleX + 3, bubbleY - 3);
      ctx.restore();

      // ♀ label
      ctx.font = `${9 * dpr}px serif`; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(200,180,100,0.6)';
      ctx.fillText('♀ قَالَتْ — she said', warnAnt.x * w + 28, warnAnt.y * h + 12);

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
      style={{ background: '#0a1a00' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(10,26,0,0.9) 0%, rgba(10,26,0,0) 100%)' }}>
        <p className="font-amiri text-lg md:text-xl leading-snug text-center"
          style={{ color: 'rgba(200,240,180,0.92)', textShadow: '0 0 20px rgba(80,200,50,0.4)' }}>
          حَتَّىٰ إِذَا أَتَوْا عَلَىٰ وَادِ النَّمْلِ{' '}
          <span style={{ color: '#aaffaa', textShadow: '0 0 14px rgba(140,255,120,0.7)' }}>قَالَتْ نَمْلَةٌ</span>
          {' '}يَا أَيُّهَا النَّمْلُ ادْخُلُوا{' '}
          <span style={{ color: '#ffdd77', textShadow: '0 0 14px rgba(255,220,100,0.7)' }}>مَسَاكِنَكُمْ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(100,160,80,0.45)' }}>
          سورة النمل · الآية ١٨
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(10,26,0,0.92) 0%, rgba(10,26,0,0.5) 60%, rgba(10,26,0,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { d: 'M12 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 9v8 M9 14h6', label: 'قالَت — مؤنث', sub: 'جميع العاملات إناث' },
            { d: 'M9 3h6 M10 3v6l-4 8a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-8V3', label: 'فيرومون إنذار', sub: 'Wilson 1971' },
            { d: 'M3 10l9-7 9 7 M5 9v11h14V9 M10 20v-6h4v6', label: 'مساكن = غرف', sub: 'مجتمع منظم' },
            { d: 'M4 3c8 4 8 14 16 18 M20 3C12 7 12 17 4 21 M7 5h10 M7 19h10', label: 'XX كروموسوم', sub: 'إناث بيولوجياً' },
          ].map(({ d, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(40,80,20,0.1)', border: '1px solid rgba(80,160,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="rgba(180,240,140,0.92)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d={d} />
              </svg>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(180,240,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(120,180,80,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
