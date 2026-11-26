/**
 * «السماع» without covers: the reciters are named, not pictured. A small
 * emblem stands where something must be touched (the mini player, the ways
 * in): headphones, or the sound moving while a recitation plays; and the
 * reciters' cards are their names, set like the title of a book.
 */
import { Link } from "react-router-dom";
import { Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

export function ListenEmblem({ playing = false, size = 44, className }: { playing?: boolean; size?: number; className?: string }) {
  return (
    <span className={cn("ls-emblem", playing && "is-playing", className)} style={{ width: size, height: size }} aria-hidden="true">
      {playing ? (
        <span className="fm-eq">
          <i />
          <i />
          <i />
        </span>
      ) : (
        <Headphones size={Math.round(size * 0.44)} />
      )}
    </span>
  );
}

/** «الشيخ أبو بكر الشاطري» → ["أبو بكر", "الشاطري"]: the given name above the family name. */
function splitName(name: string): [string, string] {
  const clean = name.replace(/^(الشيخ|شيخ|القارئ)\s+/, "").trim();
  const words = clean.split(/\s+/);
  if (words.length <= 1) return [clean, ""];
  if (words.length === 2) return [words[0]!, words[1]!];
  return [words.slice(0, -1).join(" "), words[words.length - 1]!];
}

/** A reciter, by name: the given name, the family name, a fine rule, and a word on the recitation. */
export function ReciterNameCard({ to, name, meta, gold = false }: { to: string; name: string; meta?: string; gold?: boolean }) {
  const [first, last] = splitName(name);
  return (
    <Link to={to} className={cn("ls-name ls-press", gold && "is-gold")} aria-label={name}>
      <b>{first}</b>
      {last ? <b>{last}</b> : null}
      <i aria-hidden="true" />
      {meta ? <span>{meta}</span> : null}
    </Link>
  );
}
