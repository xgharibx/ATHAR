import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// النبوءة في التوراة — Prophecy in Torah (الأعراف 157)
// Cinematic: an ancient scroll unrolls, glowing script lines write themselves,
// three prophecy markers ignite, and a beam of light descends onto فاران = مكة.

export default function ProphecyTorahVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    // Floating dust motes
    const motes = Array.from({ length: 50 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.4,
      sx: (Math.random() - 0.5) * 0.0003,
      sy: -Math.random() * 0.0004 - 0.0001,
      phase: Math.random() * Math.PI * 2,
    }));

    // Three prophecy markers (relative position on the scroll body)
    const markers = [0.3, 0.52, 0.74];

    const draw = () => {
      time += 0.016;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Background — deep warm vellum room
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.8);
      bg.addColorStop(0, '#181009');
      bg.addColorStop(1, '#070502');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Descending beam of light (revelation onto Makkah/Paran)
      const beamX = w * 0.5;
      const beamSway = Math.sin(time * 0.5) * w * 0.01;
      const beamGrad = ctx.createLinearGradient(beamX, 0, beamX, h);
      const beamPulse = 0.12 + Math.sin(time * 1.2) * 0.05;
      beamGrad.addColorStop(0, `rgba(255,225,150,${beamPulse + 0.1})`);
      beamGrad.addColorStop(0.6, `rgba(212,168,83,${beamPulse})`);
      beamGrad.addColorStop(1, 'rgba(212,168,83,0)');
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(beamX - w * 0.04, 0);
      ctx.lineTo(beamX + w * 0.04, 0);
      ctx.lineTo(beamX + w * 0.16 + beamSway, h);
      ctx.lineTo(beamX - w * 0.16 + beamSway, h);
      ctx.closePath();
      ctx.fillStyle = beamGrad;
      ctx.fill();
      ctx.restore();

      // ---- The unrolling scroll ----
      const unroll = Math.min(1, time / 2.2); // 0..1 reveal
      const ease = 1 - Math.pow(1 - unroll, 3);
      const scrollTop = h * 0.16;
      const scrollBot = h * 0.84;
      const scrollH = scrollBot - scrollTop;
      const fullW = w * 0.62;
      const curW = fullW * ease;
      const cx = w * 0.5;
      const left = cx - curW / 2;
      const right = cx + curW / 2;

      // Parchment body
      if (curW > 4) {
        const parch = ctx.createLinearGradient(0, scrollTop, 0, scrollBot);
        parch.addColorStop(0, 'rgba(60,46,26,0.95)');
        parch.addColorStop(0.5, 'rgba(78,60,34,0.95)');
        parch.addColorStop(1, 'rgba(54,40,22,0.95)');
        ctx.fillStyle = parch;
        ctx.beginPath();
        ctx.moveTo(left, scrollTop + 6);
        ctx.quadraticCurveTo(cx, scrollTop - 4, right, scrollTop + 6);
        ctx.lineTo(right, scrollBot - 6);
        ctx.quadraticCurveTo(cx, scrollBot + 4, left, scrollBot - 6);
        ctx.closePath();
        ctx.fill();

        // Inner glow edge
        ctx.strokeStyle = 'rgba(212,168,83,0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Script lines writing themselves
        ctx.save();
        ctx.beginPath();
        ctx.rect(left + 6, scrollTop, curW - 12, scrollH);
        ctx.clip();
        const lineCount = 16;
        for (let i = 0; i < lineCount; i++) {
          const ly = scrollTop + 14 + (i / lineCount) * (scrollH - 24);
          // Each line writes over time
          const lineStart = 0.4 + i * 0.09;
          const lineProg = Math.max(0, Math.min(1, (time - lineStart) / 0.5));
          if (lineProg <= 0) continue;
          const lineW = (curW - 28) * (0.55 + ((i * 37) % 40) / 100);
          const writeW = lineW * lineProg;
          // glow tip
          const grd = ctx.createLinearGradient(left + 14, ly, left + 14 + lineW, ly);
          grd.addColorStop(0, 'rgba(230,210,160,0.5)');
          grd.addColorStop(1, 'rgba(230,210,160,0.25)');
          ctx.strokeStyle = grd;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(left + 14, ly);
          ctx.lineTo(left + 14 + writeW, ly);
          ctx.stroke();
          if (lineProg < 1) {
            ctx.beginPath();
            ctx.arc(left + 14 + writeW, ly, 2.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,235,180,0.9)';
            ctx.fill();
          }
        }
        ctx.restore();

        // Prophecy markers ignite sequentially
        markers.forEach((m, idx) => {
          const my = scrollTop + 14 + m * (scrollH - 24);
          const igniteAt = 2.4 + idx * 0.7;
          const on = time > igniteAt;
          if (!on) return;
          const pulse = 0.5 + Math.sin(time * 3 + idx) * 0.5;
          const mx = right - 18;
          const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 16);
          glow.addColorStop(0, `rgba(45,212,168,${0.5 + pulse * 0.4})`);
          glow.addColorStop(1, 'rgba(45,212,168,0)');
          ctx.beginPath();
          ctx.arc(mx, my, 16, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
          // check dot
          ctx.beginPath();
          ctx.arc(mx, my, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#2dd4a8';
          ctx.fill();
        });
      }

      // Wooden rollers at the edges
      const drawRoller = (rx: number) => {
        const rg = ctx.createLinearGradient(rx - 8, 0, rx + 8, 0);
        rg.addColorStop(0, '#3a2410');
        rg.addColorStop(0.5, '#6b4423');
        rg.addColorStop(1, '#3a2410');
        ctx.fillStyle = rg;
        ctx.fillRect(rx - 7, scrollTop - 14, 14, scrollH + 28);
        // knobs
        ctx.fillStyle = '#7a4f28';
        ctx.beginPath();
        ctx.ellipse(rx, scrollTop - 14, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(rx, scrollBot + 14, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      if (curW > 4) {
        drawRoller(left);
        drawRoller(right);
      }

      // Dust motes
      for (const p of motes) {
        p.x += p.sx;
        p.y += p.sy;
        if (p.y < 0) p.y = 1;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        const tw = Math.sin(time * 1.5 + p.phase) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,168,83,${tw * 0.35})`;
        ctx.fill();
      }

      // Landing glow where beam meets scroll (Paran = Makkah)
      const landY = scrollBot - 4;
      const landPulse = 0.4 + Math.sin(time * 2) * 0.3;
      const land = ctx.createRadialGradient(beamX + beamSway, landY, 0, beamX + beamSway, landY, 40);
      land.addColorStop(0, `rgba(255,225,150,${landPulse * 0.5})`);
      land.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.beginPath();
      ctx.arc(beamX + beamSway, landY, 40, 0, Math.PI * 2);
      ctx.fillStyle = land;
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

  const prophecies = [
    { text: 'نبيٌّ من إخوتهم مثلك', source: 'تثنية 18:18' },
    { text: 'وأشرق من سعير وتلألأ من جبل فاران', source: 'تثنية 33:2', highlight: true },
    { text: 'ومعه عشرة آلاف من القديسين', source: 'تثنية 33:2' },
  ];

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-4 left-0 right-0 text-center font-amiri text-lg text-gold-primary z-10 pointer-events-none"
        style={{ textShadow: '0 0 18px rgba(212,168,83,0.4)' }}
      >
        البشارات في التوراة
      </motion.p>

      {/* Prophecy captions fading in over the scroll */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2 px-6 pointer-events-none">
        {prophecies.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.6 + i * 0.7, duration: 0.8 }}
            className={`text-center rounded-lg px-3 py-1.5 backdrop-blur-[2px] ${p.highlight ? 'bg-gold-primary/10 border border-gold-primary/25' : 'bg-black/20'}`}
          >
            <p className={`font-amiri text-sm ${p.highlight ? 'text-gold-primary' : 'text-text-primary/85'}`}>
              {p.text}
            </p>
            <p className="text-[9px] text-text-muted font-mono mt-0.5">{p.source}</p>
          </motion.div>
        ))}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.8, duration: 1 }}
          className="font-amiri text-sm text-verse-green/80 mt-1"
          style={{ textShadow: '0 0 16px rgba(45,212,168,0.3)' }}
        >
          فاران = مكة — موطن إسماعيل عليه السلام
        </motion.p>
      </div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 2 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-xs md:text-sm text-verse-green/70 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.3)' }}>
          يَجِدُونَهُ مَكْتُوبًا عِندَهُمْ فِي التَّوْرَاةِ وَالْإِنجِيلِ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">الأعراف : 157</p>
      </motion.div>
    </div>
  );
}
