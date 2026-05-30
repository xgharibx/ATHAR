
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative bg-deep-navy border-t border-border-subtle">
      {/* Gold gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-primary/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-primary to-gold-dark flex items-center justify-center text-vanta font-bold text-lg font-amiri">
                إ
              </div>
              <div>
                <h3 className="text-gold-primary font-amiri text-lg font-bold">الإعجاز العلمي</h3>
                <p className="text-text-muted text-xs">Scientific Miracles in the Quran</p>
              </div>
            </div>
            <p className="text-text-secondary text-sm font-tajawal leading-relaxed">
              الموسوعة التفاعلية الشاملة للإعجاز العلمي في القرآن الكريم، وبراهين وجود الخالق،
              وأدلة نبوة محمد ﷺ. مبنية على أعمال د. هيثم طلعت.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="text-gold-primary font-tajawal font-semibold">الأقسام</h4>
            <div className="space-y-2">
              {[
                { href: '/ijaz/miracles', label: 'جميع المعجزات' },
                { href: '/ijaz/categories/cosmological', label: 'الإعجاز الكوني' },
                { href: '/ijaz/categories/biological', label: 'الإعجاز البيولوجي' },
                { href: '/ijaz/categories/earth-sciences', label: 'علوم الأرض' },
                { href: '/ijaz/categories/prophecies', label: 'النبوءات' },
                { href: '/ijaz/categories/logical-philosophical', label: 'البراهين المنطقية' },
              ].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="block text-text-secondary text-sm font-tajawal hover:text-gold-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="space-y-4">
            <h4 className="text-gold-primary font-tajawal font-semibold">المصادر</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-text-primary text-sm font-tajawal">د. هيثم طلعت</p>
                <p className="text-text-muted text-xs font-tajawal">Dr. Haitham Talaat</p>
              </div>
              <div className="space-y-1.5 text-sm text-text-secondary font-tajawal">
                <p>📖 الإعجاز العلمي</p>
                <p>📖 بصائر</p>
                <p>📖 علم الكتاب</p>
                <p>📖 رسول الأميين</p>
              </div>
              <a
                href="https://www.youtube.com/@Dr.Haitham_Talaat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gold-primary hover:text-gold-light transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="font-tajawal">القناة على يوتيوب</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs font-tajawal text-center sm:text-right">
            جميع المحتويات مستخلصة من أعمال د. هيثم طلعت. هذا المشروع لخدمة العلم والدعوة.
          </p>
          <p className="text-text-muted text-xs font-tajawal">
            بسم الله الرحمن الرحيم
          </p>
        </div>
      </div>
    </footer>
  );
}
