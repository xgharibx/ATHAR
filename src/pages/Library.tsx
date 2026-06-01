import * as React from "react";
import Fuse from "fuse.js";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpenText, Check, Copy, ExternalLink, Heart, Library, Search, Share2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useIslamicLibraryDB } from "@/data/useIslamicLibraryDB";
import type { FlatLibraryEntry, LibraryCollection } from "@/data/libraryTypes";
import { HADITH_BOOKS_STATIC } from "@/data/hadithTypes";
import { useNoorStore } from "@/store/noorStore";
import { cn } from "@/lib/utils";
import { stripDiacritics } from "@/lib/arabic";

const GRADE_LABELS: Record<string, string> = {
  agreed: "متفق عليه",
  sahih: "صحيح",
  hasan: "حسن",
  curated: "تحريري",
};

function entryPreview(entry: FlatLibraryEntry) {
  return entry.arabic.length > 230 ? `${entry.arabic.slice(0, 230)}…` : entry.arabic;
}

async function copyEntry(entry: FlatLibraryEntry) {
  await navigator.clipboard.writeText(`${entry.arabic}\n\n${entry.source.title}${entry.narrator ? ` — ${entry.narrator}` : ""}`);
}

function LibraryEntryCard({ entry }: { entry: FlatLibraryEntry }) {
  const navigate = useNavigate();
  const favorite = useNoorStore((s) => !!s.libraryFavorites[entry.key]);
  const toggleLibraryFavorite = useNoorStore((s) => s.toggleLibraryFavorite);
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current); }, []);

  const onCopy = async () => {
    try {
      await copyEntry(entry);
      setCopied(true);
      toast.success("تم النسخ");
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const onShare = async () => {
    const text = `${entry.arabic}\n\n${entry.source.title}`;
    try {
      if (navigator.share) await navigator.share({ title: entry.title, text });
      else await navigator.clipboard.writeText(text);
      toast.success("جاهز للمشاركة");
    } catch {
      toast.error("تعذرت المشاركة");
    }
  };

  return (
    <Card className="p-4 overflow-hidden relative">
      <div
        className="absolute inset-y-0 right-0 w-1.5 opacity-80"
        style={{ background: entry.collectionAccent }}
      />
      <div className="flex items-start justify-between gap-3">
        <button type="button"
          onClick={() => navigate(`/library/${entry.collectionId}/${entry.id}`)}
          className="min-w-0 flex-1 text-right"
        >
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-base">{entry.collectionIcon}</span>
            <span className="text-xs font-semibold" style={{ color: entry.collectionAccent }}>{entry.collectionTitle}</span>
            <Badge className="px-2 py-0.5 text-[10px]">{entry.chapterTitle}</Badge>
            <Badge className="px-2 py-0.5 text-[10px]">{GRADE_LABELS[entry.grade] ?? entry.grade}</Badge>
          </div>
          <div className="text-sm font-semibold opacity-75 mb-2 arabic-text">{entry.title}</div>
          <div className="arabic-text text-base md:text-lg leading-9 font-medium text-right">{entryPreview(entry)}</div>
        </button>
        <ArrowUpRight size={17} className="opacity-45 shrink-0 mt-1" aria-hidden="true" />
      </div>

      <div className="mt-3 border-t border-[var(--stroke)] pt-3 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs opacity-65">
          <span>{entry.narrator || "فائدة محررة"}</span>
          <span className="font-semibold">{entry.source.title}</span>
        </div>
        {entry.benefits[0] && <div className="text-xs opacity-60 leading-6 line-clamp-2">{entry.benefits[0]}</div>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {entry.tags.slice(0, 3).map((tag) => <Badge key={tag} className="px-2 py-0.5 text-[10px]">{tag}</Badge>)}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <IconButton aria-label="نسخ" onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}</IconButton>
            <IconButton aria-label="مفضلة" aria-pressed={favorite} onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>
              <Heart size={15} aria-hidden="true" className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />
            </IconButton>
            <IconButton aria-label="مشاركة" onClick={onShare}><Share2 size={15} /></IconButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CollectionCard({ collection, active, onClick }: { collection: LibraryCollection; active: boolean; onClick: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-w-[220px] text-right rounded-3xl border p-4 transition press-effect",
        active ? "bg-[var(--card)] border-[var(--stroke)]" : "glass border-[var(--stroke)] hover:bg-[var(--card-2)]"
      )}
      style={active ? { borderColor: collection.accent } : undefined}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{collection.icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: collection.accent }}>{collection.title}</div>
          <div className="text-[11px] opacity-50 truncate">{collection.subtitle}</div>
        </div>
      </div>
      <div className="text-xs opacity-60 leading-5 line-clamp-2">{collection.description}</div>
      <div className="mt-3 text-[11px] opacity-45 tabular-nums">{collection.entries.length.toLocaleString("ar-EG")} مادة</div>
    </button>
  );
}

