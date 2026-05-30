
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ☀️ سير الشمس إلى مستقرها — The Sun's Journey to the Solar Apex
// "وَالشَّمْسُ تَجْرِي لِمُسْتَقَرٍّ لَّهَا ذَٰلِكَ تَقْدِيرُ الْعَزِيزِ الْعَلِيمِ"
// The sun moves at 19.7 km/s toward the Solar Apex in Hercules
// Discovered by William Herschel in 1783 — 1100+ years after the Quran

export default function SolarApexVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ── Background star field ──────────────────────────────────
    const bgStars = Array.from({ length: 500 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.pow(Math.random(), 3) * 2.5 + 0.3,
      brightness: Math.random() * 0.6 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 2 + 0.5,
      hue: Math.random() > 0.85 ? 40 : Math.random() > 0.7 ? 200 : 0,
    }));

    // ── Passing stars (sun moving through space — parallax) ───
    const passingStars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speedX: -(Math.random() * 0.006 + 0.002), // moving away behind sun
      speedY: (Math.random() - 0.5) * 0.002,
      size: Math.random() * 1.8 + 0.4,
      brightness: Math.random() * 0.7 + 0.3,
      trailLength: Math.random() * 0.025 + 0.005,
    }));

    // ── Milky Way band dust clouds ────────────────────────────
    const dustClouds = Array.from({ length: 30 }, (_, i) => ({
      x: Math.random(),
      y: 0.35 + Math.sin(i * 0.8) * 0.25 + Math.random() * 0.12,
      rx: Math.random() * 0.15 + 0.06,
      ry: Math.random() * 0.04 + 0.02,
      opacity: Math.random() * 0.07 + 0.02,
      hue: Math.random() > 0.5 ? 200 : 40,
    }));

    const draw = () => {
      time += 0.007;

      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      // ── Deep space background ────────────────────────────────
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#03030d');
      bgGrad.addColorStop(0.4, '#050510');
      bgGrad.addColorStop(0.7, '#080514');
      bgGrad.addColorStop(1, '#020208');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // ── Milky Way diffuse glow band ──────────────────────────
      const mwY = h * 0.52;
      const mwGrad = ctx.createLinearGradient(0, mwY - h * 0.22, 0, mwY + h * 0.22);
      mwGrad.addColorStop(0, 'rgba(30,40,80,0)');
      mwGrad.addColorStop(0.4, 'rgba(40,50,110,0.12)');
      mwGrad.addColorStop(0.5, 'rgba(60,70,140,0.18)');
      mwGrad.addColorStop(0.6, 'rgba(40,50,110,0.12)');
      mwGrad.addColorStop(1, 'rgba(30,40,80,0)');
      ctx.fillStyle = mwGrad;
      ctx.fillRect(0, 0, w, h);

      // ── Dust clouds in Milky Way ─────────────────────────────
      dustClouds.forEach((d) => {
        ctx.save();
        ctx.globalAlpha = d.opacity;
        const dGrad = ctx.createRadialGradient(
          d.x * w, d.y * h, 0,
          d.x * w, d.y * h, d.rx * w
        );
        const c = d.hue === 200 ? '74,100,200' : '180,140,60';
        dGrad.addColorStop(0, `rgba(${c},0.5)`);
        dGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.ellipse(d.x * w, d.y * h, d.rx * w, d.ry * h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ── Static background stars ──────────────────────────────
      bgStars.forEach((s) => {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkle) * 0.25 + 0.75;
        const alpha = s.brightness * twinkle;
        const hsl = s.hue === 40 ? `255,220,100` : s.hue === 200 ? `150,190,255` : `255,255,255`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hsl},${alpha})`;
        ctx.fill();
        // glow for brighter stars
        if (s.size > 1.6 && alpha > 0.5) {
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.size * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hsl},${alpha * 0.08})`;
          ctx.fill();
        }
      });

      // ── Passing stars with trails (parallax: sun moving) ─────
      passingStars.forEach((s) => {
        s.x += s.speedX;
        s.y += s.speedY;
        // Wrap
        if (s.x < -0.05) { s.x = 1.05; s.y = Math.random(); }
        if (s.y < 0) s.y = 1;
        if (s.y > 1) s.y = 0;

        const px = s.x * w;
        const py = s.y * h;
        const trailX = px + s.trailLength * w;

        const trailGrad = ctx.createLinearGradient(trailX, py, px, py);
        trailGrad.addColorStop(0, 'rgba(255,255,255,0)');
        trailGrad.addColorStop(1, `rgba(255,255,255,${s.brightness * 0.55})`);
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = s.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(trailX, py);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.brightness * 0.8})`;
        ctx.fill();
      });

      // ── Galactic center glow (background, lower-right) ───────
      const gcx = w * 0.72, gcy = h * 0.62;
      const gcGrad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, w * 0.28);
      gcGrad.addColorStop(0, 'rgba(255,200,80,0.10)');
      gcGrad.addColorStop(0.4, 'rgba(200,140,40,0.05)');
      gcGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gcGrad;
      ctx.fillRect(0, 0, w, h);

      // ── Galactic orbit arc ───────────────────────────────────
      // The sun orbits the galactic center — show a sweeping arc
      const orbitCx = gcx, orbitCy = gcy;
      const orbitRx = w * 0.42, orbitRy = h * 0.28;
      ctx.save();
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = 'rgba(212,168,83,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(orbitCx, orbitCy, orbitRx, orbitRy, -0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ── Sun position (moves along galactic orbit over time) ───
      const orbitAngle = time * 0.04 - 1.8; // slow orbit progression
      const sunX = orbitCx + Math.cos(orbitAngle) * orbitRx;
      const sunY = orbitCy + Math.sin(orbitAngle) * orbitRy;

      // ── Sun trail (galactic orbit path behind it) ─────────────
      for (let i = 1; i <= 30; i++) {
        const pastAngle = orbitAngle - i * 0.04;
        const px = orbitCx + Math.cos(pastAngle) * orbitRx;
        const py = orbitCy + Math.sin(pastAngle) * orbitRy;
        const alpha = (1 - i / 30) * 0.18;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,80,${alpha})`;
        ctx.fill();
      }

      // ── Solar Apex destination glow (upper-left, direction of motion) ──
      const apexX = w * 0.18, apexY = h * 0.22;

      // Pulsing target rings
      for (let i = 0; i < 3; i++) {
        const phase = (time * 0.6 + i * 0.33) % 1;
        const r = phase * 45 + 8;
        const alpha = (1 - phase) * 0.35;
        ctx.beginPath();
        ctx.arc(apexX, apexY, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,160,40,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // Core apex glow
      const apexGrad = ctx.createRadialGradient(apexX, apexY, 0, apexX, apexY, 30);
      apexGrad.addColorStop(0, 'rgba(255,200,100,0.7)');
      apexGrad.addColorStop(0.3, 'rgba(255,150,40,0.3)');
      apexGrad.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = apexGrad;
      ctx.beginPath();
      ctx.arc(apexX, apexY, 30, 0, Math.PI * 2);
      ctx.fill();
      // Diamond crosshair
      ctx.save();
      ctx.translate(apexX, apexY);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = 'rgba(255,200,80,0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.lineTo(0, 18);
        ctx.stroke();
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();

      // ── Arrow: Sun → Solar Apex (proper motion vector) ───────
      const dx = apexX - sunX, dy = apexY - sunY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const arrowEndX = sunX + (dx / dist) * (dist - 32);
      const arrowEndY = sunY + (dy / dist) * (dist - 32);
      const arrowStartX = sunX + (dx / dist) * 38;
      const arrowStartY = sunY + (dy / dist) * 38;

      // Arrow line with animated dash
      ctx.save();
      const dashOffset = (time * 40) % 16;
      ctx.setLineDash([6, 10]);
      ctx.lineDashOffset = -dashOffset;
      const arrowGrad = ctx.createLinearGradient(arrowStartX, arrowStartY, arrowEndX, arrowEndY);
      arrowGrad.addColorStop(0, 'rgba(255,200,80,0.25)');
      arrowGrad.addColorStop(1, 'rgba(255,160,40,0.75)');
      ctx.strokeStyle = arrowGrad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.lineTo(arrowEndX, arrowEndY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      const headAngle = Math.atan2(dy, dx);
      ctx.translate(arrowEndX, arrowEndY);
      ctx.rotate(headAngle);
      ctx.fillStyle = 'rgba(255,180,60,0.8)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ── Sun rendering ─────────────────────────────────────────
      // Outer corona
      const coronaGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 55);
      coronaGrad.addColorStop(0, 'rgba(255,230,120,0.25)');
      coronaGrad.addColorStop(0.4, 'rgba(255,180,40,0.10)');
      coronaGrad.addColorStop(0.7, 'rgba(255,140,20,0.04)');
      coronaGrad.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 55, 0, Math.PI * 2);
      ctx.fill();

      // Solar flares (6 directional rays)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + time * 0.3;
        const flareLen = (Math.sin(time * 1.5 + i * 1.1) * 0.3 + 0.7) * 22;
        ctx.save();
        ctx.translate(sunX, sunY);
        ctx.rotate(angle);
        const flareGrad = ctx.createLinearGradient(0, 0, flareLen, 0);
        flareGrad.addColorStop(0, 'rgba(255,220,80,0.5)');
        flareGrad.addColorStop(1, 'rgba(255,140,20,0)');
        ctx.strokeStyle = flareGrad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(18 + flareLen, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Sun body gradient
      const sunGrad = ctx.createRadialGradient(sunX - 5, sunY - 5, 2, sunX, sunY, 20);
      sunGrad.addColorStop(0, 'rgba(255,255,200,1)');
      sunGrad.addColorStop(0.3, 'rgba(255,230,100,1)');
      sunGrad.addColorStop(0.7, 'rgba(255,170,30,0.95)');
      sunGrad.addColorStop(1, 'rgba(230,110,10,0.8)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
      ctx.fill();

      // Sun surface shimmer
      const pulseR = 20 + Math.sin(time * 3) * 1.5;
      ctx.beginPath();
      ctx.arc(sunX, sunY, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,240,160,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Galactic center label ─────────────────────────────────
      const gcLabelAlpha = 0.5;
      ctx.save();
      const gcLabelGrad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 18);
      gcLabelGrad.addColorStop(0, `rgba(255,200,80,${gcLabelAlpha * 0.6})`);
      gcLabelGrad.addColorStop(1, 'rgba(255,150,30,0)');
      ctx.fillStyle = gcLabelGrad;
      ctx.beginPath();
      ctx.arc(gcx, gcy, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${10 * dpr}px sans-serif`;
      ctx.fillStyle = `rgba(255,200,80,${gcLabelAlpha * 0.7})`;
      ctx.textAlign = 'center';
      ctx.fillText('Galactic Center', gcx, gcy + 28 * dpr);
      ctx.restore();

      // ── Speed label on arrow (mid-point) ─────────────────────
      const midArrowX = (arrowStartX + arrowEndX) / 2;
      const midArrowY = (arrowStartY + arrowEndY) / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(12,12,25,0.82)';
      const lw = 90 * dpr, lh = 20 * dpr;
      ctx.beginPath();
      ctx.roundRect(midArrowX - lw / 2, midArrowY - lh / 2 - 4, lw, lh, 4);
      ctx.fill();
      ctx.font = `bold ${9 * dpr}px sans-serif`;
      ctx.fillStyle = 'rgba(255,200,80,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('19.7 km/s → Solar Apex', midArrowX, midArrowY + 2 * dpr);
      ctx.restore();

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

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}
      style={{ background: '#03030d' }}>

      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ── TOP verse strip ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(3,3,18,0.85) 0%, rgba(3,3,18,0) 100%)' }}
      >
        <p className="font-amiri text-lg md:text-xl leading-snug"
          style={{ color: 'rgba(255,245,195,0.95)', textShadow: '0 0 24px rgba(255,200,80,0.5)' }}>
          وَالشَّمْسُ{' '}
          <span style={{ color: '#ffd85a', textShadow: '0 0 16px rgba(255,215,80,0.8)' }}>
            تَجْرِي لِمُسْتَقَرٍّ لَّهَا
          </span>
          {' '}ذَٰلِكَ تَقْدِيرُ الْعَزِيزِ الْعَلِيمِ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(255,180,60,0.45)' }}>
          سورة يس · الآية ٣٨
        </p>
      </motion.div>

      {/* ── Solar Apex label — pinned near target (top-left) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="absolute z-10 pointer-events-none"
        style={{ top: '19%', left: '8%' }}
      >
        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-[3px]"
          style={{
            background: 'rgba(10,8,3,0.72)',
            border: '1px solid rgba(255,180,50,0.28)',
            backdropFilter: 'blur(6px)',
          }}>
          <span style={{ color: '#ffd85a', fontSize: 8 }}>◎</span>
          <span className="text-[8px] font-bold tracking-[0.18em] uppercase"
            style={{ color: 'rgba(255,210,80,0.82)' }}>Solar Apex · Hercules</span>
        </div>
      </motion.div>

      {/* ── BOTTOM: stat chip row + caption ──────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-2 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(3,3,18,0.9) 0%, rgba(3,3,18,0.55) 60%, rgba(3,3,18,0) 100%)', paddingTop: 20 }}
      >
        {/* Caption */}
        <p className="text-[10px] font-tajawal text-center"
          style={{ color: 'rgba(210,190,140,0.75)', letterSpacing: '0.03em' }}>
          الشمس تسبح في مدارها الكوني وتتجه نحو{' '}
          <span style={{ color: 'rgba(255,200,80,0.85)' }}>أوجها المستقر في كوكبة هرقل</span>
        </p>

        {/* Stat chips — single scrollable row */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚡', label: '19.7 كم/ث', sub: 'نحو الأوج' },
            { icon: '🔄', label: '220 كم/ث', sub: 'مداري' },
            { icon: '💫', label: '225 م.سنة', sub: 'دورة كاملة' },
            { icon: '🔭', label: 'هيرشل 1783م', sub: 'الاكتشاف' },
            { icon: '📅', label: '1174 عاماً', sub: 'بعد القرآن' },
          ].map(({ icon, label, sub }) => (
            <div key={label}
              className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{
                background: 'rgba(255,180,50,0.07)',
                border: '1px solid rgba(255,180,50,0.18)',
                backdropFilter: 'blur(8px)',
              }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(255,220,130,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(180,160,110,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
