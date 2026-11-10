export type HomeAdhkarAction = {
  id: "sleep" | "morning" | "evening";
  label: string;
};

/** Picks the Home adhkar shortcut for the current local hour. */
export function getHomeAdhkarAction(hour: number): HomeAdhkarAction {
  if (hour >= 21 || hour < 4) return { id: "sleep", label: "ابدأ بأذكار النوم" };
  if (hour >= 15) return { id: "evening", label: "ابدأ بأذكار المساء" };
  return { id: "morning", label: "ابدأ بأذكار الصباح" };
}
