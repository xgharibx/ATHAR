import { forHijri } from "@/lib/hijri";
/** Whether a date falls in Ramadan (the Islamic calendar's ninth month). */
export function isRamadan(date = new Date()): boolean {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic", { month: "numeric" });
    const parts = fmt.formatToParts(forHijri(date));
    const monthPart = parts.find((p) => p.type === "month");
    return monthPart?.value === "9";
  } catch {
    return false;
  }
}
