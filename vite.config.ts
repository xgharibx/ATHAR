import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** package.json is the single source of truth for the app's version. */
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version: string };

/**
 * Publish the version the site is serving, so an installed app can tell whether
 * it is behind.
 *
 * There is no public API for "what version is live on Google Play", and asking
 * the user to keep a number in sync by hand is a number that goes stale. This
 * is written from package.json at build time, and the web deploy goes out with
 * the same release as the store build — so an older APK fetching this sees the
 * newer version and can say so.
 */
function emitVersionManifest() {
  return {
    name: "athar-version-manifest",
    apply: "build" as const,
    generateBundle(this: {
      emitFile: (f: { type: "asset"; fileName: string; source: string }) => void;
    }) {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: pkg.version, builtAt: new Date().toISOString() }),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "", "");
  const iconRev = env.VITE_ICON_REV || env.VITE_RUNTIME_VERSION || "2026-04-02-v1";

  return {
  // Custom domain, Vite preview, and Capacitor's local Android server all serve from root.
  // Absolute asset URLs prevent deep links like /c/morning from looking for /c/assets/*.
  base: "/",
  define: {
    // The version this bundle was built as, for comparison against the live
    // version.json at runtime.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
    emitVersionManifest(),
    // B1: Force application/manifest+json on every .webmanifest response.
    //     VitePWA generates manifest.webmanifest at build time but the dev
    //     server's static middleware has been observed sending HTML on some
    //     environments, which trips Chrome's "Manifest must be JSON" check
    //     and stops the install prompt. We patch both preview and dev.
    {
      name: "noor-force-manifest-mime",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.split("?")[0]!.endsWith(".webmanifest")) {
            res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.split("?")[0]!.endsWith(".webmanifest")) {
            res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
          }
          next();
        });
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // B1: Also serve the manifest during `vite dev` so the install
      //     prompt + browser-cache flow can be exercised before
      //     `npm run build && vite preview`. The default off-mode means
      //     Chrome reports "Manifest is not a valid JSON" because the
      //     dev server's HTML fallback returns index.html for the
      //     /manifest.webmanifest path.
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
      injectManifest: {
        injectionPoint: "self.__WB_MANIFEST",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}", "data/*.json"],
        globIgnores: ["**/data/hadith/**"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
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
