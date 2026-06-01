
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// ✝️ النبوءة في الإنجيل — Prophecy in Bible/Gospel
// يَجِدُونَهُ مَكْتُوبًا عِندَهُمْ فِي التَّوْرَاةِ وَالْإِنجِيلِ
// Visual: Gospel scroll with prophecies pointing to the Paraclete / Ahmad

export default function ProphecyBibleVisual({ className }: MiracleVisualProps) {
  const prophecies = [
    { text: 'الفارقليط / المُعَزِّي (Parakletos)', source: 'يوحنا 14:16', fulfillment: 'محمد ﷺ — أحمد (Periklytos = الأكثر حمدًا)' },
    { text: 'يُعلمكم كل شيء ويُذكركم بكل ما قلته لكم', source: 'يوحنا 14:26', fulfillment: 'القرآن يُصدق ما بين يديه من الكتب' },
    { text: 'إذا جاء روح الحق يُرشدكم إلى جميع الحق', source: 'يوحنا 16:13', fulfillment: 'محمد ﷺ جاء بالحق الكامل — الإسلام' },
  ];

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-b from-[#0d0a10] to-[#080510] flex flex-col items-center justify-center p-4 ${className || ''}`}>
      {/* Light rays from above */}
      <motion.div
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-full"
        style={{ background: 'linear-gradient(180deg, rgba(200,180,255,0.1), transparent 60%)' }}
      />

      {/* Cross pattern background (subtle) */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle, rgba(180,160,220,0.3) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 text-center relative z-10"
      >
        <svg viewBox="0 0 60 60" className="w-12 h-12 mx-auto mb-2 opacity-40">
          <rect x="18" y="5" width="24" height="50" rx="3" fill="none" stroke="#a090c0" strokeWidth="1.5" />
          <line x1="30" y1="15" x2="30" y2="40" stroke="#a090c0" strokeWidth="1" opacity="0.4" />
          <line x1="22" y1="25" x2="38" y2="25" stroke="#a090c0" strokeWidth="1" opacity="0.4" />
          <line x1="22" y1="18" x2="38" y2="18" stroke="#a090c0" strokeWidth="0.5" opacity="0.2" />
          <line x1="22" y1="32" x2="38" y2="32" stroke="#a090c0" strokeWidth="0.5" opacity="0.2" />
          <line x1="22" y1="38" x2="35" y2="38" stroke="#a090c0" strokeWidth="0.5" opacity="0.2" />
        </svg>
        <p className="font-amiri text-lg text-[#c0a8e0]">البشارات في الإنجيل</p>
      </motion.div>

      {/* Key term: Paraclete */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="mb-4 text-center bg-[#1a1525]/60 border border-[#a090c0]/20 rounded-xl px-6 py-3 relative z-10"
      >
        <p className="text-[10px] text-[#a090c0]/60 font-mono mb-1">Parakletos (παράκλητος) → Periklytos (περικλυτός)</p>
        <p className="font-amiri text-lg text-gold-primary">أحمد = الأكثر حمدًا</p>
        <p className="text-[10px] text-text-muted font-tajawal mt-1">
          &ldquo;وَمُبَشِّرًا بِرَسُولٍ يَأْتِي مِن بَعْدِي اسْمُهُ أَحْمَدُ&rdquo; — الصف:6
        </p>
      </motion.div>

      {/* Prophecy list */}
      <div className="relative z-10 w-full max-w-lg space-y-3">
        {/* Continuous descending light sweep */}
        <motion.div
          aria-hidden
          animate={{ y: ['-10%', '110%'], opacity: [0, 0.5, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-0 right-0 h-16 -z-0"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(192,168,224,0.18), transparent)' }}
        />
        {prophecies.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.5, duration: 0.5 }}
            className="bg-[#12101a]/60 border border-[#a090c0]/10 rounded-lg p-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#a090c0]/15 flex items-center justify-center text-[10px] text-[#c0a8e0] font-bold">{i + 1}</span>
              <span className="text-[10px] text-[#a090c0]/50 font-mono">{p.source}</span>
            </div>
            <p className="font-amiri text-sm text-text-primary/80 mb-1.5 pr-7 border-r-2 border-[#a090c0]/20">
              &ldquo;{p.text}&rdquo;
            </p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 1.2 + i * 0.5, duration: 0.4 }}
              className="h-px bg-gradient-to-l from-verse-green/30 to-transparent mb-1.5"
            />
            <p className="text-text-secondary text-xs font-tajawal flex items-start gap-1.5">
              <motion.svg
                viewBox="0 0 16 16"
                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.4 + i * 0.5, type: 'spring', stiffness: 300 }}
              >
                <circle cx="8" cy="8" r="7" fill="none" stroke="rgba(45,212,168,0.5)" strokeWidth="1.2" />
                <path d="M 4.5 8.2 L 7 10.5 L 11.5 5.5" fill="none" stroke="#2dd4a8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
              {p.fulfillment}
            </p>
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
        <p className="font-amiri text-xs md:text-sm text-verse-green/60 px-4" style={{ textShadow: '0 0 20px rgba(45,212,168,0.2)' }}>
          يَجِدُونَهُ مَكْتُوبًا عِندَهُمْ فِي التَّوْرَاةِ وَالْإِنجِيلِ
        </p>
        <p className="text-gold-primary/40 text-xs font-tajawal mt-1">الأعراف : 157</p>
      </motion.div>
    </div>
  );
}
