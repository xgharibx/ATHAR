type UxMetricsStore = {
  events: Record<string, number>;
  variant?: "A" | "B";
};

const UX_METRICS_KEY = "noor_ux_metrics_v1";

function readStore(): UxMetricsStore {
  if (typeof window === "undefined") return { events: {} };
  try {
    const raw = localStorage.getItem(UX_METRICS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { events: {} };
    return {
      events: parsed.events && typeof parsed.events === "object" ? parsed.events : {},
      variant: parsed.variant === "A" || parsed.variant === "B" ? parsed.variant : undefined
    };
  } catch {
    return { events: {} };
  }
}

function writeStore(store: UxMetricsStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UX_METRICS_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

export function trackUxEvent(eventName: string) {
  const store = readStore();
  store.events[eventName] = (store.events[eventName] ?? 0) + 1;
  writeStore(store);
}

export function getOrCreateUxVariant(): "A" | "B" {
  const store = readStore();
  if (store.variant === "A" || store.variant === "B") return store.variant;
  const next = Math.random() < 0.5 ? "A" : "B";
  store.variant = next;
  writeStore(store);
  return next;
}
