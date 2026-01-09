import * as React from "react";
import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={cn("glass-strong rounded-3xl", className)} {...rest} />;
}
