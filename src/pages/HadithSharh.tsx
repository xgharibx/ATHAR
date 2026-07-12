/**
 * الموسوعة الحديثية الميسرة — scholarly hadith commentary, in-app.
 *
 * Browse: sections → hadith titles → the full hadith with grade, الشرح,
 * الفوائد, and غريب الألفاظ — served verbatim from the Encyclopedia of
 * Translated Prophetic Hadiths (hadeethenc.com) with attribution, cached
 * for offline revisits, plus an AI-tadabbur handoff to رفيق أثر.
 */
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpenText, ChevronLeft, Share2, Sparkles, WifiOff } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  fetchSharhChildren,
  fetchSharhHadith,
  fetchSharhList,
  fetchSharhRoots,
  type SharhCategory,
  type SharhHadith,
  type SharhListItem,
} from "@/lib/hadithSharhAPI";
import { verdictColor } from "@/lib/dorarTakhrij";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

type View =
  | { kind: "roots" }
  | { kind: "category"; root: SharhCategory }
  | { kind: "list"; category: SharhCategory }
  | { kind: "hadith"; id: string; backTo?: SharhCategory };

export function HadithSharhPage() {
  useScrollRestoration();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = React.useState<View>(() => {
    const hid = searchParams.get("h");
    return hid ? { kind: "hadith", id: hid } : { kind: "roots" };
  });
  const [loading, setLoading] = React.useState(false);
  const [offline, setOffline] = React.useState(false);

  const [roots, setRoots] = React.useState<SharhCategory[]>([]);
  const [children, setChildren] = React.useState<SharhCategory[]>([]);
  const [items, setItems] = React.useState<SharhListItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [hadith, setHadith] = React.useState<SharhHadith | null>(null);

  const run = React.useCallback(async (task: () => Promise<void>) => {
    setLoading(true);
    setOffline(false);
    try {
      await task();
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load per view
  React.useEffect(() => {
    if (view.kind === "roots") {
      void run(async () => setRoots(await fetchSharhRoots()));
    } else if (view.kind === "category") {
      void run(async () => {
        const kids = await fetchSharhChildren(view.root.id);
        if (kids.length === 0) {
          // Leaf root — jump straight to its hadith list
          setView({ kind: "list", category: view.root });
          return;
        }
        setChildren(kids);
      });
    } else if (view.kind === "list") {
      setItems([]);
      setPage(1);
      void run(async () => {
        const p = await fetchSharhList(view.category.id, 1);
        setItems(p.items);
        setHasMore(p.hasMore);
      });
    } else if (view.kind === "hadith") {
      setHadith(null);
      void run(async () => setHadith(await fetchSharhHadith(view.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const loadMore = React.useCallback(() => {
    if (view.kind !== "list") return;
    const next = page + 1;
    void run(async () => {
      const p = await fetchSharhList(view.category.id, next);
      setItems((prev) => [...prev, ...p.items]);
      setHasMore(p.hasMore);
      setPage(next);
    });
  }, [view, page, run]);

  const share = React.useCallback(async (h: SharhHadith) => {
    const text = `${h.hadeeth}\n\n${h.attribution} — ${h.grade}\n\nالشرح: ${h.explanation}\n\n• الموسوعة الحديثية hadeethenc.com`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("تم النسخ");
      }
    } catch { /* user cancelled */ }
  }, []);

  const back = () => {
    if (view.kind === "hadith" && view.backTo) setView({ kind: "list", category: view.backTo });
    else if (view.kind === "list") setView({ kind: "roots" });
    else if (view.kind === "category") setView({ kind: "roots" });
    else navigate("/library");
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} aria-label="رجوع"
          className="rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-2.5 hover:bg-[var(--card-2)] transition">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold">الموسوعة الحديثية الميسرة</h1>
          <p className="truncate text-xs text-[var(--muted-2)]">
            شرح علمي مُراجع لكل حديث — المصدر: hadeethenc.com
          </p>
        </div>
      </div>

      {offline ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          تعذّر الاتصال بالموسوعة — ما فتحته سابقًا متاح دون اتصال، وأعد المحاولة لاحقًا.
        </div>
      ) : null}

      {loading && !hadith && items.length === 0 && roots.length === 0 && children.length === 0 ? (
        <div className="py-16 text-center text-sm opacity-60">جارٍ التحميل…</div>
      ) : null}

      {/* Roots */}
      {view.kind === "roots" ? (
        <div className="mt-5 grid gap-2">
          {roots.map((c) => (
            <button type="button" key={c.id}
              onClick={() => setView({ kind: "category", root: c })}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3.5 text-start transition hover:bg-[var(--card-2)]">
              <div>
                <div className="text-sm font-semibold">{c.title}</div>
                <div className="mt-0.5 text-[11px] text-[var(--muted-2)]">
                  {Number(c.hadeeths_count).toLocaleString("ar-EG")} حديث مشروح
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Category children */}
      {view.kind === "category" ? (
        <div className="mt-5 grid gap-2">
          <div className="text-sm font-bold text-[var(--accent)]">{view.root.title}</div>
          <button type="button"
            onClick={() => setView({ kind: "list", category: view.root })}
            className="rounded-2xl border border-accent-35 bg-accent-15 px-4 py-3 text-start text-sm font-semibold transition hover:opacity-90">
            كل أحاديث القسم
          </button>
          {children.map((c) => (
            <button type="button" key={c.id}
              onClick={() => setView({ kind: "list", category: c })}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-start transition hover:bg-[var(--card-2)]">
              <div>
                <div className="text-sm">{c.title}</div>
                <div className="mt-0.5 text-[11px] text-[var(--muted-2)]">
                  {Number(c.hadeeths_count).toLocaleString("ar-EG")} حديث
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Hadith list */}
      {view.kind === "list" ? (
        <div className="mt-5 grid gap-2">
          <div className="text-sm font-bold text-[var(--accent)]">{view.category.title}</div>
          {items.map((h) => (
            <button type="button" key={h.id}
              onClick={() => setView({ kind: "hadith", id: h.id, backTo: view.category })}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-start transition hover:bg-[var(--card-2)]">
              <div className="text-sm leading-7">{h.title}</div>
              <BookOpenText className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            </button>
          ))}
          {hasMore ? (
            <button type="button" onClick={loadMore} disabled={loading}
              className="mt-1 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm font-semibold transition hover:bg-[var(--card-2)] disabled:opacity-50">
              {loading ? "جارٍ التحميل…" : "المزيد من الأحاديث"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Hadith detail */}
      {view.kind === "hadith" && hadith ? (
        <article className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-5">
            <p className="arabic-text text-base font-medium leading-9">{hadith.hadeeth}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-accent-15 px-2.5 py-0.5 text-xs font-bold text-[var(--accent)]">
                {hadith.attribution}
              </span>
              {hadith.grade ? (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ background: verdictColor(hadith.grade) + "22", color: verdictColor(hadith.grade) }}>
                  {hadith.grade}
                </span>
              ) : null}
              <span className="ms-auto flex items-center gap-1">
                <button type="button" onClick={() => void share(hadith)} aria-label="مشاركة"
                  className="rounded-lg p-1.5 opacity-60 transition hover:opacity-100">
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label="تدبر بالذكاء"
                  onClick={() => navigate(`/companion?ask=${encodeURIComponent(
                    `قرأت هذا الحديث وشرحه في الموسوعة، ساعدني أن أعيشه عمليًا هذا الأسبوع بخطوات محددة تناسب حالي:\n«${hadith.hadeeth.slice(0, 500)}» — ${hadith.attribution}`
                  )}`)}
                  className="rounded-lg p-1.5 text-[var(--accent)] opacity-80 transition hover:opacity-100">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </div>
          </div>

          {hadith.words_meanings && hadith.words_meanings.length > 0 ? (
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-5">
              <h2 className="mb-2 text-sm font-bold text-[var(--accent)]">غريب الألفاظ</h2>
              <dl className="space-y-1.5 text-sm leading-7">
                {hadith.words_meanings.map((w, i) => (
                  <div key={i} className="flex gap-2">
                    <dt className="shrink-0 font-bold">{w.word}:</dt>
                    <dd className="m-0 text-[var(--muted)]">{w.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-5">
            <h2 className="mb-2 text-sm font-bold text-[var(--accent)]">الشرح</h2>
            <p className="whitespace-pre-wrap text-sm leading-8">{hadith.explanation}</p>
          </div>

          {hadith.hints && hadith.hints.length > 0 ? (
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-5">
              <h2 className="mb-2 text-sm font-bold text-[var(--accent)]">من فوائد الحديث</h2>
              <ul className="list-inside list-disc space-y-1.5 text-sm leading-8">
                {hadith.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hadith.reference ? (
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4">
              <h2 className="mb-1 text-xs font-bold text-[var(--muted)]">المراجع</h2>
              <p className="whitespace-pre-wrap text-xs leading-6 text-[var(--muted-2)]">{hadith.reference}</p>
            </div>
          ) : null}

          <p className="text-center text-[10px] text-[var(--muted-2)]">
            المحتوى من الموسوعة الحديثية المترجمة (hadeethenc.com) — بإشراف علمي مُراجع
          </p>
        </article>
      ) : null}
    </div>
  );
}
