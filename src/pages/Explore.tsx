/**
 * «اكتشف» — everything in Athar on one calm page, for the «أفق» design.
 *
 * A search field, the board of «المتصدرون», then each part of the app in the
 * group where people look for it, and the adhkar last, as a category of their
 * own (the most used first, all of them a tap away), so the page is not a wall
 * of adhkar that hides everything under it. In the classic design this page
 * is reachable but not linked; its own bar and menus cover the same ground.
 */
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, Search, Trophy } from "lucide-react";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { UFUQ_EXPLORE_GROUPS } from "@/components/ufuq/ufuqNav";
import { arNum } from "@/lib/formatNumber";

/** The collections opened most, first in the adhkar category. */
const FEATURED_ADHKAR = ["morning", "evening", "post_prayer", "sleep", "waking"];

export function ExplorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  useScrollRestoration();
  const { data } = useAdhkarDB();
  const sections = data?.db.sections ?? [];
  const [query, setQuery] = React.useState("");
  // Arriving for the adhkar («عرض الكل» on «اليوم»): every collection, open.
  const [allAdhkar, setAllAdhkar] = React.useState(() => location.hash === "#adhkar");
  const featured = React.useMemo(() => {
    const byId = new Map(sections.map((s) => [s.id, s]));
    return FEATURED_ADHKAR.map((id) => byId.get(id)).filter((s): s is (typeof sections)[number] => Boolean(s));
  }, [sections]);
  const rest = React.useMemo(() => sections.filter((s) => !FEATURED_ADHKAR.includes(s.id)), [sections]);

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

      <button type="button" className="u-card u-card-press w-full mt-4 p-4 text-start flex items-center gap-3.5" onClick={() => navigate("/leaderboard")}>
        <span className="u-tile-icon" aria-hidden="true"><Trophy size={18} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-semibold">المتصدرون</span>
          <span className="block text-[13px] text-(--muted) mt-0.5">تنافس مع أصدقائك في الخير، والتحدي الأسبوعي</span>
        </span>
        <ChevronLeft size={16} className="opacity-35 shrink-0" aria-hidden="true" />
      </button>

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

      <section id="explore-adhkar" className="scroll-mt-20" aria-labelledby="explore-adhkar-title">
        <div className="u-section-head">
          <h2 id="explore-adhkar-title">الأذكار</h2>
          <span className="text-[12.5px] text-(--muted)">{sections.length ? `${arNum(sections.length)} مجموعة` : ""}</span>
        </div>
        <div className="u-card u-explore-group">
          {featured.map((section) => {
            const identity = getSectionIdentity(section.id);
            return (
              <button key={section.id} type="button" className="u-explore-row" onClick={() => navigate(`/c/${section.id}`)}>
                <span className="u-explore-icon" aria-hidden="true">{identity.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="u-explore-title block">{section.title}</span>
                </span>
                <ChevronLeft size={16} className="opacity-35 shrink-0" aria-hidden="true" />
              </button>
            );
          })}
          {rest.length ? (
            <button type="button" className="u-explore-row" aria-expanded={allAdhkar} onClick={() => setAllAdhkar((v) => !v)}>
              <span className="u-explore-icon" aria-hidden="true"><ChevronDown size={17} style={{ transform: allAdhkar ? "rotate(180deg)" : undefined }} /></span>
              <span className="flex-1 min-w-0">
                <span className="u-explore-title block">{allAdhkar ? "أخفِ بقية المجموعات" : `كل مجموعات الأذكار (${arNum(sections.length)})`}</span>
              </span>
            </button>
          ) : null}
        </div>
        {allAdhkar ? (
          <div className="flex flex-wrap gap-2 mt-3">
            {rest.map((section) => {
              const identity = getSectionIdentity(section.id);
              return (
                <button key={section.id} type="button" onClick={() => navigate(`/c/${section.id}`)} className="u-chip">
                  <span aria-hidden="true">{identity.icon}</span>
                  {section.title}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default ExplorePage;