type LibrarySection = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  route: string;
  badge?: string;
  featured?: boolean;
};

const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    id: "hadith",
    title: "أحاديث",
    subtitle: "كتب الحديث والمختارات النبوية",
    description: "كل بطاقات الحديث داخل مكان واحد: كتب الحديث، المختارات، البحث، الفوائد، والتصفية بالموضوع.",
    icon: "📚",
    accent: "#10b981",
    route: "/library/hadith",
    badge: "المكتبة الحديثية",
    featured: true,
  },
  {
    id: "stories",
    title: "قصص الأنبياء",
    subtitle: "قصص مرتبة بفصول ودروس",
    description: "رحلة إيمانية مع الأنبياء عليهم السلام بأسلوب بطاقات قابلة للفتح والحفظ والمشاركة.",
    icon: "🕌",
    accent: "#f59e0b",
    route: "/stories",
  },
  {
    id: "seerah",
    title: "السيرة النبوية",
    subtitle: "16 كتاباً في حياة النبي ﷺ",
    description: "السيرة المفصلة من النسب والولادة إلى الوفاة الشريفة، فصلاً فصلاً داخل بطاقات منظمة.",
    icon: "🌙",
    accent: "#10b981",
    route: "/seerah",
  },
  {
    id: "companions",
    title: "الصحابة",
    subtitle: "سير موجزة لأصحاب النبي ﷺ",
    description: "بطاقات تعريفية بروح تربوية عن الصحابة الكرام ومواقفهم وأثرهم.",
    icon: "🌟",
    accent: "#f97316",
    route: "/companions",
  },
  {
    id: "islam-pillars",
    title: "أركان الإسلام",
    subtitle: "الدعائم الخمس للإسلام",
    description: "شرح أركان الإسلام الخمسة من الشهادتين إلى الحج بالأدلة من الكتاب والسنة الصحيحة.",
    icon: "🕋",
    accent: "#10b981",
    route: "/islam-pillars",
  },
  {
    id: "faith-pillars",
    title: "أركان الإيمان",
    subtitle: "الأصول الستة للإيمان",
    description: "أركان الإيمان الستة من حديث جبريل: الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر.",
    icon: "💎",
    accent: "#f59e0b",
    route: "/faith-pillars",
  },
  {
    id: "angels",
    title: "الملائكة",
    subtitle: "عالم الملائكة ووظائفهم",
    description: "تعرّف على الملائكة الواردين في القرآن والسنة وما أخبر به النبي ﷺ عنهم ووظائف كلٍّ منهم.",
    icon: "👼",
    accent: "#38bdf8",
    route: "/angels",
  },
  {
    id: "divine-books",
    title: "الكتب السماوية",
    subtitle: "كتب الله وأنبياؤها",
    description: "الكتب التي أنزلها الله على رسله: القرآن والتوراة والإنجيل والزبور والصحف، ومن أُنزلت عليه.",
    icon: "📜",
    accent: "#a78bfa",
    route: "/divine-books",
  },
  {
    id: "faith-branches",
    title: "شُعَب الإيمان",
    subtitle: "بضعٌ وسبعون شعبة",
    description: "شُعب الإيمان من حديث النبي ﷺ مقسّمة إلى أعمال القلب واللسان والجوارح.",
    icon: "🌿",
    accent: "#22c55e",
    route: "/faith-branches",
  },
  {
    id: "major-sins",
    title: "الكبائر",
    subtitle: "أعظم الذنوب والتحذير منها",
    description: "تعريف الكبائر والسبع الموبقات وأمهات الذنوب بالأدلة، تذكيرًا وتحذيرًا للنفس.",
    icon: "⚠️",
    accent: "#ef4444",
    route: "/major-sins",
  },
  {
    id: "wudu",
    title: "الوضوء",
    subtitle: "خطوات الطهارة العملية",
    description: "دليل واضح ومتدرج لأعمال الوضوء والسنن والتنبيهات المهمة.",
    icon: "💧",
    accent: "#06b6d4",
    route: "/wudu",
  },
  {
    id: "prayer-guide",
    title: "كيفية الصلاة",
    subtitle: "تعلم الصلاة خطوة بخطوة",
    description: "دليل عملي من التكبير إلى التسليم مع ترتيب يساعد على الفهم والمراجعة.",
    icon: "🧎",
    accent: "#8b5cf6",
    route: "/prayer-guide",
  },
  {
    id: "asma",
    title: "أسماء الله الحسنى",
    subtitle: "تدبر ومعانٍ مختصرة",
    description: "أسماء الله الحسنى في بطاقات هادئة تساعد على الحفظ والتأمل والعمل.",
    icon: "✨",
    accent: "#eab308",
    route: "/asma",
  },
  {
    id: "quran-vocab",
    title: "مفردات القرآن",
    subtitle: "معاني قرآنية قريبة",
    description: "مفردات مختارة من القرآن الكريم مع المعنى والسياق لتقريب التدبر.",
    icon: "📖",
    accent: "#22c55e",
    route: "/quran-vocab",
  },
  {
    id: "hadith-memo",
    title: "حفظ الحديث",
    subtitle: "مراجعة وتثبيت الأحاديث",
    description: "مساحة مخصصة لحفظ الأحاديث ومراجعتها بطريقة منظمة داخل التطبيق.",
    icon: "🏅",
    accent: "#ec4899",
    route: "/hadith/memo",
  },
  {
    id: "duas",
    title: "الأدعية",
    subtitle: "أدعية جامعة ومأثورة",
    description: "مجموعة أدعية مرتبة للقراءة اليومية والمواقف المتكررة.",
    icon: "🤲",
    accent: "#14b8a6",
    route: "/duas",
  },
  {
    id: "ruqyah",
    title: "الرقية الشرعية",
    subtitle: "آيات وأدعية مأثورة",
    description: "الفاتحة، آية الكرسي، المعوذات، وأدعية نبوية للرقية الشرعية.",
    icon: "🛡️",
    accent: "#6366f1",
    route: "/ruqyah",
  },
];

