/**
 * Keep `package.json > released.android` equal to what Google Play is serving.
 *
 * The update prompt has to be about the store, not about git. A release is
 * pushed, reviewed and rolled out over days, so the only number worth telling
 * users about is the one they can actually install — and nobody remembers to
 * update a number by hand, which is exactly how a prompt starts lying.
 *
 * Play does not offer an API for this, but the public listing carries the
 * version in its serialised page data. So this reads it, and:
 *
 *   - writes it only when it differs and is genuinely newer,
 *   - leaves the existing value alone on ANY doubt — no match, a shape that
 *     changed, a network failure, a number that moved backwards.
 *
 * That asymmetry is the whole design. A stale value costs a late prompt; a
 * wrong value sends people to a listing that has nothing for them, and they
 * stop believing the next one.
 *
 * Usage:  node tools/scripts/sync-store-version.mjs [--write]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PKG = path.join(ROOT, "package.json");
const LISTING =
  "https://play.google.com/store/apps/details?id=com.athar.adhkar&hl=en";

/** `1.2.54` → [1,2,54] */
function parts(v) {
  return String(v ?? "").split(".").map((n) => Number.parseInt(n, 10) || 0);
}

export function isNewer(latest, current) {
  const a = parts(latest);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/**
 * Pull the version out of the listing HTML.
 *
 * Play serialises it as `[[["1.2.54"]]` inside the page's data blob. The page
 * also contains other version-shaped strings, so this deliberately matches the
 * bracket shape rather than the first number that looks like a version.
 */
export function extractPlayVersion(html) {
  const m = String(html ?? "").match(/\[\[\["(\d+\.\d+(?:\.\d+)?)"\]\]/);
  return m ? m[1] : null;
}

async function main() {
  const write = process.argv.includes("--write");
  const pkg = JSON.parse(fs.readFileSync(PKG, "utf-8"));
  const current = pkg.released?.android ?? null;

  let html = "";
  try {
    const res = await fetch(LISTING, {
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!res.ok) {
      console.log(`play listing returned ${res.status}; leaving ${current} alone`);
      return;
    }
    html = await res.text();
  } catch (e) {
    console.log(`could not reach the play listing (${e}); leaving ${current} alone`);
    return;
  }

  const found = extractPlayVersion(html);
  if (!found) {
    // The markup changed, or the page was served without the data blob. Either
    // way this script no longer knows the answer, and guessing is the one thing
    // it must not do.
    console.log(`no version found in the listing; leaving ${current} alone`);
    return;
  }

  if (found === current) {
    console.log(`play is on ${found}; unchanged`);
    return;
  }

  if (current && !isNewer(found, current)) {
    console.log(`listing says ${found}, which is not newer than ${current}; leaving it alone`);
    return;
  }

  console.log(`play moved: ${current ?? "(unset)"} -> ${found}`);
  if (!write) {
    console.log("dry run; pass --write to apply");
    return;
  }

  pkg.released = { ...(pkg.released ?? {}), android: found };
  fs.writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  console.log("package.json updated");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("sync-store-version.mjs")) {
  await main();
}
