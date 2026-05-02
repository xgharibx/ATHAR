import * as React from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpenText, Check, Clock, Copy, ExternalLink, Heart, Library, Search, Share2, Sparkles, Users } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { useIslamicLibraryDB, dorarSearchUrl } from "@/data/useIslamicLibraryDB";
import type { FlatLibraryEntry, LibraryCollection } from "@/data/libraryTypes";
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

  const onCopy = async () => {
    try {
      await copyEntry(entry);
      setCopied(true);
      toast.success("تم النسخ");
      window.setTimeout(() => setCopied(false), 1400);
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
        <button
          type="button"
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
        <ArrowUpRight size={17} className="opacity-45 shrink-0 mt-1" />
      </div>

      <div className="mt-3 border-t border-white/8 pt-3 space-y-2">
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
            <IconButton aria-label="نسخ" title="نسخ" onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}</IconButton>
            <IconButton aria-label="مفضلة" title="مفضلة" onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>
              <Heart size={15} className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />
            </IconButton>
            <IconButton aria-label="مشاركة" title="مشاركة" onClick={onShare}><Share2 size={15} /></IconButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CollectionCard({ collection, active, onClick }: { collection: LibraryCollection; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[220px] text-right rounded-3xl border p-4 transition press-effect",
        active ? "bg-white/10 border-white/20" : "glass border-white/10 hover:bg-white/8"
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
      <div className="mt-3 text-[11px] opacity-45 tabular-nums">{collection.entries.length} مادة</div>
    </button>
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useIslamicLibraryDB();
  const [q, setQ] = React.useState("");
  const [collectionFilter, setCollectionFilter] = React.useState<string>("all");
  const [tagFilter, setTagFilter] = React.useState<string | null>(null);

  const fuse = React.useMemo(() => {
    if (!data) return null;
    return new Fuse(data.flat, {
      includeScore: true,
      threshold: 0.32,
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
      .slice(0, q.trim() ? 80 : 60);
  }, [collectionFilter, data, fuse, q, tagFilter]);

  const featured = data?.flat[0] ?? null;

  if (isLoading) {
    return <div className="space-y-3 page-enter"><Card className="p-5"><div className="skeleton h-8 w-44 rounded-xl" /><div className="skeleton h-20 w-full rounded-2xl mt-4" /></Card></div>;
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
            <div className="flex items-center gap-2">
              <BookOpenText size={19} className="text-[var(--accent)]" />
              <h1 className="text-lg font-bold">المكتبة الإسلامية</h1>
            </div>
            <div className="text-xs opacity-55 mt-1">قراءة داخل التطبيق، بحث سريع، وروابط تحقق اختيارية.</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl bg-white/6 border border-white/10 p-3"><div className="text-[10px] opacity-50">المجموعات</div><div className="text-xl font-bold tabular-nums">{data.db.collections.length}</div></div>
          <div className="rounded-2xl bg-white/6 border border-white/10 p-3"><div className="text-[10px] opacity-50">المواد</div><div className="text-xl font-bold tabular-nums">{data.flat.length}</div></div>
          <div className="rounded-2xl bg-white/6 border border-white/10 p-3"><div className="text-[10px] opacity-50">الأبواب</div><div className="text-xl font-bold tabular-nums">{new Set(data.flat.map((e) => e.chapterId)).size}</div></div>
        </div>

        {featured && (
          <button
            type="button"
            onClick={() => navigate(`/library/${featured.collectionId}/${featured.id}`)}
            className="w-full text-right rounded-3xl border border-white/10 bg-white/6 p-4 hover:bg-white/9 transition"
          >
            <div className="flex items-center gap-2 mb-2"><Sparkles size={15} className="text-[var(--accent)]" /><span className="text-xs font-semibold opacity-60">بداية مقترحة</span></div>
            <div className="arabic-text leading-8 text-sm md:text-base line-clamp-3">{featured.arabic}</div>
            <div className="text-xs opacity-50 mt-2">{featured.source.title}</div>
          </button>
        )}

        {/* ── Ruqyah featured card ── */}
        <button
          type="button"
          onClick={() => navigate("/ruqyah")}
          className="w-full text-right press-effect mt-3 rounded-3xl border p-4 flex items-center gap-3 transition"
          style={{
            background: "rgba(99,102,241,0.08)",
            borderColor: "rgba(99,102,241,0.25)",
          }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            🛡️
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold arabic-text" style={{ color: "rgba(167,139,250,0.95)" }}>أذكار الرقية الشرعية</div>
            <div className="text-xs opacity-55 arabic-text mt-0.5">الفاتحة · آية الكرسي · المعوذات · أدعية نبوية</div>
          </div>
          <ArrowRight size={14} className="opacity-35 shrink-0 rotate-180" />
        </button>
      </Card>

      <Card className="p-4 sticky top-3 z-20 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Search size={17} className="opacity-60" />
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ابحث في الحديث، الراوي، الفوائد، أو الموضوع…" />
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

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setTagFilter(null)}
          className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", !tagFilter ? "bg-[var(--accent)] text-black border-transparent" : "bg-white/8 border-white/10")}
        >
          كل الموضوعات
        </button>
        {tags.map(([tag, count]) => (
          <button
            key={tag}
            type="button"
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", tagFilter === tag ? "bg-[var(--accent)] text-black border-transparent" : "bg-white/8 border-white/10")}
          >
            {tag} <span className="opacity-60 tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-sm font-semibold">المواد</div>
        <div className="text-xs opacity-50 tabular-nums">{entries.length}</div>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => <LibraryEntryCard key={entry.key} entry={entry} />)}
      </div>

      {/* Hadith corpus entry card */}
      <button
        type="button"
        dir="rtl"
        onClick={() => navigate("/hadith")}
        className="w-full text-right rounded-2xl p-4 flex items-center gap-4 transition active:scale-95"
        style={{ background: "linear-gradient(135deg, #10b98122, #3b82f622)", border: "1px solid #10b98133" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#10b98122" }}
        >
          <Library size={22} style={{ color: "#10b981" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--fg)] font-arabic">الكتب الحديثية</p>
          <p className="text-xs text-[var(--muted)] mt-0.5 font-arabic">
            9 كتب • أكثر من 36,000 حديث نبوي شريف
          </p>
        </div>
        <ArrowRight size={16} className="text-[var(--muted)] rotate-180 shrink-0" />
      </button>

      {/* Companions entry card */}
      <button
        type="button"
        dir="rtl"
        onClick={() => navigate("/companions")}
        className="w-full text-right rounded-2xl p-4 flex items-center gap-4 transition active:scale-95"
        style={{ background: "linear-gradient(135deg, #f59e0b22, #ef444422)", border: "1px solid #f59e0b33" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#f59e0b22" }}
        >
          <Users size={22} style={{ color: "#f59e0b" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--fg)] font-arabic">الصحابة الكرام</p>
          <p className="text-xs text-[var(--muted)] mt-0.5 font-arabic">
            20 صحابيًا • سيَر موجزة لأصحاب النبي ﷺ
          </p>
        </div>
        <ArrowRight size={16} className="text-[var(--muted)] rotate-180 shrink-0" />
      </button>

      {/* Seerah timeline entry card */}
      <button
        type="button"
        dir="rtl"
        onClick={() => navigate("/seerah")}
        className="w-full text-right rounded-2xl p-4 flex items-center gap-4 transition active:scale-95"
        style={{ background: "linear-gradient(135deg, #8b5cf622, #06b6d422)", border: "1px solid #8b5cf633" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#8b5cf622" }}
        >
          <Clock size={22} style={{ color: "#8b5cf6" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--fg)] font-arabic">السيرة النبوية</p>
          <p className="text-xs text-[var(--muted)] mt-0.5 font-arabic">
            21 حدثًا • رحلة حياة النبي ﷺ على خط الزمن
          </p>
        </div>
        <ArrowRight size={16} className="text-[var(--muted)] rotate-180 shrink-0" />
      </button>

      <Card className="p-4">
        <div className="flex items-start gap-2">
          <ExternalLink size={16} className="text-[var(--accent)] shrink-0 mt-1" />
          <div className="text-xs opacity-60 leading-6">
            محتوى المكتبة يقرأ داخل التطبيق. عند الحاجة يمكنك فتح رابط تحقق خارجي لكل حديث، مثل الدرر، دون أن تكون المكتبة معتمدة على قراءة خارجية.
          </div>
        </div>
      </Card>
    </div>
  );
}

export { dorarSearchUrl };
