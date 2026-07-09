import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "", "");
  const iconRev = env.VITE_ICON_REV || env.VITE_RUNTIME_VERSION || "2026-04-02-v1";

  return {
  // Custom domain, Vite preview, and Capacitor's local Android server all serve from root.
  // Absolute asset URLs prevent deep links like /c/morning from looking for /c/assets/*.
  base: "/",
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
        id: "/",
        description: "أثر - Adhkar & Prayer Companion",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait-primary",
        categories: ["lifestyle", "education", "utilities"],
        theme_color: "#2F4F37",
        background_color: "#2F4F37",
        icons: [
          { src: `pwa-192x192.png?v=${iconRev}`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `pwa-512x512.png?v=${iconRev}`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `maskable-512x512.png?v=${iconRev}`, sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          {
            name: "أذكار الصباح",
            short_name: "الصباح",
            description: "ابدأ يومك بأذكار الصباح النبوية",
            url: "/c/morning"
          },
          {
            name: "المصحف",
            short_name: "القرآن",
            description: "اقرأ القرآن الكريم مع التفسير والترجمة",
            url: "/quran"
          },
          {
            name: "المفضلة",
            short_name: "المفضلة",
            description: "الأذكار والآيات المحفوظة لديك",
            url: "/favorites"
          }
        ],
        prefer_related_applications: false,
        screenshots: [
          {
            src: "icons/screenshot-mobile.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "الشاشة الرئيسية لتطبيق أثر"
          },
          {
            src: "icons/screenshot-desktop.png",
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
            label: "واجهة سطح المكتب لتطبيق أثر"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}", "data/*.json"],
        globIgnores: ["**/data/hadith/**"],
        navigateFallback: "index.html",
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
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
          },
          // T4: Cache Quran audio files from everyayah CDN (1 year, large quota for per-reciter downloads)
          {
            urlPattern: /^https:\/\/everyayah\.com\/data\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "quran-audio",
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // T4: Cache Quran audio from islamic.network CDN
          {
            urlPattern: /^https:\/\/cdn\.islamic\.network\/quran\/audio\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "quran-audio",
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Tafsir library (spa5k/tafsir_api via jsDelivr) — CacheFirst, text never changes.
          // Also cached per-surah in IndexedDB (src/lib/tafsirEditions.ts) for a real offline read.
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/spa5k\/tafsir_api.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "tafsir-api-v1",
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // WBW/Tajweed API — CacheFirst (data doesn't change)
          {
            urlPattern: /^https:\/\/api\.quran\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "wbw-api-v1",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // 11B: Hadith pack JSON — downloaded on-demand, cached 90 days.
          //      NetworkFirst so updated packs are reflected when online.
          {
            urlPattern: /\/data\/hadith\/.*\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "athar-hadith-packs",
              expiration: { maxEntries: 15, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] }
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
