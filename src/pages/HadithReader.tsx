/**
 * HadithReader — Phase 7
 * Full hadith reader: isnad/matn split (7A), grade chip, memo card button, share-as-poster.
 * Route: /hadith/:bookKey/:hadithNumber
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Copy,
  Share2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  StickyNote,
  X,
  Check,
  BrainCircuit,
  BookOpenText,
  Hash,
} from "lucide-react";
import { useHadithPack, getHadithByNumber } from "@/data/useHadithBook";
import {
  HADITH_BOOKS_STATIC,
  HADITH_GRADE_LABELS,
  hadithRef,
  type HadithItem,
} from "@/data/hadithTypes";
import { useNoorStore } from "@/store/noorStore";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

// Split full hadith text into isnad (narrator chain) and matn (content)
function splitHadithText(text: string): { isnad: string; matn: string } {
  const markers = [
    " قَالَ:", " قَالَ :", "قال:",
    "أَنَّ رَسُولَ", "أن رسول الله",
    "عَنِ النَّبِيِّ", "عَنِ النَّبِيِّ صَلَّى",
  ];
  let earliest = -1;
  for (const m of markers) {
    const idx = text.indexOf(m);
    if (idx !== -1 && (earliest === -1 || idx < earliest)) earliest = idx;
  }
  if (earliest <= 0) return { isnad: "", matn: text };
  return { isnad: text.slice(0, earliest).trim(), matn: text.slice(earliest).trim() };
}

// Share-as-poster: draw a beautiful canvas card and share or download it
async function shareHadithPoster(opts: {
  matn: string;
  bookTitle: string;
  hadithNum: number;
  accentColor: string;
  grade: string;
}) {
  const W = 800, H = 560;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#07080b";
  const fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#f5f7ff";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial star dots
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97 + 37) % 800);
    const y = ((i * 53 + 19) % 560);
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = opts.accentColor + "55";
    ctx.fill();
  }

  // Card background
  ctx.fillStyle = opts.accentColor + "11";
  ctx.roundRect(40, 40, W - 80, H - 80, 24);
  ctx.fill();

  // Accent border
  ctx.strokeStyle = opts.accentColor + "44";
  ctx.lineWidth = 1.5;
  ctx.roundRect(40, 40, W - 80, H - 80, 24);
  ctx.stroke();

  // Grade pill
  const gradeLabel = HADITH_GRADE_LABELS[opts.grade] ?? opts.grade;
  const gradeColors: Record<string, string> = { sahih: "#10b981", hasan: "#f59e0b", daif: "#ef4444", maudu: "#6b7280" };
  const gradeColor = gradeColors[opts.grade] ?? opts.accentColor;
  ctx.fillStyle = gradeColor + "22";
  ctx.roundRect(64, 64, 80, 26, 13);
  ctx.fill();
  ctx.fillStyle = gradeColor;
  ctx.font = "bold 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(gradeLabel, 104, 81);

  // Matn text (RTL, multi-line)
  ctx.fillStyle = fg;
  ctx.font = "bold 22px 'Noto Naskh Arabic', serif";
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  const maxWidth = W - 130;
  const words = opts.matn.split(" ");
  let line = "";
  let y = 130;
  const lineH = 38;
  for (const word of words) {
    const test = word + " " + line;
    const m = ctx.measureText(test);
    if (m.width > maxWidth && line !== "") {
      ctx.fillText(line, W - 64, y);
      line = word;
      y += lineH;
      if (y > H - 120) { ctx.fillText(line + "…", W - 64, y); line = ""; break; }
    } else { line = test; }
  }
  if (line) ctx.fillText(line, W - 64, y);

  // Footer: book + number
  ctx.fillStyle = fg + "99";
  ctx.font = "14px system-ui";
  ctx.textAlign = "right";
  ctx.fillText(`${opts.bookTitle} — حديث ${opts.hadithNum}`, W - 64, H - 60);

  // App watermark
  ctx.fillStyle = opts.accentColor;
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("✦ أذكار نور", 64, H - 60);

  // Share or download
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  if (navigator.share && navigator.canShare?.({ files: [new File([blob], "hadith.png", { type: "image/png" })] })) {
    const file = new File([blob], "hadith.png", { type: "image/png" });
    await navigator.share({ files: [file] }).catch(() => {});
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = "hadith.png";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ------------------------------------------------------------------ */

