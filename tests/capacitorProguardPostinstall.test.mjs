import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Capacitor ProGuard compatibility postinstall", () => {
  it("rewrites the core Android module's legacy ProGuard file for AGP 9", () => {
    const repoRoot = fileURLToPath(new URL("../", import.meta.url));
    const scriptPath = path.join(
      repoRoot,
      "tools",
      "scripts",
      "patch-capacitor-plugins.mjs",
    );
    const fixtureRoot = mkdtempSync(
      path.join(tmpdir(), "athar-capacitor-proguard-"),
    );
    const fixtureScript = path.join(
      fixtureRoot,
      "tools",
      "scripts",
      "patch-capacitor-plugins.mjs",
    );
    const capacitorAndroidBuild = path.join(
      fixtureRoot,
      "node_modules",
      "@capacitor",
      "android",
      "capacitor",
      "build.gradle",
    );

    try {
      mkdirSync(path.dirname(fixtureScript), { recursive: true });
      mkdirSync(path.dirname(capacitorAndroidBuild), { recursive: true });
      copyFileSync(scriptPath, fixtureScript);
      writeFileSync(
        capacitorAndroidBuild,
        "proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'\n",
      );

      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });

      const patched = readFileSync(capacitorAndroidBuild, "utf8");
      expect(patched).toContain("getDefaultProguardFile('proguard-android-optimize.txt')");
      expect(patched).not.toContain("getDefaultProguardFile('proguard-android.txt')");
    } finally {
      const resolvedFixtureRoot = path.resolve(fixtureRoot);
      if (path.dirname(resolvedFixtureRoot) !== path.resolve(tmpdir())) {
        throw new Error("Refusing to remove a fixture outside the system temp directory");
      }
      rmSync(resolvedFixtureRoot, { recursive: true, force: true });
    }
  });
});
