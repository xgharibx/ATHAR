import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowUpRight, Trash2, Copy, Check, CopyCheck, Share2 } from "lucide-react";
import toast from "react-hot-toast";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSectionIdentity } from "@/lib/sectionIdentity";

export function FavoritesPage() {
  const { data } = useAdhkarDB();
  const navigate = useNavigate();
  const favorites = useNoorStore((s) => s.favorites);
  const toggleFavorite = useNoorStore((s) => s.toggleFavorite);

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

  return (
    <div className="space-y-4 page-enter">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-[var(--accent)]" />
            <div className="font-semibold">المفضلة</div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
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
            <div className="text-xs opacity-70 pr-1">{items.length} عنصر</div>
          </div>
        </div>
        <div className="mt-2 text-xs opacity-65 leading-6">
          المفضلة محفوظة محليًا على جهازك. يمكنك تصدير النسخة الاحتياطية من صفحة الإعدادات.
        </div>
      </Card>

      <Card className="p-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8 gap-3">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-3xl">
              🤍
            </div>
            <div className="font-semibold opacity-80">لا توجد مفضلة بعد</div>
            <div className="text-sm opacity-55 leading-6 max-w-[260px]">
              اضغط على ❤️ داخل أي ذكر لإضافته هنا وتجده بسرعة لاحقًا
            </div>
          </div>
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
    </div>
  );
}
