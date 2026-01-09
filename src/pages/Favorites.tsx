import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowUpRight, Trash2 } from "lucide-react";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function FavoritesPage() {
  const { data } = useAdhkarDB();
  const navigate = useNavigate();
  const favorites = useNoorStore((s) => s.favorites);
  const toggleFavorite = useNoorStore((s) => s.toggleFavorite);

  const favKeys = React.useMemo(() => Object.keys(favorites).filter((k) => favorites[k]), [favorites]);

  const items = React.useMemo(() => {
    if (!data) return [];
    const map = new Map(data.flat.map((f) => [f.key, f]));
    return favKeys.map((k) => map.get(k)).filter(Boolean) as any[];
  }, [data, favKeys]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-[var(--accent)]" />
            <div className="font-semibold">المفضلة</div>
          </div>
          <div className="text-xs opacity-70">{items.length} عنصر</div>
        </div>
        <div className="mt-2 text-xs opacity-65 leading-6">
          المفضلة محفوظة محليًا على جهازك. يمكنك تصدير النسخة الاحتياطية من صفحة الإعدادات/المصادر.
        </div>
      </Card>

      <Card className="p-5">
        {items.length === 0 ? (
          <div className="opacity-70 text-sm leading-7">
            لا توجد عناصر في المفضلة. اضغط على ❤️ داخل أي ذكر لإضافته هنا.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div
                key={r.key}
                className="glass rounded-3xl p-4 border border-white/10 flex items-start justify-between gap-3"
              >
                <button className="text-right flex-1" onClick={() => navigate(`/c/${r.sectionId}?focus=${r.index}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{r.sectionTitle}</div>
                      <div className="mt-1 text-xs opacity-60">{r.sectionId}</div>
                    </div>
                    <ArrowUpRight size={18} className="opacity-60" />
                  </div>
                  <div className="mt-3 text-sm opacity-80 leading-7">
                    {r.text.slice(0, 200)}
                    {r.text.length > 200 ? "…" : ""}
                  </div>
                </button>

                <Button variant="outline" onClick={() => toggleFavorite(r.sectionId, r.index)}>
                  <Trash2 size={16} />
                  حذف
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
