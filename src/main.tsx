import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast, Toaster } from "react-hot-toast";

import App from "./App";
import "./styles/globals.css";
import "./pwa";
import { installAppShellBehaviour } from "@/lib/appShellBehaviour";
import { setPendingNotificationAction } from "@/lib/reminders";
import { parseWebReminderActionFragment } from "@/lib/webReminderActions";
import { markStartupReady } from "@/lib/startup";

const APP_RUNTIME_VERSION = (import.meta.env.VITE_RUNTIME_VERSION as string | undefined) ?? "local-dev";
const APP_RUNTIME_VERSION_KEY = "noor_app_runtime_version";
const ROOT_INSTANCE_KEY = "noor_react_root_instance";

type AuthNoticeWindow = Window & { __atharNativeAuthNoticeInstalled?: boolean };
const authNoticeWindow = window as AuthNoticeWindow;
if (!authNoticeWindow.__atharNativeAuthNoticeInstalled) {
  authNoticeWindow.__atharNativeAuthNoticeInstalled = true;
  authNoticeWindow.addEventListener("athar-auth-result", (event: Event) => {
    const result = (event as CustomEvent<{ ok?: boolean; error?: string }>).detail;
    if (result?.ok) toast.success("تم تسجيل الدخول بنجاح");
    else toast.error(result?.error ?? "تعذّر تسجيل الدخول. يمكنك المحاولة مجددًا.");
  });
}

type ErrorBoundaryState = { hasError: boolean; message: string };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? "حدث خطأ غير متوقع" };
  }

  componentDidCatch(error: Error) {
    // B9: Stable root — capture the offending error so we can log a single
    //     diagnostic line. The duplicate-root symptom was caused by external
    //     integrations re-running this module, which used to call
    //     `createRoot` again on the same container — React then fires
    //     "removeChild" while tearing down the previous root. Guarding the
    //     singleton + module-level mount below eliminates that.
    console.error("App runtime error:", error);
    markStartupReady();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen-safe flex items-center justify-center p-6" dir="rtl">
        <div className="glass rounded-3xl p-6 max-w-md w-full border border-[var(--stroke)]">
          <div className="text-lg font-semibold">تعذر عرض التطبيق</div>
          <div className="mt-2 text-sm opacity-75 leading-7">
            تم اكتشاف خطأ أثناء تحميل الواجهة. يمكنك تحديث الصفحة أو إعادة تعيين التخزين المحلي.
          </div>
          <div className="mt-2 text-xs opacity-60 break-words">{this.state.message}</div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="px-4 py-3 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] min-h-[44px]" onClick={() => globalThis.location.reload()}>
              تحديث الصفحة
            </button>
            <button type="button"
              className="px-4 py-3 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] min-h-[44px]"
              onClick={() => {
                localStorage.clear();
                globalThis.location.reload();
              }}
            >
              إعادة تهيئة التطبيق
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// GitHub Pages SPA fallback support:
// public/404.html redirects to /ATHAR/?p=<encoded_path>
// This rewrites the URL back to the real route so React Router can render it.
try {
  const seenVersion = localStorage.getItem(APP_RUNTIME_VERSION_KEY);
  if (seenVersion !== APP_RUNTIME_VERSION) {
    localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_RUNTIME_VERSION);
    sessionStorage.removeItem("noor_preload_recover_once");
  }

  const url = new URL(globalThis.location.href);
  const p = url.searchParams.get("p");
  if (p) {
    const decoded = decodeURIComponent(p);
    const next = `${import.meta.env.BASE_URL.replace(/\/$/, "")}${decoded}`;
    globalThis.history.replaceState(null, "", next);
  }
} catch {
  // ignore
}

// A service-worker notification can open the app from a cold start. Buffer its
// validated action before React mounts, then remove the one-use payload from
// the visible URL so a refresh cannot replay it.
try {
  const action = parseWebReminderActionFragment(globalThis.location.hash);
  if (action) {
    const url = new URL(globalThis.location.href);
    url.hash = "";
    globalThis.history.replaceState(globalThis.history.state, "", url.toString());
    setPendingNotificationAction({
      actionId: action.action,
      route: action.route,
      extra: action,
      notification: { title: action.title, body: action.body },
    });
  }
} catch {
  // Invalid or unavailable browser state must not prevent app startup.
}

