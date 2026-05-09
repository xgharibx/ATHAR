import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition will-change-transform active:scale-[.99] disabled:opacity-50 disabled:cursor-not-allowed";
    const variants: Record<Variant, string> = {
      primary: "bg-[var(--accent)] text-black hover:brightness-[1.02]",
      secondary: "bg-[var(--card)] hover:bg-[var(--card-2)] border border-[var(--stroke)]",
      ghost: "bg-transparent hover:bg-[var(--card)]",
      outline: "bg-transparent border border-[var(--stroke)] hover:bg-[var(--card)]",
      danger: "bg-[var(--danger)] text-black hover:brightness-[1.02]"
    };
    const sizes = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-2.5 text-sm min-h-[44px]",
      lg: "px-5 py-3 text-base min-h-[44px]"
    };
    return (
      <button type="button"
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
