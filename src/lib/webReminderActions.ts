export type WebReminderAction = "open" | "snooze" | "done";

export type WebReminderActionDetail = {
  action: WebReminderAction;
  scheduleId: string;
  reminderId: string;
  accountOwner: string;
  route: string;
  snoozeMinutes: number;
  title: string;
  body: string;
  vibration?: boolean;
};

const ACTION_FRAGMENT_KEY = "athar-reminder-action";

export function parseWebReminderClickDetail(value: unknown): WebReminderActionDetail | null {
  if (!value || typeof value !== "object") return null;
  const detail = value as Record<string, unknown>;
  if (detail.action !== "open" && detail.action !== "snooze" && detail.action !== "done")
    return null;
  if (typeof detail.accountOwner !== "string" || !detail.accountOwner) return null;
  if (typeof detail.route !== "string" || !detail.route.startsWith("/")) return null;
  if (typeof detail.scheduleId !== "string" || typeof detail.reminderId !== "string") return null;
  if (!Number.isFinite(detail.snoozeMinutes) || (detail.snoozeMinutes as number) < 1) return null;

  return {
    action: detail.action,
    scheduleId: detail.scheduleId,
    reminderId: detail.reminderId,
    accountOwner: detail.accountOwner,
    route: detail.route,
    snoozeMinutes: detail.snoozeMinutes as number,
    title: typeof detail.title === "string" ? detail.title : "أثر",
    body: typeof detail.body === "string" ? detail.body : "",
    ...(typeof detail.vibration === "boolean" ? { vibration: detail.vibration } : {}),
  };
}

export function buildWebReminderActionUrl(
  scopeUrl: string,
  value: WebReminderActionDetail
): string {
  const url = new URL(scopeUrl);
  const detail = parseWebReminderClickDetail(value);
  if (!detail) throw new TypeError("Invalid web reminder action");
  url.hash = new URLSearchParams([[ACTION_FRAGMENT_KEY, JSON.stringify(detail)]]).toString();
  return url.toString();
}

export function parseWebReminderActionFragment(hash: string): WebReminderActionDetail | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const value = params.get(ACTION_FRAGMENT_KEY);
  if (!value) return null;
  try {
    return parseWebReminderClickDetail(JSON.parse(value));
  } catch {
    return null;
  }
}

export function selectReminderActionClient<T extends { focused?: boolean }>(
  clients: readonly T[]
): T | undefined {
  return clients.find((client) => client.focused) ?? clients[0];
}
