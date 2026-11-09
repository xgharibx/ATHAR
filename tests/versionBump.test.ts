import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptSource = path.join(repoRoot, "tools/scripts/bump-version.mjs");
const fixtures: string[] = [];

function createVersionFixture(lockVersion = "1.2.3") {
  const root = mkdtempSync(path.join(os.tmpdir(), "athar-version-bump-"));
  fixtures.push(root);
  mkdirSync(path.join(root, "tools/scripts"), { recursive: true });
  mkdirSync(path.join(root, "android/app"), { recursive: true });
  mkdirSync(path.join(root, "ios/App/App.xcodeproj"), { recursive: true });

  writeFileSync(path.join(root, "tools/scripts/bump-version.mjs"), readFileSync(scriptSource));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "1.2.3" }, null, 2));
  writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({
    name: "athar-adhkar",
    version: lockVersion,
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "athar-adhkar", version: lockVersion } },
  }, null, 2));
  writeFileSync(path.join(root, "android/app/build.gradle"), 'versionCode 5\nversionName "1.2.3"\n');
  writeFileSync(path.join(root, "ios/App/App.xcodeproj/project.pbxproj"), [
    "CURRENT_PROJECT_VERSION = 5;",
    "MARKETING_VERSION = 1.2.3;",
    "CURRENT_PROJECT_VERSION = 5;",
    "MARKETING_VERSION = 1.2.3;",
  ].join("\n"));

  return root;
}

function runVersionScript(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [path.join(root, "tools/scripts/bump-version.mjs"), ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe("cross-store version metadata", () => {
  it("updates both package-lock root versions when the app version is bumped", () => {
    const root = createVersionFixture();
    const result = runVersionScript(root);

    expect(result.status).toBe(0);
    expect(JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version).toBe("1.2.4");

    const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
    expect(lock.version).toBe("1.2.4");
    expect(lock.packages[""].version).toBe("1.2.4");
  });

  it("fails the parity check when package-lock root versions are stale", () => {
    const root = createVersionFixture("1.2.2");
    const result = runVersionScript(root, "--check");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("package-lock");
  });
});
