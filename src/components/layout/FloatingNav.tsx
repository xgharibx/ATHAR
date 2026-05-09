import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, BookOpenText, Heart, BookMarked, Clapperboard, Trophy } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const NAV_ITEMS = [
  { path: "/", label: "الرئيسية", icon: House },
  { path: "/quran", label: "القرآن", icon: BookOpenText },
  { path: "/favorites", label: "المفضلة", icon: Heart },
  { path: "/video-library", label: "الدورات", icon: Clapperboard },
  { path: "/library", label: "المكتبة", icon: BookMarked },
  { path: "/leaderboard", label: "الترتيب", icon: Trophy },
] as const;

export function FloatingNav({ drawerOpen }: { drawerOpen?: boolean }) {
  const location = useLocation();
  const [hidden, setHidden] = React.useState(false);
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

  return (
    <nav
      className={`floating-nav xl:hidden ${hidden || drawerOpen ? "nav-hidden" : ""}`}
      aria-label="التنقل الرئيسي"
      aria-hidden={drawerOpen ? "true" : undefined}
      style={drawerOpen ? { pointerEvents: "none" } : undefined}
    >
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
              <div className="relative">
                <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {item.path === "/quran" && khatmaDueToday && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-[8px] h-[8px] rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                {item.path === "/" && todayCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 leading-none text-[var(--on-accent)] tabular-nums"
                    style={{ background: "var(--accent)" }}
                  >
                    {todayCount > 99 ? "99+" : todayCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
