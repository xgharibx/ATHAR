import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Search, Settings2, House, BookOpenText, Heart, LineChart, Trophy, X, ChevronLeft } from "lucide-react";

import { NoorBackground } from "@/components/background/NoorBackground";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { coerceCount } from "@/data/types";
import { useNoorStore } from "@/store/noorStore";
import { cn, pct } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { LogoMark } from "@/components/brand/LogoMark";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { KeyboardShortcutsDialog } from "@/components/ui/KeyboardShortcutsDialog";

const CommandPalette = React.lazy(() =>
  import("@/components/layout/CommandPalette").then((m) => ({ default: m.CommandPalette }))
);

const QuickTasbeehFab = React.lazy(() =>
  import("@/components/layout/QuickTasbeehFab").then((m) => ({ default: m.QuickTasbeehFab }))
);

/* -------------------------------------------------- */
/*  Swipe-to-dismiss bottom sheet wrapper              */
/* -------------------------------------------------- */
function BottomSheetContent({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef({ startY: 0, currentY: 0, active: false });

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    // Only activate drag from the top 72px (pill handle zone)
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touchY = e.touches[0].clientY;
    if (touchY - rect.top > 72) return;
    dragRef.current = { startY: touchY, currentY: touchY, active: true };
  }, []);

  const onTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.active || !sheetRef.current) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dy < 0) return; // don't drag up
    dragRef.current.currentY = e.touches[0].clientY;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
    sheetRef.current.style.transition = "none";
  }, []);

  const onTouchEnd = React.useCallback(() => {
    if (!dragRef.current.active || !sheetRef.current) return;
    dragRef.current.active = false;
    const dy = dragRef.current.currentY - dragRef.current.startY;

    if (dy > 120) {
      // Dismiss: animate out then close
      sheetRef.current.style.transition = "transform 280ms cubic-bezier(.4,0,1,1)";
      sheetRef.current.style.transform = "translateY(100%)";
      setTimeout(onClose, 260);
    } else {
      // Spring back
      sheetRef.current.style.transition = "transform 300ms cubic-bezier(.16,1,.3,1)";
      sheetRef.current.style.transform = "translateY(0)";
    }
  }, [onClose]);

  return (
    <Dialog.Content
      className="fixed z-50 inset-x-0 bottom-0 outline-none drawer-content-enter"
      style={{ maxHeight: "92dvh", paddingBottom: "var(--sab)" }}
    >
      <Dialog.Title className="sr-only">القائمة الرئيسية</Dialog.Title>
      <div
        ref={sheetRef}
        className="glass-strong rounded-t-[28px] h-full overflow-auto overscroll-contain border-t border-white/12 shadow-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </Dialog.Content>
  );
}

const APP_FOOTER_TEXT = `هذا البرنامج صدقة جارية عني، وعن والديّ وجدتي وإخوتي وأهلي، وعن كل من أحببته في الله وأحبني فيه، وعن من كرهني لسبب أو بدون، وعن من آذاني أو آذيته.

وصدقةٌ عن كل من رأته عيني وإن كنت لا أعرفه، وعن كل عاصٍ لعل الله يهديه، وعن كل صالحٍ حتى يلقى الله، وعن كل ميتٍ نُسي تحت التراب، وعن كل حيٍ نسي أنه سيصير إلى التراب.

وصدقةٌ عن كل من شارك في هذا العمل بأي طريقة، وعن كل من اقتبستُ منه فكرةً أو محتوى، وللمسلمين والمسلمات والمؤمنين والمؤمنات الأحياء منهم والأموات.

وأُشهد الله أني قد عفوت وسامحت عن ما مضى وما هو آت، طمعاً في أن يعفو الله عني.`;

let appShellMountedCount = 0;
const DUP_SHELL_LOG_KEY = "noor_diag_dup_shell_events";
const DUP_SHELL_LAST_KEY = "noor_diag_dup_shell_last";

