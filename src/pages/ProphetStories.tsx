import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { PROPHET_STORIES, type ProphetStory } from "@/data/prophetStories";

function StoryCard({ story }: { story: ProphetStory }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      <button type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-right"
        style={{ color: "var(--fg)" }}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronUp size={18} style={{ color: "var(--accent)" }} />
          ) : (
            <ChevronDown size={18} style={{ color: "var(--accent)" }} />
          )}
        </div>
        <div className="flex-1 text-right mr-2">
          <div className="font-bold text-base" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
            {story.nameAr}
          </div>
          {story.period && (
            <div className="text-xs opacity-50 mt-0.5">{story.period}</div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {story.nameAr.charAt(0)}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div className="h-px" style={{ background: "var(--card-border)" }} />
          <p
            className="text-sm leading-loose text-right"
            style={{ color: "var(--fg)", opacity: 0.85 }}
          >
            {story.summary}
          </p>
          {story.lessons.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--accent)" }}>
                الدروس المستفادة:
              </p>
              <ul className="space-y-1.5">
                {story.lessons.map((lesson, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-right" style={{ color: "var(--fg)" }}>
                    <span style={{ color: "var(--accent)" }} className="mt-0.5 flex-shrink-0">•</span>
                    <span className="opacity-80">{lesson}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProphetStoriesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query.trim()) return PROPHET_STORIES;
    const q = query.trim();
    return PROPHET_STORIES.filter((s) =>
      s.nameAr.includes(q) ||
      s.summary.includes(q) ||
      (s.lessons ?? []).some((l) => l.includes(q))
    );
  }, [query]);

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <button type="button"
            onClick={() => navigate(-1)}
            aria-label="رجوع"
            className="p-2 rounded-xl"
            style={{ background: "var(--card-bg)", color: "var(--fg)" }}
          >
            <ArrowRight size={18} />
          </button>
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--fg)" }}>
              قصص الأنبياء
            </h1>
            <p className="text-xs opacity-60" style={{ color: "var(--fg)" }}>
              {filtered.length} من {PROPHET_STORIES.length} نبيًا
            </p>
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
          <input
            type="search"
            dir="rtl"
            placeholder="ابحث باسم النبي أو الدرس…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pr-8 pl-8 rounded-2xl text-sm outline-none border"
            style={{ background: "var(--card-bg)", color: "var(--fg)", borderColor: "var(--card-border)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Stories */}
      <div className="px-4 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 opacity-50 text-sm" style={{ color: "var(--fg)" }}>لا توجد نتائج</div>
        ) : filtered.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
}
