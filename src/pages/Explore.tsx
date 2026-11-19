/**
 * «اكتشف» — everything in Athar on one calm page, for the «أفق» design.
 *
 * A search field, then the adhkar collections, then each part of the app in
 * the group where people look for it. In the classic design this page is
 * reachable but not linked; its own bar and menus cover the same ground.
 */
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Search } from "lucide-react";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { UFUQ_EXPLORE_GROUPS } from "@/components/ufuq/ufuqNav";
import { arNum } from "@/lib/formatNumber";

export function ExplorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollRestoration();
  const { data } = useAdhkarDB();
  const sections = data?.db.sections ?? [];
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (location.hash !== "#adhkar") return;
    const timer = window.setTimeout(() => {
      document.getElementById("explore-adhkar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="u-explore pt-2">
      <h1 className="u-display px-1">اكتشف</h1>
      <p className="mt-1.5 px-1 text-[14px] text-(--muted)">كل ما في أثر، مرتّبًا كما تبحث عنه.</p>

      <form
        role="search"
        className="mt-5 u-card flex items-center gap-2.5 px-4 h-12"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
        }}
      >
        <Search size={17} className="opacity-50 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في الأذكار والقرآن والأحاديث…"
          aria-label="البحث في أثر"
          className="flex-1 min-w-0 bg-transparent outline-hidden text-[15px]"
        />
      </form>

      <section id="explore-adhkar" className="scroll-mt-20">
        <div className="u-section-head">
          <h2>الأذكار</h2>
          <span className="text-[12.5px] text-(--muted)">{sections.length ? `${arNum(sections.length)} مجموعة` : ""}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const identity = getSectionIdentity(section.id);
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => navigate(`/c/${section.id}`)}
                className="u-chip"
              >
                <span aria-hidden="true">{identity.icon}</span>
                {section.title}
              </button>
            );
          })}
        </div>
      </section>

      {UFUQ_EXPLORE_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`explore-${group.id}`}>
          <div className="u-section-head">
            <h2 id={`explore-${group.id}`}>{group.title}</h2>
          </div>
          <div className="u-card u-explore-group">
            {group.items.map((item) => (
              <button key={item.path} type="button" className="u-explore-row" onClick={() => navigate(item.path)}>
                <span className="u-explore-icon" aria-hidden="true"><item.icon size={17} /></span>
                <span className="flex-1 min-w-0">
                  <span className="u-explore-title block">{item.title}</span>
                  <span className="u-explore-sub block">{item.sub}</span>
                </span>
                <ChevronLeft size={16} className="opacity-35 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default ExplorePage;
