import { hueFor, initials } from "@/lib/listen/catalog";
import { cn } from "@/lib/utils";

/**
 * A reciter's mark: their initials over a colour of their own (the same
 * everywhere in the app) and a faint eight-pointed star. Gold for the
 * golden recordings.
 */
export function ReciterMark({ name, gold = false, className, style }: { name: string; gold?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={cn("ls-mark", gold && "is-gold", className)}
      style={{ ["--h" as string]: hueFor(name), ...style }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
