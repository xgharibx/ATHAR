import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider(props: SliderPrimitive.SliderProps) {
  return (
    <SliderPrimitive.Root
      {...props}
      className={cn("relative flex items-center select-none touch-none w-full h-5", props.className)}
    >
      <SliderPrimitive.Track className="bg-white/10 relative grow rounded-full h-2 border border-white/10">
        <SliderPrimitive.Range className="absolute bg-[var(--accent)] rounded-full h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block w-5 h-5 bg-white rounded-full border border-black/20 shadow" />
    </SliderPrimitive.Root>
  );
}
