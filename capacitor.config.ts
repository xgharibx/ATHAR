import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.athar.adhkar",
  appName: "Athar",
  webDir: "dist",
  bundledWebRuntime: false,
  // If you deploy to a real domain, set server.url; for local/offline builds, keep it undefined.
};

export default config;
