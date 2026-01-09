import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import App from "./App";
import "./styles/globals.css";
import "./pwa";

// GitHub Pages SPA fallback support:
// public/404.html redirects to /ATHAR/?p=<encoded_path>
// This rewrites the URL back to the real route so React Router can render it.
try {
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 60, retry: 1 }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
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
  </React.StrictMode>
);
