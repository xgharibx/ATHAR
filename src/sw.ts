/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import {
  NetworkFirst,
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope & typeof globalThis & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("activate", () => {
  void self.clients.claim();
});

// SPA fallback: any non-asset navigation goes to /index.html (cached by precache).
const navigationHandler = new NetworkFirst({
  cacheName: "athar-html",
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//, /^\/__/],
});
registerRoute(navigationRoute);

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
registerRoute(
  ({ url }) => url.origin === "https://everyayah.com",
  new CacheFirst({
    cacheName: "quran-audio",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 3000,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) => url.origin === "https://cdn.islamic.network" && url.pathname.startsWith("/quran/audio/"),
  new CacheFirst({
    cacheName: "quran-audio",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 3000,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
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
  new CacheFirst({
    cacheName: "wbw-api-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);
registerRoute(
  ({ url }) => /\/data\/hadith\/.*\.json$/.test(url.pathname),
  new NetworkFirst({
    cacheName: "athar-hadith-packs",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 15,
        maxAgeSeconds: 60 * 60 * 24 * 90,
      }),
    ],
  }),
);

// Network-only for /api to avoid stale auth responses.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkOnly(),
);

// ── Custom-reminder delivery (web) ────────────────────────────────────────────

type ScheduleEntry = {
  timer: ReturnType<typeof setTimeout>;
  reminderId: string;
  title: string;
  body: string;
  route: string;
  tag: string;
};

const swSchedules: Map<string, ScheduleEntry> = new Map();

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "athar-reminder-schedule") {
    const { scheduleId, fireAtMs, reminderId, title, body, route, tag } = data;
    if (typeof scheduleId !== "string" || !Number.isFinite(fireAtMs)) return;
    const existing = swSchedules.get(scheduleId);
    if (existing) clearTimeout(existing.timer);
    const delay = Math.max(0, (fireAtMs as number) - Date.now());
    const tagStr: string =
      typeof tag === "string" ? tag : `athar-reminder:${scheduleId}`;
    const titleStr: string = typeof title === "string" ? title : "أثر";
    const bodyStr: string = typeof body === "string" ? body : "";
    const routeStr: string = typeof route === "string" ? route : "";
    const reminderIdStr: string = typeof reminderId === "string" ? reminderId : "";

    const timer = setTimeout(() => {
      self.registration
        .showNotification(titleStr, {
          body: bodyStr,
          tag: tagStr,
          renotify: true,
          icon: "/logo.svg",
          badge: "/pwa-192x192.png",
          data: { scheduleId, reminderId: reminderIdStr, route: routeStr },
          actions: [
            { action: "done", title: "تم" },
            { action: "snooze", title: "غفوت" },
            { action: "open", title: "افتح" },
          ],
        } as NotificationOptions)
        .catch(() => {
          // permission revoked → silently drop
        });
      swSchedules.delete(scheduleId);
      void timer;
    }, delay);

    swSchedules.set(scheduleId, {
      timer,
      reminderId: reminderIdStr,
      title: titleStr,
      body: bodyStr,
      route: routeStr,
      tag: tagStr,
    });
  } else if (data.type === "athar-reminder-cancel") {
    const existing = swSchedules.get(data.scheduleId);
    if (existing) {
      clearTimeout(existing.timer);
      swSchedules.delete(data.scheduleId);
    }
  } else if (data.type === "athar-reminder-cancel-all") {
    for (const v of swSchedules.values()) clearTimeout(v.timer);
    swSchedules.clear();
    self.registration
      .getNotifications()
      .then((list) =>
        list
          .filter((n) => (n.tag ?? "").startsWith("athar-reminder:"))
          .forEach((n) => n.close()),
      )
      .catch(() => {});
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const action = (event as NotificationEvent & { action?: string }).action ?? "open";
  const data = (event.notification.data ?? {}) as {
    scheduleId?: string;
    reminderId?: string;
    route?: string;
  };
  const scheduleId = typeof data.scheduleId === "string" ? data.scheduleId : "";
  const reminderId = typeof data.reminderId === "string" ? data.reminderId : "";
  const route = typeof data.route === "string" && data.route ? data.route : "/";

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Tell every visible tab about the click so React can navigate/route there.
      for (const c of clientsArr) {
        c.postMessage({
          type: "athar-reminder-click",
          detail: { scheduleId, reminderId, route, action },
        });
      }

      if (clientsArr.length > 0) {
        const w = clientsArr[0];
        if ("focus" in w) {
          try {
            await w.focus();
          } catch {
            // ignore
          }
        }
        return;
      }
      if (action === "done") return; // no need to open for a "done" ack
      await self.clients.openWindow(route);
    })(),
  );
});

self.addEventListener("notificationclose", (_event: NotificationEvent) => {
  // hook reserved for future snooze-on-dismiss telemetry
});

export {};
