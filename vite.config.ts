import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * NOTE: `base: "./"` is important if you plan to ship the built `dist/`
 * inside an Android WebView (Capacitor, Cordova, etc).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "", "");
  const isGithubPages = env.GITHUB_PAGES === "true";
  const iconRev = env.VITE_ICON_REV || "2026-02-14-v1";

  return {
  base: isGithubPages ? "/ATHAR/" : "./",
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react") || id.includes("scheduler") || id.includes("framer-motion") || id.includes("lottie-react")) return "vendor-react";
          if (id.includes("react-router-dom")) return "vendor-router";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("zustand")) return "vendor-state";
          if (id.includes("gsap") || id.includes("lottie-web")) return "vendor-motion";
          if (id.includes("@react-three") || id.includes("three")) return "vendor-three";
          if (id.includes("fuse.js") || id.includes("cmdk")) return "vendor-search";
          if (id.includes("html-to-image") || id.includes("canvas-confetti")) return "vendor-share";
          if (id.includes("lucide-react") || id.includes("@radix-ui")) return "vendor-ui";
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*", "lottie/*", "data/*", "data/**/*"],
      manifest: {
        name: "Athar — Adhkar",
        short_name: "Athar",
        id: "./",
        description: "أثر - Adhkar & Prayer Companion",
        lang: "ar",
        dir: "rtl",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#0b0d12",
        background_color: "#0b0d12",
        icons: [
          { src: `pwa-192x192.png?v=${iconRev}`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `pwa-512x512.png?v=${iconRev}`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `maskable-512x512.png?v=${iconRev}`, sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          {
            name: "أذكار الصباح",
            short_name: "الصباح",
            url: "./c/morning"
          },
          {
            name: "المصحف",
            short_name: "القرآن",
            url: "./quran"
          },
          {
            name: "المفضلة",
            short_name: "المفضلة",
            url: "./favorites"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff2}"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
