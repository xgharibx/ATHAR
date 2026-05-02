/**
 * HadithBookView — Phase 2
 * Book detail page: section filter + virtual list of hadiths.
 * Route: /hadith/:bookKey
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ArrowRight, ArrowUpRight, Bookmark, BookOpenText, Layers3, Loader2, WifiOff } from "lucide-react";
import { useHadithPack, useHadithPackProgress, HADITH_PACK_SIZES_MB } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC, hadithGradeLabel, hadithPreview, type HadithItem } from "@/data/hadithTypes";
import { useNoorStore } from "@/store/noorStore";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */

// 7C: Section header row
function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div
      dir="rtl"
      className="mx-3 mt-4 mb-2 flex items-center gap-2 rounded-2xl border px-4 py-2 glass"
      style={{ borderColor: color + "35", background: `linear-gradient(90deg, ${color}18, rgba(255,255,255,0.045))` }}
    >
      <div className="w-1.5 h-4 rounded-full" style={{ background: color }} />
      <p className="text-xs font-bold font-arabic truncate" style={{ color }}>
        {title}
      </p>
    </div>
  );
}

function GradeBadge({ grades }: { grades: string[] }) {
  if (!grades.length) return null;
  const g = grades[0];
  const colors: Record<string, string> = {
    sahih: "#10b981",
    hasan: "#3b82f6",
    daif: "#ef4444",
    maudu: "#6b7280",
  };
  const color = colors[g] ?? "#6b7280";
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ background: color + "22", color }}
    >
      {hadithGradeLabel(g)}
    </span>
  );
}

