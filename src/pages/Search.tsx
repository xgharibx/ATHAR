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
import { cn } from "@/lib/utils";

// --- Recent searches helpers ---
const RECENT_KEY = "noor_recent_searches";
const MAX_RECENT = 6;
function loadRecent(): string[] {
  try {
    const v = localStorage.getItem(RECENT_KEY);
    return v ? (JSON.parse(v) as unknown[]).filter((s): s is string => typeof s === "string") : [];
  } catch { return []; }
}
function saveRecent(list: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}
function pushRecent(term: string, prev: string[]): string[] {
  const t = term.trim();
  if (!t || t.length < 2) return prev;
  const next = [t, ...prev.filter((s) => s !== t)].slice(0, MAX_RECENT);
  saveRecent(next);
  return next;
}

export function SearchPage() {
  const { data } = useAdhkarDB();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  const [recentSearches, setRecentSearches] = React.useState<string[]>(() => loadRecent());
  const [sectionFilter, setSectionFilter] = React.useState<string | null>(null);

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
    const all = fuse.search(q).map((r) => r.item);
    const filtered = sectionFilter ? all.filter((r) => r.sectionId === sectionFilter) : all;
    return { results: filtered.slice(0, 50), totalHits: filtered.length };
  }, [fuse, q, sectionFilter]);

  // Build section chip list from current results (before section filter)
  const sectionChips = React.useMemo(() => {
    if (!fuse || !q.trim() || !data) return [] as Array<{ id: string; title: string; count: number }>;
    const all = fuse.search(q).map((r) => r.item);
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const r of all) {
      const existing = map.get(r.sectionId);
      if (existing) { existing.count++; }
      else { map.set(r.sectionId, { id: r.sectionId, title: r.sectionTitle, count: 1 }); }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [fuse, q, data]);

  // Reset section filter when query changes
  React.useEffect(() => { setSectionFilter(null); }, [q]);

  // Save search term after user gets results
  React.useEffect(() => {
    if (!q.trim() || q.trim().length < 2 || results.length === 0) return;
    const timer = setTimeout(() => setRecentSearches((prev) => pushRecent(q, prev)), 800);
    return () => clearTimeout(timer);
  }, [q, results.length]);

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

        {/* Recent searches */}
        {!q && recentSearches.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold opacity-45 tracking-wide">عمليات بحث سابقة</span>
              <button
                onClick={() => { setRecentSearches([]); saveRecent([]); }}
                className="text-[11px] opacity-50 hover:opacity-80 transition px-2 py-1 rounded-lg"
              >
                مسح الكل
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => setQ(s)}
                  className="px-3 py-1.5 rounded-full glass border border-white/10 text-xs hover:bg-white/10 transition arabic-text min-h-[36px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Section filter chips */}
      {sectionChips.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setSectionFilter(null)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
              sectionFilter === null
                ? "bg-[var(--accent)] border-transparent text-black"
                : "bg-white/8 border-white/12 hover:bg-white/12"
            )}
          >
            الكل ({sectionChips.reduce((a, c) => a + c.count, 0)})
          </button>
          {sectionChips.map((chip) => {
            const identity = getSectionIdentity(chip.id);
            const isActive = sectionFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSectionFilter(isActive ? null : chip.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",
                  isActive
                    ? "border-transparent text-black"
                    : "bg-white/8 border-white/12 hover:bg-white/12"
                )}
                style={isActive ? { background: identity.accent } : {}}
              >
                <span>{identity.icon}</span>
                <span>{chip.title}</span>
                <span className="opacity-70">({chip.count})</span>
              </button>
            );
          })}
        </div>
      )}

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
                  {r.benefit && (
                    <div className="mt-2 text-[11px] opacity-55 leading-5 border-t border-white/8 pt-2">
                      الفضل: {r.benefit.slice(0, 120)}{r.benefit.length > 120 ? "…" : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
