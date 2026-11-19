import * as React from "react";
import { getListenState, subscribeListen, type ListenPlayerState } from "@/lib/listen/player";
import { loadListenCatalog, type ListenCatalog } from "@/lib/listen/catalog";

export function useListenPlayer(): ListenPlayerState {
  return React.useSyncExternalStore(subscribeListen, getListenState, getListenState);
}

/** Only what changes when the track or play state changes (not every position tick). */
export function useListenNowPlaying() {
  const read = React.useCallback(() => {
    const s = getListenState();
    return `${s.current?.id ?? ""}|${s.status}|${s.index}|${s.queue.length}`;
  }, []);
  React.useSyncExternalStore(subscribeListen, read, read);
  return getListenState();
}

export function useListenCatalog(): { catalog: ListenCatalog | null; error: boolean; retry: () => void } {
  const [catalog, setCatalog] = React.useState<ListenCatalog | null>(null);
  const [error, setError] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    loadListenCatalog()
      .then((c) => alive && setCatalog(c))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [attempt]);
  return {
    catalog,
    error,
    retry: () => {
      setError(false);
      setAttempt((n) => n + 1);
    },
  };
}
