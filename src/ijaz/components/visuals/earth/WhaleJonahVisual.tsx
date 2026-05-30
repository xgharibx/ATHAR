
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

export default function WhaleJonahVisual({ className }: MiracleVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Bubbles
    type Bubble = { x: number; y: number; r: number; speed: number; alpha: number };
    const bubbles: Bubble[] = Array.from({ length: 20 }, () => ({
      x: Math.random(), y: 0.6 + Math.random() * 0.4,
      r: 1 + Math.random() * 3, speed: 0.001 + Math.random() * 0.001, alpha: Math.random() * 0.15 + 0.05,
    }));

    const draw = () => {
      time += 0.007;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      // Ocean gradient
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#001530'); oceanGrad.addColorStop(0.3, '#000c20'); oceanGrad.addColorStop(1, '#000305');
      ctx.fillStyle = oceanGrad; ctx.fillRect(0, 0, w, h);

      // Light caustics at surface
      for (let i = 0; i < 8; i++) {
        const lx = ((i / 8 + time * 0.03) % 1) * w;
        const cGrad = ctx.createLinearGradient(lx, 0, lx, h * 0.3);
        cGrad.addColorStop(0, 'rgba(40,100,200,0.08)'); cGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cGrad; ctx.fillRect(lx - 20, 0, 40, h * 0.3);
      }

      // Bubbles
      bubbles.forEach(b => {
        b.y -= b.speed; if (b.y < 0) b.y = 1;
        ctx.beginPath(); ctx.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,160,220,${b.alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
      });

      // ── Whale silhouette ──────────────────────────────────────────
      const whaleX = w * 0.5 + Math.sin(time * 0.2) * w * 0.1;
      const whaleY = h * 0.52;
      const wW = Math.min(w, h) * 0.55, wH = Math.min(w, h) * 0.16;
      const whaleColor = 'rgba(20,40,60,0.7)';

      // Body
      ctx.beginPath(); ctx.ellipse(whaleX, whaleY, wW * 0.5, wH * 0.5, 0.05, 0, Math.PI * 2);
      ctx.fillStyle = whaleColor; ctx.fill();
      ctx.strokeStyle = 'rgba(30,60,100,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      // Tail fin
      ctx.beginPath();
      ctx.moveTo(whaleX - wW * 0.48, whaleY);
      ctx.lineTo(whaleX - wW * 0.55, whaleY - wH * 0.5);
      ctx.lineTo(whaleX - wW * 0.42, whaleY + 2);
      ctx.lineTo(whaleX - wW * 0.55, whaleY + wH * 0.5);
      ctx.closePath(); ctx.fillStyle = whaleColor; ctx.fill();
      // Flippers
      ctx.beginPath(); ctx.ellipse(whaleX + wW * 0.05, whaleY + wH * 0.35, wW * 0.15, wH * 0.12, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,32,50,0.6)'; ctx.fill();
      // Dorsal fin
      ctx.beginPath();
      ctx.moveTo(whaleX + wW * 0.1, whaleY - wH * 0.48);
      ctx.lineTo(whaleX + wW * 0.18, whaleY - wH * 0.78);
      ctx.lineTo(whaleX + wW * 0.28, whaleY - wH * 0.48);
      ctx.closePath(); ctx.fillStyle = whaleColor; ctx.fill();
      // Eye
      ctx.beginPath(); ctx.arc(whaleX + wW * 0.38, whaleY - wH * 0.08, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(40,80,120,0.5)'; ctx.fill();

      // Jonah inside (faint glow)
      const glowA = Math.sin(time * 1.5) * 0.03 + 0.08;
      const innerGlow = ctx.createRadialGradient(whaleX, whaleY, 0, whaleX, whaleY, wH * 0.3);
      innerGlow.addColorStop(0, `rgba(255,200,100,${glowA})`); innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = innerGlow; ctx.fillRect(0, 0, w, h);
      ctx.font = `7px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(200,160,80,${glowA * 3})`;
      ctx.fillText('يونس', whaleX, whaleY + 4);

      // Whale blow spout
      if (Math.sin(time * 0.4) > 0.95) {
        const spoutGrad = ctx.createLinearGradient(whaleX + wW * 0.42, whaleY - wH * 0.5, whaleX + wW * 0.42, whaleY - wH * 1.2);
        spoutGrad.addColorStop(0, 'rgba(100,160,220,0.3)'); spoutGrad.addColorStop(1, 'rgba(100,160,220,0)');
        ctx.fillStyle = spoutGrad; ctx.fillRect(whaleX + wW * 0.38, whaleY - wH * 1.2, 12, wH * 0.7);
      }

      ctx.font = `bold 10px serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(60,120,180,0.4)'; ctx.shadowColor = 'rgba(40,100,160,0.2)'; ctx.shadowBlur = 8;
      ctx.fillText('فَالتَقَمَهُ الحُوتُ وَهُوَ مُلَِيمٌ', w * 0.5, h * 0.93);
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
    <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={{ background: '#001530' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}
        className="absolute top-0 inset-x-0 z-10 flex flex-col items-center pointer-events-none px-4 pt-2.5 pb-5"
        style={{ background: 'linear-gradient(to bottom, rgba(0,21,48,0.9) 0%, rgba(0,21,48,0) 100%)' }}>
        <p className="font-amiri text-sm md:text-base leading-snug text-center"
          style={{ color: 'rgba(120,180,240,0.92)', textShadow: '0 0 18px rgba(60,120,200,0.4)' }}>
          فَالتَقَمَهُ{' '}
          <span style={{ color: '#66aaff', textShadow: '0 0 14px rgba(80,150,255,0.7)' }}>الحُوتُ</span>
          {' '}وَهُوَ مُلَِيمٌ
        </p>
        <p className="text-[9px] font-tajawal mt-0.5 tracking-[0.2em]" style={{ color: 'rgba(30,70,120,0.45)' }}>سورة الصافات · الآية ١٤٢</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1 }}
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none flex flex-col items-center gap-1.5 pb-3 px-2"
        style={{ background: 'linear-gradient(to top, rgba(0,21,48,0.92) 0%, rgba(0,21,48,0.5) 60%, rgba(0,21,48,0) 100%)', paddingTop: 20 }}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { icon: '🐳', label: 'sperm whale', sub: 'largest predator' },
            { icon: '🪣', label: 'يبتلع كاملاً', sub: 'whole humans' },
            { icon: '💡', label: 'نجاة يونس', sub: 'معجزة' },
            { icon: '🌊', label: 'deep ocean', sub: 'darkness layers' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: 'rgba(0,15,35,0.1)', border: '1px solid rgba(30,70,140,0.22)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontSize: 10 }}>{icon}</span>
              <div>
                <span className="text-[10px] font-bold font-tajawal" style={{ color: 'rgba(120,180,240,0.92)' }}>{label}</span>
                <span className="text-[8px] font-tajawal mr-1" style={{ color: 'rgba(60,110,180,0.6)' }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
