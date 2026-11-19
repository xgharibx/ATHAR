import "@/styles/brand.css";
import { cn } from "@/lib/utils";

/** Athar's real mark, in the colours of the current theme. */
export function AtharLogo({ className, label = "أثر" }: { className?: string; label?: string }) {
  const base = import.meta.env.BASE_URL ?? "/";
  return (
    <span
      className={cn("athar-logo", className)}
      role="img"
      aria-label={label}
      style={{
        ["--athar-print" as string]: `url("${base}brand/athar-print.png")`,
        ["--athar-word" as string]: `url("${base}brand/athar-word.png")`,
      }}
    >
      <span className="athar-logo-print" />
      <span className="athar-logo-word" />
    </span>
  );
}

/** The line that goes with the mark. */
export function AtharSlogan({ className }: { className?: string }) {
  return (
    <span className={cn("athar-slogan", className)}>
      همسة تطمئن قلبك،
      <br />
      وتترك أثرًا
    </span>
  );
}
