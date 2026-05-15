import * as React from "react";
import { cn } from "@/lib/utils";

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }
>(function IconButton(props, ref) {
  const { className, "aria-label": ariaLabel, ...rest } = props;
  return (
    <button type="button"
      ref={ref}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl p-2.5 bg-[var(--card)] hover:bg-[var(--card-2)] border border-[var(--stroke)] transition active:scale-[.99] min-h-[44px] min-w-[44px]",
        className
      )}
      {...rest}
    />
  );
});
