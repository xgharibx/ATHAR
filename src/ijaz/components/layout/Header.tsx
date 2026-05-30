
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/ijaz/lib/utils';

const navLinks = [
  { href: '/ijaz', label: 'الرئيسية', labelEn: 'Home' },
  { href: '/ijaz/miracles', label: 'المعجزات', labelEn: 'Miracles' },
  { href: '/ijaz/search', label: 'محرك البحث', labelEn: 'Search' },
  { href: '/ijaz/verse-explorer', label: 'مستكشف الآيات', labelEn: 'Verse Explorer' },
  { href: '/ijaz/timeline', label: 'الخط الزمني', labelEn: 'Timeline' },
  { href: '/ijaz/refute', label: 'دحض الإلحاد', labelEn: 'Refute' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-vanta/80 backdrop-blur-xl border-b border-border-gold shadow-gold-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/ijaz" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-primary to-gold-dark flex items-center justify-center text-vanta font-bold text-lg font-amiri">
                إ
              </div>
              <div className="absolute inset-0 rounded-xl bg-gold-primary/20 blur-lg group-hover:blur-xl transition-all opacity-0 group-hover:opacity-100" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-gold-primary font-amiri text-lg font-bold leading-tight">
                الإعجاز العلمي
              </h1>
              <p className="text-text-muted text-xs font-tajawal">
                Scientific Miracles in the Quran
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="relative px-4 py-2 text-sm font-tajawal text-text-secondary hover:text-gold-primary transition-colors group"
              >
                <span>{link.label}</span>
                <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-gold-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-right" />
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <Link
              to="/ijaz/search"
              aria-label="البحث"
              className="w-9 h-9 rounded-lg bg-space-blue/50 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-gold-primary hover:border-border-gold transition-all"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-lg bg-space-blue/50 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-gold-primary transition-all"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {mobileMenuOpen ? (
                  <>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </>
                ) : (
                  <>
                    <path d="M4 12h16" />
                    <path d="M4 6h16" />
                    <path d="M4 18h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden bg-deep-navy/95 backdrop-blur-xl border-t border-border-subtle overflow-hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-text-secondary hover:text-gold-primary hover:bg-space-blue/50 transition-all"
                  >
                    <span className="font-tajawal">{link.label}</span>
                    <span className="text-xs text-text-muted font-tajawal">{link.labelEn}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
