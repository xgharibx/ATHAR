import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, BookOpenText, Heart, Settings2, BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "الرئيسية", icon: House },
  { path: "/quran", label: "القرآن", icon: BookOpenText },
  { path: "/favorites", label: "المفضلة", icon: Heart },
  { path: "/insights", label: "إحصاءات", icon: BarChart3 },
  { path: "/settings", label: "الضبط", icon: Settings2 },
] as const;

export function FloatingNav() {
  const location = useLocation();
  const [hidden, setHidden] = React.useState(false);
  const lastScrollY = React.useRef(0);
  const ticking = React.useRef(false);
  const prevPath = React.useRef(location.pathname);

  React.useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Haptic feedback on tab switch
  React.useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      if (navigator.vibrate) navigator.vibrate(8);
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isAdhkarPage = location.pathname.startsWith("/c/");

  return (
    <nav
      className={`floating-nav xl:hidden ${hidden ? "nav-hidden" : ""}`}
      aria-label="التنقل الرئيسي"
    >
      <div className="flex items-center gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path) || (item.path === "/" && isAdhkarPage);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`floating-nav-item ${active ? "active" : ""}`}
              aria-label={item.label}
            >
              <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
