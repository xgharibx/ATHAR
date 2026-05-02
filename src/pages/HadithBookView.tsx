/**
 * HadithBookView — Phase 2
 * Book detail page: section filter + virtual list of hadiths.
 * Route: /hadith/:bookKey
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ArrowRight, Bookmark, Loader2, WifiOff } from "lucide-react";
import { useHadithPack, useHadithPackProgress, HADITH_PACK_SIZES_MB } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC, hadithGradeLabel, hadithPreview, type HadithItem } from "@/data/hadithTypes";
import { useNoorStore } from "@/store/noorStore";

/* ------------------------------------------------------------------ */

// 7C: Section header row
function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div
      dir="rtl"
      className="mx-3 mt-3 mb-1 flex items-center gap-2 px-4 py-2 rounded-2xl"
      style={{ background: color + "14", border: `1px solid ${color}30` }}
    >
      <div className="w-1.5 h-4 rounded-full" style={{ background: color }} />
      <p className="text-xs font-bold font-arabic" style={{ color }}>
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
}: {
  item: HadithItem;
  bookKey: string;
  accentColor: string;
}) {
  const navigate = useNavigate();
  const hadithBookmarks = useNoorStore((s) => s.hadithBookmarks);
  const key = `${bookKey}:${item.n}`;
  const isBookmarked = !!hadithBookmarks[key];

  return (
    <div className="mx-3 my-1.5">
      <button
        dir="rtl"
        onClick={() => navigate(`/hadith/${bookKey}/${item.n}`)}
        className="w-full text-right rounded-2xl glass border border-white/8 px-4 py-3.5 flex items-start gap-3 transition active:scale-[.98]"
      >
        {/* Number circle */}
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{ background: accentColor + "22", color: accentColor }}
        >
          {item.a.toLocaleString("ar-EG")}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-arabic text-[var(--fg)] leading-relaxed line-clamp-3 mb-1">
            {hadithPreview(item.t, 160)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <GradeBadge grades={item.g} />
          </div>
        </div>

        {isBookmarked && (
          <Bookmark size={14} className="shrink-0 mt-1 fill-current"
            style={{ color: accentColor }} />
        )}
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
      return (
        <HadithRow key={row.item.n} item={row.item} bookKey={bookKey!} accentColor={accentColor} />
      );
    },
    [listRows, bookKey, accentColor],
  );

  return (
    <div className="flex flex-col min-h-screen-safe" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        dir="rtl"
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur-sm"
        style={{ background: "var(--bg)cc", borderBottom: "1px solid var(--card-border)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
        >
          <ArrowRight size={20} className="text-[var(--fg)]" />
        </button>
        <div className="flex-1">
          <p className="font-bold text-base text-[var(--fg)] font-arabic leading-tight" dir="rtl">
            {meta?.title ?? bookKey}
          </p>
          {pack && (
            <p className="text-xs text-[var(--muted)]">
              {pack.count.toLocaleString("ar-EG")} حديث
            </p>
          )}
        </div>
        {isLoading && <Loader2 size={18} className="animate-spin text-[var(--muted)]" />}
        {!isLoading && isFromCache && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-arabic shrink-0"
            style={{ background: "#10b98122", color: "#10b981" }}
          >
            <WifiOff size={10} />
            <span>بلا إنترنت</span>
          </div>
        )}
      </div>

      {/* Section filter chips */}
      {pack && pack.sections.length > 1 && (
        <div
          ref={sectionsRef}
          dir="rtl"
          className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide"
          style={{ borderBottom: "1px solid var(--card-border)" }}
        >
          <button
            onClick={() => setActiveSectionId(null)}
            className="shrink-0 text-xs px-3 py-1 rounded-full transition font-arabic"
            style={
              activeSectionId === null
                ? { background: accentColor, color: "#fff" }
                : { background: "var(--card-bg)", color: "var(--fg)", border: "1px solid var(--card-border)" }
            }
          >
            الكل
          </button>
          {pack.sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSectionId(s.id)}
              className="shrink-0 text-xs px-3 py-1 rounded-full transition font-arabic whitespace-nowrap"
              style={
                activeSectionId === s.id
                  ? { background: accentColor, color: "#fff" }
                  : { background: "var(--card-bg)", color: "var(--fg)", border: "1px solid var(--card-border)" }
              }
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Resume button */}
      {lastIndex !== null && activeSectionId === null && (
        <div dir="rtl" className="px-4 py-2">
          <button
            onClick={resumeReading}
            className="w-full text-xs py-2 rounded-xl font-arabic"
            style={{ background: accentColor + "22", color: accentColor, border: `1px solid ${accentColor}44` }}
          >
            أكمل من حيث توقفت • ح{lastN?.toLocaleString("ar-EG")}
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div dir="rtl" className="flex-1 flex items-center justify-center px-6">
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
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
            style={{ flex: 1, height: "calc(100vh - 160px)" }}
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
