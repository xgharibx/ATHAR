import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { PROPHET_STORIES, type ProphetStory } from "@/data/prophetStories";

function StoryCard({ story }: { story: ProphetStory }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      <button
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

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 pt-4 pb-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
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
              {PROPHET_STORIES.length} نبيًا من أولي العزم والمرسلين
            </p>
          </div>
        </div>
      </div>

      {/* Stories */}
      <div className="px-4 pt-4 space-y-3">
        {PROPHET_STORIES.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
}
