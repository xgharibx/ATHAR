/**
 * Bump the app version everywhere it lives, in one step.
 *
 * Three files each carry a copy of the version, and they have to agree or a
 * store rejects the upload (or worse, accepts it and mis-orders updates):
 *
 *   package.json                              "version"
 *   android/app/build.gradle                  versionName + versionCode
 *   ios/App/App.xcodeproj/project.pbxproj     MARKETING_VERSION + CURRENT_PROJECT_VERSION
 *
 * Google Play, Huawei AppGallery and the App Store all read the Android/iOS
 * numbers from those files, so this is the single step that moves all three.
 *
 * Usage:
 *   node tools/scripts/bump-version.mjs            # patch:  1.2.75 -> 1.2.76
 *   node tools/scripts/bump-version.mjs minor      # minor:  1.2.75 -> 1.3.0
 *   node tools/scripts/bump-version.mjs 1.4.0      # explicit
 *   node tools/scripts/bump-version.mjs --check    # only verify they agree
 *
 * The build number only ever goes UP, by one, from the highest of the current
 * values — stores refuse a number that is not strictly greater than the last.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PKG = path.join(ROOT, "package.json");
const GRADLE = path.join(ROOT, "android/app/build.gradle");
const PBX = path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj");

/** Read keeping the file's own line endings, so a bump does not rewrite them all. */
const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s, "utf8");

function readState() {
  const pkg = JSON.parse(read(PKG));
  const gradle = read(GRADLE);
  const pbx = read(PBX);

  const gName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  const gCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
  const marketing = [...new Set([...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1].trim()))];
  const builds = [...new Set([...pbx.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((m) => Number(m[1])))];

  return { pkg, gradle, pbx, version: pkg.version, gName, gCode, marketing, builds };
}

function agree(s) {
  const problems = [];
  if (s.gName !== s.version) problems.push(`android versionName ${s.gName} != package ${s.version}`);
  if (s.marketing.length !== 1 || s.marketing[0] !== s.version) {
    problems.push(`ios MARKETING_VERSION ${s.marketing.join(",")} != package ${s.version}`);
  }
  if (s.builds.length !== 1 || s.builds[0] !== s.gCode) {
    problems.push(`ios build ${s.builds.join(",")} != android versionCode ${s.gCode}`);
  }
  return problems;
}

function nextVersion(current, how) {
  if (/^\d+\.\d+\.\d+$/.test(how)) return how;
  const [a, b, c] = current.split(".").map(Number);
  if (how === "major") return `${a + 1}.0.0`;
  if (how === "minor") return `${a}.${b + 1}.0`;
  return `${a}.${b}.${c + 1}`;
}

const arg = process.argv[2] ?? "patch";
const s = readState();

if (arg === "--check") {
  const problems = agree(s);
  if (problems.length) {
    console.error("version files DISAGREE:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log(`ok: ${s.version} (build ${s.gCode}) in package, android and ios`);
  process.exit(0);
}

// Refuse to bump from a state that is already inconsistent: the result would be
// a confident-looking set of numbers built on a wrong one.
const before = agree(s);
if (before.length) {
  console.error("refusing to bump — the version files already disagree:\n  " + before.join("\n  "));
  process.exit(1);
}

const version = nextVersion(s.version, arg);
const code = Math.max(s.gCode, ...s.builds) + 1;

// package.json — keep its line endings and key order by editing the one line.
const pkgText = read(PKG);
if (!/"version":\s*"[^"]+"/.test(pkgText)) throw new Error("no version line in package.json");
write(PKG, pkgText.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`));

write(
  GRADLE,
  s.gradle
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`)
    .replace(/versionCode\s+\d+/, `versionCode ${code}`),
);

write(
  PBX,
  s.pbx
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${code};`),
);

console.log(`${s.version} (build ${s.gCode}) -> ${version} (build ${code})`);
console.log("updated: package.json, android/app/build.gradle, ios project.pbxproj");
