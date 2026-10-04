import { useSyncExternalStore } from "react";
import {
  applyPwaUpdate,
  dismissPwaUpdate,
  getPwaUpdateSnapshot,
  subscribePwaUpdate,
} from "@/pwa";

export function usePwaUpdate() {
  const state = useSyncExternalStore(subscribePwaUpdate, getPwaUpdateSnapshot);
  return { ...state, apply: applyPwaUpdate, dismiss: dismissPwaUpdate };
}
