import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, BookOpenText, Sparkles, BookMarked, Atom, Trophy, MoreVertical, Clapperboard, BarChart3, Heart, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNoorStore } from "@/store/noorStore";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const NAV_ITEMS = [
  { path: "/", label: "الرئيسية", icon: House },
  { path: "/quran", label: "القرآن", icon: BookOpenText },
  { path: "/companion", label: "أثر", icon: Sparkles },
  { path: "/ijaz", label: "الإعجاز", icon: Atom },
  { path: "/library", label: "المكتبة", icon: BookMarked },
  { path: "/leaderboard", label: "الترتيب", icon: Trophy },
] as const;

/**
 * Destinations that live behind the overflow button rather than in the bar.
 *
 * Six tabs is already the practical ceiling for a bottom bar at Arabic label
 * widths; a seventh, eighth and ninth would either shrink every tap target or
 * push the row into horizontal scrolling, where tabs hide off-screen and stop
 * looking tappable at all. These three are real destinations but not
 * every-session ones, so they belong one tap deeper.
 */
const MORE_ITEMS = [
  { path: "/shorts", label: "مقاطع قصيرة", icon: Zap },
  { path: "/video-library", label: "الدورات", icon: Clapperboard },
  { path: "/insights", label: "الإحصائيات", icon: BarChart3 },
  { path: "/favorites", label: "المفضلة", icon: Heart },
] as const;

export function FloatingNav({ drawerOpen }: { drawerOpen?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement | null>(null);
  const moreBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const lastScrollY = React.useRef(0);
  const ticking = React.useRef(false);
  const prevPath = React.useRef(location.pathname);

  const activity = useNoorStore((s) => s.activity);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const todayCount = activity[todayISO()] ?? 0;

  const khatmaDueToday = React.useMemo(() => {
    if (!khatmaStartISO || !khatmaDays) return false;
    const today = todayISO();
    return !(khatmaDone?.[today] ?? false);
  }, [khatmaStartISO, khatmaDays, khatmaDone]);

  React.useEffect(() => {
    let mounted = true;
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        if (!mounted) return;
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        if (delta > 60 && y > 120) {
          setHidden(true);
        } else if (delta < -30 || y < 60) {
          setHidden(false);
        }
        lastScrollY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      mounted = false;
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Dismiss the overflow menu the way a native one behaves: tap anywhere else,
  // press Escape, or navigate. Focus returns to the button so keyboard users
  // are not dropped back at the top of the document.
  React.useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (moreRef.current?.contains(t) || moreBtnRef.current?.contains(t)) return;
      setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // A hidden nav must not leave an orphaned popover floating on screen.
  React.useEffect(() => {
    if (hidden || drawerOpen) setMoreOpen(false);
  }, [hidden, drawerOpen]);

  React.useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Haptic feedback on tab switch
  React.useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      if (navigator.vibrate) navigator.vibrate(8);
    }
    // Scroll the active tab into view when nav is in compact/scrollable mode
    const activeEl = document.querySelector('.floating-nav-item.active') as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isAdhkarPage = location.pathname.startsWith("/c/");
  // The bar must still show WHERE you are even when the destination lives
  // behind the overflow, otherwise those three pages look like nowhere.
  const moreActive = MORE_ITEMS.some((m) => location.pathname.startsWith(m.path));

  const bar = (
    <nav className="floating-nav" aria-label="التنقل الرئيسي">
      <div className="flex items-center gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path) || (item.path === "/" && isAdhkarPage);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`floating-nav-item ${active ? "active" : ""}`}
              aria-label={
                item.path === "/quran" && khatmaDueToday
                  ? `${item.label} — ورد القرآن مطلوب`
                  : item.path === "/" && todayCount > 0
                  ? `${item.label} — ${todayCount} تسبيح`
                  : item.label
              }
              aria-current={active ? "page" : undefined}
            >
              <div className="relative" aria-hidden="true">
                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {item.path === "/quran" && khatmaDueToday && (
                  <span
                    className="absolute -top-2 -right-2 w-[8px] h-[8px] rounded-full ring-2 ring-[var(--bg)]"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                {item.path === "/" && todayCount > 0 && (
                  <span
                    className="absolute -top-2 -right-3 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold flex items-center justify-center px-1 leading-none text-[var(--on-accent)] tabular-nums ring-2 ring-[var(--bg)]"
                    style={{ background: "var(--accent)" }}
                  >
                    {todayCount > 99 ? "99+" : todayCount}
                  </span>
                )}
              </div>
              <span aria-hidden="true">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );

  // The overflow lives OUTSIDE the bar: its own floating dot-button, with no
  // label under it. It cannot sit horizontally beside the bar — six tabs come
  // to ~318px inside a 359px cap on a 375px screen, leaving no room for a
  // 44px button — so it floats just above the bar's leading edge, where the
  // thumb already is after tapping الترتيب.
  const overflow = (
    <div className="floating-nav-dock">
      {moreOpen && (
        <div
          id="floating-nav-more-menu"
          ref={moreRef}
          role="menu"
          aria-label="المزيد"
          className="floating-nav-more-menu"
        >
          {MORE_ITEMS.map((item, i) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                type="button"
                key={item.path}
                role="menuitem"
                autoFocus={i === 0}
                onClick={() => {
                  setMoreOpen(false);
                  navigate(item.path);
                }}
                className={`floating-nav-more-item ${active ? "active" : ""}`}
                aria-label={item.label}
                title={item.label}
              >
                <item.icon size={20} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        ref={moreBtnRef}
        onClick={() => {
          setMoreOpen((v) => !v);
          if (navigator.vibrate) navigator.vibrate(8);
        }}
        className={`floating-nav-dots ${moreActive || moreOpen ? "active" : ""}`}
        aria-label="المزيد"
        aria-haspopup="menu"
        aria-expanded={moreOpen}
        aria-controls="floating-nav-more-menu"
      >
        <MoreVertical size={20} strokeWidth={moreActive || moreOpen ? 2.4 : 2} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div
      className={`floating-nav-row xl:hidden ${hidden || drawerOpen ? "nav-hidden" : ""}`}
      aria-hidden={drawerOpen ? "true" : undefined}
      style={drawerOpen ? { pointerEvents: "none" } : undefined}
    >
      {/* Invisible twin of the dots on the opposite side. It is what keeps the
          bar dead centre while the dots sit beside it: laying them out as a row
          without it pushed the bar 27px off-centre, and pinning the dots to the
          screen edge instead made the gap grow with the screen — 10px on a
          small phone, nearly 40px on a large one. */}
      <div className="floating-nav-balance" aria-hidden="true" />
      {bar}
      {overflow}
    </div>
  );
}
