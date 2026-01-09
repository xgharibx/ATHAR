import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl bg-white/6 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20 focus:bg-white/8 transition placeholder:text-white/45",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
