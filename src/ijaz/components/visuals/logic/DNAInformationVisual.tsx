
import { motion } from 'framer-motion';

const BASES = ['A', 'T', 'G', 'C'];
const COLORS: Record<string, string> = { A: '#d4a853', T: '#2dd4a8', G: '#60a5fa', C: '#f472b6' };

function randomBase() {
  return BASES[Math.floor(Math.random() * BASES.length)];
}

export default function DNAInformationVisual() {
  const cols = 16;
  const rows = 5;
  const pairs = Array.from({ length: rows }, () => ({
    left: randomBase(),
    right: randomBase(),
  }));

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-10 gap-4 px-6 pb-6 select-none overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d1117] to-[#0a1520] pointer-events-none" />

      {/* DNA helix visualization */}
      <div className="relative z-10 flex flex-col gap-[6px]">
        {pairs.map((pair, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="flex items-center gap-1"
          >
            {/* Left base */}
            <span
              className="w-8 h-7 rounded flex items-center justify-center font-mono font-bold text-sm shadow-lg"
              style={{ background: COLORS[pair.left] + '33', color: COLORS[pair.left], border: `1px solid ${COLORS[pair.left]}66` }}
            >
              {pair.left}
            </span>
            {/* Bridge */}
            <div className="flex gap-[2px] items-center">
              {Array.from({ length: cols }).map((_, j) => (
                <div
                  key={j}
                  className="rounded-full"
                  style={{
                    width: 3,
                    height: 3,
                    background: j % 2 === 0 ? '#d4a85366' : '#2dd4a833',
                    transform: `scaleY(${1 + 0.5 * Math.sin((i + j) * 0.6)})`,
                  }}
                />
              ))}
            </div>
            {/* Right base */}
            <span
              className="w-8 h-7 rounded flex items-center justify-center font-mono font-bold text-sm shadow-lg"
              style={{ background: COLORS[pair.right] + '33', color: COLORS[pair.right], border: `1px solid ${COLORS[pair.right]}66` }}
            >
              {pair.right}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="relative z-10 grid grid-cols-2 gap-3 w-full max-w-xs"
      >
        {[
          { label: 'Base Pairs', value: '3.2 Billion' },
          { label: 'Amino Acids Encoded', value: '20 types' },
          { label: 'Codons in the Code', value: '64' },
          { label: 'Information Source', value: 'God' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg p-2 text-center"
            style={{ background: 'rgba(212,168,83,0.07)', border: '1px solid rgba(212,168,83,0.18)' }}
          >
            <p className="text-gold-primary font-bold text-sm">{stat.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
