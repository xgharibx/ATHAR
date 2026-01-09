import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isGithubPages = process.env.GITHUB_PAGES === "true";
/**
 * NOTE: `base: "./"` is important if you plan to ship the built `dist/`
 * inside an Android WebView (Capacitor, Cordova, etc).
 */
export default defineConfig({
    base: isGithubPages ? "/ATHAR/" : "./",
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["icons/*", "lottie/*", "data/*", "data/**/*"],
            manifest: {
                name: "Athar — Adhkar",
                short_name: "Athar",
                description: "أثر - Adhkar & Prayer Companion",
                lang: "ar",
                dir: "rtl",
                start_url: "./",
                scope: "./",
                display: "standalone",
                theme_color: "#0b0d12",
                background_color: "#0b0d12",
                icons: [
                    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
                    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
                ]
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff2}"],
                navigateFallback: "index.html",
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
            }
        })
    ],
    server: { port: 5173, strictPort: true },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
