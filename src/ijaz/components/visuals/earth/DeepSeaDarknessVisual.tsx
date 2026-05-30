
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🌊 ظلمات البحر — Deep Sea Darkness
// "أَوْ كَظُلُمَاتٍ فِي بَحْرٍ لُّجِّيٍّ يَغْشَاهُ مَوْجٌ مِّن فَوْقِهِ مَوْجٌ مِّن فَوْقِهِ سَحَابٌ
//  ظُلُمَاتٌ بَعْضُهَا فَوْقَ بَعْضٍ إِذَا أَخْرَجَ يَدَهُ لَمْ يَكَدْ يَرَاهَا"
// Layered darkness: clouds → surface waves → internal waves → abyss

export default function DeepSeaDarknessVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // ResizeObserver handles canvas sizing below

    // Deep sea particles (debris, plankton)
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      drift: Math.random() * 0.0003,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 0.008;
      const w = canvas.width;
      const h = canvas.height;

      // Layer positions
      const cloudY = h * 0.08;
      const surfaceY = h * 0.18;
      const shallowY = h * 0.35;
      const internalWaveY = h * 0.52;
      const twilightY = h * 0.70;
      const abyssY = h * 0.85;

      // Progressive darkness gradient — THE KEY CONCEPT
      const ocean = ctx.createLinearGradient(0, 0, 0, h);
      ocean.addColorStop(0, '#2a3a5a');     // Sky/clouds
      ocean.addColorStop(surfaceY / h, '#1a3050'); // Surface
      ocean.addColorStop(shallowY / h, '#10254a');  // Shallow — light reaches
      ocean.addColorStop(internalWaveY / h, '#081838'); // Internal waves
      ocean.addColorStop(twilightY / h, '#040e25');  // Twilight zone
      ocean.addColorStop(abyssY / h, '#020818');  // Midnight zone
      ocean.addColorStop(1, '#010410');     // Abyss — total darkness
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, w, h);

      // ☁️ LAYER 1: Clouds (سحاب)
      for (let i = 0; i < 4; i++) {
        const cx_ = w * (0.2 + i * 0.2) + Math.sin(time * 0.2 + i) * 30;
        const cy_ = cloudY - 5 + Math.sin(time * 0.3 + i * 2) * 3;
        const cGrad = ctx.createRadialGradient(cx_, cy_, 0, cx_, cy_, 50);
        cGrad.addColorStop(0, 'rgba(80, 90, 120, 0.4)');
        cGrad.addColorStop(1, 'rgba(60, 70, 100, 0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.ellipse(cx_, cy_, 60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label: سحاب
      ctx.font = '12px Amiri';
      ctx.fillStyle = 'rgba(180, 190, 220, 0.5)';
      ctx.textAlign = 'right';
      ctx.fillText('سَحَابٌ', w - 15, cloudY + 3);

      // 🌊 LAYER 2: Surface waves (موج)
      ctx.beginPath();
      ctx.moveTo(0, surfaceY);
      for (let x = 0; x <= w; x += 3) {
        const wave = Math.sin(x * 0.015 + time * 2) * 8 + Math.sin(x * 0.008 + time) * 5;
        ctx.lineTo(x, surfaceY + wave);
      }
      ctx.lineTo(w, surfaceY + 30);
      ctx.lineTo(0, surfaceY + 30);
      ctx.closePath();
      ctx.fillStyle = 'rgba(40, 80, 130, 0.3)';
      ctx.fill();

      // Wave line
      ctx.beginPath();
      ctx.moveTo(0, surfaceY);
      for (let x = 0; x <= w; x += 3) {
        const wave = Math.sin(x * 0.015 + time * 2) * 8 + Math.sin(x * 0.008 + time) * 5;
        ctx.lineTo(x, surfaceY + wave);
      }
      ctx.strokeStyle = 'rgba(100, 160, 220, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(100, 160, 220, 0.4)';
      ctx.fillText('مَوْجٌ ①', w - 15, surfaceY + 20);

      // 🌊 LAYER 3: Internal waves (موج من فوقه موج) — the deep internal waves
      ctx.beginPath();
      ctx.moveTo(0, internalWaveY);
      for (let x = 0; x <= w; x += 3) {
        const wave = Math.sin(x * 0.008 + time * 0.8) * 12 + Math.sin(x * 0.005 + time * 0.5) * 8;
        ctx.lineTo(x, internalWaveY + wave);
      }
      ctx.strokeStyle = 'rgba(60, 100, 160, 0.25)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Internal wave shading
      ctx.beginPath();
      ctx.moveTo(0, internalWaveY - 15);
      for (let x = 0; x <= w; x += 3) {
        const wave = Math.sin(x * 0.008 + time * 0.8) * 12;
        ctx.lineTo(x, internalWaveY + wave);
      }
      ctx.lineTo(w, internalWaveY + 30);
      ctx.lineTo(0, internalWaveY + 30);
      ctx.closePath();
      ctx.fillStyle = 'rgba(20, 50, 90, 0.15)';
      ctx.fill();

      ctx.fillStyle = 'rgba(60, 100, 160, 0.4)';
      ctx.fillText('مَوْجٌ مِّن فَوْقِهِ مَوْجٌ ②', w - 15, internalWaveY + 25);

      // Light attenuation rays from surface
      for (let i = 0; i < 5; i++) {
        const rx = w * (0.2 + i * 0.15);
        const topW = 15;
        const alpha = 0.06 * (1 - i * 0.01);
        const fadeDepth = shallowY + (internalWaveY - shallowY) * 0.7;

        const rGrad = ctx.createLinearGradient(rx, surfaceY, rx, fadeDepth);
        rGrad.addColorStop(0, `rgba(150, 200, 255, ${alpha})`);
        rGrad.addColorStop(1, `rgba(150, 200, 255, 0)`);
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.moveTo(rx - topW, surfaceY);
        ctx.lineTo(rx + topW, surfaceY);
        ctx.lineTo(rx + topW * 2, fadeDepth);
        ctx.lineTo(rx - topW * 2, fadeDepth);
        ctx.closePath();
        ctx.fill();
      }

      // 🖐️ Hand silhouette in the deep — "لم يكد يراها"
      const handAlpha = Math.sin(time) * 0.05 + 0.08; // Barely visible
      ctx.save();
      ctx.translate(w * 0.4, abyssY);
      ctx.scale(0.5, 0.5);
      // Simple hand shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -50);
      ctx.lineTo(-5, -50);
      ctx.lineTo(-5, -70);
      ctx.lineTo(5, -70);
      ctx.lineTo(5, -75);
      ctx.lineTo(15, -75);
      ctx.lineTo(15, -65);
      ctx.lineTo(25, -65);
      ctx.lineTo(25, -55);
      ctx.lineTo(30, -50);
      ctx.lineTo(30, -20);
      ctx.lineTo(20, 0);
      ctx.closePath();
      ctx.fillStyle = `rgba(150, 160, 180, ${handAlpha})`;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = `rgba(80, 90, 120, ${handAlpha + 0.1})`;
      ctx.font = '10px Tajawal';
      ctx.fillText('إِذَا أَخْرَجَ يَدَهُ لَمْ يَكَدْ يَرَاهَا', w * 0.5, abyssY + 25);

      // Darkness depth labels
      const labels = [
        { y: shallowY, text: 'منطقة الضوء', alpha: 0.3 },
        { y: twilightY, text: 'منطقة الشفق', alpha: 0.2 },
        { y: abyssY, text: 'الظلام التام', alpha: 0.15 },
      ];
      labels.forEach((l) => {
        ctx.fillStyle = `rgba(120, 140, 180, ${l.alpha})`;
        ctx.font = '10px Tajawal';
        ctx.textAlign = 'left';
        ctx.fillText(l.text, 15, l.y);
        // Dashed line
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.moveTo(10, l.y + 5);
        ctx.lineTo(w - 10, l.y + 5);
        ctx.strokeStyle = `rgba(100, 120, 160, ${l.alpha * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Deep sea particles
      particles.forEach((p) => {
        p.y += p.drift;
        if (p.y > 1) p.y = 0;
        const px = p.x * w + Math.sin(time + p.phase) * 5;
        const py = p.y * h;
        const depthAlpha = (1 - p.y) * 0.15;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 180, 220, ${depthAlpha})`;
        ctx.fill();
      });

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none"
      >
        <p className="font-amiri text-sm md:text-lg text-verse-green/70 leading-relaxed px-4" style={{ textShadow: '0 0 30px rgba(45,212,168,0.3)' }}>
          ظُلُمَاتٌ بَعْضُهَا فَوْقَ بَعْضٍ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">النور : 40</p>
      </motion.div>
    </div>
  );
}