globalThis.addEventListener("vite:preloadError", () => {
  try {
    const key = "noor_preload_recover_once";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      globalThis.location.reload();
    }
  } catch {
    globalThis.location.reload();
  }
});

globalThis.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 60, retry: 1 }
  }
});

// On Capacitor Android, BASE_URL is "./" which breaks React Router (routes won't match).
// Use "/" as basename for Capacitor, otherwise use Vite's BASE_URL (handles GitHub Pages /ATHAR/).
const isCapacitorRuntime = !!(globalThis as unknown as Record<string, unknown>).Capacitor;
const routerBasename = isCapacitorRuntime
  ? "/"
  : (import.meta.env.BASE_URL as string);

// B9: Singleton React root. Only create the root once per page — calling
//     createRoot on the same container twice (HMR re-execution, embedded
//     scripts, etc.) triggers `NotFoundError: Failed to execute 'removeChild'`
//     and the "createRoot … Container already in use" warning. Cache the root
//     instance on window and bail out if it's already mounted.
const rootContainer = document.getElementById("root");
if (rootContainer) {
  const previouslyRenderedChild = rootContainer.firstElementChild;
  // After a hard reload React clears the container; only guard against a
  // re-entry while the previous React tree is still attached.
  const rootAlreadyMounted =
    !!previouslyRenderedChild &&
    previouslyRenderedChild.hasAttribute("data-react-root");

  const existingRoot = (window as unknown as Record<string, unknown>)[ROOT_INSTANCE_KEY] as
    | ReactDOM.Root
    | undefined;

  if (!existingRoot && !rootAlreadyMounted) {
    // Mark the container so a duplicate import can detect it and not
    // re-mount a second tree on top of the live one.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("data-react-root", "true");
    sentinel.style.display = "contents";
    rootContainer.appendChild(sentinel);

    // Suppress browser-only affordances (page pinch-zoom, double-tap zoom) on
    // touch devices, so the app does not behave like a web page inside itself.
    installAppShellBehaviour();

    const root = ReactDOM.createRoot(sentinel);
    (window as unknown as Record<string, unknown>)[ROOT_INSTANCE_KEY] = root;
    root.render(
      <React.StrictMode>
        <AppErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={routerBasename}>
              <App />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "color-mix(in srgb, var(--bg) 88%, var(--fg))",
                    color: "var(--fg)",
                    border: "1px solid var(--stroke)",
                    borderRadius: "16px",
                    direction: "rtl",
                    fontSize: "0.875rem",
                    padding: "12px 16px",
                    boxShadow: "0 8px 32px rgba(0,0,0,.3)",
                    backdropFilter: "blur(12px)",
                  },
                  success: {
                    iconTheme: {
                      primary: "var(--ok)",
                      secondary: "color-mix(in srgb, var(--bg) 88%, var(--fg))",
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: "var(--danger)",
                      secondary: "color-mix(in srgb, var(--bg) 88%, var(--fg))",
                    },
                  },
                }}
              />
            </BrowserRouter>
          </QueryClientProvider>
        </AppErrorBoundary>
      </React.StrictMode>
    );
  }
}

/**
 * Catch notification taps that land during cold start.
 *
 * Tapping a notification (or one of its action buttons) launches the app, and
 * the plugin emits `localNotificationActionPerformed` while the WebView is
 * still booting — well before App.tsx mounts its listener. Those events are not
 * queued, so the very tap that opened the app used to be dropped and the user
 * just landed on the home screen instead of the thing being reminded about.
 *
 * This registers as early as possible and dispatches to the router-aware
 * handler when it is ready, buffering only while the app shell is mounting.
 */
void (async () => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const [{ LocalNotifications }, { dispatchNativeNotificationAction }] = await Promise.all([
      import("@capacitor/local-notifications"),
      import("@/lib/reminders"),
    ]);
    await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const extra = action.notification.extra as Record<string, unknown> | undefined;
      const route = typeof extra?.route === "string" ? (extra.route as string) : undefined;
      // Keep the action extras and original notification so cold-start prayer
      // logging and snooze scheduling have the same data as the warm listener.
      dispatchNativeNotificationAction({ actionId: action.actionId, route, extra, notification: action.notification });
    });
  } catch {
    // Non-fatal: the in-app listener still covers warm taps.
  }
})();
