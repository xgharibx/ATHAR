/**
 * «/hadith/today»: opens the day's hadith with its explanation, the same one
 * the home and the widget show. Siri («حديث اليوم في أثر») and iPhone search
 * open this; without a connection it falls back to the hadith page.
 * Route: /hadith/today
 */
import * as React from "react";
import { Navigate } from "react-router-dom";
import { useDailyHadith } from "@/lib/useDailyHadith";
import { useTodayKey } from "@/hooks/useTodayKey";

export function HadithTodayPage() {
  const today = useTodayKey();
  const { hadith, done } = useDailyHadith(today);
  if (!done) {
    return (
      <div className="px-4 pt-6" role="status" aria-label="جارٍ فتح حديث اليوم">
        <div className="skeleton h-40 w-full rounded-3xl" />
      </div>
    );
  }
  return <Navigate to={hadith ? `/library/sharh?h=${encodeURIComponent(hadith.id)}` : "/hadith"} replace />;
}

export default HadithTodayPage;
