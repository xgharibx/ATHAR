import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpenText, Check, Copy, ExternalLink, Heart, Share2, ScrollText } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useIslamicLibraryDB, dorarSearchUrl } from "@/data/useIslamicLibraryDB";
import { getLibraryHadithLinks, type LibraryHadithLink } from "@/lib/libraryHadithLinks";
import { getSharhIdFor } from "@/lib/hadithSharhLinks";
import { HADITH_BOOKS_STATIC } from "@/data/hadithTypes";
import { useNoorStore } from "@/store/noorStore";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useTakhrij } from "@/lib/useTakhrij";
import { TakhrijCard } from "@/components/hadith/TakhrijCard";

const GRADE_LABELS: Record<string, string> = {
  agreed: "متفق عليه",
  sahih: "صحيح",
  hasan: "حسن",
  curated: "تحريري",
};

export function LibraryItemPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const params = useParams<{ collectionId: string; entryId: string }>();
  const { data, isLoading } = useIslamicLibraryDB();
  const [copied, setCopied] = React.useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);
  const key = `${params.collectionId ?? ""}:${params.entryId ?? ""}`;
  const favorite = useNoorStore((s) => !!s.libraryFavorites[key]);
  const toggleLibraryFavorite = useNoorStore((s) => s.toggleLibraryFavorite);

  const entry = data?.byKey.get(key) ?? null;

  // If this is one of the library's curated hadith cards (matn only, no
  // isnad), check whether it's actually one of the real 9 bundled books —
  // most of them are — so the reader can jump to the full experience
  // (isnad, grading, sharh explanation, bookmarks) instead of staying on
  // this thin card. Matched offline by text, not guessed; see
  // libraryHadithLinks.ts.
  const [hadithLinks, setHadithLinks] = React.useState<LibraryHadithLink[]>([]);
  React.useEffect(() => {
    let alive = true;
    setHadithLinks([]);
    if (entry?.kind !== "hadith" || !params.entryId) return;
    getLibraryHadithLinks(params.entryId).then((links) => { if (alive) setHadithLinks(links); });
    return () => { alive = false; };
  }, [entry?.kind, params.entryId]);

  // Real, cited grading from dorar.net for this curated card — only once we
  // know it maps to a real book/number (hadithLinks above). Same hook and
  // same TakhrijCard component as the full reader, so every hadith surface
  // has identical structure, not a per-page reinvention.
  const primaryLink = hadithLinks[0] ?? null;
  const { takhrij, loading: takhrijLoading } = useTakhrij(primaryLink?.bookKey, primaryLink?.n, entry?.arabic);

  const [sharhId, setSharhId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    setSharhId(null);
    if (!primaryLink) return;
    getSharhIdFor(primaryLink.bookKey, primaryLink.n).then((id) => { if (alive) setSharhId(id); });
    return () => { alive = false; };
  }, [primaryLink]);

  const related = React.useMemo(() => {
    if (!data || !entry) return [];
    const tagSet = new Set(entry.tags);
    const seen = new Set<string>();
    return data.flat
      .filter((candidate) => {
        if (candidate.key === entry.key) return false;
        if (!candidate.tags.some((tag) => tagSet.has(tag))) return false;
        if (seen.has(candidate.arabic)) return false;
        seen.add(candidate.arabic);
        return true;
      })
      .slice(0, 4);
  }, [data, entry]);

  if (isLoading) return <Card className="p-5" role="status" aria-label="جارٍ التحميل…"><span className="sr-only">جارٍ التحميل…</span><div className="skeleton h-24 rounded-3xl" /></Card>;

  if (!entry) {
    return (
      <Card className="p-5" dir="rtl">
        <div className="font-semibold">لم يتم العثور على المادة</div>
        <Button className="mt-4" onClick={() => navigate("/library")}>العودة للمكتبة</Button>
      </Card>
    );
  }

  const verificationUrl = entry.source.verificationUrl || (entry.kind === "hadith" ? dorarSearchUrl(entry) : "");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${entry.arabic}\n\n${entry.source.title}${entry.narrator ? ` — ${entry.narrator}` : ""}`);
      setCopied(true);
      toast.success("تم النسخ");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1400);
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
    <div className="space-y-4 page-enter" dir="rtl">
      <Card className="p-5 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: entry.collectionAccent }} />
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpenText size={18} aria-hidden="true" style={{ color: entry.collectionAccent }} />
                <div className="text-sm font-semibold truncate">{entry.collectionTitle}</div>
              </div>
              <div className="text-xs opacity-50 mt-0.5">{entry.chapterTitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <IconButton aria-label="نسخ" onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}</IconButton>
            <IconButton aria-label="مفضلة" aria-pressed={favorite} onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>
              <Heart size={15} aria-hidden="true" className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />
            </IconButton>
            <IconButton aria-label="مشاركة" onClick={onShare}><Share2 size={15} /></IconButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge>{GRADE_LABELS[entry.grade] ?? entry.grade}</Badge>
          {entry.narrator && <Badge>{entry.narrator}</Badge>}
          {entry.source.title !== (GRADE_LABELS[entry.grade] ?? entry.grade) && <Badge>{entry.source.title}</Badge>}
        </div>

        <h1 className="text-lg md:text-xl font-bold mb-4 font-arabic" style={{ color: entry.collectionAccent }}>{entry.title}</h1>
        <div className="arabic-text text-xl md:text-2xl leading-[2.4] font-medium text-right select-text">
          {entry.arabic}
        </div>

        {hadithLinks.length > 0 && (
          <button type="button"
            onClick={() => navigate(`/hadith/${hadithLinks[0]!.bookKey}/${hadithLinks[0]!.n}`)}
            className="mt-5 w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-right transition hover:brightness-110 active:scale-[0.99]"
            style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
          >
            <ScrollText size={20} aria-hidden="true" style={{ color: "var(--accent)" }} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>افتح القراءة الكاملة بالإسناد</div>
              <div className="text-[11px] opacity-60 mt-0.5">
                {HADITH_BOOKS_STATIC.find((b) => b.key === hadithLinks[0]!.bookKey)?.title ?? hadithLinks[0]!.bookKey}
                {" · ح"}{hadithLinks[0]!.n.toLocaleString("ar-EG")}
                {hadithLinks.length > 1 ? ` (+${(hadithLinks.length - 1).toLocaleString("ar-EG")} مصادر أخرى)` : ""}
              </div>
            </div>
          </button>
        )}
      </Card>

      {primaryLink && (takhrijLoading || takhrij) && (
        <TakhrijCard
          takhrij={takhrij}
          loading={takhrijLoading}
          sharhId={sharhId}
          onOpenSharh={(id) => navigate(`/library/sharh?h=${id}`)}
          accentColor={entry.collectionAccent}
        />
      )}

      {(entry.explanation || entry.benefits.length > 0) && (
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">الفهم والعمل</div>
          {entry.explanation && <div className="text-sm opacity-70 leading-7 mb-4">{entry.explanation}</div>}
          <div className="space-y-2">
            {entry.benefits.map((benefit, index) => (
              <div key={benefit} className="flex items-start gap-2 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] p-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: entry.collectionAccent, color: "black" }}>{(index + 1).toLocaleString("ar-EG")}</span>
                <div className="text-sm opacity-75 leading-7">{benefit}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="text-sm font-semibold mb-3">الموضوعات</div>
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
        </div>
        {verificationUrl && (
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-2.5 text-sm hover:bg-[var(--card-2)] transition"
          >
            <ExternalLink size={15} aria-hidden="true" />
            تحقق في الدرر
          </a>
        )}
      </Card>

      {related.length > 0 && (
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">مواد قريبة</div>
          <div className="space-y-2">
            {related.map((item) => (
              <button type="button"
                key={item.key}
                onClick={() => navigate(`/library/${item.collectionId}/${item.id}`)}
                className="w-full text-right rounded-2xl bg-[var(--card)] border border-[var(--stroke)] p-3 hover:bg-[var(--card-2)] transition"
              >
                <div className="text-xs font-semibold mb-1" style={{ color: item.collectionAccent }}>{item.collectionTitle}</div>
                <div className="arabic-text text-sm leading-7 line-clamp-2">{item.arabic}</div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
