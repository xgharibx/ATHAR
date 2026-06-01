import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// نبوءة انتصار الروم — Romans Victory Prophecy (الروم 2-4)
// Cinematic battle map: a front line between Rome (west, blue) and Persia (east, red)
// that first collapses westward (Roman defeat at the lowest point of earth), then
// surges back eastward (the foretold Roman victory). Loops through the four phases.

const PHASES = [
  { year: '٦١٤ م', label: 'هزيمة الروم في أدنى الأرض', front: 0.72, color: '#c0392b' },
  { year: '٦١٥ م', label: 'نزول النبوءة: سيغلبون في بضع سنين', front: 0.7, color: '#d4a853' },
  { year: '٦٢٢ م', label: 'الروم يبدأون الهجوم المضاد', front: 0.5, color: '#3498db' },
  { year: '٦٢٧ م', label: 'انتصار الروم — تحققت النبوءة', front: 0.28, color: '#2dd4a8' },
];

export default function RomansVictoryVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;
    let curFront = 0.72;
    let phaseIdx = 0;
    let phaseTimer = 0;
    const phaseDur = 2.6; // seconds per phase

    // Troop dots per side
    const troops = Array.from({ length: 64 }, () => ({
      x: Math.random(),
      yy: Math.random(),
      side: Math.random() > 0.5 ? 1 : 0, // 1 = persia(east), 0 = rome(west)
      sp: Math.random() * 0.0006 + 0.0003,
      r: Math.random() * 1.6 + 1,
    }));

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      phaseTimer += 0.016;
      if (phaseTimer >= phaseDur) {
        phaseTimer = 0;
        phaseIdx = (phaseIdx + 1) % PHASES.length;
        setPhase(phaseIdx);
      }
      const target = PHASES[phaseIdx].front;
      curFront += (target - curFront) * 0.04;
      const frontColor = PHASES[phaseIdx].color;
      const movingEast = phaseIdx >= 2; // Romans pushing back east

      // Background terrain
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0c1018');
      bg.addColorStop(1, '#070a10');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const mapTop = h * 0.3;
      const mapBot = h * 0.76;
      const mapH = mapBot - mapTop;

      // Roman (west) territory
      const romanGrad = ctx.createLinearGradient(0, 0, curFront * w, 0);
      romanGrad.addColorStop(0, 'rgba(52,152,219,0.3)');
      romanGrad.addColorStop(1, 'rgba(52,152,219,0.08)');
      ctx.fillStyle = romanGrad;
      ctx.fillRect(0, mapTop, curFront * w, mapH);

      // Persian (east) territory
      const persGrad = ctx.createLinearGradient(curFront * w, 0, w, 0);
      persGrad.addColorStop(0, 'rgba(192,57,43,0.1)');
      persGrad.addColorStop(1, 'rgba(192,57,43,0.32)');
      ctx.fillStyle = persGrad;
      ctx.fillRect(curFront * w, mapTop, w - curFront * w, mapH);

      ctx.strokeStyle = 'rgba(212,168,83,0.18)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, mapTop, w, mapH);

      // Troop dots drifting toward the front
      for (const t of troops) {
        const dir = t.side === 1 ? -1 : 1; // persia moves west, rome moves east
        // In Roman-defeat phases, Persia advances faster; in victory phases, Rome advances.
        const aggressor = movingEast ? 0 : 1;
        const speed = t.side === aggressor ? t.sp * 2.2 : t.sp * 0.8;
        t.x += dir * speed;
        if (t.x > 1) t.x = 0;
        if (t.x < 0) t.x = 1;
        const py = mapTop + t.yy * mapH;
        ctx.beginPath();
        ctx.arc(t.x * w, py, t.r, 0, Math.PI * 2);
        ctx.fillStyle = t.side === 1 ? 'rgba(220,90,80,0.55)' : 'rgba(90,160,220,0.55)';
        ctx.fill();
      }

      // Wavy glowing front line
      ctx.beginPath();
      for (let yy = 0; yy <= mapH; yy += 4) {
        const wob = Math.sin(yy * 0.05 + time * 2) * 6;
        const x = curFront * w + wob;
        yy === 0 ? ctx.moveTo(x, mapTop + yy) : ctx.lineTo(x, mapTop + yy);
      }
      ctx.strokeStyle = frontColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = frontColor;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Advancing arrows toward the front
      for (let a = 0; a < 3; a++) {
        const ay = mapTop + mapH * (0.28 + a * 0.22);
        const dir = movingEast ? 1 : -1;
        const baseX = curFront * w - dir * 42;
        const off = (Math.sin(time * 2 + a) * 0.5 + 0.5) * 16;
        const ax = baseX + dir * off;
        ctx.strokeStyle = movingEast ? 'rgba(45,212,168,0.75)' : 'rgba(192,57,43,0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ax - dir * 18, ay);
        ctx.lineTo(ax, ay);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - dir * 7, ay - 5);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - dir * 7, ay + 5);
        ctx.stroke();
      }

      // Lowest point on earth marker (Dead Sea)
      const deadX = w * 0.6;
      const deadY = mapBot - 6;
      const dPulse = 0.4 + Math.sin(time * 2.5) * 0.3;
      const dGlow = ctx.createRadialGradient(deadX, deadY, 0, deadX, deadY, 26);
      dGlow.addColorStop(0, `rgba(60,130,200,${dPulse})`);
      dGlow.addColorStop(1, 'rgba(60,130,200,0)');
      ctx.beginPath();
      ctx.arc(deadX, deadY, 26, 0, Math.PI * 2);
      ctx.fillStyle = dGlow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(deadX, deadY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#5aa0dc';
      ctx.fill();

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
    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  const p = PHASES[phase];

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-3 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-lg md:text-xl text-gold-primary" style={{ textShadow: '0 0 18px rgba(212,168,83,0.4)' }}>
          نبوءة انتصار الروم
        </p>
      </motion.div>

      {/* Side labels */}
      <div className="absolute top-[32%] left-3 z-10 pointer-events-none">
        <p className="font-amiri text-sm text-[#5aa0dc]">الروم</p>
        <p className="text-[8px] text-text-muted font-tajawal">Byzantines</p>
      </div>
      <div className="absolute top-[32%] right-3 z-10 pointer-events-none text-right">
        <p className="font-amiri text-sm text-[#dc6a5a]">الفرس</p>
        <p className="text-[8px] text-text-muted font-tajawal">Persians</p>
      </div>

      {/* Dead sea caption */}
      <div className="absolute bottom-[26%] left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center">
        <p className="text-[9px] text-[#7ab8e8] font-tajawal">أدنى الأرض — البحر الميت (-٤٣٠م)</p>
      </div>

      {/* Animated phase caption */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute bottom-[15%] left-0 right-0 text-center z-10 pointer-events-none px-4"
      >
        <span
          className="inline-block rounded-full px-4 py-1.5 backdrop-blur-sm border"
          style={{ borderColor: p.color + '55', background: p.color + '15' }}
        >
          <span className="font-mono text-xs ml-2" style={{ color: p.color }}>{p.year}</span>
          <span className="font-amiri text-sm text-text-primary">{p.label}</span>
        </span>
      </motion.div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 2 }}
        className="absolute bottom-3 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xs md:text-sm text-verse-green/75 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}>
          غُلِبَتِ الرُّومُ ۝ فِي أَدْنَى الْأَرْضِ وَهُم مِّن بَعْدِ غَلَبِهِمْ سَيَغْلِبُونَ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الروم : 2-4</p>
      </motion.div>
    </div>
  );
}
