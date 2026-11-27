import * as React from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Headphones, Moon, Search, Sparkles, Sun } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import "./quran2.css";
import { useQuranLook, type QuranLook } from "./look";

const LiveGardenBackdrop = React.lazy(() =>
  import("@/components/ufuq/garden/LiveGardenBackdrop").then((m) => ({ default: m.LiveGardenBackdrop })),
);

const LOOK_NAMES: Record<QuranLook, string> = { paper: "السَّحَر", night: "الليل", afaq: "أفق" };

/** The phone's status bar takes the colour of the page. */
function useThemeColor(look: QuranLook) {
  React.useEffect(() => {
    if (look === "afaq") return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", look === "night" ? "#070c0b" : "#f6f0e2");
    return () => {
      if (meta && previous) meta.setAttribute("content", previous);
    };
  }, [look]);
}

/**
 * The section's own sky behind the app's header and bars: the page colour,
 * the lamp's light at the top and the ornament around it. Drawn in <body>,
 * apart from the page (which moves as it enters), so it stays still.
 */
function Q2Backdrop({ look }: { look: Exclude<QuranLook, "afaq"> }) {
  return createPortal(<div className="q2-backdrop" data-palette={look} aria-hidden="true" />, document.body);
}

/** The pages that have no heading of their own are named here; the others name themselves. */
function titleFor(path: string): string | null {
  if (path === "/quran") return "القرآن الكريم";
  if (path.startsWith("/quran/downloads")) return "التنزيلات";
  if (path.startsWith("/quran/tafsir/read")) return "التفسير";
  return null;
}

/**
 * The page's name, at the top of the page: one bar only (the app's own bars
 * stay as they are). The way back to the section's home in the classic design
 * («أفق»'s top bar already has it), the search, and the page's colour.
 */
function QuranHead() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/+$/, "") || "/quran";
  const home = path === "/quran";
  const ufuq = useNoorStore((s) => s.prefs.designMode === "ufuq");
  const { look, cycle, next } = useQuranLook();
  const title = titleFor(path);
  return (
    <header className={`q2-head-bar${title ? "" : " is-slim"}${home ? " is-home" : ""}`}>
      {!home && !ufuq ? (
        <button type="button" className="q2-icon-btn q2-press" onClick={() => navigate("/quran")} aria-label="إلى القرآن الكريم">
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      ) : null}
      {title ? <h1 className="q2-head-title">{title}</h1> : <span className="q2-head-title" aria-hidden="true" />}
      <div className="q2-head-tools">
        {/* «السماع» sits here on the section's home, not floating over its page. */}
        {home ? (
          <NavLink to="/listen" className="q2-icon-btn q2-press" aria-label="السماع">
            <Headphones size={19} aria-hidden="true" />
          </NavLink>
        ) : null}
        {path !== "/quran/search" ? (
          <NavLink to="/quran/search" className="q2-icon-btn q2-press" aria-label="البحث في القرآن">
            <Search size={19} aria-hidden="true" />
          </NavLink>
        ) : null}
        <button type="button" className="q2-icon-btn q2-press" onClick={cycle} aria-label={`لون ${LOOK_NAMES[next]}`} title={`اللون الآن: ${LOOK_NAMES[look]}`}>
          {next === "afaq" ? <Sparkles size={19} aria-hidden="true" /> : next === "night" ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

/**
 * «القرآن الكريم» inside the app's own frame (the classic header and bottom
 * bar, or «أفق»'s top bar and tab bar); its places are reached from its home.
 */
export function Quran2Shell() {
  const { look } = useQuranLook();
  useThemeColor(look);
  return (
    <div className="q2 is-shell" data-palette={look} dir="rtl" lang="ar">
      {look !== "afaq" ? <Q2Backdrop look={look} /> : null}
      <QuranHead />
      <Outlet />
    </div>
  );
}

/**
 * Reading, memorising and reciting take the whole screen: the surah, the
 * printed page, a memorisation session, a recitation. In «أفق» the garden is
 * behind it, as on every other page there.
 */
export function QuranReadingShell() {
  const { look } = useQuranLook();
  useThemeColor(look);
  return (
    <div className="q2 is-reading" data-palette={look} dir="rtl" lang="ar">
      {look === "afaq" ? (
        <div className="q2-afaq-sky" aria-hidden="true">
          <React.Suspense fallback={null}>
            <LiveGardenBackdrop />
          </React.Suspense>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
