import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch(props: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        "w-11 h-6 rounded-full relative border border-white/14 bg-white/10 data-[state=checked]:bg-[rgba(255,215,128,.18)] transition",
        props.className
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block w-5 h-5 rounded-full bg-white absolute top-0.5 right-0.5 transition-transform data-[state=checked]:-translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
