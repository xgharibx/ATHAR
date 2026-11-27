/**
 * «مراجعة اليوم»: the Quran pages and hadith cards waiting today, side by
 * side, each opening its own session (see lib/reviewToday.ts).
 */
import { useNavigate } from "react-router-dom";
import { BookOpen, ScrollText } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { useHifzToday } from "@/quran2/hifz/useHifzToday";
import { hadithDueOn, localDayKey } from "@/lib/reviewToday";
import { arNum } from "@/lib/formatNumber";
import { countAr, CARD } from "@/lib/arabicCount";

export function ReviewTodayCard({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const today = useHifzToday();
  const hadithDue = useNoorStore((s) => hadithDueOn(s.hadithMemoCards, localDayKey()));
  const hadithCards = useNoorStore((s) => Object.keys(s.hadithMemoCards).length);
  const { newPages, near, far } = today.plan;
  const pages = newPages.length + near.length + far.length;
  if (!today.memorised && !hadithCards) return null;

  const rows = [
    {
      key: "quran",
      icon: BookOpen,
      label: "القرآن الكريم",
      value: today.memorised ? (pages ? `${arNum(pages)} صفحة` : "لا شيء الآن") : "ابدأ الحفظ",
      to: today.memorised && pages ? "/quran/hifz/session" : "/quran/hifz",
    },
    {
      key: "hadith",
      icon: ScrollText,
      label: "الحديث",
      value: hadithCards ? (hadithDue ? countAr(hadithDue, CARD) : "لا شيء الآن") : "أضف بطاقة",
      to: "/hadith/memo",
    },
  ];
  return (
    <section dir="rtl" aria-label="مراجعة اليوم" className={`rounded-3xl border border-(--stroke) bg-(--card) p-4 ${className}`}>
      <h2 className="mb-2 text-sm font-bold">مراجعة اليوم</h2>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(({ key, icon: Icon, label, value, to }) => (
          <button key={key} type="button" onClick={() => navigate(to)}
            className="flex items-center gap-2 rounded-2xl border border-(--stroke) px-3 py-2.5 text-right press-effect">
            <Icon size={16} aria-hidden="true" className="shrink-0 text-(--accent)" />
            <span className="min-w-0">
              <span className="block text-[11px] text-(--muted)">{label}</span>
              <span className="block text-sm font-bold truncate">{value}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
