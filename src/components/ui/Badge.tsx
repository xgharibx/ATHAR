import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge(props: React.HTMLAttributes<HTMLSpanElement>) {
  const { className, ...rest } = props;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-white/6 border border-white/10 text-[var(--muted)]",
        className
      )}
      {...rest}
    />
  );
}
