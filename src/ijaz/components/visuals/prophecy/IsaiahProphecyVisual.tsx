import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

// 📜 نبوءة إشعياء — Isaiah 42 foretells the Prophet of Kedar (Arabia)
// Unfurling ancient scroll + word-by-word highlight of the prophecy words.

// Each token can be plain or a highlighted keyword (with a color)
type Tok = { t: string; c?: string };
const VERSE: Tok[] = [
  { t: 'Here is my' }, { t: 'servant', c: '#d4a853' }, { t: ', whom I uphold, my' },
  { t: 'chosen one', c: '#d4a853' }, { t: 'in whom I' }, { t: 'delight', c: '#d4a853' },
  { t: '; I will put my Spirit on him, and he will bring' },
  { t: 'justice to the nations', c: '#2dd4a8' }, { t: '.' },
];

const MATCHES = [
  { ref: 'Isaiah 42:1', text: '“My chosen one in whom I delight”', match: 'محمد ﷺ = المختار · المصطفى', color: '#d4a853' },
  { ref: 'Isaiah 42:11', text: '“Let Kedar’s settlements rejoice”', match: 'قيدار = ابن إسماعيل = عرب الحجاز (مكة)', color: '#f472b6' },
];

export default function IsaiahProphecyVisual({ className }: MiracleVisualProps) {
  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center gap-3 px-5 py-6 select-none overflow-hidden ${className || ''}`}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#140d08] via-[#0d1117] to-[#0a1010] pointer-events-none" />
      {/* Soft candle-light glow behind scroll */}
      <motion.div
        className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ width: 360, height: 240, background: 'radial-gradient(ellipse at center, rgba(212,168,83,0.16), transparent 70%)' }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative z-10 font-tajawal text-[11px] tracking-[0.25em]" style={{ color: 'rgba(212,168,83,0.7)' }}
      >
        سِفْر إشعياء · نحو ٧٠٠ ق.م
      </motion.p>

      {/* ── Unfurling scroll ── */}
      <div className="relative z-10 w-full max-w-md flex items-stretch justify-center">
        {/* Left roller */}
        <div className="w-3.5 rounded-l-sm shrink-0" style={{ background: 'linear-gradient(90deg,#5a3d1e,#8a6235 40%,#6b4a26)' }} />
        {/* Parchment unrolling */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={{ transformOrigin: 'center', background: 'linear-gradient(180deg,#efe2c4,#e3d2ab 55%,#d8c499)', boxShadow: 'inset 0 0 26px rgba(120,90,40,0.35)' }}
          className="flex-1 px-4 py-4 relative"
        >
          {/* parchment edge shading */}
          <div className="absolute inset-y-0 left-0 w-4 pointer-events-none" style={{ background: 'linear-gradient(90deg,rgba(90,60,25,0.35),transparent)' }} />
          <div className="absolute inset-y-0 right-0 w-4 pointer-events-none" style={{ background: 'linear-gradient(270deg,rgba(90,60,25,0.35),transparent)' }} />

          <p className="text-center leading-relaxed text-[13px] md:text-sm font-serif" style={{ color: '#3a2c14' }}>
            {VERSE.map((tok, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={tok.c
                  ? { opacity: 1, color: [tok.c, '#3a2c14', tok.c], textShadow: ['0 0 0px transparent', `0 0 10px ${tok.c}99`, '0 0 0px transparent'] }
                  : { opacity: 1 }}
                transition={tok.c
                  ? { opacity: { delay: 0.9 + i * 0.16, duration: 0.4 }, default: { delay: 1.6, duration: 3.2, repeat: Infinity, repeatDelay: 1.5 } }
                  : { delay: 0.9 + i * 0.16, duration: 0.4 }}
                style={{ fontWeight: tok.c ? 700 : 400 }}
              >
                {tok.t}{' '}
              </motion.span>
            ))}
          </p>
        </motion.div>
        {/* Right roller */}
        <div className="w-3.5 rounded-r-sm shrink-0" style={{ background: 'linear-gradient(270deg,#5a3d1e,#8a6235 40%,#6b4a26)' }} />
      </div>

      {/* Prophecy matches */}
      <div className="relative z-10 flex flex-col gap-2 w-full max-w-md">
        {MATCHES.map((m, i) => (
          <motion.div
            key={m.ref}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.2 + i * 0.25, duration: 0.5 }}
            className="rounded-lg p-2.5"
            style={{ background: m.color + '12', border: `1px solid ${m.color}30` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: m.color + '25', color: m.color }}>
                {m.ref}
              </span>
              <span className="text-gray-300 text-[11px] italic truncate">{m.text}</span>
            </div>
            <p className="text-[11px] font-tajawal font-medium flex items-center gap-1.5" dir="rtl" style={{ color: m.color }}>
              <span className="font-amiri">↩</span>
              <span>{m.match}</span>
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
