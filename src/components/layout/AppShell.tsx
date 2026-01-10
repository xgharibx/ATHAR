import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Search, Settings2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { NoorBackground } from "@/components/background/NoorBackground";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useNoorStore } from "@/store/noorStore";
import { cn, pct } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { CommandPalette } from "@/components/layout/CommandPalette";

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

function useSectionProgress(sectionId: string, targets: number[]) {
  const progress = useNoorStore((s) => s.progress);
  return React.useMemo(() => {
    let done = 0;
    let total = 0;
    targets.forEach((t, i) => {
      const key = `${sectionId}:${i}`;
      const c = progress[key] ?? 0;
      total += t;
      done += Math.min(c, t);
    });
    return { done, total, percent: pct(done, total) };
  }, [progress, sectionId, targets]);
}

function SidebarItem({ s, onNavigate }: { s: any; onNavigate?: () => void }) {
  const location = useLocation();
  const targets = React.useMemo(() => s.content.map((i: any) => i.count), [s.content]);
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

  if (!data) return null;
  const { db } = data;

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="px-4 pt-4">
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}logo.svg`}
                className="w-8 h-8 rounded-lg shadow-lg"
                alt="ATHAR"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div className="font-semibold text-lg tracking-wide">ATHAR</div>
            </div>
          </div>
          <div className="mt-2 text-xs opacity-70 leading-5">
            اترك أثراً طيباً
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

  const prefs = useNoorStore((s) => s.prefs);

  return (
    <div className="min-h-screen">
      <NoorBackground />

      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />

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
                <img
                  src={`${import.meta.env.BASE_URL}logo.svg`}
                  className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10"
                  alt="ATHAR"
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
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
