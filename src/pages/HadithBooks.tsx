/**
 * HadithBooks — Phase 2
 * Gallery of all 9 hadith books. Tap to open a book.
 * Route: /hadith
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowRight, Library } from "lucide-react";
import { HADITH_BOOKS_STATIC, type HadithBookMeta } from "@/data/hadithTypes";
import { useHadithIndex } from "@/data/useHadithBook";
import { useNoorStore } from "@/store/noorStore";

/* ------------------------------------------------------------------ */

function BookCard({ book }: { book: HadithBookMeta }) {
  const navigate = useNavigate();
  const hadithProgress = useNoorStore((s) => s.hadithProgress);
  const lastN = hadithProgress[book.key];

  const gradeLabel =
    book.grade === "sahih" ? "صحيح" : book.grade === "mixed" ? "مختلط" : book.grade;

  return (
    <button
      dir="rtl"
      onClick={() => navigate(`/hadith/${book.key}`)}
      className="relative w-full text-right rounded-2xl overflow-hidden shadow-md active:scale-95 transition-transform"
      style={{ background: `linear-gradient(135deg, ${book.color}22, ${book.color}44)` }}
    >
      {/* Accent stripe */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full rounded-l-full"
        style={{ background: book.color }}
      />

      <div className="px-4 py-4 pr-5">
        {/* Order badge + grade */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: book.color + "33", color: book.color }}
          >
            {gradeLabel}
          </span>
          <span className="text-xs text-[var(--muted)] font-arabic">{book.order}</span>
        </div>

        {/* Title */}
        <p className="text-base font-bold font-arabic text-[var(--fg)] leading-snug mb-0.5">
          {book.title}
        </p>
        <p className="text-[11px] text-[var(--muted)] mb-2">{book.titleEn}</p>

        {/* Description (1 line) */}
        <p className="text-[11px] text-[var(--fg)] opacity-70 leading-snug line-clamp-2 font-arabic mb-3">
          {book.description}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[var(--muted)] text-xs">
            <BookOpen size={12} />
            <span>{book.count.toLocaleString("ar-EG")} حديث</span>
          </div>
          {lastN ? (
            <span className="text-[10px] text-[var(--muted)]">
              آخر قراءة: ح{lastN.toLocaleString("ar-EG")}
            </span>
          ) : null}
          <ArrowRight size={14} className="text-[var(--muted)] rotate-180" />
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */

export function HadithBooksPage() {
  const navigate = useNavigate();
  const { data: indexBooks } = useHadithIndex();
  const books = indexBooks ?? HADITH_BOOKS_STATIC;

  // Sort by order field
  const sorted = [...books].sort((a, b) => a.order - b.order);

  const totalHadiths = sorted.reduce((s, b) => s + b.count, 0);

  return (
    <div dir="rtl" className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur-sm"
        style={{ background: "var(--bg)cc", borderBottom: "1px solid var(--card-border)" }}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
          aria-label="رجوع"
        >
          <ArrowRight size={20} className="text-[var(--fg)]" />
        </button>
        <div className="flex-1">
          <p className="font-bold text-base text-[var(--fg)] font-arabic leading-tight">الكتب الحديثية</p>
          <p className="text-xs text-[var(--muted)]">الكتب الستة وما يلحق بها</p>
        </div>
        <Library size={22} className="text-[var(--muted)]" />
      </div>

      {/* Stats banner */}
      <div className="mx-4 mt-4 mb-5 rounded-2xl px-5 py-4 flex items-center gap-4"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="flex-1 text-center border-l border-[var(--card-border)]">
          <p className="text-2xl font-bold text-[var(--fg)] font-arabic">{sorted.length}</p>
          <p className="text-xs text-[var(--muted)]">كتاب</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-2xl font-bold text-[var(--fg)] font-arabic">
            {totalHadiths >= 1000
              ? `${Math.round(totalHadiths / 1000)}k`
              : totalHadiths.toLocaleString("ar-EG")}
          </p>
          <p className="text-xs text-[var(--muted)]">حديث نبوي</p>
        </div>
      </div>

      {/* Books grid */}
      <div className="px-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map((book) => (
          <BookCard key={book.key} book={book} />
        ))}
      </div>

      {/* Attribution */}
      <p className="text-center text-[10px] text-[var(--muted)] mt-6 px-4 pb-4 leading-relaxed font-arabic">
        المصدر: مشروع hadith-api (Unlicense) • fawazahmed0/hadith-api
      </p>
    </div>
  );
}

export default HadithBooksPage;
