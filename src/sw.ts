/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from "workbox-precaching";
import { registerRoute, NavigationRoute, setCatchHandler } from "workbox-routing";
import {
  NetworkFirst,
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import {
  canContinueOwnerTransition,
  isOwnerTransitionFresh,
  ReminderWorkerOwnerGate,
} from "./lib/reminderWorkerOwner";
import {
  getCustomReminderSnoozeMinutes,
  getCustomReminderVibrationPattern,
} from "./lib/customReminderTypes";
import {
  buildWebReminderActionUrl,
  selectReminderActionClient,
  type WebReminderActionDetail,
} from "./lib/webReminderActions";
import {
  MUSHAF_AUDIO_CACHE_MAX_BYTES,
  MUSHAF_AUDIO_CACHE_NAME,
  MUSHAF_AUDIO_MAX_RESPONSE_BYTES,
} from "./lib/offlineAudioCache";
import {
  CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES,
  createMaxResponseSizePlugin,
  HADITH_RUNTIME_CACHE_MAX_BYTES,
  pruneCacheToByteBudget,
  pruneOversizedCacheEntries,
} from "./lib/offlineCacheBudget";

declare const self: ServiceWorkerGlobalScope & typeof globalThis & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.open("athar-content-packs")
      .then((cache) => pruneOversizedCacheEntries(cache, CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES))
      .catch((error: unknown) => {
        console.warn("[athar] Could not prune oversized cached content packs.", error);
      }),
    caches.open(MUSHAF_AUDIO_CACHE_NAME)
      .then((cache) => pruneCacheToByteBudget(cache, MUSHAF_AUDIO_CACHE_MAX_BYTES, MUSHAF_AUDIO_MAX_RESPONSE_BYTES))
      .catch((error: unknown) => {
        console.warn("[athar] Could not prune cached recitation audio.", error);
      }),
    caches.delete("quran-audio").catch((error: unknown) => {
      console.warn("[athar] Could not remove the unused Quran audio cache.", error);
    }),
    caches.delete("wbw-api-v1").catch((error: unknown) => {
      console.warn("[athar] Could not remove the legacy year-long word-by-word cache.", error);
    }),
    caches.delete("athar-html").catch((error: unknown) => {
      console.warn("[athar] Could not remove legacy unbounded navigation cache.", error);
    }),
  ]));
});

// SPA fallback: any non-asset navigation goes to /index.html (cached by precache).
const navigationHandler = new NetworkFirst({
  cacheName: "athar-html",
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({
      maxEntries: 1,
      maxAgeSeconds: 60 * 60 * 24 * 30,
    }),
  ],
});
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//, /^\/__/],
});
registerRoute(navigationRoute);
setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    const appShell = await matchPrecache("/index.html");
    if (appShell) return appShell;
  }
  return Response.error();
});

