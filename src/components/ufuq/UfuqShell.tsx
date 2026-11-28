/**
 * The frame of «أفق»: a quiet top bar, the page, and one floating glass tab
 * bar. It replaces the classic header, sidebar, starry background, bottom bar
 * and floating buttons while the new design is on (see AppShell).
 */
import * as React from "react";
import { prefetchWhenIdle } from "@/lib/prefetch";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Pause, Play, Radio, Search, Settings2, Trophy, X } from "lucide-react";
import { vibrate } from "@/lib/haptics";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { UpdatePill } from "@/components/layout/UpdatePill";
import { getRadioState, stopRadio, subscribeRadio, toggleRadio } from "@/lib/radioPlayer";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";
import { isKhatmaDateWithinPlan } from "@/lib/quranKhatma";
import { IconExplore, IconPrayer, IconQuran, IconTasbeeh, IconToday } from "@/components/ufuq/UfuqIcons";
import { ListenMiniPlayer } from "@/components/listen/MiniPlayer";
import { DesignSwitch } from "@/components/layout/DesignSwitch";
import { isUfuqTabRoot, ufuqTabFor, ufuqTitleFor, UFUQ_TABS, type UfuqTabId } from "@/components/ufuq/ufuqNav";

import { LiveGardenLazy } from "@/components/ufuq/ufuqLazy";

const CommandPalette = React.lazy(() =>
  import("@/components/layout/CommandPalette").then((m) => ({ default: m.CommandPalette })),
);
const QuickTasbeehFab = React.lazy(() =>
  import("@/components/layout/QuickTasbeehFab").then((m) => ({ default: m.QuickTasbeehFab })),
);

/** Search opens instantly: its code is fetched while the app is idle. */
function usePrefetchSearch() {
  React.useEffect(() => prefetchWhenIdle(() => import("@/components/layout/CommandPalette")), []);
}

const TAB_ICONS: Record<UfuqTabId, (props: { active?: boolean; size?: number }) => React.ReactElement> = {
  today: IconToday,
  quran: IconQuran,
  prayer: IconPrayer,
  tasbeeh: IconTasbeeh,
  explore: IconExplore,
};

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** Hide the bar while reading down a page; bring it back on the way up. */
function useHideOnScroll() {
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (delta > 48 && y > 160) setHidden(true);
        else if (delta < -24 || y < 80) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}

/**
 * Athar's own mark — the fingerprint with «أثر» across it, taken from the
 * app icon — and its line, «همسة تطمئن قلبك، وتترك أثرًا».
 */
function UfuqBrand({ compact = false }: { compact?: boolean }) {
  const base = import.meta.env.BASE_URL ?? "/";
  return (
    <NavLink to="/" className={`u-brand${compact ? " is-compact" : ""}`} aria-label="أثر — همسة تطمئن قلبك، وتترك أثرًا">
      <span
        className="u-brand-mark"
        aria-hidden="true"
        style={{
          ["--u-brand-print" as string]: `url("${base}brand/athar-print.png")`,
          ["--u-brand-word" as string]: `url("${base}brand/athar-word.png")`,
        }}
      >
        <span className="u-brand-print" />
        <span className="u-brand-word" />
      </span>
      {compact ? null : (
        <span className="u-brand-slogan" aria-hidden="true">
          همسة تطمئن قلبك،
          <br />
          وتترك أثرًا
        </span>
      )}
    </NavLink>
  );
}

