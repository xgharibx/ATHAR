import * as React from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpenText, Brain, Home, Mic, Moon, ScrollText, Search, Sparkles, Sun } from "lucide-react";
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

/** The places of the Quran, under the app's header. */
const TABS = [
  { to: "/quran", label: "الرئيسية", Icon: Home, end: true },
  { to: "/quran/index", label: "المصحف", Icon: BookOpenText, also: ["/quran/roots", "/quran/numbers", "/quran/marks", "/quran/khatma", "/quran/search", "/quran/about"] },
  { to: "/quran/tasmee", label: "التسميع", Icon: Mic, star: true },
  { to: "/quran/hifz", label: "الحفظ", Icon: Brain },
  { to: "/quran/tafsir", label: "التفسير", Icon: ScrollText },
] as const;

function QuranTabs() {
  const location = useLocation();
  const path = location.pathname;
  const { look, cycle, next } = useQuranLook();
  return (
    <div className="q2-tabs" role="navigation" aria-label="أقسام القرآن">
      <div className="q2-tabs-row">
        {TABS.map((tab) => {
          const also = "also" in tab ? tab.also : [];
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={"end" in tab}
              className={({ isActive }) => ["q2-tab q2-press", isActive || also.some((p) => path.startsWith(p)) ? "active" : "", "star" in tab ? "is-star" : ""].join(" ")}
            >
              <tab.Icon size={17} aria-hidden="true" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
      <div className="q2-tabs-tools">
        <NavLink to="/quran/search" className="q2-icon-btn q2-press" aria-label="البحث في القرآن">
          <Search size={18} aria-hidden="true" />
        </NavLink>
        <button type="button" className="q2-icon-btn q2-press" onClick={cycle} aria-label={`لون ${LOOK_NAMES[next]}`} title={`اللون الآن: ${LOOK_NAMES[look]}`}>
          {next === "afaq" ? <Sparkles size={18} aria-hidden="true" /> : next === "night" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

/**
 * «القرآن الكريم» inside the app's own frame (the classic header and bottom
 * bar, or «أفق»'s top bar and tab bar), with its places in a row of tabs.
 */
export function Quran2Shell() {
  const { look } = useQuranLook();
  useThemeColor(look);
  return (
    <div className="q2 is-shell" data-palette={look} dir="rtl" lang="ar">
      {look !== "afaq" ? <Q2Backdrop look={look} /> : null}
      <QuranTabs />
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
