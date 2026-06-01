import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🔗 الفارقليط — Periklytos (Praised One) ↔ Ahmad (أحمد)
// Animated beam links the Gospel word to the Quranic name through "The Praised One".

const CheckIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function ParacleteVisual({ className }: MiracleVisualProps) {
  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center gap-4 px-6 py-6 select-none overflow-hidden ${className || ''}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1020] via-[#0d1117] to-[#0a0a1a] pointer-events-none" />

      {/* Two scrolls + animated linking beam */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Beam layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="paraBeam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d4a853" />
            </linearGradient>
          </defs>
          {/* arc from left card to right card dipping through the center pill */}
          <motion.path
            d="M 14 78 Q 50 112 86 78"
            fill="none"
            stroke="url(#paraBeam)"
            strokeWidth="0.8"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.55 }}
            transition={{ delay: 0.6, duration: 1, ease: 'easeInOut' }}
          />
          {/* travelling pulse */}
          <motion.circle r="1.4" fill="#fff"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], offsetDistance: ['0%', '100%'] as never }}
            style={{ offsetPath: 'path("M 14 78 Q 50 112 86 78")', offsetRotate: '0deg' } as React.CSSProperties}
            transition={{ delay: 1.6, duration: 2.2, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
          />
        </svg>

        <div className="grid grid-cols-2 gap-4">
          {/* Gospel */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            <p className="text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-2">Gospel of John</p>
            <p className="text-white text-[11px] leading-relaxed italic">
              &ldquo;another{' '}
              <span className="text-gold-primary font-semibold not-italic">Paraclete</span>&rdquo;
            </p>
            <p className="text-gray-500 text-[10px] mt-1.5">— John 14:16</p>
            <div className="mt-2 pt-2 border-t border-blue-400/20">
              <motion.p
                className="text-blue-300 text-[11px]"
                animate={{ textShadow: ['0 0 0px transparent', '0 0 10px rgba(96,165,250,0.8)', '0 0 0px transparent'] }}
                transition={{ duration: 2.6, repeat: Infinity }}
              >
                <span className="font-mono">Periklytos</span>
              </motion.p>
              <p className="text-gray-400 text-[10px]">= &ldquo;The Praised One&rdquo;</p>
            </div>
          </motion.div>

          {/* Quran */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(212,168,83,0.08)', border: '1px solid rgba(212,168,83,0.25)' }}
          >
            <p className="text-gold-primary font-bold text-[10px] uppercase tracking-widest mb-2">Quran 61:6</p>
            <p className="text-white font-arabic text-sm leading-relaxed" dir="rtl">
              وَمُبَشِّرًا بِرَسُولٍ
              <br />
              اسْمُهُ{' '}
              <span className="text-gold-primary font-bold">أَحْمَدُ</span>
            </p>
            <div className="mt-2 pt-2 border-t border-gold-primary/20">
              <motion.p
                className="text-verse-green text-[11px]"
                animate={{ textShadow: ['0 0 0px transparent', '0 0 10px rgba(212,168,83,0.8)', '0 0 0px transparent'] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: 1.1 }}
              >
                <span className="text-gold-primary font-bold">Ahmad</span>
              </motion.p>
              <p className="text-gray-400 text-[10px]">= &ldquo;The Most Praised&rdquo;</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Center equivalence pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="relative z-30 -mt-1"
      >
        <motion.span
          className="text-white text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1.5 font-semibold"
          style={{ background: 'rgba(20,24,40,0.9)', border: '1px solid rgba(255,255,255,0.18)' }}
          animate={{ boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 14px rgba(212,168,83,0.45)', '0 0 0px rgba(255,255,255,0)'] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          Periklytos = Ahmad
          <CheckIcon color="#2dd4a8" />
        </motion.span>
      </motion.div>

      {/* Paraclete description matches */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="relative z-10 w-full max-w-sm rounded-xl p-3"
        style={{ background: 'rgba(45,212,168,0.05)', border: '1px solid rgba(45,212,168,0.18)' }}
      >
        <p className="text-verse-green text-[11px] font-semibold mb-2 text-center">John 16:13 — وصف يطابق محمداً ﷺ</p>
        <div className="grid grid-cols-1 gap-1">
          {[
            '"He will guide you into all the truth" → الهداية الخاتمة',
            '"He will not speak on his own" → وحي لا كلام ذاتي',
            '"He will glorify me" → الإسلام يكرّم عيسى نبياً',
          ].map((line, i) => (
            <p key={i} className="text-gray-300 text-[11px] flex gap-1.5">
              <CheckIcon color="#2dd4a8" />
              <span>{line}</span>
            </p>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