function HadithRow({
  item,
  bookKey,
  accentColor,
  sectionTitle,
}: {
  item: HadithItem;
  bookKey: string;
  accentColor: string;
  sectionTitle?: string | null;
}) {
  const navigate = useNavigate();
  const hadithBookmarks = useNoorStore((s) => s.hadithBookmarks);
  const key = `${bookKey}:${item.n}`;
  const isBookmarked = !!hadithBookmarks[key];

  return (
    <div className="mx-3 my-2">
      <button
        dir="rtl"
        onClick={() => navigate(`/hadith/${bookKey}/${item.n}`)}
        className="group relative w-full overflow-hidden rounded-3xl border border-white/10 glass-strong glass-hover p-4 text-right transition active:scale-[.985]"
      >
        <div className="absolute inset-y-0 right-0 w-1.5 opacity-90" style={{ background: accentColor }} />
        <div className="flex items-start justify-between gap-3 pr-2">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums" style={{ background: accentColor + "22", color: accentColor }}>
                {item.a.toLocaleString("ar-EG")}
              </span>
              {sectionTitle && <Badge className="max-w-[180px] truncate px-2 py-0.5 text-[10px]">{sectionTitle}</Badge>}
              <GradeBadge grades={item.g} />
            </div>
            <p className="arabic-text text-base leading-8 font-semibold text-[var(--fg)] line-clamp-3">
              {hadithPreview(item.t, 190)}
            </p>
            <div className="mt-3 border-t border-white/8 pt-3 flex items-center justify-between gap-3 text-xs opacity-65">
              <span className="font-arabic">حديث {item.n.toLocaleString("ar-EG")}</span>
              <span className="font-semibold" style={{ color: accentColor }}>اقرأ النص الكامل</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ArrowUpRight size={17} className="opacity-45 transition group-hover:opacity-80" />
            {isBookmarked && (
              <Bookmark size={15} className="fill-current" style={{ color: accentColor }} />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function HadithBookViewPage() {
  const { bookKey } = useParams<{ bookKey: string }>();
  const navigate = useNavigate();
  const { data: pack, isLoading, isError, progress, isFromCache } = useHadithPackProgress(bookKey);
  const hadithProgress = useNoorStore((s) => s.hadithProgress);
  const virtuoso = useRef<VirtuosoHandle>(null);

  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);

  const meta =
    pack ??
    HADITH_BOOKS_STATIC.find((b) => b.key === bookKey);

  const accentColor = meta?.color ?? "#10b981";

  // Filter visible hadiths
  const visibleHadiths = useMemo<HadithItem[]>(() => {
    if (!pack) return [];
    if (activeSectionId === null) return pack.hadiths;
    return pack.hadiths.filter((h) => h.s === activeSectionId);
  }, [pack, activeSectionId]);

  const lastN = hadithProgress[bookKey ?? ""];
  const lastIndex = useMemo(() => {
    if (!lastN || !visibleHadiths.length) return null;
    const idx = visibleHadiths.findIndex((h) => h.n === lastN);
    return idx >= 0 ? idx : null;
  }, [lastN, visibleHadiths]);

  const resumeReading = useCallback(() => {
    if (lastIndex !== null) {
      virtuoso.current?.scrollToIndex({ index: lastIndex, behavior: "smooth", align: "start" });
    }
  }, [lastIndex]);

  // Scroll chips container for sections
  const sectionsRef = useRef<HTMLDivElement>(null);

  // 7C: Build flat list mixing section headers + hadiths when showing all
  type ListRow = { type: "header"; sectionTitle: string } | { type: "hadith"; item: HadithItem };
  const listRows = useMemo<ListRow[]>(() => {
    if (!pack || activeSectionId !== null) {
      return visibleHadiths.map((item) => ({ type: "hadith" as const, item }));
    }
    // Show all: inject section header before first hadith of each section
    const rows: ListRow[] = [];
    let lastSectionId = -1;
    for (const item of pack.hadiths) {
      if (item.s !== lastSectionId) {
        lastSectionId = item.s;
        const section = pack.sections.find((s) => s.id === item.s);
        if (section?.title) {
          rows.push({ type: "header", sectionTitle: section.title });
        }
      }
      rows.push({ type: "hadith", item });
    }
    return rows;
  }, [pack, activeSectionId, visibleHadiths]);

  const renderItem = useCallback(
    (index: number) => {
      const row = listRows[index];
      if (!row) return null;
      if (row.type === "header") {
        return <SectionHeader title={row.sectionTitle} color={accentColor} />;
      }
      const sectionTitle = pack?.sections.find((s) => s.id === row.item.s)?.title ?? null;
      return (
        <HadithRow key={row.item.n} item={row.item} bookKey={bookKey!} accentColor={accentColor} sectionTitle={sectionTitle} />
      );
    },
    [listRows, bookKey, accentColor, pack?.sections],
  );

  return (
    <div className="flex flex-col min-h-screen-safe page-enter pb-floating-nav">
      {/* Header */}
      <div
        dir="rtl"
        className="sticky top-0 z-20 px-3 pt-2 pb-3"
      >
        <Card className="relative overflow-hidden p-4">
          <div className="absolute inset-y-0 right-0 w-1.5" style={{ background: accentColor }} />
          <div className="absolute -left-10 -top-12 h-32 w-32 rounded-full opacity-15" style={{ background: accentColor }} />
          <div className="relative flex items-center gap-3 pr-2">
            <button
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-2xl border border-white/10 bg-white/6 grid place-items-center transition hover:bg-white/10 shrink-0"
              aria-label="رجوع"
            >
              <ArrowRight size={19} className="text-[var(--fg)]" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <BookOpenText size={16} style={{ color: accentColor }} />
                <span className="text-[11px] font-semibold opacity-55">كتاب حديثي</span>
                {isFromCache && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-arabic" style={{ background: "#10b98122", color: "#10b981" }}>
                    <WifiOff size={10} />
                    بلا إنترنت
                  </span>
                )}
              </div>
              <h1 className="font-bold text-lg text-[var(--fg)] font-arabic leading-tight truncate" dir="rtl">
                {meta?.title ?? bookKey}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs opacity-60 tabular-nums">
                <span>{(pack?.count ?? meta?.count ?? 0).toLocaleString("ar-EG")} حديث</span>
                {pack && pack.sections.length > 0 && <span>• {pack.sections.length.toLocaleString("ar-EG")} باب</span>}
              </div>
            </div>
            {isLoading && <Loader2 size={18} className="animate-spin text-[var(--muted)] shrink-0" />}
          </div>
          {lastIndex !== null && activeSectionId === null && (
            <button
              onClick={resumeReading}
              className="relative mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-semibold font-arabic press-effect"
              style={{ background: accentColor + "18", color: accentColor, borderColor: accentColor + "45" }}
            >
              أكمل من حيث توقفت • ح{lastN?.toLocaleString("ar-EG")}
            </button>
          )}
        </Card>
      </div>

      {/* Section filter chips */}
      {pack && pack.sections.length > 1 && (
        <div
          ref={sectionsRef}
          dir="rtl"
          className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar"
        >
          <button
            onClick={() => setActiveSectionId(null)}
            className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition font-arabic", activeSectionId === null ? "text-black font-bold" : "glass border-white/10")}
            style={activeSectionId === null ? { background: accentColor, borderColor: "transparent" } : undefined}
          >
            الكل · {pack.count.toLocaleString("ar-EG")}
          </button>
          {pack.sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSectionId(s.id)}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition font-arabic whitespace-nowrap", activeSectionId === s.id ? "text-black font-bold" : "glass border-white/10")}
              style={activeSectionId === s.id ? { background: accentColor, borderColor: "transparent" } : undefined}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div dir="rtl" className="flex-1 flex items-center justify-center px-6">
          <div
            className="w-full max-w-sm rounded-3xl glass-strong border border-white/10 p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: (meta?.color ?? "#10b981") + "22" }}
              >
                <Loader2 size={20} className="animate-spin" style={{ color: meta?.color ?? "#10b981" }} />
              </div>
              <div>
                <p className="font-bold text-sm font-arabic" style={{ color: "var(--fg)" }}>
                  {meta?.title ?? "جاري التحميل"}
                </p>
                <p className="text-xs font-arabic" style={{ color: "var(--muted)" }}>
                  {bookKey && HADITH_PACK_SIZES_MB[bookKey]
                    ? `حجم الملف ~${HADITH_PACK_SIZES_MB[bookKey]} MB`
                    : "جاري التحميل…"}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: meta?.color ?? "#10b981",
                }}
              />
            </div>
            <p className="text-center text-xs font-arabic" style={{ color: "var(--muted)" }}>
              {progress < 5
                ? "يتم تهيئة التحميل…"
                : progress >= 100
                ? "اكتمل التحميل"
                : `${progress}% — يتم التحميل للاستخدام دون إنترنت`}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div dir="rtl" className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="text-[var(--muted)] font-arabic">تعذّر تحميل الكتاب</p>
          <p className="text-xs text-[var(--muted)]">
            يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة
          </p>
        </div>
      )}

      {/* Hadith list — virtual scroll */}
      {pack && listRows.length > 0 && (
        <div className="flex-1">
          <Virtuoso
            ref={virtuoso}
            totalCount={listRows.length}
            itemContent={renderItem}
            style={{ flex: 1, height: "calc(100vh - 235px)" }}
          />
        </div>
      )}

      {/* Empty after filter */}
      {pack && listRows.length === 0 && !isLoading && (
        <div dir="rtl" className="flex-1 flex items-center justify-center text-[var(--muted)] font-arabic">
          لا توجد أحاديث في هذا الباب
        </div>
      )}
    </div>
  );
}

export default HadithBookViewPage;
