import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider(props: SliderPrimitive.SliderProps) {
  const { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...sliderProps } = props;

  return (
    <SliderPrimitive.Root
      {...sliderProps}
      className={cn("relative flex items-center select-none touch-none w-full h-8", props.className)}
    >
      <SliderPrimitive.Track className="bg-[var(--card)] relative grow rounded-full h-2 border border-[var(--stroke)]">
        <SliderPrimitive.Range className="absolute bg-[var(--accent)] rounded-full h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="block w-6 h-6 bg-[var(--fg)] rounded-full border border-[var(--stroke)] shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-50 focus:ring-offset-1 focus:ring-offset-transparent"
      />
    </SliderPrimitive.Root>
  );
}
