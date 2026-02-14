import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Search, Settings2, House, BookOpenText, Heart, LineChart, MoonStar, Trophy, ListChecks } from "lucide-react";

import { NoorBackground } from "@/components/background/NoorBackground";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { coerceCount } from "@/data/types";
import { useNoorStore } from "@/store/noorStore";
import { cn, pct } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { LogoMark } from "@/components/brand/LogoMark";

const CommandPalette = React.lazy(() =>
  import("@/components/layout/CommandPalette").then((m) => ({ default: m.CommandPalette }))
);

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

  return (
    <NavLink
      to={`/c/${s.id}`}
      onClick={onNavigate}
      className={cn(
        "group block w-full glass rounded-3xl px-4 py-3 border border-white/10 hover:bg-white/10 transition",
        isActive && "bg-white/10 border-white/16"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{s.title}</div>
          <div className="mt-1 text-xs opacity-60 tabular-nums">{s.content.length} ذكر</div>
        </div>
        <div className="text-xs opacity-65 tabular-nums">{percent}%</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
        <div className="h-full bg-[var(--accent)]/60" style={{ width: `${percent}%` }} />
      </div>
    </NavLink>
  );
}

function SidebarContent(props: { onNavigate?: () => void }) {
  const { data } = useAdhkarDB();
  const progress = useNoorStore((s) => s.progress);
  const activityToday = useNoorStore((s) => s.activity[todayISO()] ?? 0);

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

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="px-4 pt-4">
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoMark
                className="w-8 h-8 rounded-lg shadow-lg overflow-hidden border border-white/10"
                title="ATHAR"
              />
              <div className="font-semibold text-lg tracking-wide">ATHAR</div>
            </div>
          </div>
          <div className="mt-2 text-xs opacity-70 leading-5">
            اترك أثراً طيباً
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] opacity-75">
            <span>نشاط اليوم</span>
            <span className="tabular-nums">{activityToday}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/8 overflow-hidden border border-white/10">
            <div className="h-full bg-[var(--accent)]/70" style={{ width: `${smartSummary.percent}%` }} />
          </div>
          <div className="mt-1 text-[11px] opacity-65 tabular-nums">إنجاز عام: {smartSummary.percent}%</div>
        </div>
      </div>

      <div className="px-4">
        <div className="glass rounded-3xl p-3">
          <div className="text-xs opacity-70 mb-2 px-1">تنقل ذكي</div>
          <div className="grid grid-cols-2 gap-2">
            <NavLink to="/" onClick={props.onNavigate} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition">
              <House size={14} /> الرئيسية
            </NavLink>
            <NavLink to="/quran" onClick={props.onNavigate} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition">
              <BookOpenText size={14} /> القرآن
            </NavLink>
            <NavLink to="/favorites" onClick={props.onNavigate} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition">
              <Heart size={14} /> المفضلة
            </NavLink>
            <NavLink to="/insights" onClick={props.onNavigate} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition">
              <LineChart size={14} /> الإحصاءات
            </NavLink>
            <NavLink to="/ramadan" onClick={props.onNavigate} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition">
              <MoonStar size={14} /> رمضان
            </NavLink>
            <NavLink to="/leaderboard" onClick={props.onNavigate} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition">
              <Trophy size={14} /> المتصدرون
            </NavLink>
            <NavLink to="/missed" onClick={props.onNavigate} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition">
              <ListChecks size={14} /> قضاء
            </NavLink>
          </div>
        </div>
      </div>

      <div className="px-2">
        <div className="px-3 mb-2 text-sm font-semibold opacity-80">الأقسام</div>
        <div className="space-y-2 max-h-[calc(100vh-210px)] overflow-auto px-2 pb-4">
          {db.sections.map((s) => (
            <SidebarItem key={s.id} s={s} onNavigate={props.onNavigate} />
          ))}
        </div>
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
    <div className="min-h-screen">
      <NoorBackground />

      {paletteOpen ? (
        <React.Suspense fallback={null}>
          <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
        </React.Suspense>
      ) : null}

      {/* Top Bar */}
      <header className="sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-4 pt-3">
          <div className="glass rounded-3xl px-3 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Mobile menu */}
              <div className="xl:hidden">
                <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <Dialog.Trigger asChild>
                    <IconButton aria-label="القائمة">
                      <Menu size={18} />
                    </IconButton>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
                    <Dialog.Content className="fixed z-50 top-3 bottom-3 right-3 w-[86vw] max-w-sm outline-none">
                      <div className="glass-strong rounded-3xl h-full overflow-hidden">
                        <SidebarContent onNavigate={() => setDrawerOpen(false)} />
                      </div>
                    </Dialog.Content>
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
              <IconButton aria-label="بحث" onClick={() => setPaletteOpen(true)}>
                <Search size={18} />
              </IconButton>

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
      <div className="mx-auto max-w-[1400px] px-4 pb-10">
        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* Desktop Sidebar */}
          <aside className="hidden xl:block col-span-3 2xl:col-span-2">
            <div className="glass-strong rounded-3xl h-[calc(100vh-120px)] sticky top-[96px] overflow-hidden">
              <SidebarContent />
            </div>
          </aside>

          {/* Main */}
          <main className="col-span-12 xl:col-span-9 2xl:col-span-10">
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
