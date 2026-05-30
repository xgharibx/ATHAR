
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🧠 معضلة الوعي — The Consciousness Argument
// Material processes cannot explain subjective experience (qualia)
// This points to a non-material dimension — the soul (الروح)
// Visual: Brain neurons firing → question mark → the soul/light beyond matter

export default function ConsciousnessVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Neuron network
    const neurons = Array.from({ length: 30 }, () => ({
      x: Math.random() * 0.4 + 0.05, // Left side — brain
      y: Math.random() * 0.6 + 0.2,
      size: Math.random() * 4 + 3,
      firePhase: Math.random() * Math.PI * 2,
      fireSpeed: Math.random() * 2 + 1,
      connections: [] as number[],
    }));

    // Create connections
    neurons.forEach((n, i) => {
      const numConn = Math.floor(Math.random() * 3) + 1;
      for (let c = 0; c < numConn; c++) {
        const target = Math.floor(Math.random() * neurons.length);
        if (target !== i) n.connections.push(target);
      }
    });

    // Soul/consciousness particles — right side
    const soulParticles = Array.from({ length: 40 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 0.1 + 0.02,
      speed: Math.random() * 0.5 + 0.2,
      size: Math.random() * 2 + 1,
      hue: 30 + Math.random() * 30,
    }));

    const draw = () => {
      time += 0.01;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      // Dividing line — matter | mind
      const divX = w * 0.5;
      ctx.beginPath();
      ctx.setLineDash([4, 8]);
      ctx.moveTo(divX, h * 0.1);
      ctx.lineTo(divX, h * 0.85);
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.font = '12px Amiri';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(74, 144, 217, 0.4)';
      ctx.fillText('المادة / الدماغ', w * 0.25, h * 0.1);
      ctx.fillStyle = 'rgba(212, 168, 83, 0.4)';
      ctx.fillText('الوعي / الروح', w * 0.75, h * 0.1);

      // LEFT: Neuron network (brain/matter)
      // Connections
      neurons.forEach((n) => {
        const nx = n.x * w;
        const ny = n.y * h;
        n.connections.forEach((ci) => {
          const target = neurons[ci];
          const tx = target.x * w;
          const ty = target.y * h;

          // Signal pulse along connection
          const firing = Math.sin(time * n.fireSpeed + n.firePhase);
          const pulsePos = (Math.sin(time * 3 + n.firePhase) + 1) / 2;
          const px = nx + (tx - nx) * pulsePos;
          const py = ny + (ty - ny) * pulsePos;

          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = 'rgba(74, 144, 217, 0.07)';
          ctx.lineWidth = 0.5;
          ctx.stroke();

          if (firing > 0.5) {
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 180, 255, ${(firing - 0.5) * 0.6})`;
            ctx.fill();
          }
        });
      });

      // Neuron bodies
      neurons.forEach((n) => {
        const nx = n.x * w;
        const ny = n.y * h;
        const firing = Math.sin(time * n.fireSpeed + n.firePhase);
        const glow = Math.max(0, firing) * 0.3;

        ctx.beginPath();
        ctx.arc(nx, ny, n.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 144, 217, ${0.2 + glow})`;
        ctx.fill();

        if (glow > 0.1) {
          ctx.beginPath();
          ctx.arc(nx, ny, n.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(74, 144, 217, ${glow * 0.2})`;
          ctx.fill();
        }
      });

      // RIGHT: Consciousness / Soul — the non-material
      const soulCx = w * 0.75;
      const soulCy = h * 0.5;

      // Central soul glow
      const sGrad = ctx.createRadialGradient(soulCx, soulCy, 0, soulCx, soulCy, w * 0.15);
      sGrad.addColorStop(0, `rgba(212, 168, 83, ${0.15 + Math.sin(time) * 0.05})`);
      sGrad.addColorStop(0.5, 'rgba(212, 168, 83, 0.05)');
      sGrad.addColorStop(1, 'rgba(212, 168, 83, 0)');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(soulCx, soulCy, w * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Soul particles orbiting
      soulParticles.forEach((p) => {
        const angle = p.angle + time * p.speed;
        const dist = p.dist * w + Math.sin(time + p.angle) * 5;
        const px = soulCx + Math.cos(angle) * dist;
        const py = soulCy + Math.sin(angle) * dist;
        const alpha = 0.3 + Math.sin(time * 2 + p.angle) * 0.15;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`;
        ctx.fill();
      });

      // ? Bridge between matter and mind
      const qAlpha = 0.2 + Math.sin(time * 1.5) * 0.1;
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(200, 200, 200, ${qAlpha})`;
      ctx.fillText('?', divX, h * 0.5);

      // Arrows trying to bridge the gap
      for (let i = 0; i < 3; i++) {
        const ay = h * (0.35 + i * 0.15);
        const progress = (Math.sin(time * 2 + i) + 1) / 2;
        const ax = divX - 30 + progress * 20;
        const aAlpha = 0.15 * (1 - progress); // Fades as it approaches — can't bridge

        ctx.beginPath();
        ctx.moveTo(divX - 30, ay);
        ctx.lineTo(ax, ay);
        ctx.strokeStyle = `rgba(150, 150, 200, ${aAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    let started = false;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 2);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 2);
      if (!started) { started = true; draw(); }
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Key question */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1.5 }}
        className="absolute top-[15%] left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="text-text-muted text-[10px] font-tajawal">كيف تنتج المادة الصماء وعيًا وإدراكًا وشعورًا؟</p>
      </motion.div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-sm md:text-lg text-verse-green/70" style={{ textShadow: '0 0 20px rgba(45,212,168,0.2)' }}>
          وَيَسْأَلُونَكَ عَنِ الرُّوحِ ۖ قُلِ الرُّوحُ مِنْ أَمْرِ رَبِّي
        </p>
        <p className="text-gold-primary/40 text-xs font-tajawal mt-1">الإسراء : 85</p>
      </motion.div>
    </div>
  );
}
