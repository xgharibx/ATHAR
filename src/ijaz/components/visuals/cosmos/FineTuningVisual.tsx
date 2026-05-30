
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🎯 الضبط الدقيق — Fine Tuning of the Universe
// If any cosmic constant deviated by 10^-60, life would be impossible.
// Visualization: cosmic dials/sliders showing critical constants at exact values

const constants = [
  { name: 'ثابت الجاذبية', nameEn: 'Gravitational Constant', value: '6.674 × 10⁻¹¹', precision: 'دقة 1 من 10⁶⁰', percent: 0.83, color: '#d4a853' },
  { name: 'القوة النووية القوية', nameEn: 'Strong Nuclear Force', value: '0.007', precision: 'تغيير 0.001 = لا نجوم', percent: 0.91, color: '#4A90D9' },
  { name: 'ثابت الكون', nameEn: 'Cosmological Constant', value: '10⁻¹²²', precision: 'أدق قيمة في الفيزياء', percent: 0.97, color: '#2dd4a8' },
  { name: 'كتلة الإلكترون', nameEn: 'Electron Mass', value: '9.109 × 10⁻³¹', precision: 'تغيير = لا كيمياء', percent: 0.88, color: '#e67e22' },
  { name: 'نسبة المادة للمادة المضادة', nameEn: 'Matter-Antimatter Ratio', value: '1:10⁹ + 1', precision: 'فائض واحد بالمليار', percent: 0.95, color: '#9b59b6' },
  { name: 'معدل توسع الكون', nameEn: 'Expansion Rate', value: 'H₀ = 67.4', precision: 'أبطأ = انهيار، أسرع = تمزق', percent: 0.86, color: '#e74c3c' },
];

export default function FineTuningVisual({ className }: MiracleVisualProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= constants.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#050510] flex flex-col items-center justify-center p-6 ${className || ''}`}>
      {/* Background grid — precision aesthetic */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(rgba(212,168,83,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(212,168,83,0.3) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Crosshair center */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]"
      >
        <svg viewBox="0 0 300 300" className="w-full h-full">
          <circle cx="150" cy="150" r="140" stroke="#d4a853" strokeWidth="0.5" fill="none" opacity="0.3" />
          <circle cx="150" cy="150" r="100" stroke="#d4a853" strokeWidth="0.5" fill="none" opacity="0.2" />
          <circle cx="150" cy="150" r="60" stroke="#d4a853" strokeWidth="0.5" fill="none" opacity="0.15" />
          <line x1="150" y1="0" x2="150" y2="300" stroke="#d4a853" strokeWidth="0.3" opacity="0.2" />
          <line x1="0" y1="150" x2="300" y2="150" stroke="#d4a853" strokeWidth="0.3" opacity="0.2" />
        </svg>
      </motion.div>

      {/* Constants display */}
      <div className="relative z-10 w-full max-w-lg space-y-3">
        {constants.map((c, i) => (
          <AnimatePresence key={c.nameEn}>
            {i < visibleCount && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2/5 text-right">
                    <p className="font-amiri text-sm font-bold" style={{ color: c.color }}>{c.name}</p>
                    <p className="text-text-muted text-[10px] font-tajawal">{c.nameEn}</p>
                  </div>
                  <div className="flex-1 relative h-6 bg-space-blue/30 rounded-full overflow-hidden border border-border-subtle">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.percent * 100}%` }}
                      transition={{ duration: 1.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${c.color}60, ${c.color})` }}
                    />
                    {/* Needle pointer at exact value */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5 }}
                      className="absolute top-0 h-full w-0.5 bg-white shadow-lg"
                      style={{ left: `${c.percent * 100}%`, boxShadow: `0 0 8px ${c.color}` }}
                    />
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="w-24 text-left"
                  >
                    <p className="text-[10px] font-mono" style={{ color: c.color }}>{c.value}</p>
                  </motion.div>
                </div>
                <p className="text-text-muted text-[9px] font-tajawal mr-[40%] pr-3 mt-0.5">{c.precision}</p>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Conclusion label */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: visibleCount >= constants.length ? 1 : 0, y: visibleCount >= constants.length ? 0 : 20 }}
        transition={{ duration: 1 }}
        className="relative z-10 mt-8 text-center"
      >
        <p className="font-amiri text-lg text-gold-primary" style={{ textShadow: '0 0 20px rgba(212,168,83,0.3)' }}>
          إِنَّا كُلَّ شَيْءٍ خَلَقْنَاهُ بِقَدَرٍ
        </p>
        <p className="text-gold-primary/50 text-xs font-tajawal mt-1">القمر : 49</p>
      </motion.div>
    </div>
  );
}
