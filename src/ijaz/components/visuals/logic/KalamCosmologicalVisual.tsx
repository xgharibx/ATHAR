
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 🔗 برهان كلامي كوني — Kalam Cosmological Argument
// 1. كل ما بدأ في الوجود له سبب
// 2. الكون بدأ في الوجود
// 3. إذن الكون له سبب
// Visual: Logical flow cascade — premises → conclusion

const steps = [
  {
    premise: true,
    number: '١',
    text: 'كُلُّ ما بَدَأ في الوُجودِ لَهُ سَبَب',
    textEn: 'Everything that begins to exist has a cause',
    color: '#4A90D9',
  },
  {
    premise: true,
    number: '٢',
    text: 'الكَوْنُ بَدَأ في الوُجود',
    textEn: 'The universe began to exist',
    color: '#4A90D9',
  },
  {
    premise: false,
    number: '∴',
    text: 'إذن الكَوْنُ لَهُ سَبَب',
    textEn: 'Therefore, the universe has a cause',
    color: '#2dd4a8',
  },
];

const causeProperties = [
  { text: 'خارج الزمان والمكان', d: 'M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z' },
  { text: 'قادر على الخلق من العدم', d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' },
  { text: 'مريد مختار', d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  { text: 'واحد أحد', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M11 8l2-1v9' },
];

export default function KalamCosmologicalVisual({ className }: MiracleVisualProps) {
  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#080818] to-[#050510] flex flex-col items-center justify-center p-4 ${className || ''}`}>
      {/* Neural network background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 400 400">
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={i}
            x1={Math.random() * 400}
            y1={Math.random() * 400}
            x2={Math.random() * 400}
            y2={Math.random() * 400}
            stroke="#4A90D9"
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* Logical chain */}
      <div className="relative z-10 w-full max-w-md space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.8, duration: 0.5, type: 'spring' }}
          >
            <div
              className={`rounded-xl p-4 border backdrop-blur-sm ${step.premise
                ? 'bg-[#0a1530]/50 border-[#4A90D9]/20'
                : 'bg-verse-green/5 border-verse-green/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: step.color + '20', color: step.color }}
                >
                  {step.number}
                </div>
                <div className="flex-1">
                  <p className="font-amiri text-base text-text-primary leading-relaxed">{step.text}</p>
                  <p className="text-[10px] text-text-muted font-mono mt-1">{step.textEn}</p>
                </div>
              </div>
            </div>
            {/* Connector arrow */}
            {i < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.2, 0.6, 0.2], y: [0, 3, 0] }}
                transition={{ delay: 0.8 + i * 0.8, duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="flex justify-center py-1"
              >
                <svg viewBox="0 0 20 20" className="w-5 h-5">
                  <path d="M 10 2 L 10 14" stroke={step.color} strokeWidth="1.5" />
                  <path d="M 6 10 L 10 16 L 14 10" stroke={step.color} strokeWidth="1.5" fill="none" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        ))}

        {/* Properties of the cause */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.5, duration: 0.6 }}
          className="mt-4 pt-4 border-t border-gold-primary/15"
        >
          <p className="text-center font-amiri text-sm text-gold-primary/80 mb-3">صفات هذا السبب:</p>
          <div className="grid grid-cols-2 gap-2">
            {causeProperties.map((prop, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 4 + i * 0.3, type: 'spring' }}
                className="bg-gold-primary/5 border border-gold-primary/15 rounded-lg p-2 text-center flex flex-col items-center"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#d4a853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={prop.d} /></svg>
                <p className="text-[10px] font-tajawal text-text-secondary mt-1">{prop.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Final pointer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5.5 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10"
      >
        <p className="font-amiri text-sm text-gold-primary/70">= الله سبحانه وتعالى</p>
      </motion.div>
    </div>
  );
}
