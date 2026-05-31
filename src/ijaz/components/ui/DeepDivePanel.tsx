import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Content Parser ───────────────────────────────────────────────
// Format: separate sections with a blank line before a title,
// and a line containing only === immediately after the title.
//
// Example:
//   عنوان القسم
//   ===
//   النص...
//
// Lines starting with • are bullet items (rendered with indent).
function parseSections(text: string) {
  const blocks = text.split(/\n{2,}/);
  const items: Array<{ type: 'heading' | 'body'; text: string }> = [];

  for (const block of blocks) {
    const eqIdx = block.indexOf('\n===');
    if (eqIdx !== -1) {
      const heading = block.slice(0, eqIdx).trim();
      const body = block.slice(eqIdx + 4).trim(); // skip \n===
      if (heading) items.push({ type: 'heading', text: heading });
      if (body) items.push({ type: 'body', text: body });
    } else {
      const clean = block.trim();
      if (clean) items.push({ type: 'body', text: clean });
    }
  }
  return items;
}

// ─── Props ───────────────────────────────────────────────────────
interface DeepDivePanelProps {
  content: string;
  dir?: 'rtl' | 'ltr';
  accentColor: string;
  lang?: 'ar' | 'en';
}

// ─── Component ───────────────────────────────────────────────────
export default function DeepDivePanel({
  content,
  dir = 'rtl',
  accentColor,
  lang = 'ar',
}: DeepDivePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sections = parseSections(content);
  const isAr = lang === 'ar';

  const triggerLabel = isAr ? 'تعمّق أكثر' : 'Deep Dive';
  const badgeLabel = isAr ? 'بالتفصيل' : 'Scholarly';
  const headerLabel = isAr ? 'الشرح المعمّق' : 'Full Scholarly Analysis';
  const closeLabel = isAr ? 'طيّ الشرح' : 'Collapse';

  return (
    <div dir={dir} className="mt-5">
      {/* ── Trigger Button ── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="group w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 border font-tajawal text-sm cursor-pointer"
        style={{
          background: isOpen ? `${accentColor}0A` : `${accentColor}04`,
          borderColor: isOpen ? `${accentColor}45` : `${accentColor}22`,
          color: isOpen ? accentColor : 'var(--tw-color-text-muted, #8899aa)',
          boxShadow: isOpen
            ? `0 0 24px ${accentColor}12, inset 0 1px 0 ${accentColor}18`
            : `0 0 0px transparent`,
        }}
      >
        {/* Left side: icon + label + badge */}
        <span className="flex items-center gap-2.5">
          <motion.span
            animate={{ rotate: isOpen ? 15 : 0, scale: isOpen ? 1.2 : 1 }}
            transition={{ duration: 0.3 }}
            className="text-base leading-none flex-shrink-0"
            style={{ color: accentColor }}
          >
            ✦
          </motion.span>
          <span className="font-semibold tracking-wide" style={{ color: isOpen ? accentColor : undefined }}>
            {triggerLabel}
          </span>
          {!isOpen && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold leading-none"
              style={{ background: `${accentColor}18`, color: accentColor }}
            >
              {badgeLabel}
            </span>
          )}
        </span>

        {/* Right side: animated chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0"
          style={{ color: accentColor }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </motion.span>
      </motion.button>

      {/* ── Collapsible Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="mt-2 rounded-xl p-6"
              style={{
                background: `linear-gradient(145deg, ${accentColor}07 0%, rgba(255,255,255,0.015) 60%, ${accentColor}04 100%)`,
                border: `1px solid ${accentColor}1E`,
                borderTop: `2px solid ${accentColor}45`,
                boxShadow: `inset 0 1px 0 ${accentColor}18, 0 8px 32px rgba(0,0,0,0.18)`,
              }}
            >
              {/* Panel header badge */}
              <div
                className="flex items-center gap-2 pb-4 mb-2 border-b"
                style={{ borderColor: `${accentColor}18` }}
              >
                <span className="text-base leading-none" style={{ color: accentColor }}>
                  ✦
                </span>
                <span
                  className="text-[11px] font-tajawal font-bold tracking-widest"
                  style={{ color: accentColor, letterSpacing: isAr ? '0.05em' : '0.1em' }}
                >
                  {headerLabel}
                </span>
                <span
                  className="ml-auto mr-0 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: accentColor }}
                />
              </div>

              {/* Content sections */}
              <div className="space-y-1">
                {sections.map((section, i) =>
                  section.type === 'heading' ? (
                    <motion.h4
                      key={i}
                      initial={{ opacity: 0, x: dir === 'rtl' ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="font-amiri text-base font-bold mt-6 mb-1 flex items-center gap-3"
                      style={{ color: accentColor }}
                    >
                      <span
                        className="flex-shrink-0 rounded-full"
                        style={{
                          width: '20px',
                          height: '2px',
                          background: `linear-gradient(${dir === 'rtl' ? '270deg' : '90deg'}, ${accentColor}, transparent)`,
                        }}
                      />
                      {section.text}
                    </motion.h4>
                  ) : (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="text-text-secondary font-tajawal text-sm leading-[2] whitespace-pre-line"
                      dir={dir}
                    >
                      {section.text}
                    </motion.p>
                  ),
                )}
              </div>

              {/* Collapse button */}
              <div className="mt-6 pt-4 border-t flex" style={{ borderColor: `${accentColor}10` }}>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1.5 text-xs font-tajawal transition-colors"
                  style={{ color: `${accentColor}80` }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = `${accentColor}80`)}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ transform: 'rotate(0deg)' }}
                  >
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                  {closeLabel}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