function recordDuplicateShellEvent(pathname: string, count: number) {
  try {
    const event = {
      at: new Date().toISOString(),
      path: pathname,
      count,
      ua: navigator.userAgent
    };

    localStorage.setItem(DUP_SHELL_LAST_KEY, JSON.stringify(event));

    const raw = localStorage.getItem(DUP_SHELL_LOG_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(prev) ? [...prev, event].slice(-20) : [event];
    localStorage.setItem(DUP_SHELL_LOG_KEY, JSON.stringify(next));

    sessionStorage.setItem("noor_dup_shell_seen", "1");
  } catch {
    // ignore diagnostics failures
  }
}

function themeLabel(theme: string) {
  const map: Record<string, string> = {
    system: "تلقائي",
    dark: "داكن",
    light: "فاتح",
    noor: "نور",
    midnight: "ليلي",
    forest: "غابة",
    bees: "نحل",
    roses: "زهور",
    sapphire: "ياقوت",
    violet: "بنفسجي",
    sunset: "غروب",
    mist: "ضباب"
  };
  return map[theme] ?? "تلقائي";
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function useSectionProgress(sectionId: string, targets: number[]) {
  const progress = useNoorStore((s) => s.progress);
  return React.useMemo(() => {
    let done = 0;
    let total = 0;
    targets.forEach((t, i) => {
      const key = `${sectionId}:${i}`;
      const target = Math.max(0, Number(t) || 0);
      const c = Math.max(0, Number(progress[key]) || 0);
      total += target;
      done += Math.min(c, target);
    });
    return { done, total, percent: pct(done, total) };
  }, [progress, sectionId, targets]);
}

function SidebarItem({ s, onNavigate }: { s: any; onNavigate?: () => void }) {
  const location = useLocation();
  const targets = React.useMemo(() => s.content.map((i: any) => coerceCount(i.count)), [s.content]);
  const { percent } = useSectionProgress(s.id, targets);
  const isActive = location.pathname === `/c/${s.id}`;
  const identity = React.useMemo(() => getSectionIdentity(s.id), [s.id]);

  return (
    <NavLink
      to={`/c/${s.id}`}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 w-full rounded-2xl px-3.5 py-3 transition-all active:scale-[.97]",
        isActive
          ? "bg-[var(--accent)]/10 border border-[var(--accent)]/25"
          : "hover:bg-white/6 border border-transparent"
      )}
    >
      {/* Icon badge */}
      <div
        className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-lg"
        style={{ background: `${identity.accent}18` }}
      >
        {identity.icon}
      </div>

      {/* Title + progress */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{s.title}</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${percent}%`, background: identity.accent }}
            />
          </div>
          <span className="text-[11px] opacity-55 tabular-nums shrink-0">{percent}%</span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronLeft size={14} className="opacity-30 shrink-0" />
    </NavLink>
  );
}

function SidebarContent(props: { onNavigate?: () => void }) {
  const { data } = useAdhkarDB();
  const progress = useNoorStore((s) => s.progress);
  const activityToday = useNoorStore((s) => s.activity[todayISO()] ?? 0);
  const navigate = React.useMemo(() => {
    // We need navigation from this component; wrap onNavigate
    return (path: string) => {
      props.onNavigate?.();
      // Use programmatic nav via the link click instead
    };
  }, [props.onNavigate]);

  const smartSummary = React.useMemo(() => {
    if (!data) return { percent: 0, done: 0, total: 0 };

    const { db } = data;
    let done = 0;
    let total = 0;

    for (const s of db.sections) {
      for (let i = 0; i < s.content.length; i++) {
        const target = coerceCount(s.content[i]?.count);
        const key = `${s.id}:${i}`;
        const current = Math.min(Math.max(0, Number(progress[key]) || 0), target);
        total += target;
        done += current;
      }
    }

    return { percent: pct(done, total), done, total };
  }, [data, progress]);

  if (!data) return null;
  const { db } = data;

  const NAV_LINKS = [
    { path: "/", icon: House, label: "الرئيسية", color: "#ffd780" },
    { path: "/quran", icon: BookOpenText, label: "القرآن الكريم", color: "#9ae6ff" },
    { path: "/search", icon: Search, label: "البحث", color: "#e879f9" },
    { path: "/favorites", icon: Heart, label: "المفضلة", color: "#fb7185" },
    { path: "/insights", icon: LineChart, label: "الإحصاءات", color: "#3ddc97" },
    { path: "/leaderboard", icon: Trophy, label: "المتصدرون", color: "#f59e0b" },
    { path: "/settings", icon: Settings2, label: "الإعدادات", color: "#a78bfa" },
  ];

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Pill handle (mobile bottom-sheet style) */}
      <div className="flex justify-center pt-3 pb-1 xl:hidden">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Profile-like header */}
      <div className="px-5 pt-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/15 shadow-lg">
            <LogoMark className="w-full h-full" title="ATHAR" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base">ATHAR</div>
            <div className="text-[11px] opacity-55 mt-0.5">اترك أثراً طيباً</div>
          </div>
          <button
            onClick={props.onNavigate}
            className="xl:hidden w-11 h-11 rounded-xl bg-white/8 grid place-items-center transition hover:bg-white/12 active:scale-90"
            aria-label="إغلاق"
          >
            <X size={16} className="opacity-60" />
          </button>
        </div>

        {/* Today's stats strip */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 rounded-xl bg-white/6 px-3 py-2 border border-white/8">
            <div className="text-[11px] opacity-55 uppercase tracking-wider">نشاط اليوم</div>
            <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: "var(--accent)" }}>{activityToday}</div>
          </div>
          <div className="flex-1 rounded-xl bg-white/6 px-3 py-2 border border-white/8">
            <div className="text-[11px] opacity-55 uppercase tracking-wider">الإنجاز</div>
            <div className="text-sm font-bold tabular-nums mt-0.5" style={{ color: smartSummary.percent >= 100 ? "var(--ok)" : "var(--accent)" }}>{smartSummary.percent}%</div>
          </div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full progress-accent" style={{ width: `${smartSummary.percent}%` }} />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-5 bg-white/8" />

      {/* Main navigation links */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              onClick={props.onNavigate}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 border transition active:scale-[.94]",
                isActive
                  ? "bg-[var(--accent)]/12 border-[var(--accent)]/30"
                  : "bg-white/4 border-white/6 hover:bg-white/8"
              )}
            >
              <div
                className="w-9 h-9 rounded-xl grid place-items-center"
                style={{ background: `${link.color}18` }}
              >
                <link.icon size={17} style={{ color: link.color }} />
              </div>
              <span className="text-[11px] font-medium opacity-70">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-5 bg-white/8" />

      {/* Sections list */}
      <div className="px-3 pt-3 pb-2">
        <div className="px-2 mb-2 text-[11px] font-semibold opacity-45 uppercase tracking-wider">الأقسام</div>
      </div>
      <div className="flex-1 overflow-auto overscroll-contain px-3 pb-6 space-y-1 drawer-stagger" style={{ maxHeight: "calc(100dvh - 400px)" }}>
        {db.sections.map((s) => (
          <SidebarItem key={s.id} s={s} onNavigate={props.onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [isPrimaryShell, setIsPrimaryShell] = React.useState(true);

  const prefs = useNoorStore((s) => s.prefs);

  // Global keyboard shortcut: Ctrl+K or Cmd+K opens CommandPalette
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // G+key navigation shortcuts (press G then H/Q/F/I/S within 1.5s)
  React.useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "g" || e.key === "G") {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1500);
        return;
      }
      if (!gPressed) return;
      gPressed = false;
      if (gTimer) clearTimeout(gTimer);
      const map: Record<string, string> = { h: "/", q: "/quran", f: "/favorites", i: "/insights", s: "/settings" };
      const target = map[e.key.toLowerCase()];
      if (target) {
        e.preventDefault();
        window.location.hash = "";
        // Use pushState to navigate
        window.history.pushState({}, "", target);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => {
    appShellMountedCount += 1;
    if (appShellMountedCount > 1) {
      console.warn("Detected duplicate AppShell mount; hiding extra instance");
      recordDuplicateShellEvent(location.pathname, appShellMountedCount);
      setIsPrimaryShell(false);
    }

    return () => {
      appShellMountedCount = Math.max(0, appShellMountedCount - 1);
    };
  }, [location.pathname]);

  if (!isPrimaryShell) return null;

  return (
    <div className="min-h-screen-safe">
      {/* Skip to main content — keyboard/screen reader a11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:glass-strong focus:border focus:border-white/20 focus:text-sm focus:font-semibold"
        tabIndex={0}
      >
        انتقل إلى المحتوى الرئيسي
      </a>

      <NoorBackground />
      <OfflineBanner />

      {paletteOpen ? (
        <React.Suspense fallback={null}>
          <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
        </React.Suspense>
      ) : null}

      {/* Floating bottom navigation for mobile */}
      <FloatingNav />

      {/* Floating quick tasbeeh FAB */}
      <React.Suspense fallback={null}>
        <QuickTasbeehFab />
      </React.Suspense>

      {/* Top Bar */}
      <header className="sticky top-0 z-30" style={{ paddingTop: "var(--sat)" }}>
        <div className="mx-auto max-w-[1400px] px-4 pt-3">
          <div className="glass rounded-3xl px-3 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Mobile menu */}
              <div className="xl:hidden">
                <Dialog.Root open={drawerOpen} onOpenChange={(open) => {
                  setDrawerOpen(open);
                  if (open && navigator.vibrate) navigator.vibrate(10);
                }}>
                  <Dialog.Trigger asChild>
                    <IconButton aria-label="القائمة">
                      <Menu size={18} />
                    </IconButton>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 drawer-overlay-enter" />
                    <BottomSheetContent onClose={() => setDrawerOpen(false)}>
                      <SidebarContent onNavigate={() => setDrawerOpen(false)} />
                    </BottomSheetContent>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>

              <NavLink to="/" className="flex items-center gap-2">
                <LogoMark
                  className="w-9 h-9 rounded-2xl border border-white/10 overflow-hidden"
                  title="ATHAR"
                />
                <div className="leading-tight">
                  <div className="font-semibold">ATHAR</div>
                  <div className="text-[11px] opacity-65">أذكار • صلاة</div>
                </div>
              </NavLink>
            </div>

            <div className="flex items-center gap-2">
              <IconButton aria-label="بحث (Ctrl+K)" onClick={() => setPaletteOpen(true)}>
                <Search size={18} />
              </IconButton>

              <KeyboardShortcutsDialog />

              <NavLink to="/settings" className="inline-flex">
                <IconButton aria-label="الإعدادات">
                  <Settings2 size={18} />
                </IconButton>
              </NavLink>

              <div className="hidden md:flex items-center gap-2 text-xs opacity-70">
                <span className="px-3 py-2 rounded-2xl bg-white/6 border border-white/10">
                  {`المظهر: ${themeLabel(prefs.theme)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-[1400px] px-4 pb-floating-nav" style={{ paddingBottom: "calc(2.5rem + var(--sab))" }}>
        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* Desktop Sidebar */}
          <aside className="hidden xl:block col-span-3 2xl:col-span-2">
            <div className="glass-strong rounded-3xl sticky top-[96px] overflow-hidden" style={{ height: "calc(100dvh - 120px)" }}>
              <SidebarContent />
            </div>
          </aside>

          {/* Main */}
          <main id="main-content" className="col-span-12 xl:col-span-9 2xl:col-span-10">
            <div key={location.pathname}>
              <Outlet />
            </div>
          </main>
        </div>

        <footer className="mt-6" dir="rtl">
          <div className="glass rounded-3xl p-5 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center">
                <div className="arabic-text text-[15px] md:text-base font-semibold text-[var(--accent)]">
                  صدقة جارية
                </div>
                <div className="mt-3 h-px bg-white/10" />
              </div>

              <div className="mt-4 arabic-text text-center text-[13px] md:text-sm leading-7 md:leading-8 tracking-tight opacity-85 whitespace-pre-line">
                {APP_FOOTER_TEXT}
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
