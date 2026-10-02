/**
 * Post-install patch for Capacitor 6 Android modules on modern Android Gradle Plugin.
 *
 * @capacitor/android and @capacitor/preferences 6.x can ship
 * `getDefaultProguardFile('proguard-android.txt')`, which AGP 9+ rejects. Use
 * the optimized default already used by the generated app target.
 *
 * Runs automatically via the package.json "postinstall" hook; safe to re-run.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const capacitorPackages = fileURLToPath(
  new URL("../../node_modules/@capacitor/", import.meta.url),
);

if (!existsSync(capacitorPackages)) {
  console.log("[patch-capacitor-plugins] Capacitor packages not installed — nothing to do");
  process.exit(0);
}

for (const entry of readdirSync(capacitorPackages, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const packageRoot = path.join(capacitorPackages, entry.name);
  const buildFiles = [
    path.join(packageRoot, "capacitor", "build.gradle"),
    path.join(packageRoot, "android", "build.gradle"),
  ];

  for (const target of buildFiles) {
    if (!existsSync(target)) continue;

    const before = readFileSync(target, "utf8");
    const after = before.replace(
      "getDefaultProguardFile('proguard-android.txt')",
      "getDefaultProguardFile('proguard-android-optimize.txt')",
    );

    if (after !== before) {
      writeFileSync(target, after);
      console.log(`[patch-capacitor-plugins] patched ${path.relative(capacitorPackages, target)} for AGP 9+`);
    } else {
      console.log(`[patch-capacitor-plugins] ${path.relative(capacitorPackages, target)} already patched`);
    }
  }
}
