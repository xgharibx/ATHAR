/**
 * HadithReader — Phase 2
 * Full hadith reader with prev/next, copy, bookmark, share.
 * Route: /hadith/:bookKey/:hadithNumber
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Copy,
  Share2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  StickyNote,
  X,
  Check,
} from "lucide-react";
import { useHadithPack, getHadithByNumber } from "@/data/useHadithBook";
import {
  HADITH_BOOKS_STATIC,
  hadithGradeLabel,
  hadithRef,
  type HadithItem,
} from "@/data/hadithTypes";
import { useNoorStore } from "@/store/noorStore";

/* ------------------------------------------------------------------ */

function GradeChip({ g }: { g: string }) {
  const colors: Record<string, string> = {
    sahih: "#10b981",
    hasan: "#3b82f6",
    daif: "#ef4444",
    maudu: "#6b7280",
  };
  const color = colors[g] ?? "#6b7280";
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: color + "22", color }}
    >
      {hadithGradeLabel(g)}
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function HadithReaderPage() {
  const { bookKey, hadithNumber } = useParams<{ bookKey: string; hadithNumber: string }>();
  const navigate = useNavigate();

  const n = parseInt(hadithNumber ?? "1", 10);
  const { data: pack, isLoading } = useHadithPack(bookKey);

  const { prefs, hadithBookmarks, toggleHadithBookmark, setHadithProgress, hadithNotes, setHadithNote } = useNoorStore(
    (s) => ({
      prefs: s.prefs,
      hadithBookmarks: s.hadithBookmarks,
      toggleHadithBookmark: s.toggleHadithBookmark,
      setHadithProgress: s.setHadithProgress,
      hadithNotes: s.hadithNotes,
      setHadithNote: s.setHadithNote,
    }),
  );

  const noteKey = `${bookKey}:${n}`;
  const existingNote = hadithNotes[noteKey] ?? "";
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  // Reset note editor when hadith changes
  useEffect(() => {
    setShowNoteEditor(false);
    setDraftNote("");
  }, [bookKey, n]);

  const hadith = useMemo<HadithItem | undefined>(() => {
    if (!pack) return undefined;
    return getHadithByNumber(pack, n);
  }, [pack, n]);

  const bookmarkKey = `${bookKey}:${n}`;
  const isBookmarked = !!hadithBookmarks[bookmarkKey];

  const meta = pack ?? HADITH_BOOKS_STATIC.find((b) => b.key === bookKey);
  const accentColor = meta?.color ?? "#10b981";

  // Find prev / next hadith numbers
  const { prevN, nextN } = useMemo(() => {
    if (!pack) return { prevN: null, nextN: null };
    const hadiths = pack.hadiths;
    const idx = hadiths.findIndex((h) => h.n === n);
    if (idx < 0) return { prevN: null, nextN: null };
    return {
      prevN: idx > 0 ? hadiths[idx - 1].n : null,
      nextN: idx < hadiths.length - 1 ? hadiths[idx + 1].n : null,
    };
  }, [pack, n]);

  // Track reading progress
  useEffect(() => {
    if (bookKey && n > 0) setHadithProgress(bookKey, n);
  }, [bookKey, n, setHadithProgress]);

  // Section name
  const sectionTitle = useMemo(() => {
    if (!pack || !hadith) return null;
    return pack.sections.find((s) => s.id === hadith.s)?.title ?? null;
  }, [pack, hadith]);

  const copyText = () => {
    if (!hadith) return;
    const text = `${hadith.t}\n\n— ${hadithRef(meta?.title ?? "", hadith.a)}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const shareText = async () => {
    if (!hadith) return;
    const text = `${hadith.t}\n\n— ${hadithRef(meta?.title ?? "", hadith.a)}`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      copyText();
    }
  };

  const fontSizeClass = useMemo(() => {
    const scale = (prefs as Record<string, unknown>).hadithFontScale;
    if (typeof scale === "number") {
      if (scale <= 0.85) return "text-base";
      if (scale <= 1.0) return "text-lg";
      if (scale <= 1.2) return "text-xl";
      return "text-2xl";
    }
    return "text-xl";
  }, [prefs]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
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
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--fg)] font-arabic truncate">
            {meta?.title ?? bookKey}
          </p>
          {sectionTitle && (
            <p className="text-[11px] text-[var(--muted)] truncate">{sectionTitle}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => bookKey && toggleHadithBookmark(bookKey, n)}
            className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
            title="حفظ"
          >
            <Bookmark
              size={18}
              className={isBookmarked ? "fill-current" : ""}
              style={{ color: isBookmarked ? accentColor : "var(--muted)" }}
            />
          </button>
          <button
            onClick={copyText}
            className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
            title="نسخ"
          >
            <Copy size={16} className="text-[var(--muted)]" />
          </button>
          <button
            onClick={shareText}
            className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
            title="مشاركة"
          >
            <Share2 size={16} className="text-[var(--muted)]" />
          </button>
          <button
            onClick={() => { setDraftNote(existingNote); setShowNoteEditor((v) => !v); }}
            className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
            title="تدوين ملاحظة"
          >
            <StickyNote
              size={16}
              className={existingNote ? "fill-current" : ""}
              style={{ color: existingNote ? accentColor : "var(--muted)" }}
            />
          </button>
        </div>

        {isLoading && <Loader2 size={16} className="animate-spin text-[var(--muted)]" />}
      </div>

      {/* Body */}
      <div dir="rtl" className="flex-1 px-5 py-6 overflow-y-auto">
        {/* Reference row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {hadith?.g.map((g) => <GradeChip key={g} g={g} />)}
          </div>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: accentColor + "22", color: accentColor }}
          >
            ح {hadith?.a.toLocaleString("ar-EG") ?? "—"}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-20 text-[var(--muted)]">
            <Loader2 className="animate-spin" />
            <span className="font-arabic text-sm">جاري التحميل…</span>
          </div>
        )}

        {/* Not found */}
        {!isLoading && !hadith && (
          <p className="text-[var(--muted)] font-arabic text-center py-20">
            الحديث غير موجود
          </p>
        )}

        {/* Full text */}
        {hadith && (
          <p
            dir="rtl"
            className={`${fontSizeClass} font-arabic text-[var(--fg)] leading-loose`}
          >
            {hadith.t}
          </p>
        )}

        {/* Note editor */}
        {showNoteEditor && (
          <div
            dir="rtl"
            className="mt-5 rounded-2xl border p-4 space-y-3"
            style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold opacity-55">ملاحظتي</span>
              <button onClick={() => setShowNoteEditor(false)} className="opacity-50 hover:opacity-80">
                <X size={14} />
              </button>
            </div>
            <textarea
              dir="rtl"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="أضف ملاحظتك هنا…"
              rows={4}
              className="w-full bg-transparent resize-none outline-none font-arabic text-sm leading-7 placeholder:opacity-40"
              style={{ color: "var(--fg)" }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {existingNote && (
                <button
                  onClick={() => { bookKey && setHadithNote(bookKey, n, ""); setShowNoteEditor(false); }}
                  className="text-xs px-3 py-1.5 rounded-xl opacity-50 hover:opacity-80 transition"
                  style={{ background: "var(--card-border)" }}
                >
                  حذف
                </button>
              )}
              <button
                onClick={() => { bookKey && setHadithNote(bookKey, n, draftNote); setShowNoteEditor(false); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold transition"
                style={{ background: accentColor, color: "#fff" }}
              >
                <Check size={12} /> حفظ
              </button>
            </div>
          </div>
        )}

        {/* Display saved note (when editor closed) */}
        {!showNoteEditor && existingNote && (
          <button
            dir="rtl"
            onClick={() => { setDraftNote(existingNote); setShowNoteEditor(true); }}
            className="mt-4 w-full text-right rounded-2xl border px-4 py-3 text-sm font-arabic leading-7 opacity-70 hover:opacity-100 transition"
            style={{ borderColor: accentColor + "44", background: accentColor + "11", color: "var(--fg)" }}
          >
            <span className="text-[10px] font-semibold opacity-60 block mb-1">ملاحظتي</span>
            {existingNote}
          </button>
        )}
      </div>

      {/* Prev / Next bottom bar */}
      <div
        dir="rtl"
        className="sticky bottom-0 flex items-center gap-2 px-4 py-3 backdrop-blur-sm"
        style={{ background: "var(--bg)ee", borderTop: "1px solid var(--card-border)" }}
      >
        {/* Previous (goes up in number — forward in reading RTL) */}
        <button
          disabled={!prevN}
          onClick={() => prevN && navigate(`/hadith/${bookKey}/${prevN}`, { replace: true })}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-arabic text-sm disabled:opacity-30 transition"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <ChevronRight size={16} />
          السابق
        </button>

        {/* Number indicator */}
        <div className="text-xs text-[var(--muted)] text-center w-12 shrink-0">
          {n.toLocaleString("ar-EG")}
        </div>

        {/* Next */}
        <button
          disabled={!nextN}
          onClick={() => nextN && navigate(`/hadith/${bookKey}/${nextN}`, { replace: true })}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-arabic text-sm disabled:opacity-30 transition"
          style={{ background: accentColor, color: "#fff" }}
        >
          التالي
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}

export default HadithReaderPage;
