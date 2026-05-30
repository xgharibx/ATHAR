
import { motion } from 'framer-motion';

const prophecyPoints = [
  {
    ref: 'Isaiah 42:1',
    text: '"My chosen one in whom I delight"',
    match: 'Muhammad = The Praised/Chosen One',
    color: '#d4a853',
  },
  {
    ref: 'Isaiah 42:11',
    text: '"Let settlements where Kedar lives rejoice"',
    match: 'Kedar = son of Ishmael = Hejaz Arabs (Mecca)',
    color: '#f472b6',
  },
];

export default function IsaiahProphecyVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-10 gap-4 px-6 pb-6 select-none overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#100a0a] via-[#0d1117] to-[#0a1010] pointer-events-none" />

      {/* Isaiah scroll header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="relative z-10 rounded-xl px-4 py-3 text-center w-full max-w-sm"
        style={{ background: 'rgba(212,168,83,0.06)', border: '1px solid rgba(212,168,83,0.22)' }}
      >
        <p className="text-gray-300 text-xs italic leading-relaxed">
          &ldquo;Here is my servant, whom I uphold, my <span className="text-gold-primary font-semibold not-italic">chosen one</span> in whom I{' '}
          <span className="text-gold-primary font-semibold not-italic">delight</span>; I will put my Spirit on him, and he will bring{' '}
          <span className="text-verse-green font-semibold not-italic">justice to the nations</span>.&rdquo;
        </p>
        <p className="text-gray-500 text-xs mt-1.5">— Isaiah 42:1, ~700 BCE</p>
      </motion.div>

      {/* Prophecy matches */}
      <div className="relative z-10 flex flex-col gap-2 w-full max-w-sm">
        {prophecyPoints.map((point, i) => (
          <motion.div
            key={point.ref}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.45 }}
            className="rounded-lg p-2.5"
            style={{ background: point.color + '0a', border: `1px solid ${point.color}25` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ background: point.color + '20', color: point.color }}
              >
                {point.ref}
              </span>
            </div>
            <p className="text-gray-300 text-xs italic">{point.text}</p>
            <p className="text-xs mt-1 font-medium flex items-center gap-1" style={{ color: point.color }}>
              <span>→</span>
              <span>{point.match}</span>
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
