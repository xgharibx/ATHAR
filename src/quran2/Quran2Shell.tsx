import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenText, Brain, Home, Mic, Moon, ScrollText, Search, Sun } from "lucide-react";
import "./quran2.css";
import { useQ2Store } from "./store";

/** The dock (docs/QURAN_V2_DESIGN.md): «التسميع» raised in the middle. */
const NAV = [
  { to: "/q2", label: "الرئيسية", Icon: Home, end: true },
  { to: "/q2/index", label: "المصحف", Icon: BookOpenText, also: ["/q2/page", "/q2/roots", "/q2/numbers", "/q2/marks", "/q2/khatma", "/q2/search"] },
  { to: "/q2/tasmee", label: "التسميع", Icon: Mic, center: true },
  { to: "/q2/hifz", label: "الحفظ", Icon: Brain },
  { to: "/q2/tafsir", label: "التفسير", Icon: ScrollText },
] as const;

/** «القرآن ٢»: its own world inside Athar, with its own look and navigation. */
export function Quran2Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const palette = useQ2Store((s) => s.prefs.palette);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const path = location.pathname;
  const reading = path.startsWith("/q2/read") || path.startsWith("/q2/hifz/session") || path.startsWith("/q2/page") || path.startsWith("/q2/madina") || path.startsWith("/q2/tasmee/session");

  React.useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", palette === "night" ? "#070c0b" : "#f6f0e2");
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
          <button type="button" className="q2-icon-btn q2-press" onClick={() => navigate("/q2/search")} aria-label="البحث في القرآن">
            <Search size={19} aria-hidden="true" />
          </button>
          <div className="q2-top-title">
            القرآن <span className="q2-orn">✦</span> ٢
          </div>
          <span className="q2-icon-btn" aria-hidden="true" />
          <button
            type="button"
            className="q2-icon-btn q2-press"
            onClick={() => setPrefs({ palette: palette === "night" ? "paper" : "night" })}
            aria-label={palette === "night" ? "لون السَّحَر" : "لون الليل"}
          >
            {palette === "night" ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
        </header>
      ) : null}
      <Outlet />
      {!reading ? (
        <nav className="q2-nav" aria-label="أقسام القرآن ٢">
          {NAV.map((item) => {
            const { to, label, Icon } = item;
            const also = "also" in item ? item.also : [];
            const isCenter = "center" in item;
            return (
              <NavLink
                key={to}
                to={to}
                end={"end" in item}
                className={({ isActive }) => [isActive || also.some((p) => path.startsWith(p)) ? "active" : "", isCenter ? "is-center" : ""].join(" ")}
              >
                {isCenter ? (
                  <span className="q2-medal"><Icon size={24} aria-hidden="true" /></span>
                ) : (
                  <Icon size={21} aria-hidden="true" />
                )}
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
