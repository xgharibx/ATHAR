import { useStartupReady } from "@/hooks/useStartupReady";

/** Put inside Suspense so a pending route cannot reveal an empty shell. */
export function StartupReady({ ready = true }: { ready?: boolean }) {
  useStartupReady(ready);
  return null;
}
