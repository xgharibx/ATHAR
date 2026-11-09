import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lockPath = path.join(root, "package-lock.json");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const minimumPatched = [6, 2, 2];
const nativePackages = ["@capacitor/android", "@capacitor/ios"];

function versionTuple(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version ?? "");
  return match ? match.slice(1, 4).map(Number) : null;
}

function isAtLeast(left, right) {
  for (let index = 0; index < right.length; index += 1) {
    if (left[index] > right[index]) return true;
    if (left[index] < right[index]) return false;
  }
  return true;
}

const problems = [];
for (const name of nativePackages) {
  const version = lock.packages?.[`node_modules/${name}`]?.version;
  const tuple = versionTuple(version);
  if (!tuple || !isAtLeast(tuple, minimumPatched)) {
    problems.push(`${name} resolves to ${version ?? "no locked version"}; require Capacitor 6.2.2 or newer.`);
  }
}

if (problems.length) {
  console.error(`Unsafe Capacitor native package resolution:\n- ${problems.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("ok: locked Capacitor Android and iOS packages include the upstream navigation-proxy security fix");
}
