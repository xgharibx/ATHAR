import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn("h-px w-full bg-[var(--stroke)]", className)} {...rest} />;
}
