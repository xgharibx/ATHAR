
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ⚖️ البرهان الأخلاقي — Moral Argument
// 1. If God does not exist, objective moral values do not exist
// 2. Objective moral values DO exist
// 3. Therefore, God exists
// Visual: Scales of justice, moral compass pointing to transcendent source

export default function MoralArgumentVisual({ className }: MiracleVisualProps) {
  const moralFacts = [
    { text: 'قتل الأبرياء شر مطلق', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M5 5l14 14' },
    { text: 'الظلم خطأ بالضرورة', d: 'M12 3v18 M7 7h10 M5 7l-2 5a3.5 3.5 0 0 0 7 0L8 7 M19 7l-2 5a3.5 3.5 0 0 0 7 0l-2-5 M8 21h8' },
    { text: 'الرحمة خير في ذاتها', d: 'M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3 1.5 4 3 1-1.5 2-3 4-3 3.5 0 5 3.5 3.5 7C19 16.65 12 21 12 21z' },
    { text: 'الصدق فضيلة مطلقة', d: 'M12 2 14.4 8.8 21.6 9.1 16 13.5 17.8 20.5 12 16.5 6.2 20.5 8 13.5 2.4 9.1 9.6 8.8z' },
  ];

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#080815] to-[#050508] flex flex-col items-center justify-center p-4 ${className || ''}`}>
      {/* Radial moral compass background */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[300px] h-[300px] opacity-[0.03]"
      >
        <svg viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" stroke="#d4a853" strokeWidth="0.5" fill="none" />
          <circle cx="150" cy="150" r="100" stroke="#d4a853" strokeWidth="0.5" fill="none" />
          <line x1="150" y1="10" x2="150" y2="290" stroke="#d4a853" strokeWidth="0.3" />
          <line x1="10" y1="150" x2="290" y2="150" stroke="#d4a853" strokeWidth="0.3" />
        </svg>
      </motion.div>

      {/* Scales of Justice - SVG */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mb-4"
      >
        <svg viewBox="0 0 200 120" className="w-40 h-24 mx-auto">
          {/* Central pillar */}
          <line x1="100" y1="10" x2="100" y2="110" stroke="#d4a853" strokeWidth="2" opacity="0.4" />
          {/* Base */}
          <rect x="70" y="108" width="60" height="6" rx="3" fill="#d4a853" opacity="0.3" />
          {/* Beam */}
          <motion.g
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ transformOrigin: '100px 20px' }}
          >
            <line x1="25" y1="20" x2="175" y2="20" stroke="#d4a853" strokeWidth="2" opacity="0.5" />
            {/* Left pan — "without God" */}
            <line x1="25" y1="20" x2="25" y2="55" stroke="#d4a853" strokeWidth="1" opacity="0.3" />
            <line x1="5" y1="55" x2="45" y2="55" stroke="#d4a853" strokeWidth="1" opacity="0.3" />
            <path d="M 5 55 Q 25 70 45 55" stroke="#d4a853" strokeWidth="1" fill="rgba(212,168,83,0.05)" opacity="0.4" />
            <text x="25" y="80" textAnchor="middle" fill="#c0392b" fontSize="6" fontFamily="Tajawal" opacity="0.6">بدون إله</text>
            <text x="25" y="88" textAnchor="middle" fill="#c0392b" fontSize="5" fontFamily="Tajawal" opacity="0.4">لا أخلاق مطلقة</text>
            {/* Right pan — "with God" */}
            <line x1="175" y1="20" x2="175" y2="45" stroke="#d4a853" strokeWidth="1" opacity="0.3" />
            <line x1="155" y1="45" x2="195" y2="45" stroke="#d4a853" strokeWidth="1" opacity="0.3" />
            <path d="M 155 45 Q 175 60 195 45" stroke="#2dd4a8" strokeWidth="1" fill="rgba(45,212,168,0.05)" opacity="0.4" />
            <text x="175" y="70" textAnchor="middle" fill="#2dd4a8" fontSize="6" fontFamily="Tajawal" opacity="0.6">مع الله</text>
            <text x="175" y="78" textAnchor="middle" fill="#2dd4a8" fontSize="5" fontFamily="Tajawal" opacity="0.4">أساس الأخلاق المطلقة</text>
          </motion.g>
          {/* Top ornament */}
          <circle cx="100" cy="12" r="5" fill="#d4a853" opacity="0.3" />
        </svg>
      </motion.div>

      {/* Logical structure */}
      <div className="relative z-10 w-full max-w-md space-y-3">
        {[
          { n: '١', text: 'إذا لم يكن الله موجودًا، فلا قيم أخلاقية مطلقة', color: '#4A90D9' },
          { n: '٢', text: 'القيم الأخلاقية المطلقة موجودة فعلاً', color: '#4A90D9' },
          { n: '∴', text: 'إذن الله موجود', color: '#2dd4a8' },
        ].map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 + i * 0.6, duration: 0.4 }}
            className={`flex items-center gap-3 p-3 rounded-lg border ${i === 2 ? 'bg-verse-green/5 border-verse-green/20' : 'bg-space-blue/20 border-blue-400/10'}`}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: step.color + '20', color: step.color }}>
              {step.n}
            </div>
            <p className="font-amiri text-sm text-text-primary">{step.text}</p>
          </motion.div>
        ))}
      </div>

      {/* Moral facts that everyone knows */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="relative z-10 mt-4 w-full max-w-md"
      >
        <p className="text-center text-[10px] text-text-muted font-tajawal mb-2">حقائق أخلاقية يعرفها كل إنسان:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {moralFacts.map((fact, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 4 + i * 0.2 }}
              className="bg-space-blue/15 border border-border-subtle rounded-full px-3 py-1 flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#d4a853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={fact.d} /></svg>
              <span className="text-[9px] text-text-secondary font-tajawal">{fact.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
