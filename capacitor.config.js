var config = {
    appId: "com.athar.adhkar",
    appName: "Athar",
    webDir: "dist",
    bundledWebRuntime: false,
    android: {
        // Allow the Capacitor server to handle all paths for React Router
        allowMixedContent: true,
        // Ensure the WebView's background matches our dark theme while bootstrapping
        backgroundColor: "#0a0c12",
    },
    server: {
        // No server.url here — keeps the app offline/bundled (production mode)
        androidScheme: "https",
    },
};
export default config;
