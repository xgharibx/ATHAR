import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⭐ وَهُوَ الَّذِي جَعَلَ لَكُمُ النُّجُومَ لِتَهْتَدُوا — Stars for Navigation (الأنعام 97)
// ULTIMATE: a rotating celestial sphere wheels around a fixed Polaris (true diurnal
// motion), constellations ignite and connect, shooting stars streak, a sextant
// bearing beam locks onto Polaris, and a compass rose tracks true north below a
// rolling ship on a shimmering sea.

export default function StarsNavigationVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Polaris sits at this screen fraction; everything rotates around it.
    const POLARIS = { x: 0.5, y: 0.16 };

    // Rotating background stars (polar coordinates around Polaris)
    type Star = { ang: number; rad: number; size: number; tw: number; hot: boolean };
    const stars: Star[] = Array.from({ length: 320 }, () => ({
      ang: Math.random() * Math.PI * 2,
      rad: Math.random() * 0.9 + 0.02,
      size: Math.pow(Math.random(), 2) * 2.4 + 0.4,
      tw: Math.random() * Math.PI * 2,
      hot: Math.random() > 0.85,
    }));

    // Constellations defined as polar offsets from Polaris so they wheel together.
    // Big Dipper + Cassiopeia, expressed as [angle, radius] anchors.
    const makeConstellation = (baseAng: number, baseRad: number, shape: [number, number][]) =>
      shape.map(([dx, dy]) => ({ dx, dy, baseAng, baseRad }));
    const dipper = makeConstellation(0, 0, [
      [-0.16, -0.04], [-0.10, -0.06], [-0.04, -0.05], [0.02, -0.02],
      [0.01, 0.04], [-0.05, 0.05], [-0.11, 0.03],
    ]);
    const cassiopeia = makeConstellation(0, 0, [
      [0.18, 0.10], [0.23, 0.04], [0.28, 0.10], [0.33, 0.04], [0.38, 0.10],
    ]);

    // Shooting stars
    type Shoot = { x: number; y: number; vx: number; vy: number; life: number; max: number };
    const shoots: Shoot[] = [];

    const draw = () => {
      time += 0.008;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const rot = time * 0.06; // diurnal rotation
      const px = POLARIS.x * w, py = POLARIS.y * h;
      const scale = Math.min(w, h);

      // Deep space background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#010008');
      bg.addColorStop(0.5, '#03021a');
      bg.addColorStop(1, '#05061c');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Faint star-trail circles around Polaris
      for (let r = 0.12; r < 0.95; r += 0.16) {
        ctx.beginPath();
        ctx.arc(px, py, r * scale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120,150,220,${0.04})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Rotating stars
      stars.forEach((s) => {
        const a = s.ang + rot;
        const sx = px + Math.cos(a) * s.rad * scale;
        const sy = py + Math.sin(a) * s.rad * scale;
        const alpha = Math.sin(time * 1.5 + s.tw) * 0.18 + (s.hot ? 0.8 : 0.45);
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.hot ? `rgba(255,235,150,${alpha})` : `rgba(200,215,255,${alpha})`;
        ctx.fill();
        if (s.hot) {
          ctx.beginPath();
          ctx.arc(sx, sy, s.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,220,120,${alpha * 0.08})`;
          ctx.fill();
        }
      });

      // Constellation drawing helper (wheels with rotation)
      const drawConstellation = (pts: { dx: number; dy: number }[], anchorAng: number, anchorRad: number, name: string, reveal: number) => {
        const screen = pts.map((p) => {
          const ang = Math.atan2(p.dy, p.dx) + anchorAng + rot;
          const rad = Math.hypot(p.dx, p.dy) + anchorRad;
          return [px + Math.cos(ang) * rad * scale, py + Math.sin(ang) * rad * scale] as [number, number];
        });
        const shown = Math.floor(reveal * screen.length);
        ctx.strokeStyle = 'rgba(230,210,110,0.32)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < Math.min(shown, screen.length); i++) {
          if (i === 0) ctx.moveTo(screen[i][0], screen[i][1]);
          else ctx.lineTo(screen[i][0], screen[i][1]);
        }
        ctx.stroke();
        screen.forEach(([sx, sy], i) => {
          if (i >= shown) return;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,235,150,0.95)';
          ctx.shadowColor = 'rgba(255,220,120,0.8)';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        if (shown > 0) {
          const mid = screen[Math.floor(screen.length / 2)];
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(230,210,110,0.4)';
          ctx.fillText(name, mid[0], mid[1] - 12);
        }
      };

      const reveal = Math.min(1, time / 2.5);
      drawConstellation(dipper, Math.PI * 0.9, 0.45, 'الدب الأكبر', reveal);
      drawConstellation(cassiopeia, -Math.PI * 0.6, 0.5, 'ذات الكرسي', reveal);

      // Polaris — fixed, radiant
      const pPulse = Math.sin(time * 2) * 0.15 + 0.85;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, 22);
      pg.addColorStop(0, `rgba(200,235,255,${pPulse})`);
      pg.addColorStop(0.4, `rgba(140,200,255,${pPulse * 0.4})`);
      pg.addColorStop(1, 'rgba(140,200,255,0)');
      ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
      // 4-point sparkle
      ctx.strokeStyle = `rgba(220,245,255,${pPulse})`;
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(a) * 14, py + Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#eaf6ff'; ctx.fill();
      ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,225,255,0.7)';
      ctx.fillText('نجم القطب', px, py - 26);

      // Ocean horizon
      const horizY = h * 0.74;
      const ocean = ctx.createLinearGradient(0, horizY, 0, h);
      ocean.addColorStop(0, 'rgba(10,32,64,0.92)');
      ocean.addColorStop(1, 'rgba(4,14,38,1)');
      ctx.fillStyle = ocean; ctx.fillRect(0, horizY, w, h - horizY);
      // Polaris reflection shimmer
      for (let i = 0; i < 14; i++) {
        const ry = horizY + 4 + i * ((h - horizY) / 14);
        const sway = Math.sin(time * 2 + i * 0.7) * (3 + i);
        ctx.beginPath();
        ctx.moveTo(px - 6 + sway, ry);
        ctx.lineTo(px + 6 + sway, ry);
        ctx.strokeStyle = `rgba(160,210,255,${0.12 * (1 - i / 14)})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      // wave shimmer
      for (let i = 0; i < 22; i++) {
        const ox = (i / 22) * w;
        const oy = horizY + 10 + Math.sin(time * 1.4 + i) * 3;
        ctx.strokeStyle = `rgba(80,160,220,${Math.sin(time + i) * 0.05 + 0.1})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 18, oy); ctx.stroke();
      }

      // Ship rolling on the sea
      const shipAngle = Math.sin(time * 0.6) * 0.12;
      const shipX = w * 0.5, shipY = horizY + 14;
      ctx.save();
      ctx.translate(shipX, shipY);
      ctx.rotate(shipAngle);
      ctx.fillStyle = 'rgba(120,100,60,0.8)';
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(14, 12); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(150,128,75,0.7)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -32); ctx.stroke();
      ctx.fillStyle = 'rgba(225,205,165,0.5)';
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(19, -10); ctx.lineTo(0, -5); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Sextant bearing beam — ship to Polaris
      const beamPulse = Math.sin(time * 3) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(160,220,255,${0.15 + beamPulse * 0.2})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 7]);
      ctx.lineDashOffset = -(time * 30 % 12);
      ctx.beginPath(); ctx.moveTo(shipX, shipY); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);

      // Compass rose locked to true north (Polaris direction)
      const crX = w * 0.84, crY = h * 0.86, crR = Math.min(w, h) * 0.07;
      const northAng = Math.atan2(py - crY, px - crX);
      ctx.save();
      ctx.translate(crX, crY);
      ctx.strokeStyle = 'rgba(220,200,120,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, crR, 0, Math.PI * 2); ctx.stroke();
      // needle points to Polaris
      ctx.rotate(northAng + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -crR);
      ctx.lineTo(crR * 0.22, 0);
      ctx.lineTo(0, crR * 0.5);
      ctx.lineTo(-crR * 0.22, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,120,80,0.85)';
      ctx.fill();
      ctx.restore();
      ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(220,200,120,0.6)';
      ctx.fillText('N', crX + Math.cos(northAng) * crR, crY + Math.sin(northAng) * crR - 2);

      // Shooting stars
      if (Math.random() < 0.012) {
        const sx = Math.random() * w * 0.8 + w * 0.1;
        const sy = Math.random() * h * 0.4;
        shoots.push({ x: sx, y: sy, vx: (Math.random() * 2 + 2) * (Math.random() > 0.5 ? 1 : -1), vy: Math.random() * 1.5 + 1, life: 0, max: 40 });
      }
      for (let i = shoots.length - 1; i >= 0; i--) {
        const sh = shoots[i];
        sh.x += sh.vx; sh.y += sh.vy; sh.life++;
        const a = Math.sin((sh.life / sh.max) * Math.PI);
        ctx.strokeStyle = `rgba(255,245,210,${a})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 6, sh.y - sh.vy * 6);
        ctx.stroke();
        if (sh.life >= sh.max) shoots.splice(i, 1);
      }

      // لِتَهْتَدُوا label
      ctx.font = 'bold 13px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(230,210,130,0.6)';
      ctx.shadowColor = 'rgba(200,180,80,0.4)'; ctx.shadowBlur = 12;
      ctx.fillText('لِتَهْتَدُوا بِها', w * 0.5, h * 0.92);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#010008' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(1,0,8,0.9) 0%, rgba(1,0,8,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(230,210,160,0.92)', textShadow: '0 0 18px rgba(200,180,80,0.4)' }}>
          وَهُوَ الَّذِي جَعَلَ لَكُمُ النُّجُومَ{' '}
          <span style={{ color: '#ffdd88', textShadow: '0 0 14px rgba(255,220,100,0.7)' }}>لِتَهْتَدُوا بِهَا</span>
          {' '}فِي ظُلُمَاتِ الْبَرِّ وَالْبَحْرِ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(130,110,50,0.45)' }}>
          سورة الأنعام · الآية ٩٧
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(1,0,8,0.92) 0%, rgba(1,0,8,0.5) 60%, rgba(1,0,8,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⭐', label: 'الجدي = الشمال', sub: 'Polaris' },
            { icon: '🧭', label: 'ملاحة فلكية', sub: '3000 سنة' },
            { icon: '🚀', label: 'GPS عبر أقمار', sub: 'نفس المبدأ' },
            { icon: '🌌', label: 'Big Dipper', sub: 'دب أكبر' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(30,20,5,0.1)', border: '1px solid rgba(160,130,40,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(230,210,150,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(160,140,80,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
