/**
 * The one hadith-grade chip design — used everywhere a grade is shown
 * (full reader, book search results, Library) so the same grade always
 * looks the same, not a per-page reinvention with its own color map.
 */
import { hadithGradeColor, hadithGradeLabel } from "@/data/hadithTypes";
import { cn } from "@/lib/utils";

export function GradeChip({ grade, size = "md" }: { grade: string; size?: "sm" | "md" }) {
  const color = hadithGradeColor(grade);
  return (
    <span
      className={cn(
        "font-semibold rounded-full shrink-0",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1",
      )}
      style={{ background: color + "22", color }}
    >
      {hadithGradeLabel(grade)}
    </span>
  );
}
