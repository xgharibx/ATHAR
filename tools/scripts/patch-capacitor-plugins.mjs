/**
 * Post-install patch for Capacitor 6 plugins on modern Android Gradle Plugin.
 *
 * @capacitor/preferences 6.x ships `getDefaultProguardFile('proguard-android.txt')`,
 * which AGP 9+ rejects (the non-optimize file was removed). The maintained fix
 * (Capacitor 7) uses proguard-android-optimize.txt — apply the same here.
 *
 * Runs automatically via the package.json "postinstall" hook; safe to re-run.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(
  new URL("../../node_modules/@capacitor/preferences/android/build.gradle", import.meta.url),
);

if (!existsSync(target)) {
  console.log("[patch-capacitor-plugins] preferences plugin not installed — nothing to do");
  process.exit(0);
}

const before = readFileSync(target, "utf8");
const after = before.replace(
  "getDefaultProguardFile('proguard-android.txt')",
  "getDefaultProguardFile('proguard-android-optimize.txt')",
);

if (after !== before) {
  writeFileSync(target, after);
  console.log("[patch-capacitor-plugins] patched @capacitor/preferences proguard config for AGP 9+");
} else {
  console.log("[patch-capacitor-plugins] @capacitor/preferences already patched");
}
