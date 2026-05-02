import * as React from "react";
import { Command } from "cmdk";
import { Search, Moon, Sun, Sparkles, Download, BookOpen, LibraryBig } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import toast from "react-hot-toast";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useQuranDB } from "@/data/useQuranDB";
import { useIslamicLibraryDB } from "@/data/useIslamicLibraryDB";
import { useNoorStore } from "@/store/noorStore";
import type { NoorTheme } from "@/store/noorStore";
import type { FlatDhikr } from "@/data/types";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { downloadJson } from "@/lib/download";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

export function CommandPalette(props: Props) {
  const navigate = useNavigate();
  const { data } = useAdhkarDB();
  const { data: quranData } = useQuranDB();
  const { data: libraryData } = useIslamicLibraryDB();
  const theme = useNoorStore((s) => s.prefs.theme);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const exportState = useNoorStore((s) => s.exportState);
  const quranLastRead = useNoorStore((s) => s.quranLastRead);

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

  // Quran surah fuzzy search index
  const surahFuse = React.useMemo(() => {
    if (!quranData) return null;
    return new Fuse(quranData, {
      includeScore: true,
      threshold: 0.35,
      keys: ["name", "englishName", "id"],
    });
  }, [quranData]);

  // De10: Ayah-level search — normalize Arabic to strip diacritics + alef variants for matching
  const normalizeArabic = React.useCallback((text: string) =>
    text
      .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06EF\u0670]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي"),
  []);

  const ayahIndex = React.useMemo(() => {
    if (!quranData) return [] as Array<{ surahId: number; surahName: string; ayahIndex: number; text: string; normalized: string }>;
    const arr: Array<{ surahId: number; surahName: string; ayahIndex: number; text: string; normalized: string }> = [];
    for (const surah of quranData) {
      for (let i = 0; i < surah.ayahs.length; i++) {
        const text = surah.ayahs[i] as string;
        arr.push({ surahId: surah.id, surahName: surah.name, ayahIndex: i + 1, text, normalized: normalizeArabic(text) });
      }
    }
    return arr;
  }, [quranData, normalizeArabic]);

  const ayahFuse = React.useMemo(() => {
    if (!ayahIndex.length) return null;
    return new Fuse(ayahIndex, {
      includeScore: true,
      threshold: 0.3,
      keys: ["normalized"],
      minMatchCharLength: 3,
    });
  }, [ayahIndex]);

  const libraryFuse = React.useMemo(() => {
    if (!libraryData) return null;
    return new Fuse(libraryData.flat, {
      includeScore: true,
      threshold: 0.34,
      keys: ["searchText", "arabic", "title", "narrator", "tags", "collectionTitle"],
      minMatchCharLength: 2,
    });
  }, [libraryData]);

  const ayahResults = React.useMemo(() => {
    if (!ayahFuse || query.trim().length < 3) return [] as typeof ayahIndex;
    return ayahFuse.search(normalizeArabic(query)).slice(0, 6).map((r) => r.item);
  }, [ayahFuse, query, normalizeArabic]);

  const libraryResults = React.useMemo(() => {
    if (!libraryFuse || query.trim().length < 2) return [];
    return libraryFuse.search(normalizeArabic(query)).slice(0, 8).map((r) => r.item);
  }, [libraryFuse, normalizeArabic, query]);

  const surahResults = React.useMemo(() => {
    if (!surahFuse || !query.trim()) return [] as NonNullable<typeof quranData>;
    return surahFuse.search(query).slice(0, 8).map((r) => r.item);
  }, [surahFuse, query]);

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

  const ALL_THEMES: NoorTheme[] = ["roses", "noor", "sapphire", "violet", "sunset", "forest", "midnight", "bees", "mist", "dark", "light", "system"];

  const cycleTheme = () => {
    const idx = ALL_THEMES.indexOf(theme);
    const next = ALL_THEMES[(idx + 1) % ALL_THEMES.length] ?? "dark";
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
                placeholder="ابحث عن ذكر أو سورة أو آية…"
                className="w-full bg-transparent outline-none text-sm placeholder:text-white/45"
              />
              <kbd className="text-[11px] opacity-40 pointer-events-none shrink-0 font-mono border border-white/10 rounded-md px-1.5 py-0.5">Ctrl+K</kbd>
              <kbd className="text-[11px] opacity-40 pointer-events-none shrink-0 font-mono border border-white/10 rounded-md px-1.5 py-0.5">esc</kbd>
            </div>

            <Command.List className="max-h-[60vh] overflow-auto py-2">
              <Command.Empty className="px-4 py-6 text-sm opacity-70">
                لا توجد نتائج.
              </Command.Empty>

              <Command.Group heading="الصفحات" className="px-2">
                <Item onSelect={() => go("/")} icon={<span className="text-base">🏠</span>}>الرئيسية</Item>
                <Item onSelect={() => go("/quran")} icon={<span className="text-base">📖</span>}>المصحف</Item>
                <Item onSelect={() => go("/library")} icon={<LibraryBig size={16} />}>المكتبة الإسلامية</Item>
                <Item onSelect={() => go("/search")} icon={<span className="text-base">🔍</span>}>البحث</Item>
                <Item onSelect={() => go("/favorites")} icon={<span className="text-base">❤️</span>}>المفضلة</Item>
                <Item onSelect={() => go("/insights")} icon={<span className="text-base">📊</span>}>الإحصاءات</Item>
                <Item onSelect={() => go("/leaderboard")} icon={<span className="text-base">🏆</span>}>المتصدرون</Item>
                <Item onSelect={() => go("/settings")} icon={<span className="text-base">⚙️</span>}>الإعدادات</Item>
              </Command.Group>

              <Command.Separator className="h-px bg-white/10 my-2" />
              <Command.Group heading="محتوى وأدلة" className="px-2">
                <Item onSelect={() => go("/asma")} icon={<span className="text-base">✨</span>}>أسماء الله الحسنى</Item>
                <Item onSelect={() => go("/duas")} icon={<span className="text-base">🤲</span>}>الأدعية المأثورة</Item>
                <Item onSelect={() => go("/library")} icon={<span className="text-base">📚</span>}>صحيح مسلم والجوامع</Item>
                <Item onSelect={() => go("/quran-vocab")} icon={<span className="text-base">📖</span>}>مفردات القرآن</Item>
                <Item onSelect={() => go("/stories")} icon={<span className="text-base">🕌</span>}>قصص الأنبياء</Item>
                <Item onSelect={() => go("/prayer-guide")} icon={<span className="text-base">🧎</span>}>كيفية الصلاة</Item>
                <Item onSelect={() => go("/wudu")} icon={<span className="text-base">💧</span>}>كيفية الوضوء</Item>
              </Command.Group>

              <Command.Separator className="h-px bg-white/10 my-2" />
              <Command.Group heading="روابط إضافية" className="px-2">
                <Item onSelect={() => go("/sources")}>المصادر والبيانات</Item>
              </Command.Group>

              <Command.Separator className="h-px bg-white/10 my-2" />

              <Command.Group heading="أوامر سريعة" className="px-2">
                <Item
                  onSelect={() => {
                    cycleTheme();
                    props.setOpen(false);
                  }}
                  icon={
                    theme === "dark" ? <Moon size={16} /> : theme === "light" ? <Sun size={16} /> : <Sparkles size={16} />
                  }
                >
                  تبديل المظهر (الحالي: {themeLabel(theme)})
                </Item>
                <Item
                  onSelect={() => {
                    const blob = exportState();
                    downloadJson(`ATHAR-نسخة-احتياطية-${blob.exportedAt.slice(0, 10)}.athar`, blob);
                    toast.success("تم تنزيل النسخة الاحتياطية");
                    props.setOpen(false);
                  }}
                  icon={<Download size={16} />}
                >
                  نسخ احتياطي سريع
                </Item>
                {quranLastRead && (
                  <Item
                    onSelect={() => go(`/mushaf?surah=${quranLastRead.surahId}&ayah=${quranLastRead.ayahIndex}`)}
                    icon={<BookOpen size={16} />}
                  >
                    تابع قراءة القرآن (آية {quranLastRead.ayahIndex} من سورة {quranLastRead.surahId})
                  </Item>
                )}
              </Command.Group>

              {data?.db?.sections?.length ? (
                <>
                  <Command.Separator className="h-px bg-white/10 my-2" />
                  <Command.Group heading="الأقسام" className="px-2">
                    {data.db.sections.slice(0, 12).map((s) => {
                      const identity = getSectionIdentity(s.id);
                      return (
                        <Item key={s.id} onSelect={() => go(`/c/${s.id}`)} icon={<span className="text-base">{identity.icon}</span>}>
                          {s.title}
                        </Item>
                      );
                    })}
                  </Command.Group>
                </>
              ) : null}

              {surahResults.length ? (
                <>
                  <Command.Separator className="h-px bg-white/10 my-2" />
                  <Command.Group heading="السور" className="px-2">
                    {surahResults.map((s) => (
                      <Item key={s.id} onSelect={() => go(`/mushaf?surah=${s.id}`)} icon={<span className="text-base">📖</span>}>
                        <span className="arabic-text">{s.name}</span>
                        {s.englishName ? (
                          <span className="text-[11px] opacity-55 block mt-0.5">{s.englishName} • {s.id}</span>
                        ) : (
                          <span className="text-[11px] opacity-55 block mt-0.5">{s.id}</span>
                        )}
                      </Item>
                    ))}
                  </Command.Group>
                </>
              ) : null}

              {ayahResults.length ? (
                <>
                  <Command.Separator className="h-px bg-white/10 my-2" />
                  <Command.Group heading="آيات قرآنية" className="px-2">
                    {ayahResults.map((a) => (
                      <Item key={`${a.surahId}:${a.ayahIndex}`} onSelect={() => go(`/mushaf?surah=${a.surahId}&ayah=${a.ayahIndex}`)} icon={<span className="text-base">🌙</span>}>
                        <span className="text-[11px] opacity-55 block">{a.surahName} • آية {a.ayahIndex}</span>
                        <span className="text-sm arabic-text line-clamp-2">{a.text.slice(0, 120)}</span>
                      </Item>
                    ))}
                  </Command.Group>
                </>
              ) : null}

              {libraryResults.length ? (
                <>
                  <Command.Separator className="h-px bg-white/10 my-2" />
                  <Command.Group heading="نتائج داخل المكتبة" className="px-2">
                    {libraryResults.map((entry) => (
                      <Item key={entry.key} onSelect={() => go(`/library/${entry.collectionId}/${entry.id}`)} icon={<span className="text-base">{entry.collectionIcon}</span>}>
                        <span className="text-sm">{entry.collectionTitle} • {entry.title}</span>
                        <span className="text-[11px] opacity-60 block mt-1 line-clamp-2 arabic-text">
                          {entry.arabic.slice(0, 140)}
                        </span>
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
      className="flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm cursor-pointer select-none data-[selected=true]:bg-[var(--accent)]/12 data-[selected=true]:text-[var(--accent)] min-h-[44px]"
    >
      <span className="mt-0.5 opacity-70">{props.icon}</span>
      <div className="min-w-0">{props.children}</div>
    </Command.Item>
  );
}
