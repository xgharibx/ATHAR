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
  it("rewrites legacy ProGuard files across installed Capacitor Android modules", () => {
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
    const legacyGradle = "proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'\n";
    const moduleBuildFiles = [
      ["android", "capacitor", "build.gradle"],
      ["local-notifications", "android", "build.gradle"],
      ["preferences", "android", "build.gradle"],
    ].map((parts) => path.join(fixtureRoot, "node_modules", "@capacitor", ...parts));

    try {
      mkdirSync(path.dirname(fixtureScript), { recursive: true });
      copyFileSync(scriptPath, fixtureScript);
      for (const buildFile of moduleBuildFiles) {
        mkdirSync(path.dirname(buildFile), { recursive: true });
        writeFileSync(buildFile, legacyGradle);
      }

      execFileSync(process.execPath, [fixtureScript], { cwd: fixtureRoot });

      for (const buildFile of moduleBuildFiles) {
        const patched = readFileSync(buildFile, "utf8");
        expect(patched).toContain("getDefaultProguardFile('proguard-android-optimize.txt')");
        expect(patched).not.toContain("getDefaultProguardFile('proguard-android.txt')");
      }
    } finally {
      const resolvedFixtureRoot = path.resolve(fixtureRoot);
      if (path.dirname(resolvedFixtureRoot) !== path.resolve(tmpdir())) {
        throw new Error("Refusing to remove a fixture outside the system temp directory");
      }
      rmSync(resolvedFixtureRoot, { recursive: true, force: true });
    }
  });
});
