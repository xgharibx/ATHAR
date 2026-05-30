
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ☀️ وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ — Sun in Orbital Motion
// Ya-Sin 36:38-40 — the Sun swims/floats in orbit
// Solar apex: Sun orbits galactic center at 220 km/s

export default function SunOrbitalMotionVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Star field
    const stars = Array.from({ length: 250 }, () => ({ x: Math.random(), y: Math.random(), size: Math.random() * 1.5 + 0.3, phase: Math.random() * Math.PI * 2 }));

    // Sun orbit trail
    const orbitTrail: [number, number][] = [];

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      ctx.fillStyle = '#01000a'; ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach((s) => {
        const alpha = Math.sin(time * 0.8 + s.phase) * 0.1 + 0.3;
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,210,255,${alpha})`; ctx.fill();
      });

      // Galactic center indicator
      ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,180,80,0.06)'; ctx.fill();
      ctx.font = `7px sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,160,60,0.2)';
      ctx.fillText('مركز المجرة', w * 0.5, h * 0.5 + 24);

      // Galactic orbit ellipse
      const orbA = Math.min(w, h) * 0.36, orbB = Math.min(w, h) * 0.2;
      ctx.strokeStyle = 'rgba(180,160,80,0.1)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.5, orbA, orbB, 0, 0, Math.PI * 2); ctx.stroke();

      // Sun position
      const sunAngle = time * 0.2;
      const sunX = w * 0.5 + Math.cos(sunAngle) * orbA;
      const sunY = h * 0.5 + Math.sin(sunAngle) * orbB;

      // Trail
      orbitTrail.push([sunX, sunY]);
      if (orbitTrail.length > 120) orbitTrail.shift();
      orbitTrail.forEach(([tx, ty], i) => {
        const a = (i / orbitTrail.length) * 0.2;
        ctx.beginPath(); ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,80,${a})`; ctx.fill();
      });

      // Solar apex arrow
      const apexAngle = sunAngle + Math.PI * 0.3;
      ctx.strokeStyle = 'rgba(180,220,255,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(apexAngle) * 30, sunY + Math.sin(apexAngle) * 30); ctx.stroke();

      // Sun
      const sunR = Math.min(w, h) * 0.055;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
      sunGrad.addColorStop(0, 'rgba(255,250,200,0.95)');
      sunGrad.addColorStop(0.4, 'rgba(255,200,80,0.7)');
      sunGrad.addColorStop(0.7, 'rgba(200,120,20,0.3)');
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad; ctx.fillRect(0, 0, w, h);
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,250,220,0.9)'; ctx.fill();

      // Speed label
      ctx.font = `7px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,180,80,0.3)';
      ctx.fillText('220 km/s', sunX, sunY + sunR * 0.6 + 10);

      // يَسْبَحُونَ label
      ctx.font = `bold 12px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,220,120,0.55)'; ctx.shadowColor = 'rgba(220,180,60,0.3)'; ctx.shadowBlur = 10;
      ctx.fillText('وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ', w * 0.5, h * 0.9);
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
      style={{ background: '#01000a' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,10,0.9) 0%, rgba(1,0,10,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(255,230,160,0.92)', textShadow: '0 0 18px rgba(200,160,60,0.4)' }}>
          وَالشَّمْسُ{' '}
          <span style={{ color: '#ffdd88', textShadow: '0 0 14px rgba(255,220,100,0.7)' }}>تَجْرِي لِمُسْتَقَرٍّ لَهَا</span>
          {' '}وَكُلٌّ فِي فَلَكٍ{' '}
          <span style={{ color: '#ffcc66', textShadow: '0 0 12px rgba(240,200,80,0.6)' }}>يَسْبَحُونَ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(120,100,40,0.45)' }}>
          سورة يس · الآية ٣٨
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,10,0.92) 0%, rgba(1,0,10,0.5) 60%, rgba(1,0,10,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '☀️', label: '220 km/s', sub: 'سرعة مدارية' },
            { icon: '🌀', label: 'فلك المجرة', sub: '225M سنة/دورة' },
            { icon: '🔭', label: 'Solar apex', sub: 'Herschel 1783' },
            { icon: '🌌', label: 'Milky Way', sub: 'يسبح ليس يدور' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(20,15,0,0.1)', border: '1px solid rgba(160,130,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(255,230,140,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(180,150,70,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
