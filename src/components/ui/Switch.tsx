import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch(props: Readonly<SwitchPrimitive.SwitchProps>) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        "w-11 h-6 rounded-full relative border bg-danger-20 border-danger-45 data-[state=checked]:bg-ok-35 data-[state=checked]:border-ok-70 transition disabled:opacity-45",
        props.className
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block w-5 h-5 rounded-full bg-[var(--danger)] absolute top-0.5 right-0.5 shadow-sm transition-transform data-[state=checked]:-translate-x-5 data-[state=checked]:bg-[var(--ok)]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
