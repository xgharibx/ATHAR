import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const gradle = await readFile(path.join(repoRoot, "android/app/build.gradle"), "utf8");
const minimumApi = 36;
const compileSdk = Number(gradle.match(/\bcompileSdk\s+(\d+)/)?.[1]);
const targetSdk = Number(gradle.match(/\btargetSdkVersion\s+(\d+)/)?.[1]);

if (!Number.isInteger(compileSdk) || compileSdk < minimumApi) {
  throw new Error(`compileSdk must be ${minimumApi} or newer for release builds; found ${compileSdk || "missing"}.`);
}
if (!Number.isInteger(targetSdk) || targetSdk < minimumApi) {
  throw new Error(`targetSdkVersion must be ${minimumApi} or newer for Play submissions; found ${targetSdk || "missing"}.`);
}

console.log(`Android SDK targets are release-ready: compileSdk ${compileSdk}, targetSdk ${targetSdk} (minimum ${minimumApi}).`);
