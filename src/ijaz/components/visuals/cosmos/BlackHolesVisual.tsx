
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚫ فَلَا أُقْسِمُ بِالْخُنَّسِ الْجَوَارِ الْكُنَّسِ — The Black Holes Miracle
// Three Arabic words: retreat+collapse / sweep with gravity / hide+disappear
// Schwarzschild 1916 — John Wheeler 1967 "Black Hole"

export default function BlackHolesVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Background stars
    const stars = Array.from({ length: 400 }, () => ({
      x: Math.random(), y: Math.random(),
      size: Math.pow(Math.random(), 3) * 2.2 + 0.2,
      alpha: Math.random() * 0.7 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.5 + 0.5,
    }));

    // Stars being consumed — spiral into black hole
    type ConsumedStar = { angle: number; radius: number; speed: number; size: number; alpha: number; hue: number; dead: boolean };
    const consumed: ConsumedStar[] = Array.from({ length: 30 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 0.3 + 0.12,
      speed: (Math.random() * 0.4 + 0.15) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      hue: Math.random() > 0.6 ? 20 : 200,
      dead: false,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      const cx = w * 0.5, cy = h * 0.46;
      const bhR = Math.min(w, h) * 0.115; // black hole radius

      // Background
      ctx.fillStyle = '#030005';
      ctx.fillRect(0, 0, w, h);

      // Subtle purple nebula
      const nebGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.55);
      nebGrad.addColorStop(0, 'rgba(60,10,80,0.18)');
      nebGrad.addColorStop(0.4, 'rgba(40,5,60,0.08)');
      nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nebGrad; ctx.fillRect(0, 0, w, h);

      // Background stars
      stars.forEach((s) => {
        const t = Math.sin(time * s.speed + s.twinkle) * 0.25 + 0.75;
        const dx = s.x * w - cx, dy = s.y * h - cy;
        const distFrac = Math.sqrt(dx * dx + dy * dy) / (w * 0.5);
        // Stars near BH are dimmed / distorted
        const lensAlpha = s.alpha * t * Math.min(1, distFrac * 2.5);
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${lensAlpha})`; ctx.fill();
      });

      // ── Accretion disk (hot swirling gas in perspective ellipse) ──
      const diskRx = bhR * 2.8, diskRy = bhR * 0.6;
      const diskAngle = time * 0.12;

      // Multiple disk rings with hot colors
      for (let ring = 0; ring < 8; ring++) {
        const rFrac = 1 - ring / 8;
        const rx = diskRx * (1.1 - ring * 0.04);
        const ry = diskRy * (1.1 - ring * 0.04);
        const alpha = 0.12 + rFrac * 0.18;

        const hue = 15 + ring * 4; // orange → red
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(diskAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 90%, ${55 + ring * 3}%, ${alpha})`;
        ctx.lineWidth = 3 - ring * 0.2;
        ctx.stroke();
        ctx.restore();
      }

      // Disk glow — upper arc
      ctx.save();
      ctx.translate(cx, cy);
      const diskGlowGrad = ctx.createLinearGradient(-diskRx, 0, diskRx, 0);
      diskGlowGrad.addColorStop(0, 'rgba(255,80,20,0.0)');
      diskGlowGrad.addColorStop(0.3, 'rgba(255,140,50,0.22)');
      diskGlowGrad.addColorStop(0.5, 'rgba(255,200,80,0.35)');
      diskGlowGrad.addColorStop(0.7, 'rgba(255,140,50,0.22)');
      diskGlowGrad.addColorStop(1, 'rgba(255,80,20,0.0)');
      ctx.fillStyle = diskGlowGrad;
      ctx.beginPath(); ctx.ellipse(0, 0, diskRx, diskRy * 0.8, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Consumed/spiraling stars ──────────────────────────
      consumed.forEach((s) => {
        s.angle += s.speed * 0.022;
        s.radius -= 0.0007;
        if (s.radius < 0.04) {
          s.radius = Math.random() * 0.3 + 0.14;
          s.angle = Math.random() * Math.PI * 2;
          s.speed = (Math.random() * 0.4 + 0.15) * (Math.random() > 0.5 ? 1 : -1);
        }
        const sx = cx + Math.cos(s.angle) * s.radius * w * 0.5;
        const sy = cy + Math.sin(s.angle) * s.radius * h * 0.55;
        const distFrac = s.radius / 0.44;
        const a = s.alpha * Math.min(1, distFrac * 1.4);
        // Trail
        for (let t = 1; t <= 12; t++) {
          const pa = s.angle - t * 0.05 * Math.sign(s.speed);
          const pr = s.radius + t * 0.0035;
          const px = cx + Math.cos(pa) * pr * w * 0.5;
          const py = cy + Math.sin(pa) * pr * h * 0.55;
          ctx.beginPath(); ctx.arc(px, py, s.size * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${s.hue},80%,65%,${(1 - t / 12) * a * 0.4})`; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue},80%,70%,${a})`; ctx.fill();
      });

      // ── Photon sphere glow (innermost stable orbit) ──────────
      const photonR = bhR * 1.12;
      const photonGrad = ctx.createRadialGradient(cx, cy, photonR * 0.9, cx, cy, photonR * 1.4);
      photonGrad.addColorStop(0, 'rgba(255,160,60,0.22)');
      photonGrad.addColorStop(0.5, 'rgba(255,100,30,0.12)');
      photonGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = photonGrad;
      ctx.beginPath(); ctx.arc(cx, cy, photonR * 1.4, 0, Math.PI * 2); ctx.fill();

      // ── Gravitational lensing ring ──────────────────────────
      const lensR = bhR * 1.06;
      const lensGrad = ctx.createRadialGradient(cx, cy, lensR * 0.9, cx, cy, lensR * 1.25);
      lensGrad.addColorStop(0, 'rgba(255,120,40,0.55)');
      lensGrad.addColorStop(0.5, 'rgba(255,80,20,0.25)');
      lensGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lensGrad;
      ctx.beginPath(); ctx.arc(cx, cy, lensR * 1.25, 0, Math.PI * 2); ctx.fill();

      // ── Relativistic jets (polar) ──────────────────────────
      for (let j = 0; j < 2; j++) {
        const jDir = j === 0 ? -1 : 1;
        const jetGrad = ctx.createLinearGradient(cx, cy + jDir * bhR, cx, cy + jDir * bhR * 4.5);
        jetGrad.addColorStop(0, `rgba(150,100,255,0.3)`);
        jetGrad.addColorStop(0.5, `rgba(100,60,220,0.12)`);
        jetGrad.addColorStop(1, `rgba(80,40,180,0)`);
        ctx.fillStyle = jetGrad;
        const jetW = bhR * (0.25 + Math.sin(time * 2) * 0.03);
        ctx.beginPath();
        ctx.moveTo(cx - jetW, cy + jDir * bhR * 1.05);
        ctx.lineTo(cx + jetW, cy + jDir * bhR * 1.05);
        ctx.lineTo(cx + jetW * 0.15, cy + jDir * bhR * 4.5);
        ctx.lineTo(cx - jetW * 0.15, cy + jDir * bhR * 4.5);
        ctx.closePath(); ctx.fill();
      }

      // ── Draw disk AGAIN in front of bottom half BH ──────────
      ctx.save();
      ctx.translate(cx, cy);
      const diskFrontGrad = ctx.createLinearGradient(-diskRx, 0, diskRx, 0);
      diskFrontGrad.addColorStop(0, 'rgba(255,80,20,0.0)');
      diskFrontGrad.addColorStop(0.35, 'rgba(255,150,60,0.28)');
      diskFrontGrad.addColorStop(0.5, 'rgba(255,210,100,0.45)');
      diskFrontGrad.addColorStop(0.65, 'rgba(255,150,60,0.28)');
      diskFrontGrad.addColorStop(1, 'rgba(255,80,20,0.0)');
      ctx.fillStyle = diskFrontGrad;
      ctx.beginPath(); ctx.ellipse(0, 0, diskRx, diskRy * 0.75, 0, 0, Math.PI);
      ctx.fill();
      ctx.restore();

      // ── Black hole void ──────────────────────────────────────
      const voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bhR);
      voidGrad.addColorStop(0, 'rgba(0,0,0,1)');
      voidGrad.addColorStop(0.85, 'rgba(0,0,0,1)');
      voidGrad.addColorStop(1, 'rgba(0,0,0,0.96)');
      ctx.fillStyle = voidGrad;
      ctx.beginPath(); ctx.arc(cx, cy, bhR, 0, Math.PI * 2); ctx.fill();

      // ── The 3 Arabic word pulses around BH ──────────────────
      const words = [
        { text: 'الخُنَّس', angle: -Math.PI * 0.6, color: '#ff8844', sub: 'تراجع · انهيار' },
        { text: 'الجَوَار', angle: Math.PI * 0.1, color: '#ffcc44', sub: 'جاذبية هائلة' },
        { text: 'الكُنَّس', angle: Math.PI * 0.75, color: '#aa88ff', sub: 'اختفاء · خفاء' },
      ];
      const wordOrbit = bhR * 2.05;
      words.forEach(({ text, angle, color, sub }) => {
        const wax = cx + Math.cos(angle) * wordOrbit;
        const way = cy + Math.sin(angle) * wordOrbit * 0.55;
        const pulse = Math.sin(time * 1.2 + angle) * 0.12 + 0.88;

        // Connector line to BH edge
        const edgeX = cx + Math.cos(angle) * bhR * 1.12;
        const edgeY = cy + Math.sin(angle) * bhR * 0.7;
        ctx.save();
        ctx.globalAlpha = 0.28 * pulse;
        ctx.strokeStyle = color; ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 6]); ctx.lineDashOffset = -(time * 18 % 9);
        ctx.beginPath(); ctx.moveTo(edgeX, edgeY); ctx.lineTo(wax, way); ctx.stroke();
        ctx.setLineDash([]);

        // Pill bg
        ctx.globalAlpha = pulse * 0.9;
        ctx.fillStyle = 'rgba(4,0,8,0.85)'; ctx.strokeStyle = `${color}55`; ctx.lineWidth = 1;
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: number[]) => void }).roundRect(wax - 40, way - 22, 80, 40, 8);
        ctx.fill(); ctx.stroke();

        // Arabic
        ctx.fillStyle = color;
        ctx.font = `bold ${12 * dpr}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = color; ctx.shadowBlur = 8;
        ctx.fillText(text, wax, way - 5);

        // Sub
        ctx.globalAlpha = pulse * 0.65; ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(200,180,150,0.7)';
        ctx.font = `${8 * dpr}px sans-serif`;
        ctx.fillText(sub, wax, way + 10);
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
      if (!started) { started = true; draw(); }
    });
    observer.observe(canvas);
    return () => { cancelAnimationFrame(animId); observer.disconnect(); };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}
      style={{ background: '#030005' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* TOP verse */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(3,0,5,0.88) 0%, rgba(3,0,5,0) 100%)' }}>
        <p className="font-amiri text-lg md:text-xl leading-snug text-center"
          style={{ color: 'rgba(255,230,200,0.92)', textShadow: '0 0 22px rgba(200,80,40,0.5)' }}>
          فَلَا أُقْسِمُ{' '}
          <span style={{ color: '#ff8844', textShadow: '0 0 14px rgba(255,120,60,0.7)' }}>بِالْخُنَّسِ</span>
          {' '}
          <span style={{ color: '#ffcc44', textShadow: '0 0 14px rgba(255,200,60,0.7)' }}>الْجَوَارِ</span>
          {' '}
          <span style={{ color: '#aa88ff', textShadow: '0 0 14px rgba(160,120,255,0.7)' }}>الْكُنَّسِ</span>
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(200,100,60,0.45)' }}>
          سورة التكوير · الآيتان ١٥–١٦
        </p>
      </motion.div>

      {/* Bottom chips */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-2 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(3,0,5,0.92) 0%, rgba(3,0,5,0.5) 60%, rgba(3,0,5,0) 100%)', paddingTop: 20 }}>
        <p className="text-[10px] font-tajawal text-center" style={{ color: 'rgba(210,180,150,0.75)' }}>
          ثلاث كلمات عربية تصف{' '}
          <span style={{ color: 'rgba(255,150,60,0.9)' }}>الثقوب السوداء</span>
          {' '}بدقة لم يصلها العلم إلا عام 1916م
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '⚫', label: 'خُنَّس = انهيار', sub: 'تراجع نحو الداخل' },
            { icon: '🌀', label: 'جَوَار = جذب هائل', sub: 'يسحب الضوء' },
            { icon: '👁️', label: 'كُنَّس = اختفاء', sub: 'لا يُرى' },
            { icon: '📡', label: 'EHT صورة 2019م', sub: 'M87* أول صورة' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(180,60,20,0.07)', border: '1px solid rgba(200,80,40,0.18)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(255,180,120,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(200,140,100,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
