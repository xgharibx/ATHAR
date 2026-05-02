import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
/**
 * NOTE: `base: "./"` is important if you plan to ship the built `dist/`
 * inside an Android WebView (Capacitor, Cordova, etc).
 */
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, "", "");
    var isGithubPages = env.GITHUB_PAGES === "true";
    var iconRev = env.VITE_ICON_REV || env.VITE_RUNTIME_VERSION || "2026-04-02-v1";
    return {
        // Custom domain (www.athark.org) serves from root, so use "/" not "/ATHAR/"
        base: isGithubPages ? "/" : "./",
        build: {
            chunkSizeWarningLimit: 900,
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        if (!id.includes("node_modules"))
                            return;
                        if (id.includes("react") || id.includes("scheduler") || id.includes("framer-motion") || id.includes("lottie-react"))
                            return "vendor-react";
                        if (id.includes("react-router-dom"))
                            return "vendor-router";
                        if (id.includes("@tanstack/react-query"))
                            return "vendor-query";
                        if (id.includes("zustand"))
                            return "vendor-state";
                        if (id.includes("gsap") || id.includes("lottie-web"))
                            return "vendor-motion";
                        if (id.includes("@react-three") || id.includes("three"))
                            return "vendor-three";
                        if (id.includes("fuse.js") || id.includes("cmdk"))
                            return "vendor-search";
                        if (id.includes("html-to-image") || id.includes("canvas-confetti"))
                            return "vendor-share";
                        if (id.includes("lucide-react") || id.includes("@radix-ui"))
                            return "vendor-ui";
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
                    theme_color: "#2F4F37",
                    background_color: "#2F4F37",
                    icons: [
                        { src: "pwa-192x192.png?v=".concat(iconRev), sizes: "192x192", type: "image/png", purpose: "any" },
                        { src: "pwa-512x512.png?v=".concat(iconRev), sizes: "512x512", type: "image/png", purpose: "any" },
                        { src: "maskable-512x512.png?v=".concat(iconRev), sizes: "512x512", type: "image/png", purpose: "maskable" }
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
                        // T4: Cache Quran audio files from everyayah CDN
                        {
                            urlPattern: /^https:\/\/everyayah\.com\/data\/.*/i,
                            handler: "CacheFirst",
                            options: {
                                cacheName: "quran-audio",
                                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                                cacheableResponse: { statuses: [0, 200] }
                            }
                        },
                        // T4: Cache Quran audio from islamic.network CDN
                        {
                            urlPattern: /^https:\/\/cdn\.islamic\.network\/quran\/audio\/.*/i,
                            handler: "CacheFirst",
                            options: {
                                cacheName: "quran-audio",
                                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
