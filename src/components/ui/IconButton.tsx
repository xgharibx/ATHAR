import * as React from "react";
import { cn } from "@/lib/utils";

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }
>(function IconButton(props, ref) {
  const { className, ...rest } = props;
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl p-2.5 bg-white/6 hover:bg-white/10 border border-white/10 transition active:scale-[.99] min-h-[44px] min-w-[44px]",
        className
      )}
      {...rest}
    />
  );
});
