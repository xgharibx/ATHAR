import * as React from "react";
import { Command } from "cmdk";
import { Search, Moon, Sun, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useNoorStore } from "@/store/noorStore";
import type { NoorTheme } from "@/store/noorStore";
import type { FlatDhikr } from "@/data/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

export function CommandPalette(props: Props) {
  const navigate = useNavigate();
  const { data } = useAdhkarDB();
  const theme = useNoorStore((s) => s.prefs.theme);
  const setPrefs = useNoorStore((s) => s.setPrefs);

  const themeLabel = (t: NoorTheme) => {
    const map: Record<NoorTheme, string> = {
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
    return map[t] ?? "تلقائي";
  };

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<FlatDhikr[]>([]);

  const fuse = React.useMemo(() => {
    if (!data) return null;
    return new Fuse(data.flat, {
      includeScore: true,
      threshold: 0.35,
      keys: ["text", "sectionTitle", "sectionId"]
    });
  }, [data]);

  React.useEffect(() => {
    if (!props.open) setQuery("");
  }, [props.open]);

  React.useEffect(() => {
    if (!fuse || !query.trim()) {
      setResults([]);
      return;
    }
    const out = fuse.search(query).slice(0, 12).map((r) => r.item);
    setResults(out);
  }, [fuse, query]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        props.setOpen(!props.open);
      }
      if (e.key === "Escape") props.setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  const go = (path: string) => {
    navigate(path);
    props.setOpen(false);
  };

  const toggleTheme = () => {
    const next =
      theme === "dark" ? "light" : theme === "light" ? "noor" : theme === "noor" ? "system" : "dark";
    setPrefs({ theme: next });
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] transition pointer-events-none",
        props.open && "pointer-events-auto"
      )}
    >
      {/* Overlay */}
      <div
        className={cn("absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0", props.open && "opacity-100")}
        onClick={() => props.setOpen(false)}
      />

      {/* Panel */}
      <div className={cn("absolute left-1/2 top-14 -translate-x-1/2 w-[92vw] max-w-2xl opacity-0 scale-[.98] transition", props.open && "opacity-100 scale-100")}>
        <div className="glass-strong rounded-3xl overflow-hidden border border-white/10">
          <Command className="w-full">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <Search size={18} className="opacity-70" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="ابحث عن ذكر أو قسم…"
                className="w-full bg-transparent outline-none text-sm placeholder:text-white/45"
              />
            </div>

            <Command.List className="max-h-[60vh] overflow-auto py-2">
              <Command.Empty className="px-4 py-6 text-sm opacity-70">
                لا توجد نتائج.
              </Command.Empty>

              <Command.Group heading="الصفحات" className="px-2">
                <Item onSelect={() => go("/")}>الرئيسية</Item>
                <Item onSelect={() => go("/quran")}>المصحف</Item>
                <Item onSelect={() => go("/favorites")}>المفضلة</Item>
                <Item onSelect={() => go("/settings")}>الإعدادات</Item>
                <Item onSelect={() => go("/sources")}>المصادر</Item>
              </Command.Group>

              <Command.Separator className="h-px bg-white/10 my-2" />

              <Command.Group heading="أوامر سريعة" className="px-2">
                <Item
                  onSelect={() => {
                    toggleTheme();
                    props.setOpen(false);
                  }}
                  icon={
                    theme === "dark" ? <Moon size={16} /> : theme === "light" ? <Sun size={16} /> : <Sparkles size={16} />
                  }
                >
                  تبديل المظهر (الحالي: {themeLabel(theme)})
                </Item>
              </Command.Group>

              {data?.db?.sections?.length ? (
                <>
                  <Command.Separator className="h-px bg-white/10 my-2" />
                  <Command.Group heading="الأقسام" className="px-2">
                    {data.db.sections.slice(0, 12).map((s) => (
                      <Item key={s.id} onSelect={() => go(`/c/${s.id}`)}>
                        {s.title}
                      </Item>
                    ))}
                  </Command.Group>
                </>
              ) : null}

              {results.length ? (
                <>
                  <Command.Separator className="h-px bg-white/10 my-2" />
                  <Command.Group heading="نتائج داخل الأذكار" className="px-2">
                    {results.map((r) => (
                      <Item key={r.key} onSelect={() => go(`/c/${r.sectionId}?focus=${r.index}`)}>
                        <span className="text-sm">{r.sectionTitle}</span>
                        <span className="text-[11px] opacity-60 block mt-1 line-clamp-2">
                          {r.text.slice(0, 140)}
                        </span>
                      </Item>
                    ))}
                  </Command.Group>
                </>
              ) : null}
            </Command.List>
          </Command>
        </div>
      </div>
    </div>
  );
}

function Item(props: { children: React.ReactNode; onSelect: () => void; icon?: React.ReactNode }) {
  return (
    <Command.Item
      onSelect={props.onSelect}
      className="flex items-start gap-2 rounded-2xl px-3 py-2 text-sm cursor-pointer select-none data-[selected=true]:bg-white/10"
    >
      <span className="mt-0.5 opacity-70">{props.icon}</span>
      <div className="min-w-0">{props.children}</div>
    </Command.Item>
  );
}
