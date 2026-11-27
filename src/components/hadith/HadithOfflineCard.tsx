/**
 * «الكتب على جهازك»: which hadith books are kept for reading with no
 * connection, with «تحميل الكل». In the phone apps every book is already
 * inside the app, so the card only says so.
 */
import * as React from "react";
import { Capacitor } from "@capacitor/core";
import { CheckCircle2, CloudDownload, HardDrive, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { HadithBookMeta } from "@/data/hadithTypes";
import { HADITH_PACK_SIZES_MB, forgetHadithBook, isHadithBookKept, keepHadithBook } from "@/data/useHadithBook";
import { prewarmFullHadithSearch } from "@/lib/fullHadithSearch";
import { arNum } from "@/lib/formatNumber";
import { BOOK, countAr } from "@/lib/arabicCount";

export function HadithOfflineCard({ books }: { books: HadithBookMeta[] }) {
  const native = Capacitor.isNativePlatform();
  const [open, setOpen] = React.useState(false);
  const [kept, setKept] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState<Record<string, number>>({});

  const refresh = React.useCallback(async () => {
    const entries = await Promise.all(books.map(async (b) => [b.key, await isHadithBookKept(b.key)] as const));
    setKept(Object.fromEntries(entries));
  }, [books]);
  React.useEffect(() => {
    if (!native) void refresh();
  }, [native, refresh]);

  if (native) {
    return (
      <p className="flex items-center justify-center gap-1.5 px-6 pb-4 text-center text-[11px] text-(--muted)">
        <HardDrive size={12} aria-hidden="true" /> الكتب كلها داخل التطبيق، تُقرأ بلا إنترنت.
      </p>
    );
  }

  const keep = async (key: string) => {
    setBusy((b) => ({ ...b, [key]: 0 }));
    try {
      await keepHadithBook(key, (pct) => setBusy((b) => ({ ...b, [key]: pct })));
      setKept((k) => ({ ...k, [key]: true }));
    } catch {
      toast.error("تعذّر الحفظ، تأكد من الاتصال");
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[key];
        return next;
      });
    }
  };
  const keepAll = async () => {
    prewarmFullHadithSearch();
    for (const b of books) if (!kept[b.key]) await keep(b.key);
  };
  const forget = async (key: string) => {
    await forgetHadithBook(key);
    setKept((k) => ({ ...k, [key]: false }));
  };
  const keptCount = books.filter((b) => kept[b.key]).length;

  return (
    <div className="mx-4 mb-6 rounded-3xl border border-(--stroke) bg-(--card) p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 text-right">
        <CloudDownload size={18} aria-hidden="true" className="text-(--accent) shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-(--fg)">الكتب على جهازك</span>
          <span className="block text-[11px] text-(--muted)">
            {keptCount ? `${countAr(keptCount, BOOK)} محفوظة للقراءة بلا إنترنت` : "احفظ الكتب لتقرأها بلا إنترنت"}
          </span>
        </span>
      </button>
      {open && (
        <div className="mt-3 stack-y-2 border-t border-(--stroke) pt-3">
          {books.map((b) => {
            const pct = busy[b.key];
            return (
              <div key={b.key} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{b.title}</span>
                  <span className="block text-[10.5px] text-(--muted)">نحو {arNum(HADITH_PACK_SIZES_MB[b.key] ?? 1)} ميغابايت</span>
                </span>
                {pct != null ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-(--muted)"><Loader2 size={13} className="animate-spin" aria-hidden="true" />{arNum(pct)}٪</span>
                ) : kept[b.key] ? (
                  <>
                    <CheckCircle2 size={16} aria-label="محفوظ" className="text-(--accent)" />
                    <button type="button" onClick={() => void forget(b.key)} aria-label={`احذف ${b.title} من الجهاز`} className="grid h-8 w-8 place-items-center rounded-xl text-(--muted) press-effect">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => void keep(b.key)} className="rounded-full border border-(--stroke) px-3 py-1 text-[11px] font-semibold press-effect">احفظ</button>
                )}
              </div>
            );
          })}
          {keptCount < books.length && (
            <button type="button" onClick={() => void keepAll()} disabled={Object.keys(busy).length > 0}
              className="mt-1 w-full rounded-2xl py-2.5 text-sm font-bold press-effect disabled:opacity-60" style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              تحميل الكل
            </button>
          )}
        </div>
      )}
    </div>
  );
}
