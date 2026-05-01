import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowUpRight, Trash2, Copy, Check, CopyCheck, Share2, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useQuranDB } from "@/data/useQuranDB";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { EmptyState } from "@/components/ui/EmptyState";

export function FavoritesPage() {
  const { data } = useAdhkarDB();
  const { data: quranData } = useQuranDB();
  const navigate = useNavigate();
  const favorites = useNoorStore((s) => s.favorites);
  const toggleFavorite = useNoorStore((s) => s.toggleFavorite);
  const quranBookmarks = useNoorStore((s) => s.quranBookmarks);
  const toggleQuranBookmark = useNoorStore((s) => s.toggleQuranBookmark);
  const quranNotes = useNoorStore((s) => s.quranNotes);
  const quranHighlights = useNoorStore((s) => s.quranHighlights);

  const [activeTab, setActiveTab] = React.useState<"adhkar" | "quran">("adhkar");

  const [confirmDeleteKey, setConfirmDeleteKey] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [copiedAll, setCopiedAll] = React.useState(false);

  const copyItem = React.useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("تم النسخ");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("تعذر النسخ");
    }
  }, []);

  const favKeys = React.useMemo(() => Object.keys(favorites).filter((k) => favorites[k]), [favorites]);

  const items = React.useMemo(() => {
    if (!data) return [];
    const map = new Map(data.flat.map((f) => [f.key, f]));
    return favKeys.map((k) => map.get(k)).filter(Boolean) as any[];
  }, [data, favKeys]);

  const copyAll = React.useCallback(async () => {
    if (items.length === 0) return;
    const lines: string[] = [];
    for (const item of items) {
      lines.push(item.text);
      if (item.benefit) lines.push(`  ﴾ ${item.benefit} ﴿`);
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setCopiedAll(true);
      toast.success(`تم نسخ ${items.length} ذكر`);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      toast.error("تعذر النسخ");
    }
  }, [items]);

  const shareAll = React.useCallback(async () => {
    if (items.length === 0) return;
    const lines: string[] = ["【 أذكاري المفضلة 】", ""];
    for (const item of items) {
      lines.push(item.text);
      if (item.benefit) lines.push(`  ﴾ ${item.benefit} ﴿`);
      lines.push("");
    }
    const text = lines.join("\n").trim() + "\n\n• ATHAR أثر";
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* fall through */ }
    }
    await copyAll();
  }, [items, copyAll]);

  // Group items by section for organized display
  const grouped = React.useMemo(() => {
    const map = new Map<string, { sectionId: string; sectionTitle: string; items: any[] }>();
    for (const item of items) {
      const existing = map.get(item.sectionId);
      if (existing) { existing.items.push(item); }
      else { map.set(item.sectionId, { sectionId: item.sectionId, sectionTitle: item.sectionTitle, items: [item] }); }
    }
    return [...map.values()];
  }, [items]);

  // Quran bookmarks list grouped by surah
  const quranBmList = React.useMemo(() => {
    if (!quranData) return [] as Array<{ surahId: number; surahName: string; ayahIndex: number; note?: string; highlight?: string }>;
    const out: Array<{ surahId: number; surahName: string; ayahIndex: number; note?: string; highlight?: string }> = [];
    for (const [k, v] of Object.entries(quranBookmarks)) {
      if (!v) continue;
      const [sid, aidx] = k.split(":");
      const surahId = Number(sid);
      const ayahIndex = Number(aidx);
      const surahName = quranData.find((s) => s.id === surahId)?.name ?? `${surahId}`;
      out.push({ surahId, surahName, ayahIndex, note: quranNotes[k] || undefined, highlight: quranHighlights[k] || undefined });
    }
    return out.sort((a, b) => a.surahId - b.surahId || a.ayahIndex - b.ayahIndex);
  }, [quranBookmarks, quranData, quranNotes, quranHighlights]);

  const quranBmBySurah = React.useMemo(() => {
    const map = new Map<number, { surahId: number; surahName: string; items: typeof quranBmList }>();
    for (const bm of quranBmList) {
      const g = map.get(bm.surahId);
      if (g) g.items.push(bm);
      else map.set(bm.surahId, { surahId: bm.surahId, surahName: bm.surahName, items: [bm] });
    }
    return [...map.values()];
  }, [quranBmList]);

  const HL_SWATCHES: Record<string, string> = {
    gold:  "rgba(251,191,36,0.85)",
    green: "rgba(52,211,153,0.85)",
    blue:  "rgba(96,165,250,0.85)",
    red:   "rgba(248,113,113,0.85)",
  };

  return (
    <div className="space-y-4 page-enter">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-[var(--accent)]" />
            <div className="font-semibold">المفضلة</div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "adhkar" && items.length > 0 && (
              <>
                <Button variant="secondary" onClick={shareAll} aria-label="مشاركة الكل">
                  <Share2 size={15} />
                  مشاركة
                </Button>
                <Button variant="secondary" onClick={copyAll} aria-label="نسخ الكل">
                  {copiedAll ? <CopyCheck size={15} /> : <Copy size={15} />}
                  {copiedAll ? "تم ✓" : "نسخ الكل"}
                </Button>
              </>
            )}
            <div className="text-xs opacity-70 pr-1">
              {activeTab === "adhkar" ? `${items.length} ذكر` : `${quranBmList.length} علامة`}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs opacity-65 leading-6">
          المفضلة محفوظة محليًا على جهازك. يمكنك تصدير النسخة الاحتياطية من صفحة الإعدادات.
        </div>

        {/* Tab switcher */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setActiveTab("adhkar")}
            className={[
              "flex items-center gap-1.5 px-4 py-2 rounded-2xl border text-sm transition min-h-[40px]",
              activeTab === "adhkar"
                ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 font-medium"
                : "bg-white/6 border-white/10 opacity-70 hover:opacity-100"
            ].join(" ")}
          >
            <Heart size={14} />
            الأذكار {items.length > 0 && <span className="text-[11px] opacity-60">({items.length})</span>}
          </button>
          <button
            onClick={() => setActiveTab("quran")}
            className={[
              "flex items-center gap-1.5 px-4 py-2 rounded-2xl border text-sm transition min-h-[40px]",
              activeTab === "quran"
                ? "bg-[var(--accent)]/15 border-[var(--accent)]/35 font-medium"
                : "bg-white/6 border-white/10 opacity-70 hover:opacity-100"
            ].join(" ")}
          >
            <BookOpen size={14} />
            القرآن {quranBmList.length > 0 && <span className="text-[11px] opacity-60">({quranBmList.length})</span>}
          </button>
        </div>
      </Card>

      {/* ── Adhkar tab ── */}
      {activeTab === "adhkar" && (
      <Card className="p-5">
        {items.length === 0 ? (
          <EmptyState
            variant="favorites"
            title="لا توجد مفضلة بعد"
            description="اضغط على ♥ داخل أي ذكر لإضافته هنا وتجده بسرعة لاحقًا"
          />
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => {
              const identity = getSectionIdentity(group.sectionId);
              return (
                <div key={group.sectionId}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-base">{identity.icon}</span>
                    <span className="text-xs font-semibold opacity-65" style={{ color: identity.accent }}>{group.sectionTitle}</span>
                    <span className="text-[11px] opacity-40 mr-auto">{group.items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((r: any) => (
                      <div
                        key={r.key}
                        className="glass rounded-3xl p-4 border border-white/10 flex items-start justify-between gap-3 press-effect glass-hover"
                      >
                        <button className="text-right flex-1" onClick={() => navigate(`/c/${r.sectionId}?focus=${r.index}`)}>
                          <div className="flex items-start justify-between gap-3">
                            <ArrowUpRight size={18} className="opacity-60 shrink-0 mt-0.5" />
                          </div>
                          <div className="arabic-text text-sm opacity-80 leading-7">
                            {r.text.slice(0, 200)}
                            {r.text.length > 200 ? "…" : ""}
                          </div>
                          {r.benefit && (
                            <div className="mt-2 text-[11px] opacity-50 leading-5 border-t border-white/8 pt-2">
                              الفضل: {r.benefit.slice(0, 100)}{r.benefit.length > 100 ? "…" : ""}
                            </div>
                          )}
                        </button>

                        {confirmDeleteKey === r.key ? (
                          <div className="flex flex-col gap-2">
                            <Button variant="danger" size="sm" onClick={() => { toggleFavorite(r.sectionId, r.index); setConfirmDeleteKey(null); }}>
                              تأكيد
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteKey(null)}>
                              إلغاء
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              onClick={() => copyItem(r.key, r.text)}
                              aria-label="نسخ الذكر"
                            >
                              {copiedKey === r.key ? <Check size={16} /> : <Copy size={16} />}
                            </Button>
                            <Button variant="outline" onClick={() => setConfirmDeleteKey(r.key)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      )}

      {/* ── Quran bookmarks tab ── */}
      {activeTab === "quran" && (
        <Card className="p-5">
          {quranBmList.length === 0 ? (
            <EmptyState
              variant="quran-favorites"
              title="لا توجد علامات مرجعية"
              description="اضغط على 🔖 داخل أي آية في المصحف لحفظها هنا"
              action={
                <button
                  onClick={() => navigate("/quran")}
                  className="text-sm text-[var(--accent)] opacity-80 hover:opacity-100 transition underline underline-offset-2"
                >
                  الذهاب للقرآن ◄
                </button>
              }
            />
          ) : (
            <div className="space-y-5">
              {quranBmBySurah.map((group) => (
                <div key={group.surahId}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <BookOpen size={13} className="text-[var(--accent)] shrink-0" />
                    <span className="text-xs font-semibold opacity-65 arabic-text">{group.surahName}</span>
                    <span className="text-[11px] opacity-40 mr-auto">{group.items.length}</span>
                  </div>
                  <div className="divide-y divide-white/6 rounded-2xl border border-white/10 overflow-hidden">
                    {group.items.map((bm) => (
                      <div key={`${bm.surahId}:${bm.ayahIndex}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/6 transition">
                        {bm.highlight && HL_SWATCHES[bm.highlight] && (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20" style={{ background: HL_SWATCHES[bm.highlight] }} />
                        )}
                        <button
                          className="flex-1 text-right min-w-0"
                          onClick={() => navigate(`/quran/${bm.surahId}?a=${bm.ayahIndex}`)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm arabic-text font-medium">{bm.surahName}</span>
                            <span className="text-xs opacity-55 tabular-nums shrink-0">﴿{bm.ayahIndex}﴾</span>
                          </div>
                          {bm.note && (
                            <div className="text-[11px] opacity-55 mt-0.5 truncate">{bm.note.slice(0, 60)}</div>
                          )}
                        </button>
                        <Button
                          variant="outline"
                          onClick={() => toggleQuranBookmark(bm.surahId, bm.ayahIndex)}
                          aria-label="إزالة العلامة"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
