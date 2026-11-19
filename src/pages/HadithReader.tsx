/**
 * Reading one hadith: its chapter, the chain of narrators (as a tappable
 * chain, plain text, or hidden), the matn in your reading size (with or
 * without harakat), the grading, and the explanation. Swipe or use the
 * arrow keys for the next and previous hadith.
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
  User,
  ExternalLink,
  Type,
  Minus,
  Plus,
} from "lucide-react";
import { useHadithPrefs, withoutHarakat, TEXT_SCALE_MAX, TEXT_SCALE_MIN, type IsnadView } from "@/lib/hadithPrefs";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { useHadithPack, getHadithByNumber } from "@/data/useHadithBook";
import { getSharhIdFor } from "@/lib/hadithSharhLinks";
import { parseIsnadChain } from "@/lib/isnadParser";
import { lookupNarratorBio, type NarratorBio } from "@/lib/narratorLookup";
import { useTakhrij } from "@/lib/useTakhrij";
import { cleanHadithText, splitHadithText } from "@/lib/hadithText";
import { TakhrijCard } from "@/components/hadith/TakhrijCard";
import { SharhSection } from "@/components/hadith/SharhSection";
import {
  HADITH_BOOKS_STATIC,
  HADITH_GRADE_LABELS,
  hadithRef,
  type HadithItem,
} from "@/data/hadithTypes";
import { useShallow } from "zustand/react/shallow";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import toast from "react-hot-toast";
import { arNum } from "@/lib/formatNumber";
import { PremiumShareComposer } from "@/components/share/PremiumShareComposer";
import type { PosterContent } from "@/lib/premiumPoster";


/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */

export function HadithReaderPage() {
  const { bookKey, hadithNumber } = useParams<{ bookKey: string; hadithNumber: string }>();
  const navigate = useNavigate();
  useScrollRestoration();

  const n = parseInt(hadithNumber ?? "1", 10);
  const { data: pack, isLoading, isError, refetch } = useHadithPack(bookKey);

  const { hadithBookmarks, toggleHadithBookmark, setHadithProgress, hadithNotes, setHadithNote, addHadithMemoCard, hadithMemoCards } = useNoorStore(
    useShallow((s) => ({
      hadithBookmarks: s.hadithBookmarks,
      toggleHadithBookmark: s.toggleHadithBookmark,
      setHadithProgress: s.setHadithProgress,
      hadithNotes: s.hadithNotes,
      setHadithNote: s.setHadithNote,
      addHadithMemoCard: s.addHadithMemoCard,
      hadithMemoCards: s.hadithMemoCards,
    })),
  );
  // The matn honours the app-wide reading size + line-height (Settings →
  // حجم الخط), same preference the adhkar and Quran text follow — matters
  // most for older readers who scale everything up.
  const fontScale = useNoorStore((s) => s.prefs.fontScale);
  const lineHeight = useNoorStore((s) => s.prefs.lineHeight);

  const { textScale, isnadView, harakat, setTextScale, setIsnadView, setHarakat, setLast } = useHadithPrefs();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const show = (t: string) => (harakat ? t : withoutHarakat(t));

  const noteKey = `${bookKey}:${n}`;
  const existingNote = hadithNotes[noteKey] ?? "";
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  // Real explanation link, where hadeethenc.com happens to carry this exact
  // hadith (matched by text, not guessed — see hadithSharhLinks.ts). Most
  // hadiths won't have one; the button only shows when a match exists.
  const [sharhId, setSharhId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSharhId(null);
    if (!bookKey || !n) return;
    getSharhIdFor(bookKey, n).then((id) => { if (alive) setSharhId(id); });
    return () => { alive = false; };
  }, [bookKey, n]);

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
  const accentColor = "var(--accent)";

  // Find prev / next hadith numbers
  const { prevN, nextN, position } = useMemo(() => {
    if (!pack) return { prevN: null, nextN: null, position: 0 };
    const hadiths = pack.hadiths;
    const idx = hadiths.findIndex((h) => h.n === n);
    if (idx < 0) return { prevN: null, nextN: null, position: 0 };
    return {
      prevN: idx > 0 ? hadiths[idx - 1].n : null,
      nextN: idx < hadiths.length - 1 ? hadiths[idx + 1].n : null,
      position: idx + 1,
    };
  }, [pack, n]);

  // Track reading progress
  useEffect(() => {
    if (!bookKey || !(n > 0)) return;
    setHadithProgress(bookKey, n);
    setLast(bookKey, n);
  }, [bookKey, n, setHadithProgress, setLast]);

  // Arrow keys turn the page, the way an Arabic book turns: left is next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowLeft" && nextN) navigate(`/hadith/${bookKey}/${nextN}`, { replace: true });
      else if (e.key === "ArrowRight" && prevN) navigate(`/hadith/${bookKey}/${prevN}`, { replace: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bookKey, nextN, prevN, navigate]);

  // A horizontal swipe on the text does the same.
  const swipe = React.useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipe.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipe.current;
    swipe.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    if (dx > 0 && nextN) navigate(`/hadith/${bookKey}/${nextN}`, { replace: true });
    else if (dx < 0 && prevN) navigate(`/hadith/${bookKey}/${prevN}`, { replace: true });
  };

  // Section name
  const sectionTitle = useMemo(() => {
    if (!pack || !hadith) return null;
    return pack.sections.find((s) => s.id === hadith.s)?.title ?? null;
  }, [pack, hadith]);

  const copyText = async () => {
    if (!hadith) return;
    const text = `${cleanHadithText(hadith.t)}\n\n— ${hadithRef(meta?.title ?? "", hadith.a)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const [posterOpen, setPosterOpen] = useState(false);
  const posterContent = useMemo<PosterContent | null>(() => {
    if (!hadith) return null;
    const { matn } = splitHadithText(hadith.t);
    const grade = hadith.g[0] ?? "";
    return {
      kind: "hadith",
      text: matn || hadith.t,
      heading: meta?.title ?? "",
      reference: `الحديث ${arNum(hadith.a)}`,
      grade: grade ? (HADITH_GRADE_LABELS[grade] ?? grade) : undefined,
    };
  }, [hadith, meta?.title]);
  const shareText = async () => {
    if (posterContent) setPosterOpen(true);
  };

  // Split text for display (7A)
  const hadithSplit = useMemo(() => {
    if (!hadith) return null;
    return splitHadithText(hadith.t);
  }, [hadith]);

  // Isnad as a chain of narrator links, for the tappable chain visual.
  const isnadChain = useMemo(() => parseIsnadChain(hadithSplit?.isnad ?? ""), [hadithSplit]);

  // Real grading (takhrij) from dorar.net — who graded this hadith and what
  // they said, not just a flat "sahih"/"hasan" tag. See useTakhrij for the
  // bundled-then-live lookup strategy (shared by every hadith surface).
  const { takhrij, loading: takhrijLoading } = useTakhrij(bookKey, n, hadithSplit?.matn);

  // Narrator bio popup — opened by tapping a link in the chain.
  const [narratorPopup, setNarratorPopup] = useState<{ name: string; bio: NarratorBio | null; loading: boolean } | null>(null);
  const openNarrator = (name: string) => {
    setNarratorPopup({ name, bio: null, loading: true });
    lookupNarratorBio(name).then((bio) => {
      setNarratorPopup((prev) => (prev && prev.name === name ? { name, bio, loading: false } : prev));
    });
  };


  return (
    <div dir="rtl" className="relative min-h-screen-safe overflow-hidden page-enter pb-floating-nav">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" aria-hidden />
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-3 pt-2 pb-3"
      >
        <Card className="relative overflow-hidden p-4">
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
          <div className="absolute inset-y-0 right-0 w-1.5" style={{ background: accentColor }} />
          <div className="relative flex items-start gap-3 pr-2">
            <button type="button"
              onClick={() => navigate(-1)}
              className="h-11 w-11 rounded-2xl border border-(--stroke) bg-(--card) grid place-items-center transition hover:bg-(--card-2) shrink-0"
              aria-label="رجوع"
            >
              <ArrowRight size={19} aria-hidden="true" className="text-(--fg)" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-base text-(--fg) font-arabic truncate">
                {meta?.title ?? bookKey}
              </h1>
              <button type="button" onClick={() => navigate(`/hadith/${bookKey}`)} className="mt-0.5 flex max-w-full items-center gap-1.5 text-[12px] text-(--muted) text-right">
                <BookOpenText size={13} aria-hidden="true" className="shrink-0" style={{ color: accentColor }} />
                <span className="truncate">
                  {sectionTitle ? `${sectionTitle}، ` : ""}الحديث {Number.isFinite(n) ? arNum(hadith?.a ?? n) : "—"}
                </span>
              </button>
            </div>
            {isLoading && <Loader2 size={16} aria-hidden="true" className="animate-spin text-(--muted) shrink-0" />}
          </div>

          {/* Action buttons */}
          <div className="relative mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pr-2">
            <IconButton
              aria-label={isMemoCard ? "في بطاقات الحفظ، افتحها" : "أضف إلى بطاقات الحفظ"}
              aria-pressed={isMemoCard}
              onClick={() => {
                if (isMemoCard) {
                  navigate("/hadith/memo");
                  return;
                }
                addHadithMemoCard(memoCardKey);
                toast.success("أُضيف إلى بطاقات الحفظ، وتبدأ مراجعته اليوم", { duration: 2200 });
              }}
              className={cn(isMemoCard && "ring-1 ring-accent-40")}
            >
              <BrainCircuit size={18} aria-hidden="true" style={{ color: isMemoCard ? accentColor : "var(--muted)" }} />
            </IconButton>
            <IconButton aria-label={isBookmarked ? "إزالة من محفوظاتي" : "أضف إلى محفوظاتي"} aria-pressed={isBookmarked} onClick={() => bookKey && toggleHadithBookmark(bookKey, n)}>
              <Bookmark size={18} aria-hidden="true" className={isBookmarked ? "fill-current" : ""} style={{ color: isBookmarked ? accentColor : "var(--muted)" }} />
            </IconButton>
            <IconButton aria-label="نسخ" onClick={copyText}><Copy size={16} aria-hidden="true" className="text-(--muted)" /></IconButton>
            <IconButton aria-label="مشاركة" onClick={shareText}><Share2 size={16} aria-hidden="true" className="text-(--muted)" /></IconButton>
            <IconButton aria-label="إعدادات القراءة" onClick={() => setSettingsOpen(true)}><Type size={16} aria-hidden="true" className="text-(--muted)" /></IconButton>
            <IconButton aria-label="ملاحظة" aria-pressed={showNoteEditor} onClick={() => { setDraftNote(existingNote); setShowNoteEditor((v) => !v); }}>
              <StickyNote size={16} aria-hidden="true" className={existingNote ? "fill-current" : ""} style={{ color: existingNote ? accentColor : "var(--muted)" }} />
            </IconButton>
          </div>
        </Card>
      </div>

      <main className="mx-auto w-full max-w-3xl px-3 py-4 stack-y-4">
        {/* Loading */}
        {isLoading && (
          <Card className="p-6" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-center gap-3 py-10 text-(--muted)">
              <Loader2 aria-hidden="true" className="animate-spin" />
              <span className="font-arabic text-sm">جاري التحميل…</span>
            </div>
          </Card>
        )}

        {/* Not found */}
        {!isLoading && !hadith && (
          <Card className="p-6 text-center">
            <p className="text-(--muted) font-arabic py-6">
              {isError ? "تعذّر تحميل كتاب الأحاديث" : "الحديث غير موجود"}
            </p>
            {isError && (
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-xl border border-(--stroke) px-4 py-2 text-sm font-arabic text-(--accent) transition hover:bg-(--card)"
              >
                إعادة المحاولة
              </button>
            )}
          </Card>
        )}

        {/* Text genuinely missing from this edition — a real gap in the
            bundled data (~1% of entries, mostly in صحيح مسلم), not a load
            failure. Say so honestly instead of showing a blank card. */}
        {hadith && !hadith.t.trim() && (
          <Card className="p-6 text-center">
            <p className="text-sm font-arabic opacity-70 py-6">
              نص هذا الحديث غير متوفر في هذه النسخة الرقمية.
              <br />
              <span className="text-xs opacity-60">استخدم أزرار «السابق» أو «التالي» للانتقال إلى حديث آخر.</span>
            </p>
          </Card>
        )}

        {hadith && hadith.t.trim() && hadithSplit && (
          <>
            {/* Reading order: الإسناد → المتن → الحكم والتخريج → الشرح.
                Chain of narration, then the hadith itself (the hero), then
                the ruling, then the scholarly explanation — all on one page,
                nothing hidden behind a "read it elsewhere" link. */}

            {/* 1) Isnad — chain of tappable narrator links */}
            {hadithSplit.isnad && isnadView !== "hidden" && (
              <Card className="relative overflow-hidden p-4">
                <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
                <div className="absolute inset-y-0 right-0 w-1 opacity-70" style={{ background: accentColor }} />
                <div className="relative pr-2">
                  <p className="mb-3 text-[11px] font-semibold opacity-55 font-arabic">
                    الإسناد {isnadView === "chain" && isnadChain.length > 0 && <span className="opacity-60">، اضغط على راوٍ لتعرفه</span>}
                  </p>
                  {isnadView === "chain" && isnadChain.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2" dir="rtl">
                      {isnadChain.map((link, i) => (
                        <React.Fragment key={i}>
                          <button type="button"
                            onClick={() => openNarrator(link.name)}
                            className="inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-arabic transition hover:brightness-110 active:scale-95"
                            style={{
                              borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                              background: narratorPopup?.name === link.name ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--card)",
                            }}
                          >
                            <User size={11} aria-hidden="true" style={{ color: accentColor }} />
                            {show(link.name)}
                          </button>
                          {i < isnadChain.length - 1 && (
                            <ChevronLeft size={13} aria-hidden="true" className="opacity-30 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-arabic text-(--fg) opacity-65 leading-loose">
                      {show(hadithSplit.isnad)}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Narrator bio popup */}
            {narratorPopup && (
              <Card className="relative overflow-hidden p-4">
                <div className="absolute inset-y-0 right-0 w-1 opacity-70" style={{ background: accentColor }} />
                <div className="relative pr-2">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={16} aria-hidden="true" style={{ color: accentColor }} className="shrink-0" />
                      <h2 className="text-sm font-bold font-arabic truncate">{narratorPopup.bio?.name ?? narratorPopup.name}</h2>
                    </div>
                    <IconButton aria-label="إغلاق" onClick={() => setNarratorPopup(null)}><X size={14} aria-hidden="true" /></IconButton>
                  </div>

                  {narratorPopup.loading && (
                    <div className="flex items-center gap-2 py-4 text-xs opacity-55">
                      <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                      جارٍ البحث عن ترجمة الراوي…
                    </div>
                  )}

                  {!narratorPopup.loading && !narratorPopup.bio && (
                    <p className="text-xs opacity-55 py-3">
                      لم يُعثر على ترجمة موثوقة لهذا الاسم. قد يكون مذكوراً بكنية أو اسم مختصر يصعب مطابقته تلقائياً.
                    </p>
                  )}

                  {!narratorPopup.loading && narratorPopup.bio && (
                    <>
                      <p className="text-sm leading-7 opacity-80">{narratorPopup.bio.extract}</p>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full opacity-55" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>
                          {narratorPopup.bio.source === "companion" ? "من صفحة الصحابة داخل التطبيق" : "من ويكيبيديا العربية"}
                        </span>
                        {narratorPopup.bio.companionId && (
                          <button type="button"
                            onClick={() => navigate(`/companions?open=${narratorPopup.bio!.companionId}`)}
                            className="text-[11px] font-semibold flex items-center gap-1"
                            style={{ color: accentColor }}
                          >
                            السيرة الكاملة <ChevronLeft size={11} aria-hidden="true" />
                          </button>
                        )}
                        {narratorPopup.bio.url && (
                          <a href={narratorPopup.bio.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-semibold flex items-center gap-1" style={{ color: accentColor }}
                          >
                            ويكيبيديا <ExternalLink size={11} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* 2) المتن — the hadith itself (the hero) */}
            <Card className="relative overflow-hidden p-5 md:p-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
              <div className="absolute inset-y-0 right-0 w-1.5 opacity-90" style={{ background: accentColor }} />
              <div className="relative pr-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold opacity-55 font-arabic">المتن</p>
                  <span className="h-2 w-16 rounded-full" style={{ background: accentColor }} />
                </div>
                <p dir="rtl" className="arabic-text font-bold text-(--fg)"
                  style={{ fontSize: `${(fontScale * 1.32 * textScale).toFixed(3)}rem`, lineHeight: Math.max(lineHeight, 2) }}>
                  {show(hadithSplit.matn)}
                </p>
                {meta?.title && (
                  <p className="mt-4 text-xs opacity-55 leading-6">{hadithRef(meta.title, hadith.a)}</p>
                )}
              </div>
            </Card>

            {/* 3) الحكم والتخريج — who narrated it, who graded it, and the ruling */}
            <TakhrijCard
              takhrij={takhrij}
              loading={takhrijLoading}
              grades={hadith.g}
              accentColor={accentColor}
            />

            {/* 4) الشرح الميسّر — the scholarly explanation, inline */}
            <SharhSection sharhId={sharhId} matn={hadithSplit.matn} accentColor={accentColor} />
          </>
        )}

        {/* Note editor */}
        {showNoteEditor && (
          <Card className="p-4 stack-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold opacity-55">ملاحظتي</span>
              <button type="button" onClick={() => setShowNoteEditor(false)} className="h-9 w-9 rounded-xl bg-(--card) border border-(--stroke) grid place-items-center opacity-70 hover:opacity-100" aria-label="إغلاق">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <textarea
              dir="rtl"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="أضف ملاحظتك هنا…"
              aria-label="ملاحظة الحديث"
              rows={4}
              className="w-full rounded-2xl border border-(--stroke) bg-(--card) px-4 py-3 resize-none outline-hidden font-arabic text-sm leading-7 placeholder:opacity-40 focus:border-accent-40"
              style={{ color: "var(--fg)" }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {existingNote && (
                <button type="button"
                  onClick={() => { bookKey && setHadithNote(bookKey, n, ""); setShowNoteEditor(false); }}
                  className="text-xs px-3 py-2 rounded-xl bg-(--card) border border-(--stroke) opacity-70 hover:opacity-100 transition"
                >
                  حذف
                </button>
              )}
              <button type="button"
                onClick={() => { bookKey && setHadithNote(bookKey, n, draftNote); setShowNoteEditor(false); }}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition press-effect"
                style={{ background: accentColor, color: "var(--on-accent)" }}
              >
                <Check size={12} aria-hidden="true" /> حفظ
              </button>
            </div>
          </Card>
        )}

        {/* Display saved note (when editor closed) */}
        {!showNoteEditor && existingNote && (
          <button type="button"
            onClick={() => { setDraftNote(existingNote); setShowNoteEditor(true); }}
            className="w-full text-right rounded-3xl border px-4 py-3 text-sm font-arabic leading-7 transition press-effect glass"
            style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)", color: "var(--fg)" }}
          >
            <span className="text-[10px] font-semibold opacity-60 block mb-1">ملاحظتي</span>
            {existingNote}
          </button>
        )}

        {/* Prev / Next */}
        {(prevN || nextN) && (
          <Card className="p-3" aria-label="التنقل بين الأحاديث" role="navigation">
            <div className="flex items-center gap-2">
              <button type="button"
                disabled={!prevN}
                aria-label="الحديث السابق"
                onClick={() => prevN && navigate(`/hadith/${bookKey}/${prevN}`, { replace: true })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-arabic text-sm disabled:opacity-30 transition border border-(--stroke) bg-(--card) press-effect"
              >
                <ChevronRight size={16} aria-hidden="true" />
                السابق
              </button>
              <div className="min-w-16 text-[11px] text-(--muted) text-center leading-4" aria-live="polite" aria-atomic="true">
                {position && pack ? <>{arNum(position)}<br />من {arNum(pack.hadiths.length)}</> : arNum(n)}
              </div>
              <button type="button"
                disabled={!nextN}
                aria-label="الحديث التالي"
                onClick={() => nextN && navigate(`/hadith/${bookKey}/${nextN}`, { replace: true })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-arabic text-sm disabled:opacity-30 transition press-effect"
                style={{ background: accentColor, color: "var(--on-accent)" }}
              >
                التالي
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
            </div>
          </Card>
        )}
      </main>
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} ariaLabel="إعدادات القراءة">
        <div dir="rtl" className="p-5 stack-y-5">
          <h2 className="text-base font-bold flex items-center gap-2"><Type size={18} aria-hidden="true" className="text-(--accent)" /> إعدادات القراءة</h2>
          <div>
            <p className="mb-2 text-xs font-semibold text-(--muted)">حجم نص الحديث</p>
            <div className="flex items-center gap-3">
              <IconButton aria-label="تصغير" disabled={textScale <= TEXT_SCALE_MIN} onClick={() => setTextScale(textScale - 0.1)}><Minus size={16} aria-hidden="true" /></IconButton>
              <div className="flex-1 text-center arabic-text font-bold" style={{ fontSize: `${(fontScale * 1.1 * textScale).toFixed(3)}rem` }}>
                {show("إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ")}
              </div>
              <IconButton aria-label="تكبير" disabled={textScale >= TEXT_SCALE_MAX} onClick={() => setTextScale(textScale + 0.1)}><Plus size={16} aria-hidden="true" /></IconButton>
            </div>
            <p className="mt-1 text-center text-[11px] text-(--muted)">{arNum(Math.round(textScale * 100))}٪</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-(--muted)">الإسناد</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="عرض الإسناد">
              {([["chain", "سلسلة رواة"], ["text", "نصًّا"], ["hidden", "إخفاؤه"]] as [IsnadView, string][]).map(([v, label]) => (
                <button key={v} type="button" role="radio" aria-checked={isnadView === v} onClick={() => setIsnadView(v)}
                  className={cn("rounded-2xl border px-2 py-2.5 text-[13px]", isnadView === v ? "bg-(--accent) text-(--on-accent) border-transparent font-bold" : "bg-(--card) border-(--stroke)")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold">التشكيل</span>
              <span className="block text-[11px] text-(--muted)">أخفِه لقراءة أسرع، وأظهره للضبط والحفظ</span>
            </span>
            <Switch checked={harakat} onCheckedChange={setHarakat} aria-label="إظهار التشكيل" />
          </label>
        </div>
      </Modal>
      {posterOpen && posterContent && (
        <PremiumShareComposer
          open={posterOpen}
          onClose={() => setPosterOpen(false)}
          content={posterContent}
          title={hadithRef(meta?.title ?? "حديث", hadith?.a ?? n)}
          filename={`athar-hadith-${bookKey ?? ""}-${hadith?.a ?? n}.png`}
        />
      )}
    </div>
  );
}

export default HadithReaderPage;