function LibraryHubCard({ section }: { section: LibrarySection }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(section.route)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-right transition press-effect cv-auto",
        section.featured ? "col-span-full min-h-[150px]" : "min-h-[168px]"
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${section.accent} 18%, var(--card)), var(--card))`,
        borderColor: `color-mix(in srgb, ${section.accent} 35%, var(--stroke))`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 dhikr-card-stars opacity-45" aria-hidden="true" />
      <div className="relative flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{
              background: `color-mix(in srgb, ${section.accent} 16%, transparent)`,
              border: `1px solid color-mix(in srgb, ${section.accent} 28%, transparent)`,
            }}
            aria-hidden="true"
          >
            {section.icon}
          </div>
          <ArrowRight size={16} className="mt-2 shrink-0 rotate-180 opacity-35 transition group-hover:opacity-70" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          {section.badge && (
            <div
              className="mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{ background: `color-mix(in srgb, ${section.accent} 16%, transparent)`, color: section.accent }}
            >
              {section.badge}
            </div>
          )}
          <h2 className="font-arabic text-base font-bold leading-7" style={{ color: section.accent }}>
            {section.title}
          </h2>
          <p className="mt-0.5 text-xs font-semibold opacity-60">{section.subtitle}</p>
          <p className="mt-3 text-xs leading-6 opacity-65 line-clamp-3">{section.description}</p>
        </div>
      </div>
    </button>
  );
}

function LibraryHubView() {
  const navigate = useNavigate();
  const featured = LIBRARY_SECTIONS.find((section) => section.featured);
  const sections = LIBRARY_SECTIONS.filter((section) => !section.featured);

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 dhikr-card-stars opacity-45" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, #10b981 13%, transparent), color-mix(in srgb, #f59e0b 9%, transparent))",
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-start gap-3">
          <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <BookOpenText size={19} aria-hidden="true" className="text-[var(--accent)]" />
              <span className="text-xs opacity-60">مكتبة أثر</span>
            </div>
            <h1 className="text-xl font-bold">المكتبة الإسلامية</h1>
            <p className="mt-2 text-sm leading-7 opacity-70">
              كل أبواب المحتوى في مكان واحد: حديث، سيرة، قصص، أدعية، عبادات، وحفظ.
            </p>
          </div>
        </div>
      </Card>

      {featured && <LibraryHubCard section={featured} />}

      <div className="grid grid-cols-2 gap-3" role="list" aria-label="أقسام المكتبة">
        {sections.map((section) => (
          <div key={section.id} role="listitem">
            <LibraryHubCard section={section} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HadithLibraryView() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useIslamicLibraryDB();
  const [q, setQ] = React.useState("");
  const [collectionFilter, setCollectionFilter] = React.useState<string>("all");
  const [tagFilter, setTagFilter] = React.useState<string | null>(null);

  const fuse = React.useMemo(() => {
    if (!data) return null;
    return new Fuse(data.flat, {
      includeScore: true,
      threshold: 0.25,
      keys: [
        { name: "searchText", weight: 3 },
        { name: "arabic", weight: 3 },
        { name: "title", weight: 2 },
        { name: "narrator", weight: 1.5 },
        { name: "tags", weight: 1.2 },
        { name: "source.title", weight: 1 },
      ],
    });
  }, [data]);

  const tags = React.useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    for (const entry of data.flat) {
      for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  }, [data]);

  const entries = React.useMemo(() => {
    if (!data) return [] as FlatLibraryEntry[];
    const base = q.trim() && fuse
      ? fuse.search(stripDiacritics(q.trim())).map((result) => result.item)
      : data.flat;
    return base
      .filter((entry) => collectionFilter === "all" || entry.collectionId === collectionFilter)
      .filter((entry) => !tagFilter || entry.tags.includes(tagFilter))
      .slice(0, q.trim() ? 80 : 200);
  }, [collectionFilter, data, fuse, q, tagFilter]);

  const featuredIndex = Math.floor(Date.now() / 86400000) % (data?.flat.length ?? 1);
  const featured = data?.flat[featuredIndex] ?? null;

  if (isLoading) {
    return <div className="space-y-3 page-enter" role="status" aria-label="جارٍ التحميل…"><span className="sr-only">جارٍ التحميل…</span><Card className="p-5"><div className="skeleton h-8 w-44 rounded-xl" /><div className="skeleton h-20 w-full rounded-2xl mt-4" /></Card></div>;
  }

  if (error || !data) {
    return <Card className="p-5"><div className="font-semibold">تعذر تحميل المكتبة</div><div className="text-sm opacity-60 mt-2">أعد فتح الصفحة بعد قليل.</div></Card>;
  }

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      <Card className="p-5 overflow-hidden relative">
        <div className="absolute -left-8 -top-10 w-32 h-32 rounded-full opacity-10" style={{ background: "var(--accent)" }} />
        <div className="flex items-center gap-3 mb-4">
          <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
          <div className="min-w-0">
            <div className="flex items-center gap-2" role="search" aria-label="بحث في المكتبة">
              <BookOpenText size={19} aria-hidden="true" className="text-[var(--accent)]" />
              <h1 className="text-lg font-bold">أحاديث</h1>
            </div>
            <div className="text-xs opacity-55 mt-1">كتب الحديث، مختارات نبوية، بحث سريع، وفوائد عملية.</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--stroke)] p-3"><div className="text-[10px] opacity-50">المجموعات</div><div className="text-xl font-bold tabular-nums">{data.db.collections.length.toLocaleString("ar-EG")}</div></div>
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--stroke)] p-3"><div className="text-[10px] opacity-50">المواد</div><div className="text-xl font-bold tabular-nums">{data.flat.length.toLocaleString("ar-EG")}</div></div>
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--stroke)] p-3"><div className="text-[10px] opacity-50">الأبواب</div><div className="text-xl font-bold tabular-nums">{new Set(data.flat.map((e) => e.chapterId)).size.toLocaleString("ar-EG")}</div></div>
        </div>

        {featured && (
          <button type="button"
            onClick={() => navigate(`/library/${featured.collectionId}/${featured.id}`)}
            className="w-full text-right rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4 hover:bg-[var(--card-2)] transition"
          >
            <div className="flex items-center gap-2 mb-2"><Sparkles size={15} className="text-[var(--accent)]" aria-hidden="true" /><span className="text-xs font-semibold opacity-60">بداية مقترحة</span></div>
            {featured.title && <div className="text-xs font-semibold mb-1 font-arabic" style={{ color: featured.collectionAccent }}>{featured.collectionTitle} · {featured.title}</div>}
            <div className="arabic-text leading-8 text-sm md:text-base line-clamp-3">{featured.arabic}</div>
            <div className="text-xs opacity-50 mt-2">{featured.source.title}</div>
          </button>
        )}
      </Card>

      {/* Hadith Books Grid — at top for quick access */}
      <div className="grid grid-cols-2 gap-3" role="list" aria-label="كتب الحديث">
        {HADITH_BOOKS_STATIC.map((book) => (
          <div key={book.key} role="listitem">
          <button type="button"
            dir="rtl"
            onClick={() => navigate(`/hadith/${book.key}`)}
            className="press-effect text-right rounded-3xl p-4 glass border border-[var(--stroke)] transition active:scale-95 cv-auto"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${book.color}22` }}
            >
              <Library size={16} style={{ color: book.color }} aria-hidden="true" />
            </div>
            <div className="text-sm font-bold arabic-text truncate" style={{ color: book.color }}>
              {book.title}
            </div>
            <div className="text-[11px] opacity-50 mt-0.5 tabular-nums">
              {book.count.toLocaleString("ar-EG")} حديث
            </div>
          </button>
          </div>
        ))}
      </div>

      <Card className="p-4 sticky top-3 z-20 backdrop-blur-xl">
        <div className="flex items-center gap-2" role="search" aria-label="بحث في المكتبة">
          <Search size={17} className="opacity-60" aria-hidden="true" />
          <Input value={q} onChange={(event) => setQ(event.target.value)} type="search" placeholder="ابحث في الحديث، الراوي، الفوائد، أو الموضوع…" aria-label="بحث في المكتبة" spellCheck={false} autoComplete="off" autoCapitalize="none" />
        </div>
      </Card>

      <div className="overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
        <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
          <CollectionCard
            collection={{ ...data.db.collections[0]!, id: "all", title: "الكل", subtitle: "كل المكتبة", description: "اعرض كل المواد المتاحة داخل التطبيق.", icon: "🌟", accent: "var(--accent)", entries: data.flat }}
            active={collectionFilter === "all"}
            onClick={() => setCollectionFilter("all")}
          />
          {data.db.collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} active={collectionFilter === collection.id} onClick={() => setCollectionFilter(collection.id)} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="تصفية بالموضوع">
        <button type="button"
          onClick={() => setTagFilter(null)}
          aria-pressed={!tagFilter}
          className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", !tagFilter ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}
        >
          كل الموضوعات
        </button>
        {tags.map(([tag, count]) => (
          <button type="button"
            key={tag}
            aria-pressed={tagFilter === tag}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", tagFilter === tag ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}
          >
            {tag} <span className="opacity-60 tabular-nums">{count.toLocaleString("ar-EG")}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-sm font-semibold">المواد</div>
        <div className="text-xs opacity-50 tabular-nums" aria-live="polite" aria-atomic="true">{entries.length.toLocaleString("ar-EG")}</div>
      </div>

      <div className="space-y-3" role="list" aria-label="مواد المكتبة">
        {entries.map((entry) => <div key={entry.key} role="listitem"><LibraryEntryCard entry={entry} /></div>)}
        {entries.length === 0 && (
          <div dir="rtl" className="flex flex-col items-center py-12 gap-4">
            <Search size={40} aria-hidden="true" className="text-[var(--muted)] opacity-20" />
            <p className="text-sm text-[var(--muted)] font-arabic text-center">لا توجد نتائج للفلاتر الحالية</p>
            <button
              type="button"
              onClick={() => { setTagFilter(null); setCollectionFilter("all"); setQ(""); }}
              className="text-xs px-4 py-2 rounded-full border border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)] transition font-arabic"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-start gap-2">
          <ExternalLink size={16} aria-hidden="true" className="text-[var(--accent)] shrink-0 mt-1" />
          <div className="text-xs opacity-60 leading-6">
            محتوى المكتبة يقرأ داخل التطبيق. عند الحاجة يمكنك فتح رابط تحقق خارجي لكل حديث، مثل الدرر، دون أن تكون المكتبة معتمدة على قراءة خارجية.
          </div>
        </div>
      </Card>
    </div>
  );
}

export function LibraryPage() {
  useScrollRestoration();
  const location = useLocation();
  return location.pathname === "/library/hadith" ? <HadithLibraryView /> : <LibraryHubView />;
}
