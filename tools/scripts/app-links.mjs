#!/usr/bin/env node
/**
 * Writes the files that let shared links open the installed app:
 *   <out>/.well-known/apple-app-site-association  (iOS universal links)
 *   <out>/.well-known/assetlinks.json             (Android app links)
 *
 *   node tools/scripts/app-links.mjs dist <apple team id> <android fingerprints>
 *
 * Both are public identifiers (they are in every signed copy of the app),
 * given as arguments; either may be empty.
 *
 * Only hadith pages are claimed (/hadith/…); everything else stays a web page.
 * A file whose value is missing or malformed is skipped, not guessed.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

export const APP_ID = "com.athar.adhkar";
export const LINK_PATHS = ["/hadith/*"];

export function appleAssociation(teamId) {
  if (!/^[A-Z0-9]{10}$/.test(teamId ?? "")) return null;
  return {
    applinks: {
      details: [{ appIDs: [`${teamId}.${APP_ID}`], components: LINK_PATHS.map((path) => ({ "/": path })) }],
    },
  };
}

export function androidAssetLinks(fingerprints) {
  const list = (fingerprints ?? "")
    .split(/[\s,]+/)
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
  if (!list.length) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: APP_ID, sha256_cert_fingerprints: list },
    },
  ];
}

function main() {
  const out = process.argv[2] ?? "dist";
  const dir = join(out, ".well-known");
  mkdirSync(dir, { recursive: true });
  const apple = appleAssociation(process.argv[3] ?? "");
  if (apple) writeFileSync(join(dir, "apple-app-site-association"), JSON.stringify(apple));
  const android = androidAssetLinks(process.argv[4] ?? "");
  if (android) writeFileSync(join(dir, "assetlinks.json"), JSON.stringify(android));
  console.log(`apple-app-site-association: ${apple ? "written" : "skipped (no team id)"}`);
  console.log(`assetlinks.json: ${android ? "written" : "skipped (no fingerprint)"}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
