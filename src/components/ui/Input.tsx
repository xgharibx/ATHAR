import * as React from "react";
import { cn } from "@/lib/utils";
import { DateField, TimeField } from "@/components/ui/Pickers";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  // Dates and times open the app's own sheet instead of the system dialog.
  if (props.type === "date" || props.type === "time") {
    const field = cn(
      "form-field-readable w-full rounded-2xl border border-[var(--stroke)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition",
      className,
    );
    const onChange = props.onChange as unknown as ((e: { target: { value: string } }) => void) | undefined;
    return props.type === "date" ? (
      <DateField
        value={String(props.value ?? "")}
        onChange={onChange}
        min={props.min as string | undefined}
        max={props.max as string | undefined}
        className={field}
        disabled={props.disabled}
        aria-label={props["aria-label"]}
      />
    ) : (
      <TimeField
        value={String(props.value ?? "")}
        onChange={onChange}
        className={field}
        disabled={props.disabled}
        aria-label={props["aria-label"]}
      />
    );
  }
  return (
    <input
      ref={ref}
      className={cn(
        "form-field-readable w-full rounded-2xl border border-[var(--stroke)] px-4 py-3 text-sm outline-none focus:border-accent-40 transition",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
