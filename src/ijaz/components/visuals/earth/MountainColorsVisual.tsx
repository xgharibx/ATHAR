
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function MountainColorsVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const strata = [
      { color: 'rgba(220,220,220,0.55)', ar: 'بيض', en: 'quartz/chalk', thickness: 0.08 },
      { color: 'rgba(160,80,40,0.5)', ar: 'حُمر', en: 'iron oxide', thickness: 0.12 },
      { color: 'rgba(200,180,120,0.45)', ar: 'sandy', en: 'sandstone', thickness: 0.07 },
      { color: 'rgba(180,100,60,0.5)', ar: 'حمراء', en: 'jasper/laterite', thickness: 0.1 },
      { color: 'rgba(240,240,250,0.5)', ar: 'بيض', en: 'limestone', thickness: 0.09 },
      { color: 'rgba(40,40,40,0.65)', ar: 'غرابيب', en: 'basalt', thickness: 0.12 },
      { color: 'rgba(160,80,60,0.45)', ar: 'حمر', en: 'red granite', thickness: 0.08 },
      { color: 'rgba(20,20,20,0.7)', ar: 'سود', en: 'obsidian', thickness: 0.14 },
      { color: 'rgba(230,210,190,0.4)', ar: 'فاتح', en: 'travertine', thickness: 0.07 },
      { color: 'rgba(30,30,40,0.6)', ar: 'سود', en: 'coal/slate', thickness: 0.13 },
    ];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // Sky backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0a0c14'); skyGrad.addColorStop(1, '#050608');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);

      // Mountain silhouette clip region
      const peaks: [number, number][] = [
        [0, h], [0, h * 0.55], [w * 0.1, h * 0.25], [w * 0.22, h * 0.55],
        [w * 0.35, h * 0.18], [w * 0.5, h * 0.42], [w * 0.62, h * 0.12],
        [w * 0.75, h * 0.4], [w * 0.88, h * 0.28], [w, h * 0.48], [w, h],
      ];

      ctx.save();
      ctx.beginPath();
      peaks.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
      ctx.closePath(); ctx.clip();

      // Draw strata layers across full canvas in clipped mountain
      let yOffset = 0;
      strata.forEach((s, si) => {
        const layerH = s.thickness * h;
        const wave = Math.sin(time * 0.3 + si * 0.8) * 2;
        const lGrad = ctx.createLinearGradient(0, yOffset + wave, 0, yOffset + layerH + wave);
        lGrad.addColorStop(0, s.color); lGrad.addColorStop(0.5, s.color); lGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.moveTo(0, yOffset + wave);
        for (let x = 0; x <= w; x += 10) {
          const wy = yOffset + Math.sin(x * 0.012 + time * 0.1 + si * 0.6) * 3 + wave;
          ctx.lineTo(x, wy);
        }
        ctx.lineTo(w, yOffset + layerH + wave);
        ctx.lineTo(0, yOffset + layerH + wave);
        ctx.closePath(); ctx.fill();
        // Layer label
        ctx.font = `6px monospace`; ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(255,255,255,0.18)`;
        ctx.fillText(s.en, 8, yOffset + layerH * 0.65 + wave);
        ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(255,255,255,0.22)`;
        ctx.fillText(s.ar, w - 8, yOffset + layerH * 0.65 + wave);
        yOffset += layerH;
      });

      ctx.restore();

      // Mountain outline
      ctx.strokeStyle = 'rgba(120,100,80,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath();
      peaks.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
      ctx.closePath(); ctx.stroke();

      // Pulse scan line
      const scanY = ((time * 0.08) % 1) * h;
      ctx.strokeStyle = `rgba(200,220,255,0.08)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(w, scanY); ctx.stroke();

      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,160,120,0.45)'; ctx.shadowColor = 'rgba(140,120,80,0.2)'; ctx.shadowBlur = 8;
      ctx.fillText('جُدَدٌ بِيضٌ وَحُمْرٌ وَغَرَابِيبُ سُودٌ', w * 0.5, h * 0.95);
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };

    let started = false;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!started) { started = true; draw(); }
    });
    observer.observe(canvas);
    return () => { cancelAnimationFrame(animId); observer.disconnect(); };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#0a0c14' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(10,12,20,0.9) 0%, rgba(10,12,20,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(220,200,180,0.92)', textShadow: '0 0 18px rgba(160,140,100,0.4)' }}>
          <span style={{ color: '#ffffff', textShadow: '0 0 14px rgba(255,255,240,0.6)' }}>جُدَدٌ بِيضٌ</span>
          {' '}وَ
          <span style={{ color: '#ff8866', textShadow: '0 0 14px rgba(255,120,60,0.6)' }}>حُمْرٌ</span>
          {' '}وَ
          <span style={{ color: '#555566', textShadow: '0 0 14px rgba(80,80,100,0.5)' }}>غَرَابِيبُ سُودٌ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(60,50,30,0.45)' }}>سورة فاطر · الآية ٢٧</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(10,12,20,0.92) 0%, rgba(10,12,20,0.5) 60%, rgba(10,12,20,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚪', label: 'بيض = quartz', sub: 'SiO\u2082' },
            { icon: '🔴', label: 'حمر = iron oxide', sub: 'Fe\u2082O\u2083' },
            { icon: '⚫', label: 'سود = basalt', sub: 'obsidian/coal' },
            { icon: '🧪', label: 'geology', sub: 'stratigraphy' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(15,12,5,0.1)', border: '1px solid rgba(100,80,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(220,200,160,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(140,120,60,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