function GradeChip({ g }: { g: string }) {
  const colors: Record<string, string> = {
    sahih: "#10b981",
    hasan: "#f59e0b",
    daif: "#ef4444",
    maudu: "#6b7280",
  };
  const color = colors[g] ?? "#6b7280";
  const label = HADITH_GRADE_LABELS[g] ?? g;
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function HadithReaderPage() {
  const { bookKey, hadithNumber } = useParams<{ bookKey: string; hadithNumber: string }>();
  const navigate = useNavigate();

  const n = parseInt(hadithNumber ?? "1", 10);
  const { data: pack, isLoading } = useHadithPack(bookKey);

  const { prefs, hadithBookmarks, toggleHadithBookmark, setHadithProgress, hadithNotes, setHadithNote, addHadithMemoCard, hadithMemoCards } = useNoorStore(
    (s) => ({
      prefs: s.prefs,
      hadithBookmarks: s.hadithBookmarks,
      toggleHadithBookmark: s.toggleHadithBookmark,
      setHadithProgress: s.setHadithProgress,
      hadithNotes: s.hadithNotes,
      setHadithNote: s.setHadithNote,
      addHadithMemoCard: s.addHadithMemoCard,
      hadithMemoCards: s.hadithMemoCards,
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
  const memoCardKey = `${bookKey}:${n}`;
  const isMemoCard = !!hadithMemoCards[memoCardKey];

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
    const { matn } = splitHadithText(hadith.t);
    await shareHadithPoster({
      matn: matn || hadith.t,
      bookTitle: meta?.title ?? "",
      hadithNum: hadith.a,
      accentColor,
      grade: hadith.g[0] ?? "",
    });
  };

  // Split text for display (7A)
  const hadithSplit = useMemo(() => {
    if (!hadith) return null;
    return splitHadithText(hadith.t);
  }, [hadith]);

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
    <div dir="rtl" className="min-h-screen-safe page-enter pb-floating-nav">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-3 pt-2 pb-3"
      >
        <Card className="relative overflow-hidden p-4">
          <div className="absolute inset-y-0 right-0 w-1.5" style={{ background: accentColor }} />
          <div className="absolute -left-10 -top-12 h-32 w-32 rounded-full opacity-15" style={{ background: accentColor }} />
          <div className="relative flex items-start gap-3 pr-2">
            <button
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-2xl border border-white/10 bg-white/6 grid place-items-center transition hover:bg-white/10 shrink-0"
              aria-label="رجوع"
            >
              <ArrowRight size={19} className="text-[var(--fg)]" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <BookOpenText size={15} style={{ color: accentColor }} />
                <span className="text-[11px] font-semibold opacity-55">قراءة حديثية</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums" style={{ background: accentColor + "22", color: accentColor }}>
                  ح {Number.isFinite(n) ? n.toLocaleString("ar-EG") : "—"}
                </span>
              </div>
              <h1 className="font-bold text-base text-[var(--fg)] font-arabic truncate">
                {meta?.title ?? bookKey}
              </h1>
              {sectionTitle && <p className="mt-1 text-[11px] text-[var(--muted)] truncate">{sectionTitle}</p>}
            </div>
            {isLoading && <Loader2 size={16} className="animate-spin text-[var(--muted)] shrink-0" />}
          </div>

          {/* Action buttons */}
          <div className="relative mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pr-2">
            <IconButton
              aria-label="بطاقة الحفظ"
              title="بطاقة الحفظ"
              onClick={() => {
                if (!isMemoCard) addHadithMemoCard(memoCardKey);
                navigate("/hadith/memo");
              }}
              className={cn(isMemoCard && "ring-1 ring-[var(--accent)]/40")}
            >
              <BrainCircuit size={18} style={{ color: isMemoCard ? accentColor : "var(--muted)" }} />
            </IconButton>
            <IconButton aria-label="حفظ" title="حفظ" onClick={() => bookKey && toggleHadithBookmark(bookKey, n)}>
              <Bookmark size={18} className={isBookmarked ? "fill-current" : ""} style={{ color: isBookmarked ? accentColor : "var(--muted)" }} />
            </IconButton>
            <IconButton aria-label="نسخ" title="نسخ" onClick={copyText}><Copy size={16} className="text-[var(--muted)]" /></IconButton>
            <IconButton aria-label="مشاركة" title="مشاركة" onClick={shareText}><Share2 size={16} className="text-[var(--muted)]" /></IconButton>
            <IconButton aria-label="ملاحظة" title="ملاحظة" onClick={() => { setDraftNote(existingNote); setShowNoteEditor((v) => !v); }}>
              <StickyNote size={16} className={existingNote ? "fill-current" : ""} style={{ color: existingNote ? accentColor : "var(--muted)" }} />
            </IconButton>
          </div>
        </Card>
      </div>

      <main className="mx-auto w-full max-w-3xl px-3 py-4 space-y-4">
        {/* Loading */}
        {isLoading && (
          <Card className="p-6">
            <div className="flex items-center justify-center gap-3 py-10 text-[var(--muted)]">
              <Loader2 className="animate-spin" />
              <span className="font-arabic text-sm">جاري التحميل…</span>
            </div>
          </Card>
        )}

        {/* Not found */}
        {!isLoading && !hadith && (
          <Card className="p-6 text-center">
            <p className="text-[var(--muted)] font-arabic py-10">الحديث غير موجود</p>
          </Card>
        )}

        {hadith && hadithSplit && (
          <>
            {/* Metadata card */}
            <Card className="relative overflow-hidden p-4">
              <div className="absolute inset-y-0 right-0 w-1.5 opacity-90" style={{ background: accentColor }} />
              <div className="flex items-start justify-between gap-3 pr-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: accentColor + "22", color: accentColor }}>
                      <Hash size={12} />
                      {hadith.a.toLocaleString("ar-EG")}
                    </span>
                    {hadith.g.map((g) => <GradeChip key={g} g={g} />)}
                    {sectionTitle && <Badge className="max-w-[240px] truncate px-2 py-0.5 text-[10px]">{sectionTitle}</Badge>}
                  </div>
                  <div className="text-xs opacity-60 leading-6">
                    {hadithRef(meta?.title ?? "", hadith.a)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Isnad */}
            {hadithSplit.isnad && (
              <Card className="relative overflow-hidden p-4">
                <div className="absolute inset-y-0 right-0 w-1 opacity-70" style={{ background: accentColor }} />
                <div className="pr-2">
                  <p className="mb-2 text-[11px] font-semibold opacity-55 font-arabic">الإسناد</p>
                  <p className="text-sm font-arabic text-[var(--fg)] opacity-65 leading-loose">
                    {hadithSplit.isnad}
                  </p>
                </div>
              </Card>
            )}

            {/* Matn */}
            <Card className="relative overflow-hidden p-5 md:p-6">
              <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full opacity-10" style={{ background: accentColor }} />
              <div className="absolute inset-y-0 right-0 w-1.5 opacity-90" style={{ background: accentColor }} />
              <div className="relative pr-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold opacity-55 font-arabic">المتن</p>
                  <span className="h-2 w-16 rounded-full" style={{ background: accentColor }} />
                </div>
                <p dir="rtl" className={`${fontSizeClass} arabic-text font-bold text-[var(--fg)] leading-[2.25]`}>
                  {hadithSplit.matn}
                </p>
              </div>
            </Card>
          </>
        )}

        {/* Note editor */}
        {showNoteEditor && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold opacity-55">ملاحظتي</span>
              <button onClick={() => setShowNoteEditor(false)} className="h-9 w-9 rounded-xl bg-white/6 border border-white/10 grid place-items-center opacity-70 hover:opacity-100" aria-label="إغلاق">
                <X size={14} />
              </button>
            </div>
            <textarea
              dir="rtl"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="أضف ملاحظتك هنا…"
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 resize-none outline-none font-arabic text-sm leading-7 placeholder:opacity-40 focus:border-[var(--accent)]/40"
              style={{ color: "var(--fg)" }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {existingNote && (
                <button
                  onClick={() => { bookKey && setHadithNote(bookKey, n, ""); setShowNoteEditor(false); }}
                  className="text-xs px-3 py-2 rounded-xl bg-white/6 border border-white/10 opacity-70 hover:opacity-100 transition"
                >
                  حذف
                </button>
              )}
              <button
                onClick={() => { bookKey && setHadithNote(bookKey, n, draftNote); setShowNoteEditor(false); }}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition press-effect"
                style={{ background: accentColor, color: "#06110d" }}
              >
                <Check size={12} /> حفظ
              </button>
            </div>
          </Card>
        )}

        {/* Display saved note (when editor closed) */}
        {!showNoteEditor && existingNote && (
          <button
            onClick={() => { setDraftNote(existingNote); setShowNoteEditor(true); }}
            className="w-full text-right rounded-3xl border px-4 py-3 text-sm font-arabic leading-7 transition press-effect glass"
            style={{ borderColor: accentColor + "44", background: accentColor + "11", color: "var(--fg)" }}
          >
            <span className="text-[10px] font-semibold opacity-60 block mb-1">ملاحظتي</span>
            {existingNote}
          </button>
        )}

        {/* Prev / Next */}
        {(prevN || nextN) && (
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <button
                disabled={!prevN}
                onClick={() => prevN && navigate(`/hadith/${bookKey}/${prevN}`, { replace: true })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-arabic text-sm disabled:opacity-30 transition border border-white/10 bg-white/6 press-effect"
              >
                <ChevronRight size={16} />
                السابق
              </button>
              <div className="min-w-12 text-xs text-[var(--muted)] text-center tabular-nums">
                {n.toLocaleString("ar-EG")}
              </div>
              <button
                disabled={!nextN}
                onClick={() => nextN && navigate(`/hadith/${bookKey}/${nextN}`, { replace: true })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-arabic text-sm disabled:opacity-30 transition press-effect"
                style={{ background: accentColor, color: "#06110d" }}
              >
                التالي
                <ChevronLeft size={16} />
              </button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

export default HadithReaderPage;
