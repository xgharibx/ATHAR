import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "form-field-readable w-full rounded-2xl border border-white/10 px-4 py-3 text-sm outline-none focus:border-[var(--accent)]/40 transition",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
