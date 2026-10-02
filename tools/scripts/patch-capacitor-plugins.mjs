/**
 * Post-install patch for Capacitor 6 Android modules on modern Android Gradle Plugin.
 *
 * @capacitor/android and @capacitor/preferences 6.x can ship
 * `getDefaultProguardFile('proguard-android.txt')`, which AGP 9+ rejects. Use
 * the optimized default already used by the generated app target.
 *
 * Runs automatically via the package.json "postinstall" hook; safe to re-run.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const modules = [
  {
    name: "@capacitor/android",
    buildFile: new URL("../../node_modules/@capacitor/android/capacitor/build.gradle", import.meta.url),
  },
  {
    name: "@capacitor/preferences",
    buildFile: new URL("../../node_modules/@capacitor/preferences/android/build.gradle", import.meta.url),
  },
];

for (const module of modules) {
  const target = fileURLToPath(module.buildFile);
  if (!existsSync(target)) {
    console.log(`[patch-capacitor-plugins] ${module.name} not installed — skipping`);
    continue;
  }

  const before = readFileSync(target, "utf8");
  const after = before.replace(
    "getDefaultProguardFile('proguard-android.txt')",
    "getDefaultProguardFile('proguard-android-optimize.txt')",
  );

  if (after !== before) {
    writeFileSync(target, after);
    console.log(`[patch-capacitor-plugins] patched ${module.name} proguard config for AGP 9+`);
  } else {
    console.log(`[patch-capacitor-plugins] ${module.name} already patched`);
  }
}