function UfuqTopBar({ onSearch }: { onSearch: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const scrolled = useScrolled();
  const root = isUfuqTabRoot(location.pathname);
  const title = ufuqTitleFor(location.pathname);

  return (
    <header data-app-topbar="" className={`u-topbar ${scrolled ? "is-scrolled" : ""} ${root ? "is-root" : ""}`}>
      <div className="u-topbar-row">
        <div className="u-topbar-start">
          {root ? (
            <UfuqBrand />
          ) : (
            <>
              <button
                type="button"
                className="u-icon-btn"
                aria-label="رجوع"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              >
                <ChevronRight size={22} aria-hidden="true" />
              </button>
              {/* Athar's mark on every page, not only the tabs' own. */}
              <UfuqBrand compact />
            </>
          )}
        </div>
        <div className="u-topbar-title">
          {root ? <DesignSwitch /> : title}
        </div>
        <div className="u-topbar-end">
          <UpdatePill />
          {/* «المتصدرون», quietly: a trophy on «اليوم», as games sit in a phone's own apps. */}
          {location.pathname === "/" ? (
            <NavLink to="/leaderboard" className="u-icon-btn" aria-label="المتصدرون">
              <Trophy size={19} aria-hidden="true" />
            </NavLink>
          ) : null}
          <button type="button" className="u-icon-btn" aria-label="بحث" onClick={onSearch}>
            <Search size={19} aria-hidden="true" />
          </button>
          <NavLink to="/settings" className="u-icon-btn" aria-label="الإعدادات">
            <Settings2 size={19} aria-hidden="true" />
          </NavLink>
        </div>
      </div>
    </header>
  );
}

function useRadio() {
  const [state, setState] = React.useState(getRadioState);
  React.useEffect(() => subscribeRadio(() => setState(getRadioState())), []);
  return state;
}

/** While the Quran radio plays, a small strip rides above the tab bar. */
function NowPlaying() {
  const radio = useRadio();
  const active = radio.playing || radio.loading;
  const station = radio.stations[radio.stationIdx]?.label ?? "راديو القرآن";
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="now-playing"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="u-now-playing"
          role="region"
          aria-label="راديو القرآن"
        >
          <span className="u-now-playing-icon" aria-hidden="true"><Radio size={15} /></span>
          <span className="u-now-playing-text">
            <b>راديو القرآن</b>
            <span>{radio.loading ? "جارٍ الاتصال…" : station}</span>
          </span>
          <button type="button" className="u-icon-btn" aria-label={radio.playing ? "إيقاف مؤقت" : "تشغيل"} onClick={() => toggleRadio()}>
            {radio.playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          </button>
          <button type="button" className="u-icon-btn" aria-label="إغلاق الراديو" onClick={() => stopRadio()}>
            <X size={17} aria-hidden="true" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function UfuqTabBar() {
  const location = useLocation();
  const hiddenByScroll = useHideOnScroll();
  const current = ufuqTabFor(location.pathname);
  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);
  const today = useTodayKey();
  const quranDue = Boolean(
    khatmaStartISO && khatmaDays && isKhatmaDateWithinPlan(today, khatmaStartISO, khatmaDays) && !khatmaDone?.[today],
  );
  const prevPath = React.useRef(location.pathname);
  React.useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      vibrate(6);
    }
  }, [location.pathname]);

  return (
    <div className={`u-tabbar-wrap ${hiddenByScroll ? "is-hidden" : ""}`}>
      <div className="u-tabbar-stack">
        <ListenMiniPlayer variant="ufuq" />
        <NowPlaying />
        <nav className="u-tabbar" aria-label="التنقل الرئيسي">
          {UFUQ_TABS.map((tab) => {
            const active = tab.id === current;
            const Icon = TAB_ICONS[tab.id];
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.path === "/"}
                className="u-tab"
                aria-current={active ? "page" : undefined}
                aria-label={tab.id === "quran" && quranDue ? `${tab.label} — ورد اليوم لم يكتمل` : tab.label}
                tabIndex={hiddenByScroll ? -1 : undefined}
              >
                {active ? (
                  <motion.span
                    layoutId="u-tab-pill"
                    className="u-tab-pill"
                    transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  />
                ) : null}
                <Icon active={active} size={23} />
                <span aria-hidden="true">{tab.label}</span>
                {tab.id === "quran" && quranDue && !active ? <span className="u-tab-dot" aria-hidden="true" /> : null}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function UfuqShell() {
  usePrefetchSearch();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const look = useNoorStore((s) => s.prefs.ufuqLook ?? "live");
  const garden = look !== "plain";

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => {
    const title = ufuqTitleFor(location.pathname);
    document.title = location.pathname === "/" ? "أثر" : `${title} — أثر`;
  }, [location.pathname]);

  return (
    <div className="u-frame">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-100 focus:px-4 focus:py-2 focus:rounded-full focus:bg-(--accent) focus:text-(--on-accent) focus:text-sm focus:font-semibold"
      >
        انتقل إلى المحتوى الرئيسي
      </a>
      {garden ? (
        <React.Suspense fallback={null}>
          <LiveGardenLazy />
        </React.Suspense>
      ) : (
        <div className="u-horizon" aria-hidden="true" />
      )}
      <OfflineBanner />
      {paletteOpen ? (
        <React.Suspense fallback={null}>
          <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
        </React.Suspense>
      ) : null}
      <UfuqTopBar onSearch={() => setPaletteOpen(true)} />
      <main id="main-content" tabIndex={-1} aria-label="المحتوى الرئيسي" className="u-main focus:outline-hidden">
        {/* The new page appears at once and fades in; it never waits for the old one to fade out. */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="route-page-wrapper"
          >
            <Outlet />
          </motion.div>
      </main>
      <React.Suspense fallback={null}>
        <QuickTasbeehFab variant="ufuq" />
      </React.Suspense>
      <UfuqTabBar />
    </div>
  );
}
