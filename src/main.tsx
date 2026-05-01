import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./styles/globals.css";
import "./pwa";

const APP_RUNTIME_VERSION = (import.meta.env.VITE_RUNTIME_VERSION as string | undefined) ?? "local-dev";
const APP_RUNTIME_VERSION_KEY = "noor_app_runtime_version";

type ErrorBoundaryState = { hasError: boolean; message: string };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? "حدث خطأ غير متوقع" };
  }

  componentDidCatch(error: Error) {
    console.error("App runtime error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="glass rounded-3xl p-6 max-w-md w-full border border-white/10">
          <div className="text-lg font-semibold">تعذر عرض التطبيق</div>
          <div className="mt-2 text-sm opacity-75 leading-7">
            تم اكتشاف خطأ أثناء تحميل الواجهة. يمكنك تحديث الصفحة أو إعادة تعيين التخزين المحلي.
          </div>
          <div className="mt-2 text-xs opacity-60 break-words">{this.state.message}</div>
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 min-h-[44px]" onClick={() => window.location.reload()}>
              تحديث الصفحة
            </button>
            <button
              className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 min-h-[44px]"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
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
  const isCapacitor = !!(window as unknown as Record<string, unknown>).Capacitor;
  if (!isCapacitor) {
    const seenVersion = localStorage.getItem(APP_RUNTIME_VERSION_KEY);
    if (seenVersion !== APP_RUNTIME_VERSION) {
      localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_RUNTIME_VERSION);
      sessionStorage.removeItem("noor_preload_recover_once");
      window.location.reload();
    }
  } else {
    // On Capacitor, just persist the version without reloading
    localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_RUNTIME_VERSION);
  }

  const url = new URL(window.location.href);
  const p = url.searchParams.get("p");
  if (p) {
    const decoded = decodeURIComponent(p);
    const next = `${import.meta.env.BASE_URL.replace(/\/$/, "")}${decoded}`;
    window.history.replaceState(null, "", next);
  }
} catch {
  // ignore
}

window.addEventListener("vite:preloadError", () => {
  try {
    const key = "noor_preload_recover_once";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 60, retry: 1 }
  }
});

// On Capacitor Android, BASE_URL is "./" which breaks React Router (routes won't match).
// Use "/" as basename for Capacitor, otherwise use Vite's BASE_URL (handles GitHub Pages /ATHAR/).
const isCapacitorRuntime = !!(window as unknown as Record<string, unknown>).Capacitor;
const routerBasename = isCapacitorRuntime
  ? "/"
  : (import.meta.env.BASE_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
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
                background: "rgba(10,12,18,.94)",
                color: "white",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: "16px",
                direction: "rtl",
                fontSize: "0.875rem",
                padding: "12px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,.45)",
                backdropFilter: "blur(12px)",
              },
              success: {
                iconTheme: { primary: "#3ddc97", secondary: "rgba(10,12,18,.94)" },
              },
              error: {
                iconTheme: { primary: "#ff6b6b", secondary: "rgba(10,12,18,.94)" },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
