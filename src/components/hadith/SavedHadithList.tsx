/**
 * Every hadith you kept, in one list: the ones you marked or noted in the
 * books, and the curated ones you favourited. The same list is shown in
 * «الأحاديث ← العلامات» and in Favorites. Each row carries its own text
 * (see hadithCards.ts); a book is loaded only for marks made before that.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Download, FolderPlus, Heart, Plus, Search, StickyNote, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { savedHadithsText, useSavedHadiths, type SavedHadith } from "@/lib/useSavedHadiths";
import { FOLDER_NAME_MAX, useHadithPrefs } from "@/lib/hadithPrefs";
import { foldHadithSearch } from "@/lib/fullHadithSearch";
import { shareFileBlob } from "@/lib/shareTargets";
import { CuratedIcon } from "@/components/hadith/CuratedIcon";
import { cn } from "@/lib/utils";

type Filter = "all" | "bookmarks" | "notes" | "curated" | `folder:${string}`;

const chip = (on: boolean) =>
  cn("shrink-0 rounded-full px-3 py-1.5 border text-xs", on ? "bg-(--accent) text-(--on-accent) border-transparent font-bold" : "bg-(--card) border-(--stroke)");

/** The folders one saved hadith is in, ticked on and off; a new folder can be made here too. */
function FolderPicker({ itemKey, onClose }: { itemKey: string; onClose: () => void }) {
  const folders = useHadithPrefs((s) => s.folders);
  const mine = useHadithPrefs((s) => s.inFolders[itemKey]);
  const toggleInFolder = useHadithPrefs((s) => s.toggleInFolder);
  const addFolder = useHadithPrefs((s) => s.addFolder);
  const [name, setName] = React.useState("");
  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    addFolder(clean);
    toggleInFolder(itemKey, clean.slice(0, FOLDER_NAME_MAX));
    setName("");
  };
  return (
    <div className="mt-2 rounded-2xl border border-(--stroke) bg-(--card) p-3 stack-y-2" role="group" aria-label="المجموعات">
      <div className="flex items-center justify-between text-xs font-bold">
        <span>ضعه في مجموعة</span>
        <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-7 w-7 place-items-center rounded-full press-effect"><X size={14} aria-hidden="true" /></button>
      </div>
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {folders.map((f) => (
            <button key={f} type="button" role="checkbox" aria-checked={!!mine?.includes(f)} onClick={() => toggleInFolder(itemKey, f)} className={chip(!!mine?.includes(f))}>{f}</button>
          ))}
        </div>
      )}
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={FOLDER_NAME_MAX} placeholder="مجموعة جديدة"
          aria-label="اسم مجموعة جديدة"
          className="min-w-0 flex-1 rounded-xl border border-(--stroke) bg-transparent px-3 py-2 text-xs outline-none focus:border-(--accent)" />
        <button type="submit" disabled={!name.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-(--accent) text-(--on-accent) disabled:opacity-40" aria-label="أضف المجموعة">
          <Plus size={15} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function matches(x: SavedHadith, folded: string, folders: string[] | undefined) {
  if (!folded) return true;
  const hay = foldHadithSearch([x.title, x.heading ?? "", x.text, x.kind === "book" ? x.note : "", ...(folders ?? [])].join(" "));
  return folded.split(" ").every((w) => hay.includes(w));
}

export function SavedHadithList({ removable = false, emptyAction }: { removable?: boolean; emptyAction?: React.ReactNode }) {
  const navigate = useNavigate();
  const { items, loading, remove } = useSavedHadiths();
  const folders = useHadithPrefs((s) => s.folders);
  const inFolders = useHadithPrefs((s) => s.inFolders);
  const removeFolder = useHadithPrefs((s) => s.removeFolder);
  const [chosen, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [picking, setPicking] = React.useState<string | null>(null);
  const folded = foldHadithSearch(query).trim();
  // A folder that was removed shows everything again.
  const filter: Filter = chosen.startsWith("folder:") && !folders.includes(chosen.slice(7)) ? "all" : chosen;
  const folder = filter.startsWith("folder:") ? filter.slice(7) : null;
  const shown = items.filter((x) =>
    (filter === "all" ? true
      : folder ? !!inFolders[x.key]?.includes(folder)
        : filter === "curated" ? x.kind === "curated"
          : x.kind === "book" && (filter === "notes" ? !!x.note : x.bookmarked))
    && matches(x, folded, inFolders[x.key]));

  const onExport = async () => {
    const text = savedHadithsText(shown, inFolders);
    const result = await shareFileBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), { filename: "athar-hadith-notes.txt", title: "أحاديثي المحفوظة" });
    if (result === "downloaded") toast.success("حُفظ الملف");
    else if (result === "failed") toast.error("تعذر التصدير");
  };

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

  const filters: [Filter, string][] = [
    ["all", "الكل"], ["bookmarks", "العلامات"], ["notes", "ملاحظاتي"], ["curated", "المختارات"],
    ...folders.map((f): [Filter, string] => [`folder:${f}`, f]),
  ];
  return (
    <div dir="rtl" className="stack-y-3">
      <div className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-(--stroke) bg-(--card) px-3 py-2">
          <Search size={15} aria-hidden="true" className="text-(--muted) shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في محفوظاتك وملاحظاتك" aria-label="ابحث في المحفوظات"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <button type="button" onClick={onExport} disabled={!shown.length}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-(--stroke) bg-(--card) px-3 py-2.5 text-xs font-semibold press-effect disabled:opacity-40">
          <Download size={14} aria-hidden="true" />
          تصدير ملاحظاتي
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="عرض">
        {filters.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={filter === k} onClick={() => setFilter(k)} className={chip(filter === k)}>
            {label}
          </button>
        ))}
      </div>
      {folder && (
        <div className="flex items-center justify-between text-xs text-(--muted)">
          <span>مجموعة «{folder}»</span>
          <button type="button" onClick={() => { removeFolder(folder); setFilter("all"); }} className="underline underline-offset-4 press-effect">حذف المجموعة</button>
        </div>
      )}
      {loading && <div className="skeleton h-24 w-full rounded-3xl" role="status" aria-label="جارٍ التحميل…" />}
      <div className="stack-y-3" role="list" aria-label="الأحاديث المحفوظة">
        {shown.map((x) => (
          <div key={x.key} role="listitem">
          <div className="flex items-start gap-2">
            <button type="button"
              onClick={() => navigate(x.kind === "book" ? `/hadith/${x.bookKey}/${x.n}` : `/library/${x.collectionId}/${x.entryId}`)}
              className="relative min-w-0 flex-1 overflow-hidden rounded-3xl border border-(--stroke) bg-(--card) text-right press-effect p-4"
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
              {inFolders[x.key]?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inFolders[x.key]!.map((f) => <span key={f} className="rounded-full border border-(--stroke) px-2 py-0.5 text-[10.5px] text-(--muted)">{f}</span>)}
                </div>
              ) : null}
            </button>
            <button type="button"
              onClick={() => setPicking(picking === x.key ? null : x.key)}
              aria-label="المجموعات" aria-expanded={picking === x.key}
              className="mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-(--stroke) bg-(--card) text-(--muted) press-effect"
            >
              <FolderPlus size={15} aria-hidden="true" />
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
          {picking === x.key && <FolderPicker itemKey={x.key} onClose={() => setPicking(null)} />}
          </div>
        ))}
      </div>
      {!loading && !shown.length && <p className="py-8 text-center text-xs text-(--muted)">لا شيء هنا بعد.</p>}
    </div>
  );
}
