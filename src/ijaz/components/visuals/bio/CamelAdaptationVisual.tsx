import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🐪 أَفَلَا يَنظُرُونَ إِلَى الْإِبِلِ كَيْفَ خُلِقَتْ — Camel Adaptation (الغاشية 17)
// ULTIMATE: a blazing desert with a scorching sun, layered drifting dunes, a
// sandstorm haze and heat shimmer, a walking camel leaving a footprint trail,
// and labeled callout lines pointing to its survival adaptations.

export default function CamelAdaptationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // sandstorm particles
    const sand = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(),
      sp: 0.001 + Math.random() * 0.003,
      r: 0.5 + Math.random() * 1.4,
      a: Math.random() * 0.25 + 0.05,
    }));

    const tracks: { x: number; y: number; a: number }[] = [];

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      sky.addColorStop(0, '#3a1d04');
      sky.addColorStop(0.5, '#6b3a0a');
      sky.addColorStop(1, '#a86417');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.6);

      // blazing sun
      const sunX = w * 0.78, sunY = h * 0.22;
      const sunR = Math.min(w, h) * 0.09;
      const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
      halo.addColorStop(0, 'rgba(255,230,160,0.5)');
      halo.addColorStop(0.3, 'rgba(255,180,80,0.22)');
      halo.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
      const sunBody = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
      sunBody.addColorStop(0, '#fff4d0'); sunBody.addColorStop(1, '#ffac3a');
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR + Math.sin(time * 2) * 2, 0, Math.PI * 2);
      ctx.fillStyle = sunBody; ctx.fill();

      // layered dunes
      const duneColors = ['#7a4410', '#5e330b', '#3f2207'];
      const baseY = [0.58, 0.68, 0.78];
      duneColors.forEach((col, d) => {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const y = h * baseY[d] + Math.sin(x * 0.006 + d * 2 + time * 0.1) * (18 - d * 4) + Math.sin(x * 0.02 + d) * 6;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
      });

      // ground level for camel
      const groundY = h * baseY[1] - 6;

      // footprint trail
      ctx.fillStyle = 'rgba(40,22,6,0.5)';
      tracks.forEach((t) => {
        t.a -= 0.0015;
        if (t.a > 0) {
          ctx.beginPath(); ctx.ellipse(t.x, t.y, 3, 2, 0, 0, Math.PI * 2);
          ctx.globalAlpha = Math.max(0, t.a); ctx.fill(); ctx.globalAlpha = 1;
        }
      });
      while (tracks.length && tracks[0].a <= 0) tracks.shift();

      // ── camel walking ──
      const camX = w * 0.4 + Math.sin(time * 0.12) * w * 0.06;
      const camY = groundY;
      const u = Math.min(w, h) * 0.012; // unit
      const sway = Math.sin(time * 1.4) * 1.2;

      ctx.save();
      ctx.translate(camX, camY + sway);
      const camFill = 'rgba(120,75,25,0.92)';
      const camStroke = 'rgba(70,42,12,0.8)';
      ctx.fillStyle = camFill; ctx.strokeStyle = camStroke; ctx.lineWidth = 1;

      // legs (animated)
      const legPhase = time * 2.2;
      const legs = [
        { x: -3.2 * u, ph: 0 }, { x: -1.2 * u, ph: Math.PI },
        { x: 2.4 * u, ph: Math.PI * 0.5 }, { x: 4.2 * u, ph: Math.PI * 1.5 },
      ];
      legs.forEach((lg) => {
        const swing = Math.sin(legPhase + lg.ph) * 1.2 * u;
        ctx.strokeStyle = camStroke; ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lg.x, -1.2 * u);
        ctx.quadraticCurveTo(lg.x + swing * 0.4, 1.4 * u, lg.x + swing, 3.4 * u);
        ctx.stroke();
        // footprint drop
        if (Math.abs(swing) < 0.15 * u && Math.random() < 0.3)
          tracks.push({ x: camX + lg.x + swing, y: camY + 3.4 * u + sway, a: 0.45 });
      });
      ctx.lineCap = 'butt';

      // body
      ctx.beginPath();
      ctx.ellipse(0.5 * u, -2.6 * u, 4.6 * u, 2.2 * u, 0.04, 0, Math.PI * 2);
      ctx.fillStyle = camFill; ctx.fill(); ctx.strokeStyle = camStroke; ctx.lineWidth = 1; ctx.stroke();
      // hump
      ctx.beginPath();
      ctx.ellipse(0.6 * u, -4.6 * u, 2.1 * u, 1.9 * u, -0.15, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // neck
      ctx.beginPath();
      ctx.moveTo(3.6 * u, -3.4 * u);
      ctx.quadraticCurveTo(5.6 * u, -4.6 * u, 5.9 * u, -7 * u);
      ctx.lineWidth = 1.4 * u; ctx.strokeStyle = camFill; ctx.stroke();
      // head
      ctx.beginPath();
      ctx.ellipse(6.2 * u, -7.6 * u, 1.2 * u, 0.8 * u, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = camFill; ctx.fill();
      // muzzle
      ctx.beginPath();
      ctx.ellipse(7.1 * u, -7.0 * u, 0.7 * u, 0.5 * u, 0.5, 0, Math.PI * 2);
      ctx.fill();
      // ear
      ctx.beginPath();
      ctx.moveTo(5.7 * u, -8.2 * u); ctx.lineTo(5.4 * u, -9 * u); ctx.lineTo(6.0 * u, -8.4 * u);
      ctx.closePath(); ctx.fill();
      // tail
      ctx.strokeStyle = camStroke; ctx.lineWidth = 0.4 * u;
      ctx.beginPath();
      ctx.moveTo(-4 * u, -3 * u);
      ctx.quadraticCurveTo(-5 * u + Math.sin(time * 3) * 0.5 * u, -1.4 * u, -4.6 * u, 0.4 * u);
      ctx.stroke();
      ctx.restore();

      // heat shimmer streaks near ground
      for (let i = 0; i < 8; i++) {
        const hx = (i / 8) * w + Math.sin(time + i) * 6;
        ctx.strokeStyle = `rgba(255,210,140,${0.04 + Math.sin(time * 2 + i) * 0.02})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx, groundY + 8);
        ctx.quadraticCurveTo(hx + 4, groundY + 2, hx, groundY - 6);
        ctx.stroke();
      }

      // sandstorm particles
      sand.forEach((p) => {
        p.x += p.sp; if (p.x > 1.05) { p.x = -0.05; p.y = Math.random(); }
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h * 0.85, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,180,110,${p.a})`; ctx.fill();
      });

      // callout adaptations
      const callouts = [
        { x: camX + 0.6 * Math.min(w, h) * 0.012, y: camY - 4.6 * Math.min(w, h) * 0.012, lx: w * 0.12, ly: h * 0.2, en: 'سَنام = دهون', sub: 'fat, not water' },
        { x: camX + 6.2 * Math.min(w, h) * 0.012, y: camY - 7.6 * Math.min(w, h) * 0.012, lx: w * 0.86, ly: h * 0.46, en: 'مَنخران يُغلَقان', sub: 'closing nostrils' },
        { x: camX - 3 * Math.min(w, h) * 0.012, y: camY + 3 * Math.min(w, h) * 0.012, lx: w * 0.12, ly: h * 0.55, en: 'أقدام عريضة', sub: 'wide soft feet' },
      ];
      callouts.forEach((c, i) => {
        const on = (Math.sin(time * 0.9 - i * 1.6) * 0.5 + 0.5);
        ctx.strokeStyle = `rgba(255,210,140,${0.15 + on * 0.4})`;
        ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.lx, c.ly); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,150,${0.4 + on * 0.5})`; ctx.fill();
        ctx.textAlign = c.lx < w * 0.5 ? 'left' : 'right';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = `rgba(255,225,160,${0.4 + on * 0.5})`;
        ctx.fillText(c.en, c.lx, c.ly - 5);
        ctx.font = '7px monospace';
        ctx.fillStyle = `rgba(200,160,90,${0.3 + on * 0.4})`;
        ctx.fillText(c.sub, c.lx, c.ly + 5);
      });

      // temp readout
      const tempPulse = Math.sin(time * 2) * 0.15 + 0.55;
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
      ctx.fillStyle = `rgba(255,150,50,${tempPulse})`;
      ctx.fillText('50°C', w * 0.97, h * 0.12);
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(255,180,100,0.5)';
      ctx.fillText('±6°C body tolerance', w * 0.97, h * 0.165);

      // verse label
      ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,210,140,0.55)';
      ctx.shadowColor = 'rgba(200,150,60,0.3)'; ctx.shadowBlur = 12;
      ctx.fillText('أَفَلَا يَنظُرُونَ إِلَى الْإِبِلِ كَيْفَ خُلِقَتْ', w * 0.5, h * 0.95);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#0d0800' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(13,8,0,0.9) 0%, rgba(13,8,0,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(220,180,120,0.92)', textShadow: '0 0 18px rgba(160,120,60,0.4)' }}>
          أَفَلَا يَنظُرُونَ إِلَى{' '}
          <span style={{ color: '#ffcc88', textShadow: '0 0 14px rgba(200,160,80,0.7)' }}>الْإِبِلِ كَيْفَ خُلِقَتْ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(80,60,20,0.45)' }}>سورة الغاشية · الآية ١٧</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(13,8,0,0.92) 0%, rgba(13,8,0,0.5) 60%, rgba(13,8,0,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🐪', label: '8 تكيفات', sub: 'دم/كلى/جلد' },
            { icon: '👻', label: 'دهون ليس ماء', sub: 'hump = fat store' },
            { icon: '🌡️', label: '+/- 6 C', sub: 'temp tolerance' },
            { icon: '💧', label: 'يدخر 150L', sub: 'بول مركز' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(20,10,0,0.1)', border: '1px solid rgba(120,80,20,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(220,180,100,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(140,100,40,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
