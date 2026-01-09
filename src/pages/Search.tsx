import * as React from "react";
import Fuse from "fuse.js";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";

import { useAdhkarDB } from "@/data/useAdhkarDB";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { FlatDhikr } from "@/data/types";

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

  const results: FlatDhikr[] = React.useMemo(() => {
    if (!fuse) return [];
    if (!q.trim()) return [];
    return fuse.search(q).slice(0, 50).map((r) => r.item);
  }, [fuse, q]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Search size={18} className="opacity-70" />
          <div className="font-semibold">بحث</div>
        </div>
        <div className="mt-4">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث داخل الأذكار…" />
        </div>
        <div className="mt-2 text-xs opacity-65 leading-5">
          نصائح: ابحث بكلمة عربية أو اسم قسم. أمثلة: <span className="opacity-80">الله</span> —{" "}
          <span className="opacity-80">المساء</span> — <span className="opacity-80">الوضوء</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-3">النتائج ({results.length})</div>
        {!q.trim() ? (
          <div className="opacity-70 text-sm leading-7">اكتب شيئًا للبحث.</div>
        ) : results.length === 0 ? (
          <div className="opacity-70 text-sm leading-7">لا توجد نتائج.</div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <button
                key={r.key}
                onClick={() => navigate(`/c/${r.sectionId}?focus=${r.index}`)}
                className="w-full text-right glass rounded-3xl p-4 hover:bg-white/10 transition border border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{r.sectionTitle}</div>
                    <div className="mt-1 text-xs opacity-60">{r.sectionId}</div>
                  </div>
                  <ArrowUpRight size={18} className="opacity-60" />
                </div>
                <div className="mt-3 text-sm opacity-80 leading-7">
                  {r.text.slice(0, 220)}
                  {r.text.length > 220 ? "…" : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
