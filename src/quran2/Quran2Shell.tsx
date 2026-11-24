import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenText, Brain, Home, Moon, Search, Sprout, Sun } from "lucide-react";
import "./quran2.css";
import { useQ2Store } from "./store";

const NAV = [
  { to: "/q2", label: "الرئيسية", Icon: Home, end: true },
  { to: "/q2/index", label: "الفهرس", Icon: BookOpenText },
  { to: "/q2/hifz", label: "الحفظ", Icon: Brain },
  { to: "/q2/roots", label: "الجذور", Icon: Sprout },
  { to: "/q2/search", label: "البحث", Icon: Search },
] as const;

/** «القرآن ٢»: its own world inside Athar, with its own look and navigation. */
export function Quran2Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const palette = useQ2Store((s) => s.prefs.palette);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const reading = location.pathname.startsWith("/q2/read") || location.pathname.startsWith("/q2/hifz/session");

  React.useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", palette === "night" ? "#0d1311" : "#f5efe1");
    return () => {
      if (meta && previous) meta.setAttribute("content", previous);
    };
  }, [palette]);

  return (
    <div className="q2" data-palette={palette} dir="rtl" lang="ar">
      {!reading ? (
        <header className="q2-top">
          <button type="button" className="q2-icon-btn q2-press" onClick={() => navigate("/quran")} aria-label="العودة إلى أثر">
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <div className="q2-top-title">
            القرآن <span className="q2-orn">✦</span> ٢
          </div>
          <button
            type="button"
            className="q2-icon-btn q2-press"
            onClick={() => setPrefs({ palette: palette === "night" ? "paper" : "night" })}
            aria-label={palette === "night" ? "لون الورق" : "لون الليل"}
          >
            {palette === "night" ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
        </header>
      ) : null}
      <Outlet />
      {!reading ? (
        <nav className="q2-nav" aria-label="أقسام القرآن ٢">
          {NAV.map(({ to, label, Icon, ...rest }) => (
            <NavLink key={to} to={to} end={"end" in rest} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon size={21} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
