/**
 * HadithBooks â€” Phase 7
 * Gallery of 9 hadith books with Ø§Ù„Ø£Ø±Ø¨Ø¹ÙŠÙ†ÙŠØ§Øª hero (7E), Fuse.js global search (7B).
 * Route: /hadith
 */
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Library, BookOpen, Bookmark, BrainCircuit } from "lucide-react";
import Fuse from "fuse.js";
import { HADITH_BOOKS_STATIC, HADITH_GRADE_LABELS, type HadithBookMeta, type HadithItem } from "@/data/hadithTypes";
import { useHadithIndex, loadHadithPack } from "@/data/useHadithBook";
import { useNoorStore } from "@/store/noorStore";

/* ------------------------------------------------------------------ */
/* Grade chip                                                            */
/* ------------------------------------------------------------------ */

const GRADE_COLORS: Record<string, string> = {
  sahih: "#10b981",
  hasan: "#f59e0b",
  daif: "#ef4444",
  maudu: "#6b7280",
};

function GradeChip({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade] ?? "#6b7280";
  const label = HADITH_GRADE_LABELS[grade] ?? grade;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stars background                                                      */
/* ------------------------------------------------------------------ */

function StarField({ count = 24, color }: { count?: number; color: string }) {
  const stars = Array.from({ length: count }, (_, i) => ({
    x: ((i * 37 + 11) % 97),
    y: ((i * 53 + 7) % 89),
    r: 0.5 + (i % 3) * 0.5,
    o: 0.2 + (i % 4) * 0.15,
  }));
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill={color} opacity={s.o} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Ø§Ù„Ø£Ø±Ø¨Ø¹ÙŠÙ†ÙŠØ§Øª hero card (7E)                                           */
/* ------------------------------------------------------------------ */

function ArbainiCard({ book }: { book: HadithBookMeta }) {
  const navigate = useNavigate();
  const hadithProgress = useNoorStore((s) => s.hadithProgress);
  const lastN = hadithProgress[book.key];
  const isNawawi = book.key === "nawawi";

  return (
    <button
      dir="rtl"
      onClick={() => navigate(`/hadith/${book.key}`)}
      className="relative flex-1 min-w-[140px] text-right rounded-2xl overflow-hidden active:scale-95 transition-transform shadow-lg"
      style={{ background: `linear-gradient(140deg, ${book.color}33, ${book.color}66)`, border: `1px solid ${book.color}55` }}
    >
      <StarField count={18} color={book.color} />
      <div className="relative p-4">
        {/* Badge row */}
        <div className="flex items-center justify-between mb-2">
          {isNawawi ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: book.color + "44", color: book.color }}>
              Ø§Ù„Ø£Ø±Ø¨Ø¹ÙˆÙ† Ø§Ù„Ù†ÙˆÙˆÙŠØ©
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: book.color + "44", color: book.color }}>
              Ø§Ù„Ø£Ø­Ø§Ø¯ÙŠØ« Ø§Ù„Ù‚Ø¯Ø³ÙŠØ©
            </span>
          )}
          <GradeChip grade="sahih" />
        </div>
        {/* Title */}
        <p className="text-sm font-bold font-arabic text-[var(--fg)] leading-tight mb-1">
          {book.title}
        </p>
        <p className="text-[10px] text-[var(--muted)] mb-3">{book.titleEn}</p>
        {/* Count + progress */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-arabic" style={{ color: book.color }}>
            {book.count} Ø­Ø¯ÙŠØ«
          </span>
          {lastN ? (
            <span className="text-[9px] text-[var(--muted)]">Ø­{lastN}</span>
          ) : (
            <span className="text-[9px] text-[var(--muted)] opacity-60">Ù„Ù… ÙŠÙÙ‚Ø±Ø£</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Regular book card                                                     */
/* ------------------------------------------------------------------ */

function BookCard({ book }: { book: HadithBookMeta }) {
  const navigate = useNavigate();
  const hadithProgress = useNoorStore((s) => s.hadithProgress);
  const lastN = hadithProgress[book.key];
  const hadithBookmarks = useNoorStore((s) => s.hadithBookmarks);
  const bookmarkCount = Object.keys(hadithBookmarks).filter((k) => k.startsWith(book.key + ":")).length;

  return (
    <button
      dir="rtl"
      onClick={() => navigate(`/hadith/${book.key}`)}
      className="relative w-full text-right rounded-2xl overflow-hidden active:scale-95 transition-transform"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      {/* Left accent bar */}
      <div className="absolute top-0 right-0 w-1 h-full" style={{ background: book.color }} />

      <div className="px-4 py-3.5 pr-5">
        <div className="flex items-start gap-3">
          {/* Color dot */}
          <div className="mt-1 w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: book.color + "22" }}>
            <span className="text-sm font-bold font-arabic" style={{ color: book.color }}>
              {book.order}
            </span>
          </div>
          {/* Text block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold font-arabic text-[var(--fg)] leading-tight truncate">
                {book.title}
              </p>
              <GradeChip grade={book.grade === "mixed" ? "hasan" : book.grade} />
            </div>
            <p className="text-[10px] text-[var(--muted)] mb-2">{book.titleEn}</p>
            <p className="text-[11px] text-[var(--fg)] opacity-70 leading-snug line-clamp-1 font-arabic">
              {book.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <BookOpen size={10} />
              {book.count.toLocaleString("ar-EG")}
            </span>
            {bookmarkCount > 0 && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: book.color }}>
                <Bookmark size={10} />
                {bookmarkCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastN ? (
              <span className="text-[9px] text-[var(--muted)]">Ø¢Ø®Ø±: Ø­{lastN}</span>
            ) : null}
            <ArrowRight size={12} className="text-[var(--muted)] rotate-180" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Search tab (7B) â€” Fuse.js across loaded packs                        */
/* ------------------------------------------------------------------ */

type SearchResult = {
  bookKey: string;
  bookTitle: string;
  bookColor: string;
  item: HadithItem;
};

function SearchTab({ books }: { books: HadithBookMeta[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    // Load packs lazily; smaller books first for UX
    const priorityOrder = ["nawawi", "qudsi", "bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"];
    const allResults: SearchResult[] = [];

    for (const key of priorityOrder) {
      try {
        const pack = await loadHadithPack(key);
        if (!pack) continue;
        const fuse = new Fuse(pack.hadiths, {
          keys: ["t"],
          threshold: 0.35,
          minMatchCharLength: 2,
        });
        const hits = fuse.search(q, { limit: 5 });
        const meta = books.find((b) => b.key === key);
        for (const h of hits) {
          allResults.push({
            bookKey: key,
            bookTitle: meta?.title ?? key,
            bookColor: meta?.color ?? "#888",
            item: h.item,
          });
        }
        if (allResults.length >= 50) break;
      } catch {
        // skip failed pack
      }
    }

    setResults(allResults.slice(0, 50));
    setLoading(false);
  }, [books]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 500);
  };

  const previewText = (t: string) => {
    const markers = [" Ù‚ÙŽØ§Ù„ÙŽ:", " Ù‚ÙŽØ§Ù„ÙŽ :", "Ù‚Ø§Ù„:", "Ø£ÙŽÙ†ÙŽÙ‘ Ø±ÙŽØ³ÙÙˆÙ„ÙŽ", "Ø£Ù† Ø±Ø³ÙˆÙ„ Ø§Ù„Ù„Ù‡", "Ø¹ÙŽÙ†Ù Ø§Ù„Ù†ÙŽÙ‘Ø¨ÙÙŠÙÙ‘"];
    let matnStart = -1;
    for (const m of markers) {
      const idx = t.indexOf(m);
      if (idx !== -1 && (matnStart === -1 || idx < matnStart)) matnStart = idx;
    }
    const text = matnStart > 0 ? t.slice(matnStart + 1) : t;
    return text.slice(0, 120) + (text.length > 120 ? "â€¦" : "");
  };

  return (
    <div dir="rtl" className="px-4 pt-4">
      {/* Search input */}
      <div className="relative mb-5">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø£Ø­Ø§Ø¯ÙŠØ«â€¦"
          dir="rtl"
          className="w-full pr-9 pl-4 py-3 rounded-2xl text-sm font-arabic text-[var(--fg)] outline-none"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--muted)]">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-arabic">Ø¬Ø§Ø±Ù Ø§Ù„Ø¨Ø­Ø«â€¦</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Search size={36} className="text-[var(--muted)] opacity-30" />
          <p className="text-sm text-[var(--muted)] font-arabic">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Search size={36} className="text-[var(--muted)] opacity-20" />
          <p className="text-sm text-[var(--muted)] font-arabic">Ø§Ø¨Ø­Ø« ÙÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„ÙƒØªØ¨ Ø§Ù„ØªØ³Ø¹Ø©</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-3 pb-6">
          <p className="text-xs text-[var(--muted)] font-arabic">
            {results.length >= 50 ? "Ø£ÙƒØ«Ø± Ù…Ù† 50" : results.length} Ù†ØªÙŠØ¬Ø©
          </p>
          {results.map((r, i) => (
            <button
              key={i}
              dir="rtl"
              onClick={() => navigate(`/hadith/${r.bookKey}/${r.item.n}`)}
              className="w-full text-right rounded-xl overflow-hidden active:scale-95 transition-transform"
              style={{ background: "var(--card-bg)", border: `1px solid ${r.bookColor}33` }}
            >
              <div className="px-4 py-3">
                {/* Book tag */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: r.bookColor + "22", color: r.bookColor }}>
                    {r.bookTitle}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">Ø­{r.item.n}</span>
                  {r.item.g?.length > 0 && <GradeChip grade={r.item.g[0]!} />}
                </div>
                {/* Preview */}
                <p className="text-[12px] font-arabic text-[var(--fg)] leading-relaxed line-clamp-3">
                  {previewText(r.item.t)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */

export function HadithBooksPage() {
  const navigate = useNavigate();
  const { data: indexBooks } = useHadithIndex();
  const books = indexBooks ?? HADITH_BOOKS_STATIC;
  const [tab, setTab] = useState<"library" | "search">("library");

  // Sort by order
  const sorted = [...books].sort((a, b) => a.order - b.order);

  // Separate arba'iniyat from rest
  const arbaini = sorted.filter((b) => b.key === "nawawi" || b.key === "qudsi");
  const mainBooks = sorted.filter((b) => b.key !== "nawawi" && b.key !== "qudsi");

  const totalHadiths = sorted.reduce((s, b) => s + b.count, 0);

  return (
    <div dir="rtl" className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur-sm"
        style={{ background: "var(--bg)cc", borderBottom: "1px solid var(--card-border)" }}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
          aria-label="Ø±Ø¬ÙˆØ¹"
        >
          <ArrowRight size={20} className="text-[var(--fg)]" />
        </button>
        <div className="flex-1">
          <p className="font-bold text-base text-[var(--fg)] font-arabic leading-tight">Ø§Ù„ÙƒØªØ¨ Ø§Ù„Ø­Ø¯ÙŠØ«ÙŠØ©</p>
          <p className="text-xs text-[var(--muted)]">Ø§Ù„ÙƒØªØ¨ Ø§Ù„Ø³ØªØ© ÙˆÙ…Ø§ ÙŠÙ„Ø­Ù‚ Ø¨Ù‡Ø§</p>
        </div>
        <button
          onClick={() => navigate("/hadith/memo")}
          className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
          title="Ø¨Ø·Ø§Ù‚Ø§Øª Ø§Ù„Ø­ÙØ¸"
        >
          <BrainCircuit size={20} className="text-[var(--accent)]" />
        </button>
        <Library size={20} className="text-[var(--muted)]" />
      </div>

      {/* Stats banner */}
      <div className="mx-4 mt-4 mb-4 rounded-2xl px-5 py-3.5 flex items-center gap-4"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex-1 text-center border-l border-[var(--card-border)]">
          <p className="text-xl font-bold text-[var(--fg)] font-arabic">{sorted.length}</p>
          <p className="text-[10px] text-[var(--muted)]">ÙƒØªØ§Ø¨</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xl font-bold text-[var(--fg)] font-arabic">
            {totalHadiths >= 1000 ? `${Math.round(totalHadiths / 1000)}k` : totalHadiths.toLocaleString("ar-EG")}
          </p>
          <p className="text-[10px] text-[var(--muted)]">Ø­Ø¯ÙŠØ« Ù†Ø¨ÙˆÙŠ</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mx-4 mb-5 flex rounded-2xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        {(["library", "search"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-arabic transition-colors"
            style={tab === t
              ? { background: "var(--accent)", color: "#fff", fontWeight: 700 }
              : { color: "var(--muted)" }
            }
          >
            {t === "library" ? <BookOpen size={14} /> : <Search size={14} />}
            {t === "library" ? "Ø§Ù„Ù…ÙƒØªØ¨Ø©" : "Ø§Ù„Ø¨Ø­Ø«"}
          </button>
        ))}
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <div>
          {/* 7E: Ø§Ù„Ø£Ø±Ø¨Ø¹ÙŠÙ†ÙŠØ§Øª hero */}
          {arbaini.length > 0 && (
            <div className="px-4 mb-6">
              {/* Section heading */}
              <div className="relative mb-3 overflow-hidden rounded-2xl p-4"
                style={{ background: "linear-gradient(135deg, #84cc1622, #22c55e33)", border: "1px solid #84cc1644" }}>
                <StarField count={30} color="#84cc16" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">âœ¨</span>
                    <p className="text-base font-bold font-arabic text-[var(--fg)]">Ø§Ù„Ø£Ø±Ø¨Ø¹ÙŠÙ†ÙŠØ§Øª Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒØ©</p>
                  </div>
                  <p className="text-xs text-[var(--muted)] font-arabic leading-relaxed">
                    Ø§Ù„Ø£Ø­Ø§Ø¯ÙŠØ« Ø§Ù„Ù…Ø®ØªØ§Ø±Ø© Ø§Ù„ØªÙŠ ÙŠØ­ÙØ¸Ù‡Ø§ ÙƒÙ„ Ù…Ø³Ù„Ù…
                  </p>
                </div>
              </div>
              {/* Two arba'iniyat cards */}
              <div className="flex gap-3">
                {arbaini.map((b) => (
                  <ArbainiCard key={b.key} book={b} />
                ))}
              </div>
            </div>
          )}

          {/* Main books */}
          <div className="px-4 space-y-3 mb-4">
            <p className="text-xs text-[var(--muted)] font-arabic px-1">Ø§Ù„ÙƒØªØ¨ Ø§Ù„ÙƒØ¨Ø±Ù‰</p>
            {mainBooks.map((book) => (
              <BookCard key={book.key} book={book} />
            ))}
          </div>

          {/* Attribution */}
          <p className="text-center text-[10px] text-[var(--muted)] mt-2 px-4 pb-4 leading-relaxed font-arabic">
            Ø§Ù„Ù…ØµØ¯Ø±: Ù…Ø´Ø±ÙˆØ¹ hadith-api (Unlicense) â€¢ fawazahmed0/hadith-api
          </p>
        </div>
      )}

      {/* Search tab */}
      {tab === "search" && <SearchTab books={sorted} />}
    </div>
  );
}

export default HadithBooksPage;
