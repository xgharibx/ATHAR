import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./styles/globals.css";
import "./pwa";
import { hydrateHadithState, hydrateCustomReminders } from "@/store/noorStore";

const APP_RUNTIME_VERSION = (import.meta.env.VITE_RUNTIME_VERSION as string | undefined) ?? "local-dev";
const APP_RUNTIME_VERSION_KEY = "noor_app_runtime_version";
const ROOT_INSTANCE_KEY = "noor_react_root_instance";

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
// NOTE: Skip reload on Capacitor/Android to prevent black screen on first install.
try {
  const isCapacitor = !!(globalThis as unknown as Record<string, unknown>).Capacitor;
  if (!isCapacitor) {
    const seenVersion = localStorage.getItem(APP_RUNTIME_VERSION_KEY);
    if (seenVersion !== APP_RUNTIME_VERSION) {
      localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_RUNTIME_VERSION);
      sessionStorage.removeItem("noor_preload_recover_once");
      globalThis.location.reload();
    }
  } else {
    // On Capacitor, just persist the version without reloading
    localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_RUNTIME_VERSION);
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

    const root = ReactDOM.createRoot(sentinel);
    (window as unknown as Record<string, unknown>)[ROOT_INSTANCE_KEY] = root;
    root.render(
      <React.StrictMode>
        <AppErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter
              basename={routerBasename}
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
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

// 11A: Hydrate hadith user-state (bookmarks, progress, notes, memoCards) from IDB.
// Fires after first render so the UI is already visible — data appears within ms.
void hydrateHadithState();

// Custom (user-defined) reminders — IDB-backed like hadith.
void hydrateCustomReminders();