// Runtime caches (mirror the previous generateSW workbox.runtimeCaching rules).
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-stylesheets",
    plugins: [new ExpirationPlugin({ maxEntries: 10 })],
  }),
);
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);
// Explicit offline downloads use cache:no-store to bypass this handler and are
// written only after their response size and aggregate usage pass the app budget.
registerRoute(
  ({ request, url }) => url.origin === "https://everyayah.com" && request.cache === "no-store",
  new NetworkOnly(),
);
// Playback can read explicit downloads while offline, but ordinary streamed
// playback never accumulates opaque audio in CacheStorage without user intent.
registerRoute(
  ({ request, url }) => url.origin === "https://everyayah.com" && request.cache !== "no-store",
  new CacheFirst({
    cacheName: MUSHAF_AUDIO_CACHE_NAME,
    plugins: [{ cacheWillUpdate: async () => null }],
  }),
);
registerRoute(
  ({ url }) =>
    url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/gh/spa5k/tafsir_api"),
  new CacheFirst({
    cacheName: "tafsir-api-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 400,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) =>
    url.origin === "https://cdn.jsdelivr.net" &&
    url.pathname.startsWith("/gh/fawazahmed0/quran-api"),
  new CacheFirst({
    cacheName: "translation-api-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) =>
    url.origin === "https://cdn.jsdelivr.net" &&
    url.pathname.startsWith("/gh/Waqar144/Quran_Mutashabihat_Data"),
  new CacheFirst({
    cacheName: "mutashabihat-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) => url.origin === "https://api.quran.com",
  new NetworkFirst({
    cacheName: "wbw-api-v2-7d",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\/data\/hadith\/.*\.json$/.test(url.pathname),
  new NetworkFirst({
    cacheName: "athar-hadith-packs",
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      createMaxResponseSizePlugin(HADITH_RUNTIME_CACHE_MAX_BYTES),
      new ExpirationPlugin({
        maxEntries: 1,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) => url.origin === self.location.origin && /\/data\/(?!hadith\/).*\.json$/.test(url.pathname),
  new NetworkFirst({
    cacheName: "athar-content-packs",
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      createMaxResponseSizePlugin(CONTENT_PACK_RUNTIME_CACHE_MAX_BYTES),
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 60 * 60 * 24 * 90,
      }),
    ],
  }),
);

// Audio played by the Mushaf uses direct cross-origin <audio> requests. Keep
// successful opaque responses too, so previously downloaded recitations can
// still play without a connection.
// Network-only for /api to avoid stale auth responses.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkOnly(),
);

// ── Custom-reminder delivery (web) ────────────────────────────────────────────

type ScheduleEntry = {
  timer: ReturnType<typeof setTimeout>;
  reminderId: string;
  accountOwner: string;
  title: string;
  body: string;
  route: string;
  snoozeMinutes: number;
  tag: string;
};

const swSchedules: Map<string, ScheduleEntry> = new Map();
const swNotificationOperations = new Set<Promise<boolean>>();
const reminderOwnerGate = new ReminderWorkerOwnerGate();
let ownerTransitionQueue: Promise<void> = Promise.resolve();
let pendingOwnerTransitions = 0;
let ownerTransitionNeedsRecovery = false;
let ownerTransitionSourceOwner: string | undefined;
let ownerTransitionRequestAtMs = 0;
let ownerTransitionRequestTargetOwner: string | undefined;
const pendingOwnerTransitionAcks: Array<{
  port?: MessagePort;
  targetOwner?: string;
  ok: boolean;
}> = [];
const REMINDER_OWNER_CACHE = "athar-reminder-owner-v1";
const REMINDER_OWNER_CACHE_KEY = new URL("/__athar_reminder_owner__", self.location.origin).toString();

type ReminderOwnerState = {
  owner: string | null;
  transitioning: boolean;
  sourceOwner?: string;
  targetOwner?: string;
  requestAtMs: number;
  requestTargetOwner?: string;
};

async function readReminderOwner(): Promise<ReminderOwnerState> {
  const cache = await caches.open(REMINDER_OWNER_CACHE);
  const response = await cache.match(REMINDER_OWNER_CACHE_KEY);
  if (!response) return { owner: null, transitioning: false, requestAtMs: 0 };
  const value = await response.json() as {
    owner?: unknown;
    transitioning?: unknown;
    sourceOwner?: unknown;
    targetOwner?: unknown;
    requestAtMs?: unknown;
    requestTargetOwner?: unknown;
  };
  return {
    owner: typeof value.owner === "string" ? value.owner : null,
    transitioning: value.transitioning === true,
    sourceOwner: typeof value.sourceOwner === "string" ? value.sourceOwner : undefined,
    targetOwner: typeof value.targetOwner === "string" ? value.targetOwner : undefined,
    requestAtMs: Number.isFinite(value.requestAtMs) ? value.requestAtMs as number : 0,
    requestTargetOwner: typeof value.requestTargetOwner === "string"
      ? value.requestTargetOwner
      : undefined,
  };
}

async function persistReminderOwner(
  owner: string | null,
  transitioning: boolean,
  sourceOwner?: string,
  targetOwner?: string,
  requestAtMs = ownerTransitionRequestAtMs,
  requestTargetOwner = ownerTransitionRequestTargetOwner,
): Promise<void> {
  const cache = await caches.open(REMINDER_OWNER_CACHE);
  await cache.put(
    REMINDER_OWNER_CACHE_KEY,
    new Response(JSON.stringify({
      owner,
      transitioning,
      sourceOwner,
      targetOwner,
      requestAtMs,
      requestTargetOwner,
    }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const reminderOwnerReady = readReminderOwner()
  .then((state) => {
    reminderOwnerGate.hydrate(state.owner);
    ownerTransitionSourceOwner = state.sourceOwner;
    ownerTransitionRequestAtMs = state.requestAtMs;
    ownerTransitionRequestTargetOwner = state.requestTargetOwner;
    if (state.transitioning) {
      reminderOwnerGate.beginTransition(state.targetOwner);
      ownerTransitionNeedsRecovery = true;
      ownerTransitionSourceOwner ??= state.owner ?? undefined;
    }
  })
  .catch(() => {
    // Unknown storage state must fail closed; a later cleanup request can
    // re-establish and persist the active owner before notifications resume.
    ownerTransitionNeedsRecovery = true;
    reminderOwnerGate.tryBeginTransition();
  });

function startSwNotificationDelivery(title: string, options: NotificationOptions): Promise<boolean> {
  let delivery: Promise<boolean>;
  delivery = Promise.resolve()
    .then(async () => {
      await self.registration.showNotification(title, options);
      return true;
    })
    .catch(() => false)
    .finally(() => swNotificationOperations.delete(delivery));
  swNotificationOperations.add(delivery);
  return delivery;
}

async function waitForSwNotificationOperations(): Promise<void> {
  while (swNotificationOperations.size > 0) {
    await Promise.allSettled([...swNotificationOperations]);
  }
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "athar-reminder-owner-query") {
    const responsePort = event.ports[0];
    event.waitUntil((async () => {
      await reminderOwnerReady;
      responsePort?.postMessage({
        ok: true,
        owner: reminderOwnerGate.currentOwner,
        transitioning: reminderOwnerGate.isTransitioning,
        sourceOwner: ownerTransitionSourceOwner,
        targetOwner: ownerTransitionRequestTargetOwner,
        requestAtMs: ownerTransitionRequestAtMs,
      });
    })().catch(() => {
      responsePort?.postMessage({ ok: false });
    }));
  } else if (data.type === "athar-reminder-schedule") {
    const { scheduleId, fireAtMs, reminderId, accountOwner, title, body, route, snoozeMinutes, tag, vibration } = data;
    if (typeof scheduleId !== "string" || !Number.isFinite(fireAtMs)) return;
    event.waitUntil((async () => {
      await reminderOwnerReady;
      if (!reminderOwnerGate.canDeliver(accountOwner)) return;
      const existing = swSchedules.get(scheduleId);
      if (existing) clearTimeout(existing.timer);
      const delay = Math.max(0, (fireAtMs as number) - Date.now());
      const tagStr: string = typeof tag === "string" ? tag : `athar-reminder:${scheduleId}`;
      const titleStr: string = typeof title === "string" ? title : "أثر";
      const bodyStr: string = typeof body === "string" ? body : "";
      const routeStr: string = typeof route === "string" ? route : "";
      const reminderIdStr: string = typeof reminderId === "string" ? reminderId : "";
      const snoozeMinutesValue = getCustomReminderSnoozeMinutes(snoozeMinutes);
      const vibrate = getCustomReminderVibrationPattern(vibration);
      const accountOwnerStr = accountOwner as string;

      const timer = setTimeout(() => {
        swSchedules.delete(scheduleId);
        if (!reminderOwnerGate.canDeliver(accountOwnerStr)) return;
        void startSwNotificationDelivery(titleStr, {
          body: bodyStr,
          tag: tagStr,
          vibrate,
          renotify: false,
          icon: "/logo.svg",
          badge: "/pwa-192x192.png",
          data: {
            scheduleId,
            reminderId: reminderIdStr,
            accountOwner: accountOwnerStr,
            route: routeStr,
            snoozeMinutes: snoozeMinutesValue,
          },
          actions: [
            { action: "done", title: "تم" },
            { action: "snooze", title: "غفوت" },
            { action: "open", title: "افتح" },
          ],
        } as NotificationOptions);
      }, delay);

      swSchedules.set(scheduleId, {
        timer,
        reminderId: reminderIdStr,
        accountOwner: accountOwnerStr,
        title: titleStr,
        body: bodyStr,
        route: routeStr,
        snoozeMinutes: snoozeMinutesValue,
        tag: tagStr,
      });
    })());
  } else if (data.type === "athar-notification-show") {
    const responsePort = event.ports[0];
    event.waitUntil((async () => {
      await reminderOwnerReady;
      if (!reminderOwnerGate.canDeliver(data.accountOwner) || typeof data.title !== "string") {
        responsePort?.postMessage({ ok: false });
        return;
      }
      const options = data.options && typeof data.options === "object"
        ? data.options as NotificationOptions
        : {};
      const shown = await startSwNotificationDelivery(data.title, options);
      responsePort?.postMessage({ ok: shown });
    })().catch(() => {
      responsePort?.postMessage({ ok: false });
    }));
  } else if (data.type === "athar-reminder-cancel") {
    const existing = swSchedules.get(data.scheduleId);
    if (existing) {
      clearTimeout(existing.timer);
      swSchedules.delete(data.scheduleId);
    }
  } else if (data.type === "athar-reminder-cancel-all" || data.type === "athar-reminder-cancel-pending") {
    const responsePort = event.ports[0];
    const targetOwner = typeof data.accountOwner === "string" ? data.accountOwner : undefined;
    const sourceOwner = typeof data.sourceOwner === "string" ? data.sourceOwner : undefined;
    const requestAtMs = Number.isFinite(data.requestedAtMs) ? data.requestedAtMs as number : 0;
    const clearDelivered = data.type === "athar-reminder-cancel-all";
    const requestedTargetOwner = targetOwner ?? sourceOwner ?? reminderOwnerGate.currentOwner ?? undefined;
    const requestArrivedDuringTransition = pendingOwnerTransitions > 0 || reminderOwnerGate.isTransitioning;
    if (!reminderOwnerGate.isTransitioning) reminderOwnerGate.tryBeginTransition();
    pendingOwnerTransitions += 1;
    const transitionAck = { port: responsePort, targetOwner, ok: false };
    pendingOwnerTransitionAcks.push(transitionAck);
    const transition = ownerTransitionQueue.then(async () => {
      await reminderOwnerReady;
      // The worker is shared by every tab. Ignore an outgoing account's stale
      // cleanup request once another tab has already selected a new owner. A
      // queued/recovered request may use its original source while retargeting
      // to the latest account selected by that tab.
      if (!isOwnerTransitionFresh(
        requestAtMs,
        ownerTransitionRequestAtMs,
        requestedTargetOwner,
        ownerTransitionRequestTargetOwner,
      )) return false;
      const canRetargetPendingTransition = canContinueOwnerTransition(
        sourceOwner,
        targetOwner,
        ownerTransitionSourceOwner,
        ownerTransitionNeedsRecovery || requestArrivedDuringTransition,
      );
      if (!reminderOwnerGate.canBeginTransition(sourceOwner, targetOwner) && !canRetargetPendingTransition) {
        return false;
      }
      if (!requestArrivedDuringTransition && !ownerTransitionNeedsRecovery) {
        ownerTransitionSourceOwner = sourceOwner;
      } else {
        ownerTransitionSourceOwner ??= sourceOwner;
      }
      ownerTransitionRequestAtMs = requestAtMs;
      ownerTransitionRequestTargetOwner = requestedTargetOwner;

      // Save a fail-closed marker before touching timers or delivered alerts.
      // If the worker is terminated during cleanup, its next instance will
      // remain gated and let a tab safely retry this transition.
      ownerTransitionNeedsRecovery = true;
      const currentOwner = reminderOwnerGate.currentOwner;
      await persistReminderOwner(
        currentOwner,
        true,
        ownerTransitionSourceOwner,
        targetOwner,
        ownerTransitionRequestAtMs,
        ownerTransitionRequestTargetOwner,
      );
      for (const schedule of swSchedules.values()) clearTimeout(schedule.timer);
      swSchedules.clear();
      await waitForSwNotificationOperations();
      if (clearDelivered) {
        const notifications = await self.registration.getNotifications();
        notifications
          .filter((notification) => {
            const tag = notification.tag ?? "";
            return tag.startsWith("athar-reminder:") ||
              tag.startsWith("athar-notification:") ||
              tag.startsWith("customReminder:");
          })
          .forEach((notification) => notification.close());
      }
      const settledOwner = targetOwner ?? currentOwner ?? sourceOwner ?? null;
      await persistReminderOwner(
        settledOwner,
        false,
        ownerTransitionSourceOwner,
        undefined,
        ownerTransitionRequestAtMs,
        ownerTransitionRequestTargetOwner,
      );
      if (settledOwner) reminderOwnerGate.setTargetOwner(settledOwner);
      ownerTransitionNeedsRecovery = false;
      return true;
    });
    ownerTransitionQueue = transition.then(() => undefined, () => undefined);
    event.waitUntil((async () => {
      let ok = false;
      try {
        ok = await transition;
      } catch {
        // Report failure to the page and leave the current owner unchanged.
      }
      transitionAck.ok = ok;
      pendingOwnerTransitions -= 1;
      if (pendingOwnerTransitions === 0) {
        const canResumeDelivery = !ownerTransitionNeedsRecovery;
        if (canResumeDelivery) reminderOwnerGate.completeTransition();
        const settledOwner = reminderOwnerGate.currentOwner;
        for (const ack of pendingOwnerTransitionAcks.splice(0)) {
          const ackSucceeded = canResumeDelivery && ack.ok &&
            (ack.targetOwner === undefined || ack.targetOwner === settledOwner);
          try {
            ack.port?.postMessage({ ok: ackSucceeded });
          } catch {
            // A client may have navigated away before the whole transition queue settled.
          }
        }
      }
    })());
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const action = (event as NotificationEvent & { action?: string }).action ?? "open";
  const data = (event.notification.data ?? {}) as {
    scheduleId?: string;
    reminderId?: string;
    accountOwner?: string;
    route?: string;
    snoozeMinutes?: number;
  };
  const scheduleId = typeof data.scheduleId === "string" ? data.scheduleId : "";
  const reminderId = typeof data.reminderId === "string" ? data.reminderId : "";
  const accountOwner = typeof data.accountOwner === "string" ? data.accountOwner : "local";
  const route = typeof data.route === "string" && data.route ? data.route : "/";
  const snoozeMinutes = getCustomReminderSnoozeMinutes(data.snoozeMinutes);
  const detail: WebReminderActionDetail = {
    action: action === "snooze" || action === "done" ? action : "open",
    scheduleId,
    reminderId,
    accountOwner,
    route,
    snoozeMinutes,
    title: event.notification.title,
    body: typeof event.notification.body === "string" ? event.notification.body : "",
  };

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // A notification click is one action. Sending it to every tab could
      // complete the same reminder or schedule multiple snoozes.
      const client = selectReminderActionClient(clientsArr);
      if (client) {
        client.postMessage({ type: "athar-reminder-click", detail });
        const w = client;
        if ("focus" in w) {
          try {
            await w.focus();
          } catch {
            // ignore
          }
        }
        return;
      }
      // Preserve the action when no app window is open. The page bootstrap
      // consumes and strips this one-use fragment before React renders.
      await self.clients.openWindow(buildWebReminderActionUrl(self.registration.scope, detail));
    })(),
  );
});

self.addEventListener("notificationclose", (_event: NotificationEvent) => {
  // hook reserved for future snooze-on-dismiss telemetry
});

export {};
