import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, BookOpenText, Heart, Trophy, BarChart3 } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreakLocal(activity: Record<string, number>) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if ((activity[k] ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}

const NAV_ITEMS = [
  { path: "/", label: "الرئيسية", icon: House },
  { path: "/quran", label: "القرآن", icon: BookOpenText },
  { path: "/favorites", label: "المفضلة", icon: Heart },
  { path: "/insights", label: "إحصاءات", icon: BarChart3 },
  { path: "/leaderboard", label: "الترتيب", icon: Trophy },
] as const;

export function FloatingNav() {
  const location = useLocation();
  const [hidden, setHidden] = React.useState(false);
  const lastScrollY = React.useRef(0);
  const ticking = React.useRef(false);
  const prevPath = React.useRef(location.pathname);

  const activity = useNoorStore((s) => s.activity);
  const todayCount = activity[todayISO()] ?? 0;
  const streak = React.useMemo(() => computeStreakLocal(activity), [activity]);

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
              <div className="relative">
                <item.icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {item.path === "/" && todayCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 leading-none text-black tabular-nums"
                    style={{ background: "var(--accent)" }}
                  >
                    {todayCount > 99 ? "99+" : todayCount}
                  </span>
                )}
                {item.path === "/insights" && streak > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 leading-none tabular-nums"
                    style={{
                      background: streak >= 7 ? "#f59e0b" : streak >= 3 ? "var(--accent)" : "rgba(255,255,255,0.2)",
                      color: streak >= 3 ? "black" : "white",
                    }}
                  >
                    {streak > 99 ? "99+" : streak}
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
