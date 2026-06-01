
import { motion } from 'framer-motion';
import type { MiracleVisualProps } from '../MiracleVisualRegistry';

const contingentItems = [
  { label: '\u0623\u0646\u062A', desc: '\u064A\u0645\u0643\u0646 \u0623\u0644\u0627 \u062A\u0643\u0648\u0646 \u0645\u0648\u062C\u0648\u062F\u064B\u0627', delay: 0.5 },
  { label: '\u0648\u0627\u0644\u062F\u0627\u0643', desc: '\u064A\u0645\u0643\u0646 \u0623\u0644\u0627 \u064A\u0643\u0648\u0646\u0627 \u0645\u0648\u062C\u0648\u062F\u064A\u0646', delay: 0.9 },
  { label: '\u0627\u0644\u0623\u0631\u0636', desc: '\u064A\u0645\u0643\u0646 \u0623\u0644\u0627 \u062A\u0643\u0648\u0646 \u0645\u0648\u062C\u0648\u062F\u0629', delay: 1.3 },
  { label: '\u0627\u0644\u0634\u0645\u0633', desc: '\u064A\u0645\u0643\u0646 \u0623\u0644\u0627 \u062A\u0643\u0648\u0646 \u0645\u0648\u062C\u0648\u062F\u0629', delay: 1.7 },
  { label: '\u0627\u0644\u0645\u0627\u062F\u0629', desc: '\u064A\u0645\u0643\u0646 \u0623\u0644\u0627 \u062A\u0643\u0648\u0646 \u0645\u0648\u062C\u0648\u062F\u0629', delay: 2.1 },
  { label: '\u0627\u0644\u0643\u0648\u0646', desc: '\u064A\u0645\u0643\u0646 \u0623\u0644\u0627 \u064A\u0643\u0648\u0646 \u0645\u0648\u062C\u0648\u062F\u064B\u0627', delay: 2.5 },
];

const causeProps = [
  { text: '\u0645\u0648\u062C\u0648\u062F \u0628\u0630\u0627\u062A\u0647 \u2014 \u0644\u0627 \u064A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 \u063A\u064A\u0631\u0647', mark: 'Necessary Being = \u0627\u0644\u0644\u0647' },
];

export default function ContingencyVisual({ className }: MiracleVisualProps) {
  const cls = ['relative w-full h-full overflow-hidden bg-gradient-to-b from-[#080818] to-[#050510] flex flex-col items-center justify-center p-4', className || ''].join(' ');

  return (
    <div className={cls}>
      <motion.svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        viewBox="0 0 300 300"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '50% 50%' }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <circle key={i} cx="150" cy="150" r={30 + i * 15} fill="none" stroke="#4A90D9" strokeWidth="0.5" strokeDasharray="4 8" />
        ))}
      </motion.svg>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-4 relative z-10"
      >
        <p className="font-amiri text-lg text-gold-primary">{'\u0628\u0631\u0647\u0627\u0646 \u0627\u0644\u0625\u0645\u0643\u0627\u0646 \u0648\u0627\u0644\u0648\u062C\u0648\u0628'}</p>
        <p className="text-text-muted text-[10px] font-tajawal">{'\u0643\u0644 \u0645\u0645\u0643\u0646 \u064A\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u0648\u0627\u062C\u0628 \u0627\u0644\u0648\u062C\u0648\u062F'}</p>
      </motion.div>

      <div className="relative z-10 w-full max-w-sm">
        {contingentItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: item.delay, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-shrink-0 w-6 flex flex-col items-center">
                <div className="w-3 h-3 rounded-full border border-blue-400/30 bg-blue-400/10" />
                {i < contingentItems.length - 1 && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 16 }}
                    transition={{ delay: item.delay + 0.2 }}
                    className="w-px bg-blue-400/20"
                  />
                )}
              </div>
              <div className="flex-1 flex items-center gap-2 bg-space-blue/20 border border-blue-400/10 rounded-lg px-3 py-1.5">
                <p className="font-amiri text-sm text-text-primary">{item.label}</p>
                <p className="text-[9px] text-text-muted font-tajawal mr-auto">{'\u2190 ' + item.desc}</p>
                <span className="text-[9px] text-blue-400/50 font-mono">{'\u0645\u0645\u0643\u0646'}</span>
              </div>
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="flex justify-center my-3"
        >
          <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1, repeat: Infinity }}>
            <svg viewBox="0 0 30 30" className="w-6 h-6">
              <path d="M 15 5 L 15 20" stroke="#d4a853" strokeWidth="2" />
              <path d="M 10 15 L 15 22 L 20 15" stroke="#d4a853" strokeWidth="2" fill="none" />
            </svg>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 3.5, duration: 0.6, type: 'spring' }}
        >
          <motion.div
            animate={{ boxShadow: ['0 0 0 rgba(212,168,83,0)', '0 0 30px rgba(212,168,83,0.15)', '0 0 0 rgba(212,168,83,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="bg-gold-primary/5 border-2 border-gold-primary/30 rounded-xl p-4 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-gold-primary/15 border border-gold-primary/30 flex items-center justify-center mx-auto mb-2">
              <span className="text-gold-primary font-bold text-lg">{'\u221E'}</span>
            </div>
            <p className="font-amiri text-lg text-gold-primary font-bold">{'\u0648\u0627\u062C\u0628 \u0627\u0644\u0648\u062C\u0648\u062F'}</p>
            <p className="text-text-secondary text-xs font-tajawal mt-1">{causeProps[0].text}</p>
            <p className="text-[10px] font-mono text-verse-green/60 mt-2">{causeProps[0].mark}</p>
          </motion.div>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4.5 }}
        className="absolute bottom-4 text-center text-[10px] text-text-muted font-tajawal z-10 px-4"
      >
        {'\u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u0645\u0645\u0643\u0646\u0627\u062A \u0644\u0627 \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u0645\u062A\u062F \u0625\u0644\u0649 \u0645\u0627 \u0644\u0627 \u0646\u0647\u0627\u064A\u0629 \u2014 \u0644\u0627 \u0628\u062F \u0645\u0646 \u0648\u0627\u062C\u0628 \u0627\u0644\u0648\u062C\u0648\u062F'}
      </motion.p>
    </div>
  );
}
