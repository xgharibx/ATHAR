import * as React from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom";
import { ArrowRight, Home, Search, BookOpen, Sparkles, Clock, Zap } from "lucide-react";

const NoorStarfield = React.lazy(() => import('@/components/background/NoorStarfield'));

/* ----------------------------------------------------------------
   IjazShell — thin wrapper that mounts the الإعجاز العلمي section
   inside the main Noor app. Provides the dark-space theme
   (class="ijaz-shell dark") and a minimal in-section nav bar.
   ---------------------------------------------------------------- */

const IJAZ_NAV = [
  { path: "/ijaz", label: "الرئيسية", icon: Home, exact: true },
  { path: "/ijaz/miracles", label: "المعجزات", icon: Sparkles },
  { path: "/ijaz/verse-explorer", label: "الآيات", icon: BookOpen },
  { path: "/ijaz/search", label: "بحث", icon: Search },
  { path: "/ijaz/timeline", label: "التسلسل", icon: Clock },
  { path: "/ijaz/journey", label: "الرحلة", icon: Zap },
] as const;

export function IjazShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [starfieldReady, setStarfieldReady] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  React.useEffect(() => {
    const w = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setStarfieldReady(true), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = setTimeout(() => setStarfieldReady(true), 2000);
    return () => clearTimeout(id);
  }, []);

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="ijaz-shell dark" dir="rtl">
      {/* ── Fixed star canvas — behind ALL ijaz content ── */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: -1, background: '#080b12', pointerEvents: 'none' }}
      >
        {starfieldReady && (
          <React.Suspense fallback={null}>
            <NoorStarfield mobile={isMobile} />
          </React.Suspense>
        )}
      </div>

      {/* ── Top bar ── */}
      <header className="ijaz-topbar">
        <span className="ijaz-topbar-glow" aria-hidden />
        <button
          type="button"
          onClick={() => navigate("/")}
          className="ijaz-back-btn"
          aria-label="العودة لتطبيق أثر"
        >
          <ArrowRight size={18} />
          <span>أثر</span>
        </button>

        <span className="ijaz-brand">
          <span className="ijaz-brand-icon">✦</span>
          <span className="ijaz-brand-text">الإعجاز العلمي</span>
        </span>
      </header>

      {/* ── Sub-nav ── */}
      <nav className="ijaz-subnav" aria-label="تنقل الإعجاز">
        {IJAZ_NAV.map((item) => {
          const active = isActive(item.path, (item as { exact?: boolean }).exact);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={(item as { exact?: boolean }).exact}
              className={`ijaz-nav-item ${active ? "active" : ""}`}
            >
              <item.icon size={15} strokeWidth={active ? 2.2 : 1.7} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Page content ── */}
      <main className="ijaz-content">
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="ijaz-spinner" aria-label="جاري التحميل" />
            </div>
          }
        >
          <Outlet />
        </React.Suspense>
      </main>
    </div>
  );
}
