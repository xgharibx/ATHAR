import * as React from "react";
import { markStartupReady } from "@/lib/startup";

export function useStartupReady(ready = true): void {
  React.useLayoutEffect(() => {
    if (ready) markStartupReady();
  }, [ready]);
}
