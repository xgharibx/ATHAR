import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./styles/globals.css";
import "./pwa";

const APP_RUNTIME_VERSION = "2026-02-14-r5";
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
            <button className="px-4 py-2 rounded-2xl bg-white/10 border border-white/10" onClick={() => window.location.reload()}>
              تحديث الصفحة
            </button>
            <button
              className="px-4 py-2 rounded-2xl bg-white/10 border border-white/10"
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
try {
  const seenVersion = localStorage.getItem(APP_RUNTIME_VERSION_KEY);
  if (seenVersion !== APP_RUNTIME_VERSION) {
    localStorage.setItem(APP_RUNTIME_VERSION_KEY, APP_RUNTIME_VERSION);
    sessionStorage.removeItem("noor_preload_recover_once");
    window.location.reload();
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "rgba(10,12,18,.92)",
                color: "white",
                border: "1px solid rgba(255,255,255,.12)"
              }
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
