var config = {
    appId: "com.athar.adhkar",
    appName: "Athar",
    webDir: "dist",
    plugins: {
        LocalNotifications: {
            smallIcon: "ic_stat_athar",
            iconColor: "#2F4F37",
        },
    },
    android: {
        // Allow the Capacitor server to handle all paths for React Router
        allowMixedContent: true,
        // Ensure the WebView's background matches our dark theme while bootstrapping
        backgroundColor: "#0a0c12",
    },
    ios: {
        // Match the dark theme while the WKWebView bootstraps (same as Android)
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
