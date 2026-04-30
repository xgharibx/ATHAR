import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl bg-white/6 border border-white/10 px-4 py-3 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]/40 focus:bg-white/8 transition placeholder:text-[var(--muted-2)]",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
