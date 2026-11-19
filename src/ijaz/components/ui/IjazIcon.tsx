/**
 * Drawn icons for «الإعجاز» in place of emoji, which render differently on
 * every phone and read as clip-art next to the Arabic.
 */
import { Atom, BookOpen, Brain, Compass, Dna, Globe2, Mountain, ScrollText, Search, Sparkles, Telescope, Waves, type LucideIcon } from 'lucide-react';

const BY_KEY: Record<string, LucideIcon> = {
  cosmological: Atom,
  cosmos: Atom,
  biological: Dna,
  microscopic: Dna,
  'earth-sciences': Globe2,
  earth: Globe2,
  prophecies: ScrollText,
  timeline: ScrollText,
  'logical-philosophical': Brain,
  logic: Brain,
  mountain: Mountain,
  sea: Waves,
  scientist: Telescope,
  seeker: Compass,
  skeptic: Search,
  book: BookOpen,
  spark: Sparkles,
};

export function IjazIcon({ name, size = 24, className, style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const Icon = BY_KEY[name] ?? Sparkles;
  return <Icon size={size} aria-hidden="true" className={className} style={style} />;
}
