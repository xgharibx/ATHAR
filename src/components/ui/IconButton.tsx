import * as React from "react";
import { cn } from "@/lib/utils";

export function IconButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }
) {
  const { className, ...rest } = props;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl p-2.5 bg-white/6 hover:bg-white/10 border border-white/10 transition active:scale-[.99]",
        className
      )}
      {...rest}
    />
  );
}
