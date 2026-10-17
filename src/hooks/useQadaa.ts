import * as React from "react";
import { useNoorStore, ibadahDayKeyOf } from "@/store/noorStore";
import { buildQadaaSummary, type QadaaSummary } from "@/lib/qadaaSummary";

/**
 * The one place the Qadaa surfaces read their numbers from. Selecting the raw
 * maps (stable references until they change) and deriving in a memo keeps the
 * bottom-bar button from re-rendering on unrelated store writes.
 */
export function useQadaa(): QadaaSummary {
  const owed = useNoorStore((s) => s.qadaaOwed);
  const done = useNoorStore((s) => s.qadaaDone);
  const dayTotals = useNoorStore((s) => s.qadaaDayTotals);
  const dayKinds = useNoorStore((s) => s.qadaaDayKinds);
  const settings = useNoorStore((s) => s.qadaaSettings);
  const today = useNoorStore((s) => ibadahDayKeyOf(s));
  return React.useMemo(
    () => buildQadaaSummary({ owed, done, dayTotals, dayKinds, settings, today }),
    [owed, done, dayTotals, dayKinds, settings, today],
  );
}
