/**
 * Notification buttons pressed while Athar was not on screen.
 *
 * «صلّيتُ», «تمّ» and the snoozes act without opening the app: Android sends
 * them to NotificationActionReceiver, iPhone's patched notification handler
 * keeps them. Either way the phone closes the notification, schedules a
 * snooze itself, and keeps the press in a small queue. This applies the
 * queue the moment the app is open, or the next time it opens.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/** The buttons that never open the app. */
export const BACKGROUND_NOTIFICATION_ACTIONS: ReadonlySet<string> = new Set(["mark_prayed", "snooze_60", "snooze", "done"]);

export type QueuedNotificationAction = {
  id?: string;
  actionId: string;
  extra?: Record<string, unknown>;
  title?: string;
  body?: string;
  /** The phone already did it (a snooze it scheduled itself). */
  handled?: boolean;
  at?: number;
};

export type ApplyNotificationAction = (action: {
  actionId: string;
  extra?: Record<string, unknown>;
  notification?: { title?: string; body?: string };
}) => Promise<boolean>;

type NotificationActionsPlugin = {
  drain(): Promise<{ actions?: QueuedNotificationAction[] }>;
  addListener(event: "queued", listener: () => void): Promise<PluginListenerHandle>;
};

let plugin: NotificationActionsPlugin | null = null;

function native(): NotificationActionsPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<NotificationActionsPlugin>("NotificationActions");
  return plugin;
}

let chain: Promise<unknown> = Promise.resolve();

/**
 * Apply every queued press once, in order. Resolves to how many were found,
 * or null when this app build has no queue (the caller applies the press itself).
 */
export function drainNotificationActions(apply: ApplyNotificationAction): Promise<number | null> {
  const bridge = native();
  if (!bridge) return Promise.resolve(null);
  const run = chain.then(async () => {
    let actions: QueuedNotificationAction[];
    try {
      actions = (await bridge.drain()).actions ?? [];
    } catch {
      return null;
    }
    for (const action of actions) {
      if (!action || typeof action.actionId !== "string") continue;
      if (action.handled && (action.actionId === "snooze_60" || action.actionId === "snooze")) continue;
      try {
        await apply({
          actionId: action.actionId,
          extra: action.extra && typeof action.extra === "object" ? action.extra : undefined,
          notification: { title: action.title, body: action.body },
        });
      } catch {
        // One bad entry must not hold up the rest.
      }
    }
    return actions.length;
  });
  chain = run.catch(() => undefined);
  return run;
}

/**
 * A press that reached the app directly (iPhone, or an older Android build):
 * apply the queue, which holds it, or the press itself when there is no queue.
 */
export async function applyBackgroundAction(
  action: Parameters<ApplyNotificationAction>[0],
  apply: ApplyNotificationAction,
): Promise<void> {
  const found = await drainNotificationActions(apply);
  if (found === null || found === 0) await apply(action);
}

/** Apply the queue now, whenever a press arrives, and whenever the app comes back. */
export async function watchNotificationActions(apply: ApplyNotificationAction): Promise<() => void> {
  const bridge = native();
  if (!bridge) return () => {};
  const drain = () => void drainNotificationActions(apply);
  let handle: PluginListenerHandle | null = null;
  try {
    handle = await bridge.addListener("queued", drain);
  } catch {
    // iPhone has no event: presses arrive through the notification listener.
  }
  const onVisible = () => {
    if (document.visibilityState === "visible") drain();
  };
  window.addEventListener("athar-app-resume", drain);
  document.addEventListener("visibilitychange", onVisible);
  drain();
  return () => {
    void handle?.remove();
    window.removeEventListener("athar-app-resume", drain);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
