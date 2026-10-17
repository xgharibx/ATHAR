/**
 * Build the Android package for one store, or for all of them, from one source.
 *
 *   npm run release:play      -> play/out/
 *   npm run release:huawei    -> huawei/out/
 *   npm run release:stores    -> both
 *
 * Every change made to the app reaches Google Play, Huawei AppGallery and (via
 * the same web bundle) the iOS project by running this again. There is no
 * separate Huawei codebase to keep in step: the packages differ only in which
 * store the app believes it came from (-Pstore=...), which decides where "a new
 * version is out" sends people.
 *
 * Steps, in order — each stops the run if it fails:
 *   1. the version files must agree (bump-version.mjs --check)
 *   2. the web app is built ONCE (tsc + vite)
 *   3. the web bundle is synced into the Android project ONCE
 *   4. gradle builds an .aab and an .apk per store
 *   5. results are copied to <store>/out/ with a name that carries the version,
 *      a SHA-256, and a BUILD_INFO.txt
 *
 * Signing is optional and driven by YOUR environment (ATHAR_KEYSTORE,
 * ATHAR_KEYSTORE_PASSWORD, ATHAR_KEY_ALIAS, ATHAR_KEY_PASSWORD) — see
 * android/app/build.gradle. This script never reads or stores a secret. With
 * none set the packages are produced unsigned and say so in their name.
 *
 * Flags:  --skip-web   reuse the existing web build and Android sync
 */
import { spawnSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDROID = path.join(ROOT, "android");
const STORES = ["play", "huawei"];

const args = process.argv.slice(2);
const storeArg = (args.find((a) => a.startsWith("--store=")) ?? "--store=all").split("=")[1];
const skipWeb = args.includes("--skip-web");
const stores = storeArg === "all" ? STORES : [storeArg];

for (const s of stores) {
  if (!STORES.includes(s)) {
    console.error(`unknown store "${s}" — expected one of: ${STORES.join(", ")}, all`);
    process.exit(2);
  }
}

function run(cmd, cmdArgs, opts = {}) {
  console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}`);
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: true, cwd: ROOT, ...opts });
  if (r.status !== 0) {
    console.error(`\nFAILED (exit ${r.status}): ${cmd} ${cmdArgs.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

/** A JDK is only usable if it actually contains a java executable. */
const hasJava = (home) =>
  Boolean(home) && fs.existsSync(path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java"));

/**
 * Gradle needs a JDK 17 or 21. Not the newest one: this Gradle/AGP combination
 * rejects JDK 25, which is what a plain `java` on the PATH often is.
 *
 * Existing is not enough — Android Studio's jbr folder on this machine exists
 * but holds no java.exe, so each candidate is checked for the executable.
 */
function javaHome() {
  const candidates = [process.env.JAVA_HOME];
  candidates.push(
    "C:\Program Files\Android\Android Studio\jbr",
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    "/opt/android-studio/jbr",
  );
  // JetBrains-managed runtimes, e.g. ~/.jdks/jbr-17.0.14
  const jdks = path.join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".jdks");
  if (fs.existsSync(jdks)) {
    for (const name of fs.readdirSync(jdks).sort().reverse()) {
      if (/(^|[^0-9])(17|21)([^0-9]|$)/.test(name)) candidates.push(path.join(jdks, name));
    }
  }
  return candidates.find(hasJava);
}

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const mb = (file) => (fs.statSync(file).size / 1048576).toFixed(1);

// 1 ── the version files must agree before anything is built
run("node", ["tools/scripts/bump-version.mjs", "--check"]);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const gradleText = fs.readFileSync(path.join(ANDROID, "app/build.gradle"), "utf8");
const versionCode = gradleText.match(/versionCode\s+(\d+)/)[1];

// 2 + 3 ── web build and native sync, once for all stores
if (!skipWeb) {
  run("npm", ["run", "build"]);
  run("npx", ["cap", "sync", "android"]);
} else {
  console.log("\n--skip-web: reusing the existing web build and Android sync");
}

const jdk = javaHome();
if (!jdk) {
  console.error("no usable JDK 17/21 found. Set JAVA_HOME to one (Android Studio's jbr, or a JDK in ~/.jdks).");
  process.exit(1);
}
const env = { ...process.env, JAVA_HOME: jdk };
// Absolute and quoted: cmd.exe does not look in the working directory, and the
// project path contains no spaces today but should not be the thing that breaks.
const gradle = `"${path.join(ANDROID, process.platform === "win32" ? "gradlew.bat" : "gradlew")}"`;

const signed = Boolean(process.env.ATHAR_KEYSTORE);
console.log(`\nsigning: ${signed ? "ON (using ATHAR_KEYSTORE from your environment)" : "OFF — packages will be unsigned"}`);

for (const store of stores) {
  // 4 ── one gradle run per store; only -Pstore differs
  run(gradle, ["bundleRelease", "assembleRelease", `-Pstore=${store}`, "--console=plain", "-q"], {
    cwd: ANDROID,
    env,
  });

  // 5 ── collect
  const out = path.join(ROOT, store, "out");
  fs.mkdirSync(out, { recursive: true });

  const aabSrc = path.join(ANDROID, "app/build/outputs/bundle/release/app-release.aab");
  const apkDir = path.join(ANDROID, "app/build/outputs/apk/release");
  const apkSrc = ["app-release.apk", "app-release-unsigned.apk"]
    .map((n) => path.join(apkDir, n))
    .find((p) => fs.existsSync(p));

  const tag = `athar-${pkg.version}-${versionCode}-${store}${signed ? "" : "-UNSIGNED"}`;
  const lines = [
    `Athar ${pkg.version} (build ${versionCode}) — ${store}`,
    `built:   ${new Date().toISOString()}`,
    `signed:  ${signed ? "yes" : "NO — sign before uploading"}`,
    "",
  ];

  for (const [src, ext] of [[aabSrc, "aab"], [apkSrc, "apk"]]) {
    if (!src || !fs.existsSync(src)) {
      console.error(`missing ${ext} for ${store} — gradle reported success but produced none`);
      process.exit(1);
    }
    const dest = path.join(out, `${tag}.${ext}`);
    fs.copyFileSync(src, dest);
    lines.push(`${path.basename(dest)}  ${mb(dest)} MB`, `  sha256 ${sha256(dest)}`);
    console.log(`  -> ${path.relative(ROOT, dest)}  (${mb(dest)} MB)`);
  }
  fs.writeFileSync(path.join(out, "BUILD_INFO.txt"), lines.join("\n") + "\n", "utf8");
}

console.log(`\ndone: ${pkg.version} (build ${versionCode}) for ${stores.join(" + ")}`);
