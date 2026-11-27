/**
 * Every hadith you kept, in one list: the ones you marked or noted in the
 * books, and the curated ones you favourited. The same list is shown in
 * «الأحاديث ← العلامات» and in Favorites. Each row carries its own text
 * (see hadithCards.ts); a book is loaded only for marks made before that.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Heart, StickyNote, Trash2 } from "lucide-react";
import { useSavedHadiths } from "@/lib/useSavedHadiths";
import { CuratedIcon } from "@/components/hadith/CuratedIcon";
import { cn } from "@/lib/utils";

type Filter = "all" | "bookmarks" | "notes" | "curated";

export function SavedHadithList({ removable = false, emptyAction }: { removable?: boolean; emptyAction?: React.ReactNode }) {
  const navigate = useNavigate();
  const { items, loading, remove } = useSavedHadiths();
  const [filter, setFilter] = React.useState<Filter>("all");
  const shown = items.filter((x) =>
    filter === "all" ? true
      : filter === "curated" ? x.kind === "curated"
        : x.kind === "book" && (filter === "notes" ? !!x.note : x.bookmarked));

  if (!items.length && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Bookmark size={36} aria-hidden="true" className="text-(--muted) opacity-30" />
        <p className="text-sm font-bold text-(--fg)">لا علامات ولا ملاحظات بعد</p>
        <p className="text-xs text-(--muted) leading-6">اضغط «علامة» أو «ملاحظة» في أي حديث، أو القلب في المختارات، فتجده هنا.</p>
        {emptyAction}
      </div>
    );
  }

  const filters: [Filter, string][] = [["all", "الكل"], ["bookmarks", "العلامات"], ["notes", "ملاحظاتي"], ["curated", "المختارات"]];
  return (
    <div dir="rtl" className="stack-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="عرض">
        {filters.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={filter === k} onClick={() => setFilter(k)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", filter === k ? "bg-(--accent) text-(--on-accent) border-transparent font-bold" : "bg-(--card) border-(--stroke)")}
          >
            {label}
          </button>
        ))}
      </div>
      {loading && <div className="skeleton h-24 w-full rounded-3xl" role="status" aria-label="جارٍ التحميل…" />}
      <div className="stack-y-3" role="list" aria-label="الأحاديث المحفوظة">
        {shown.map((x) => (
          <div key={x.key} role="listitem" className="flex items-start gap-2">
            <button type="button"
              onClick={() => navigate(x.kind === "book" ? `/hadith/${x.bookKey}/${x.n}` : `/library/${x.collectionId}/${x.entryId}`)}
              className="relative min-w-0 flex-1 overflow-hidden rounded-3xl text-right glass glass-hover press-effect p-4"
            >
              <div className="absolute inset-y-0 right-0 w-1 opacity-80" style={{ background: x.color }} />
              <div className="mb-1.5 flex items-center gap-2 text-[11px] text-(--muted)">
                {x.kind === "curated" ? (
                  <>
                    <CuratedIcon id={x.collectionId} size={12} color={x.color} />
                    <Heart size={11} aria-hidden="true" className="fill-red-400 text-red-400" />
                    <span>{x.title}</span>
                  </>
                ) : (
                  <>
                    {x.bookmarked && <Bookmark size={12} aria-hidden="true" className="fill-current text-(--accent)" />}
                    {x.note && <StickyNote size={12} aria-hidden="true" className="text-(--accent)" />}
                    <span>{x.title}، {x.place}</span>
                  </>
                )}
              </div>
              {x.heading && <p className="mb-1 text-[13.5px] font-bold font-arabic leading-snug" style={{ color: x.color }}>{x.heading}</p>}
              {x.text ? <p className="arabic-text text-[14px] leading-7 text-(--fg) line-clamp-3">{x.text}</p> : null}
              {x.kind === "book" && x.note ? (
                <p className="mt-2 rounded-2xl px-3 py-2 text-[12.5px] leading-6 text-(--fg)" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}>
                  {x.note}
                </p>
              ) : null}
            </button>
            {removable && (x.kind === "curated" || x.bookmarked) && (
              <button type="button"
                onClick={() => remove(x)}
                aria-label={x.kind === "curated" ? "إزالة من المفضلة" : "إزالة العلامة"}
                className="mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-(--stroke) bg-(--card) text-(--muted) press-effect"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!loading && !shown.length && <p className="py-8 text-center text-xs text-(--muted)">لا شيء هنا بعد.</p>}
    </div>
  );
}
