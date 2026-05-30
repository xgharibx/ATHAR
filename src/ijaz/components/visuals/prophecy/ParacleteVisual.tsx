
import { motion } from 'framer-motion';

const connections = [
  { from: 'John 14:16', to: 'Paraclete (Parakletos)', type: 'scripture' },
  { from: 'Periklytos (Greek)', to: '"The Praised One"', type: 'translation' },
  { from: '"The Praised One"', to: 'Ahmad / أحمد', type: 'equals' },
  { from: 'Quran 61:6', to: 'Ahmad / أحمد', type: 'confirms' },
];

export default function ParacleteVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-10 gap-5 px-6 pb-6 select-none overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1020] via-[#0d1117] to-[#0a0a1a] pointer-events-none" />

      {/* Two scrolls side by side */}
      <div className="relative z-10 grid grid-cols-2 gap-4 w-full max-w-sm">
        {/* Gospel */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)' }}
        >
          <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Gospel of John</p>
          <p className="text-white text-xs leading-relaxed italic">
            &ldquo;I will ask the Father, and He will give you another{' '}
            <span className="text-gold-primary font-semibold not-italic">Paraclete</span>&rdquo;
          </p>
          <p className="text-gray-500 text-xs mt-2">— John 14:16</p>
          <div className="mt-3 pt-2 border-t border-blue-400/20">
            <p className="text-blue-300 text-xs">Greek: <span className="font-mono">Periklytos</span></p>
            <p className="text-gray-400 text-xs">= &ldquo;The Glorified/Praised One&rdquo;</p>
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
          <p className="text-gold-primary font-bold text-xs uppercase tracking-widest mb-2">Quran 61:6</p>
          <p className="text-white font-arabic text-sm leading-relaxed dir-rtl" dir="rtl">
            وَمُبَشِّرًا بِرَسُولٍ يَأْتِي مِن بَعْدِي
            <br />
            اسْمُهُ{' '}
            <span className="text-gold-primary font-bold">أَحْمَدُ</span>
          </p>
          <div className="mt-2 pt-2 border-t border-gold-primary/20">
            <p className="text-verse-green text-xs">Name: <span className="text-gold-primary font-bold">Ahmad</span></p>
            <p className="text-gray-400 text-xs">= &ldquo;The Most Praised&rdquo;</p>
          </div>
        </motion.div>
      </div>

      {/* Connection arrow */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="relative z-10 flex items-center gap-3 w-full max-w-sm"
      >
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(96,165,250,0.4), rgba(212,168,83,0.4))' }} />
        <span className="text-white text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Periklytos = Ahmad ✓
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, rgba(96,165,250,0.4), rgba(212,168,83,0.4))' }} />
      </motion.div>

      {/* Paraclete description matches */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="relative z-10 w-full max-w-sm rounded-xl p-3"
        style={{ background: 'rgba(45,212,168,0.05)', border: '1px solid rgba(45,212,168,0.18)' }}
      >
        <p className="text-verse-green text-xs font-semibold mb-2 text-center">John 16:13 description matches Muhammad ﷺ</p>
        <div className="grid grid-cols-1 gap-1">
          {[
            '"He will guide you into all the truth" → Complete final guidance',
            '"He will not speak on his own" → Revelation, not personal speech',
            '"He will glorify me" → Islam honors Jesus as a prophet',
          ].map((line, i) => (
            <p key={i} className="text-gray-300 text-xs flex gap-1">
              <span className="text-verse-green mt-0.5 shrink-0">✓</span>
              <span>{line}</span>
            </p>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
