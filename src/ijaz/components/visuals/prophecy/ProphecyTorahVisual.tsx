
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 📜 النبوءة في التوراة — Prophecy in Torah
// The Torah contains prophecies/descriptions that point to Prophet Muhammad ﷺ
// Visual: Ancient scroll with highlighted prophecy text, connecting lines to fulfillment

export default function ProphecyTorahVisual({ className }: MiracleVisualProps) {
  const prophecies = [
    { text: 'نبي من إخوتهم مثل موسى', source: 'تثنية 18:18', fulfillment: 'محمد ﷺ نبي من بني إسماعيل — إخوة بني إسرائيل' },
    { text: 'جاء الرب من سيناء وأشرق من سعير وتلألأ من جبل فاران', source: 'تثنية 33:2', fulfillment: 'فاران = مكة — موطن إسماعيل عليه السلام' },
    { text: 'يأتي ومعه عشرات الألوف من القديسين', source: 'تثنية 33:2', fulfillment: 'فتح مكة بعشرة آلاف من الصحابة' },
  ];

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#100d08] to-[#0a0805] flex flex-col items-center justify-center p-4 ${className || ''}`}>
      {/* Scroll background aesthetic */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(212,168,83,0.1) 30px, rgba(212,168,83,0.1) 31px)',
      }} />

      {/* Scroll icon */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 text-center relative z-10"
      >
        <svg viewBox="0 0 60 60" className="w-14 h-14 mx-auto mb-2 opacity-40">
          <rect x="15" y="8" width="30" height="44" rx="2" fill="none" stroke="#d4a853" strokeWidth="1.5" />
          <path d="M 12 8 Q 12 5 15 5 L 45 5 Q 48 5 48 8" stroke="#d4a853" strokeWidth="1.5" fill="none" />
          <path d="M 12 52 Q 12 55 15 55 L 45 55 Q 48 55 48 52" stroke="#d4a853" strokeWidth="1.5" fill="none" />
          <line x1="20" y1="18" x2="40" y2="18" stroke="#d4a853" strokeWidth="0.5" opacity="0.3" />
          <line x1="20" y1="24" x2="40" y2="24" stroke="#d4a853" strokeWidth="0.5" opacity="0.3" />
          <line x1="20" y1="30" x2="40" y2="30" stroke="#d4a853" strokeWidth="0.5" opacity="0.3" />
          <line x1="20" y1="36" x2="40" y2="36" stroke="#d4a853" strokeWidth="0.5" opacity="0.3" />
          <line x1="20" y1="42" x2="35" y2="42" stroke="#d4a853" strokeWidth="0.5" opacity="0.3" />
        </svg>
        <p className="font-amiri text-lg text-gold-primary">البشارات في التوراة</p>
      </motion.div>

      {/* Prophecy cards */}
      <div className="relative z-10 w-full max-w-lg space-y-4">
        {prophecies.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.6, duration: 0.6 }}
            className="relative"
          >
            <div className="bg-space-blue/20 border border-gold-primary/15 rounded-lg p-3 backdrop-blur-sm">
              {/* Source */}
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-gold-primary/20 flex items-center justify-center text-[10px] text-gold-primary font-bold">{i + 1}</span>
                <span className="text-[10px] text-gold-primary/60 font-mono">{p.source}</span>
              </div>
              {/* Original text */}
              <p className="font-amiri text-sm text-text-primary/80 mb-2 pr-7 border-r-2 border-gold-primary/20">
                &ldquo;{p.text}&rdquo;
              </p>
              {/* Arrow */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1 + i * 0.6, duration: 0.5 }}
                className="h-px bg-gradient-to-l from-verse-green/30 to-transparent mb-2"
              />
              {/* Fulfillment */}
              <p className="text-text-secondary text-xs font-tajawal flex items-start gap-1.5">
                <span className="text-verse-green/70 mt-0.5">✓</span>
                {p.fulfillment}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Verse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 2 }}
        className="absolute bottom-4 left-0 right-0 text-center z-10"
      >
        <p className="font-amiri text-sm text-verse-green/60 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.2)' }}>
          الَّذِينَ يَتَّبِعُونَ الرَّسُولَ النَّبِيَّ الْأُمِّيَّ الَّذِي يَجِدُونَهُ مَكْتُوبًا عِندَهُمْ فِي التَّوْرَاةِ وَالْإِنجِيلِ
        </p>
        <p className="text-gold-primary/40 text-xs font-tajawal mt-1">الأعراف : 157</p>
      </motion.div>
    </div>
  );
}
