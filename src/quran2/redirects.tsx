/**
 * The app's earlier Quran addresses, still used by links people saved, home
 * screen widgets, notifications, Siri and Spotlight shortcuts and older
 * builds of the app, lead to the same place in «القرآن الكريم».
 */
import { Navigate, useLocation, useParams } from "react-router-dom";
import { quranTargetFor } from "./redirectTarget";

export function QuranRedirect({ from }: { from: "mushaf" | "q2" | "tafsir" }) {
  const location = useLocation();
  // Read so the redirect re-renders when the address changes.
  useParams();
  return <Navigate to={quranTargetFor(from, location.pathname, location.search, location.hash)} replace />;
}
