/**
 * Line icons for the curated hadith collections, in the app's icon style
 * (they used to be emoji, which look different on every phone).
 */
import { BookOpen, Compass, Landmark, Layers, Leaf, MoonStar, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  all: Layers,
  nawawi_core: BookOpen,
  sahih_muslim_selected: Landmark,
  adab_raqaiq: Leaf,
  worship_pillars: MoonStar,
  reader_guides: Compass,
};

export function CuratedIcon({ id, size = 16, className, color }: { id: string; size?: number; className?: string; color?: string }) {
  const Icon = ICONS[id] ?? BookOpen;
  return <Icon size={size} aria-hidden="true" className={className} style={color ? { color } : undefined} />;
}
