import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.athar.adhkar",
  appName: "Athar",
  webDir: "dist",
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_athar_notification",
      iconColor: "#2F4F37",
    },
  },
  android: {
    // Keep insecure HTTP resources blocked inside the secure Capacitor WebView.
    allowMixedContent: false,
    // Match the forest intro before web content paints; React applies the saved theme.
    backgroundColor: "#022c22",
  },
  ios: {
    // Match the dark theme while the WKWebView bootstraps.
    backgroundColor: "#0a0c12",
    // The app draws its own safe-area padding (viewport-fit=cover + env() insets)
    contentInset: "never",
    // Serve the mobile layout on iPad as well
    preferredContentMode: "mobile",
  },
  server: {
    // No server.url here — keeps the app offline/bundled (production mode)
    androidScheme: "https",
  },
};

export default config;
