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
  Info,
  User,
  ExternalLink,
} from "lucide-react";
import { useHadithPack, getHadithByNumber } from "@/data/useHadithBook";
import { getSharhIdFor } from "@/lib/hadithSharhLinks";
import { parseIsnadChain } from "@/lib/isnadParser";
import { lookupNarratorBio, type NarratorBio } from "@/lib/narratorLookup";
import { useTakhrij } from "@/lib/useTakhrij";
import { TakhrijCard } from "@/components/hadith/TakhrijCard";
import { GradeChip } from "@/components/hadith/GradeChip";
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
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

// Split full hadith text into isnad (narrator chain) and matn (content).
//
// Multi-narrator chains repeat "قال: حدثنا فلان، قال: حدثنا فلان..." once per
// link, so splitting at the FIRST such marker (the old behavior) only peeled
// off the first narrator and left the rest of the chain sitting inside
// "matn". The real isnad/matn boundary is the LAST marker occurring before
// the quoted saying — the one immediately introducing it — not the first.
//
// This dataset doesn't punctuate "قال" with a colon consistently (checked
// against the bundled bukhari.json: most hadiths have none at all), but it
// does reliably wrap the actual quoted matn in a literal `"`. So markers are
// the primary signal when present; a bare quote mark is the fallback when
// they aren't — covers the large share of hadiths with no colon anywhere.
function splitHadithText(text: string): { isnad: string; matn: string } {
  const QUOTE = "\"";
  const firstQuote = text.indexOf(QUOTE);
  // Only look for markers before the quote, so a "قال" inside the quoted
  // matn itself (reported speech within reported speech) can't be picked.
  const searchSpace = firstQuote > 0 ? text.slice(0, firstQuote) : text;

  const markers = [
    " قَالَ:", " قَالَ :", "قال:",
    " يَقُولُ:", " يَقُولُ :", "يقول:",
    "أَنَّ رَسُولَ", "أن رسول الله",
    "عَنِ النَّبِيِّ", "عَنِ النَّبِيِّ صَلَّى",
  ];
  let latest = -1;
  let latestMarkerLen = 0;
  for (const m of markers) {
    const idx = searchSpace.lastIndexOf(m);
    if (idx !== -1 && idx > latest) { latest = idx; latestMarkerLen = m.length; }
  }

  let cut: number;
  if (latest > 0) {
    // Keep the marker itself ("...يقول:") attached to isnad — it's the
    // narrator's own words introducing the quote, not part of it.
    cut = latest + latestMarkerLen;
  } else if (firstQuote > 8) {
    cut = firstQuote;
  } else {
    return { isnad: "", matn: text };
  }

  const isnad = text.slice(0, cut).trim();
  // Strip a leading/trailing literal quote mark (with its RLM wrapper and
  // any trailing full stop) — it's source punctuation, not content.
  const QUOTE_EDGE = /^[‏\s]*"[‏\s]*|[‏\s]*"[‏\s]*\.?[‏\s]*$/g;
  const matn = text.slice(cut).trim().replace(QUOTE_EDGE, "").trim();
  return { isnad, matn };
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
  ctx.fillText("✦ أثر", 64, H - 60);

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

/* ------------------------------------------------------------------ */

export function HadithReaderPage() {
  const { bookKey, hadithNumber } = useParams<{ bookKey: string; hadithNumber: string }>();
  const navigate = useNavigate();
  useScrollRestoration();

  const n = parseInt(hadithNumber ?? "1", 10);
  const { data: pack, isLoading } = useHadithPack(bookKey);

  const { hadithBookmarks, toggleHadithBookmark, setHadithProgress, hadithNotes, setHadithNote, addHadithMemoCard, hadithMemoCards } = useNoorStore(
    (s) => ({
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
  const posterAccentColor = meta?.color ?? "#10b981";
  const accentColor = "var(--accent)";

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

  const copyText = async () => {
    if (!hadith) return;
    const text = `${hadith.t}\n\n— ${hadithRef(meta?.title ?? "", hadith.a)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const shareText = async () => {
    if (!hadith) return;
    const { matn } = splitHadithText(hadith.t);
    await shareHadithPoster({
      matn: matn || hadith.t,
      bookTitle: meta?.title ?? "",
      hadithNum: hadith.a,
      accentColor: posterAccentColor,
      grade: hadith.g[0] ?? "",
    });
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

  const fontSizeClass = useMemo(() => {
    return "text-xl";
  }, []);

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
              className="h-11 w-11 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] grid place-items-center transition hover:bg-[var(--card-2)] shrink-0"
              aria-label="رجوع"
            >
              <ArrowRight size={19} aria-hidden="true" className="text-[var(--fg)]" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <BookOpenText size={15} aria-hidden="true" style={{ color: accentColor }} />
                <span className="text-[11px] font-semibold opacity-55">قراءة حديثية</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: accentColor }}>
                  ح {Number.isFinite(n) ? n.toLocaleString("ar-EG") : "—"}
                </span>
              </div>
              <h1 className="font-bold text-base text-[var(--fg)] font-arabic truncate">
                {meta?.title ?? bookKey}
              </h1>
              {sectionTitle && <p className="mt-1 text-[11px] text-[var(--muted)] truncate">{sectionTitle}</p>}
            </div>
            {isLoading && <Loader2 size={16} aria-hidden="true" className="animate-spin text-[var(--muted)] shrink-0" />}
          </div>

          {/* Action buttons */}
          <div className="relative mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pr-2">
            <IconButton
              aria-label="بطاقة الحفظ"
              onClick={() => {
                if (!isMemoCard) addHadithMemoCard(memoCardKey);
                navigate("/hadith/memo");
              }}
              className={cn(isMemoCard && "ring-1 ring-accent-40")}
            >
              <BrainCircuit size={18} aria-hidden="true" style={{ color: isMemoCard ? accentColor : "var(--muted)" }} />
            </IconButton>
            <IconButton aria-label="حفظ" aria-pressed={isBookmarked} onClick={() => bookKey && toggleHadithBookmark(bookKey, n)}>
              <Bookmark size={18} aria-hidden="true" className={isBookmarked ? "fill-current" : ""} style={{ color: isBookmarked ? accentColor : "var(--muted)" }} />
            </IconButton>
            <IconButton aria-label="نسخ" onClick={copyText}><Copy size={16} aria-hidden="true" className="text-[var(--muted)]" /></IconButton>
            <IconButton aria-label="مشاركة" onClick={shareText}><Share2 size={16} aria-hidden="true" className="text-[var(--muted)]" /></IconButton>
            <IconButton aria-label="ملاحظة" aria-pressed={showNoteEditor} onClick={() => { setDraftNote(existingNote); setShowNoteEditor((v) => !v); }}>
              <StickyNote size={16} aria-hidden="true" className={existingNote ? "fill-current" : ""} style={{ color: existingNote ? accentColor : "var(--muted)" }} />
            </IconButton>
            {sharhId && (
              <button type="button"
                onClick={() => navigate(`/library/sharh?h=${sharhId}`)}
                className="flex items-center gap-1.5 h-10 shrink-0 rounded-2xl px-3.5 text-xs font-semibold transition hover:brightness-110 active:scale-[0.97]"
                style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: accentColor }}
              >
                <Info size={14} aria-hidden="true" />
                الشرح الكامل
              </button>
            )}
          </div>
        </Card>
      </div>

      <main className="mx-auto w-full max-w-3xl px-3 py-4 space-y-4">
        {/* Loading */}
        {isLoading && (
          <Card className="p-6" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex items-center justify-center gap-3 py-10 text-[var(--muted)]">
              <Loader2 aria-hidden="true" className="animate-spin" />
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
            {/* Metadata card */}
            <Card className="relative overflow-hidden p-4">
              <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
              <div className="absolute inset-y-0 right-0 w-1.5 opacity-90" style={{ background: accentColor }} />
              <div className="relative flex items-start justify-between gap-3 pr-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: accentColor }}>
                      <Hash size={12} aria-hidden="true" />
                      {hadith.a.toLocaleString("ar-EG")}
                    </span>
                    {hadith.g.map((g) => <GradeChip key={g} grade={g} />)}
                    {sectionTitle && <Badge className="max-w-[240px] truncate px-2 py-0.5 text-[10px]">{sectionTitle}</Badge>}
                  </div>
                  <div className="text-xs opacity-60 leading-6">
                    {hadithRef(meta?.title ?? "", hadith.a)}
                  </div>
                </div>
              </div>
            </Card>

            <TakhrijCard
              takhrij={takhrij}
              loading={takhrijLoading}
              sharhId={sharhId}
              onOpenSharh={(id) => navigate(`/library/sharh?h=${id}`)}
              accentColor={accentColor}
            />

            {/* Isnad — chain of tappable narrator links */}
            {hadithSplit.isnad && (
              <Card className="relative overflow-hidden p-4">
                <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
                <div className="absolute inset-y-0 right-0 w-1 opacity-70" style={{ background: accentColor }} />
                <div className="relative pr-2">
                  <p className="mb-3 text-[11px] font-semibold opacity-55 font-arabic">
                    الإسناد {isnadChain.length > 0 && <span className="opacity-60">— اضغط على راوٍ لمعرفته</span>}
                  </p>
                  {isnadChain.length > 0 ? (
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
                            {link.name}
                          </button>
                          {i < isnadChain.length - 1 && (
                            <ChevronLeft size={13} aria-hidden="true" className="opacity-30 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-arabic text-[var(--fg)] opacity-65 leading-loose">
                      {hadithSplit.isnad}
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

            {/* Matn */}
            <Card className="relative overflow-hidden p-5 md:p-6">
              <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
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
              <button type="button" onClick={() => setShowNoteEditor(false)} className="h-9 w-9 rounded-xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center opacity-70 hover:opacity-100" aria-label="إغلاق">
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
              className="w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 resize-none outline-none font-arabic text-sm leading-7 placeholder:opacity-40 focus:border-accent-40"
              style={{ color: "var(--fg)" }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {existingNote && (
                <button type="button"
                  onClick={() => { bookKey && setHadithNote(bookKey, n, ""); setShowNoteEditor(false); }}
                  className="text-xs px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--stroke)] opacity-70 hover:opacity-100 transition"
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
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-arabic text-sm disabled:opacity-30 transition border border-[var(--stroke)] bg-[var(--card)] press-effect"
              >
                <ChevronRight size={16} aria-hidden="true" />
                السابق
              </button>
              <div className="min-w-12 text-xs text-[var(--muted)] text-center tabular-nums" aria-live="polite" aria-atomic="true">
                {n.toLocaleString("ar-EG")}
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
    </div>
  );
}

export default HadithReaderPage;
