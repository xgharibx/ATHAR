import * as React from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpRight, X } from "lucide-react";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Card } from "@/components/ui/Card";
import type { FlatDhikr } from "@/data/types";
import { getSectionIdentity } from "@/lib/sectionIdentity";

export function SearchPage() {
  const { data } = useAdhkarDB();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");

  const fuse = React.useMemo(() => {
    if (!data) return null;
    return new Fuse(data.flat, {
      includeScore: true,
      threshold: 0.35,
      keys: ["text", "sectionTitle", "sectionId"]
    });
  }, [data]);

  const { results, totalHits } = React.useMemo(() => {
    if (!fuse || !q.trim()) return { results: [] as FlatDhikr[], totalHits: 0 };
    const all = fuse.search(q);
    return { results: all.slice(0, 50).map((r) => r.item), totalHits: all.length };
  }, [fuse, q]);

  return (
    <div className="space-y-4 page-enter">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Search size={18} className="opacity-70" />
          <div className="font-semibold">بحث</div>
        </div>
        <div className="mt-4 relative flex items-center gap-2">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث داخل الأذكار…" />
          {q ? (
            <IconButton aria-label="مسح" onClick={() => setQ("")}>
              <X size={16} />
            </IconButton>
          ) : null}
        </div>
        <div className="mt-2 text-xs opacity-65 leading-5">
          نصائح: ابحث بكلمة عربية أو اسم قسم. أمثلة: <span className="opacity-80">الله</span> —{" "}
          <span className="opacity-80">المساء</span> — <span className="opacity-80">الوضوء</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">النتائج</div>
          {q.trim() && (
            <div className="text-xs opacity-55 tabular-nums">
              {totalHits > 50 ? `${results.length} من ${totalHits}` : results.length}
            </div>
          )}
        </div>
        {!q.trim() ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <Search size={32} className="opacity-20" />
            <div className="text-sm opacity-55">اكتب للبحث في الأذكار</div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6 gap-2">
            <div className="text-2xl opacity-30">🔍</div>
            <div className="text-sm opacity-55">لا توجد نتائج لـ «{q}»</div>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => {
              const identity = getSectionIdentity(r.sectionId);
              return (
                <button
                  key={r.key}
                  onClick={() => navigate(`/c/${r.sectionId}?focus=${r.index}`)}
                  className="w-full text-right glass rounded-3xl p-4 hover:bg-white/10 transition border border-white/10 press-effect glass-hover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{identity.icon}</span>
                      <div className="text-sm font-semibold truncate" style={{ color: identity.accent }}>
                        {r.sectionTitle}
                      </div>
                    </div>
                    <ArrowUpRight size={18} className="opacity-60 shrink-0" />
                  </div>
                  <div className="mt-3 arabic-text text-sm opacity-80 leading-7">
                    {r.text.slice(0, 220)}
                    {r.text.length > 220 ? "…" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
