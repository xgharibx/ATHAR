import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpenText, Check, Copy, ExternalLink, Heart, Share2 } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useIslamicLibraryDB, dorarSearchUrl } from "@/data/useIslamicLibraryDB";
import { useNoorStore } from "@/store/noorStore";

const GRADE_LABELS: Record<string, string> = {
  agreed: "متفق عليه",
  sahih: "صحيح",
  hasan: "حسن",
  curated: "تحريري",
};

export function LibraryItemPage() {
  const navigate = useNavigate();
  const params = useParams<{ collectionId: string; entryId: string }>();
  const { data, isLoading } = useIslamicLibraryDB();
  const [copied, setCopied] = React.useState(false);
  const key = `${params.collectionId ?? ""}:${params.entryId ?? ""}`;
  const favorite = useNoorStore((s) => !!s.libraryFavorites[key]);
  const toggleLibraryFavorite = useNoorStore((s) => s.toggleLibraryFavorite);

  const entry = data?.byKey.get(key) ?? null;
  const related = React.useMemo(() => {
    if (!data || !entry) return [];
    const tagSet = new Set(entry.tags);
    return data.flat
      .filter((candidate) => candidate.key !== entry.key && candidate.tags.some((tag) => tagSet.has(tag)))
      .slice(0, 4);
  }, [data, entry]);

  if (isLoading) return <Card className="p-5"><div className="skeleton h-24 rounded-3xl" /></Card>;

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
    <div className="space-y-4 page-enter" dir="rtl">
      <Card className="p-5 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: entry.collectionAccent }} />
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpenText size={18} style={{ color: entry.collectionAccent }} />
                <div className="text-sm font-semibold truncate">{entry.collectionTitle}</div>
              </div>
              <div className="text-xs opacity-50 mt-0.5">{entry.chapterTitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <IconButton aria-label="نسخ" onClick={onCopy}>{copied ? <Check size={15} /> : <Copy size={15} />}</IconButton>
            <IconButton aria-label="مفضلة" onClick={() => toggleLibraryFavorite(entry.collectionId, entry.id)}>
              <Heart size={15} className={favorite ? "fill-red-400 text-red-400" : "opacity-70"} />
            </IconButton>
            <IconButton aria-label="مشاركة" onClick={onShare}><Share2 size={15} /></IconButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge>{GRADE_LABELS[entry.grade] ?? entry.grade}</Badge>
          {entry.narrator && <Badge>{entry.narrator}</Badge>}
          <Badge>{entry.source.title}</Badge>
        </div>

        <h1 className="text-lg md:text-xl font-bold mb-4" style={{ color: entry.collectionAccent }}>{entry.title}</h1>
        <div className="arabic-text text-xl md:text-2xl leading-[2.4] font-medium text-right select-text">
          {entry.arabic}
        </div>
      </Card>

      {(entry.explanation || entry.benefits.length > 0) && (
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">الفهم والعمل</div>
          {entry.explanation && <div className="text-sm opacity-70 leading-7 mb-4">{entry.explanation}</div>}
          <div className="space-y-2">
            {entry.benefits.map((benefit, index) => (
              <div key={benefit} className="flex items-start gap-2 rounded-2xl bg-white/5 border border-white/10 p-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: entry.collectionAccent, color: "black" }}>{index + 1}</span>
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
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm hover:bg-white/12 transition"
          >
            <ExternalLink size={15} />
            تحقق في الدرر
          </a>
        )}
      </Card>

      {related.length > 0 && (
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">مواد قريبة</div>
          <div className="space-y-2">
            {related.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(`/library/${item.collectionId}/${item.id}`)}
                className="w-full text-right rounded-2xl bg-white/5 border border-white/10 p-3 hover:bg-white/9 transition"
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
