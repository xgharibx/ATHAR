import toast from "react-hot-toast";

export type PwaUpdateSnapshot = { available: boolean; applying: boolean };
let snapshot: PwaUpdateSnapshot = { available: false, applying: false };
const listeners = new Set<() => void>();
let waitingWorker: ServiceWorker | null = null;
let refreshReady = false;
let updateAccepted = false;

function publish(next: PwaUpdateSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function getPwaUpdateSnapshot() { return snapshot; }
export function subscribePwaUpdate(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function dismissPwaUpdate() {
  publish({ ...snapshot, available: false });
}

/** Called only after this tab's user has accepted the refresh confirmation. */
export function applyPwaUpdate() {
  if (snapshot.applying || (!waitingWorker && !refreshReady)) return;
  updateAccepted = true;
  publish({ available: true, applying: true });
  try {
    if (refreshReady) globalThis.location.reload();
    else waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  } catch {
    updateAccepted = false;
    publish({ available: true, applying: false });
    toast.error("تعذّر تطبيق التحديث. يمكنك المحاولة مجددًا.");
  }
}

const isLocalHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

if (isLocalHost && "serviceWorker" in navigator) {
  void (async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {
      // ignore local cleanup failures
    }
  })();
}

if (!isLocalHost && typeof window !== "undefined" && "serviceWorker" in navigator) {
  const workers = navigator.serviceWorker;
  let registration: ServiceWorkerRegistration | null = null;
  let controller = workers.controller;

  // A worker accepted by another tab may start controlling this one. Keep its
  // current document (and drafts) intact until its own user accepts a refresh.
  workers.addEventListener("controllerchange", () => {
    const previousController = controller;
    controller = workers.controller;
    if (previousController === controller || !controller) return;
    if (!previousController && !updateAccepted && !waitingWorker) return;
    waitingWorker = null;
    refreshReady = true;
    if (updateAccepted) globalThis.location.reload();
    else publish({ available: true, applying: false });
  });

  const offerWaitingWorker = (reg: ServiceWorkerRegistration) => {
    if (!reg.waiting || !reg.active || waitingWorker === reg.waiting) return;
    waitingWorker = reg.waiting;
    refreshReady = false;
    publish({ available: true, applying: false });
  };

  const observeInstallingWorker = (reg: ServiceWorkerRegistration) => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed") offerWaitingWorker(reg);
    });
  };

  const checkForUpdate = () => {
    // Checking for a new script must never activate a waiting worker.
    void registration?.update().catch(() => { /* offline or transient failure */ });
  };

  const base = import.meta.env.BASE_URL;
  void workers.register(`${base}sw.js`, { scope: base }).then((reg) => {
    registration = reg;
    reg.addEventListener("updatefound", () => observeInstallingWorker(reg));
    observeInstallingWorker(reg);
    offerWaitingWorker(reg);
    window.setTimeout(checkForUpdate, 3000);
  }).catch(() => { /* registration failures must not interrupt the app */ });

  window.setInterval(checkForUpdate, 60 * 1000);
  window.addEventListener("online", checkForUpdate);
  window.addEventListener("focus", checkForUpdate);
  window.addEventListener("pageshow", checkForUpdate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
}
