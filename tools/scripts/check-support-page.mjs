import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page = await readFile(path.join(repoRoot, "public/support.html"), "utf8");

assert.match(page, /<html[^>]*lang="ar"[^>]*dir="rtl"/i, "support page starts in Arabic RTL");
assert.match(page, /id="support-en"/, "support page includes English content");
assert.match(page, /href="mailto:amr@gharib\.dev/i, "support page offers the confirmed support email");
assert.match(page, /href="\/privacy\.html"/, "support page links to the privacy policy");
assert.match(page, /rel="canonical"[^>]*https:\/\/www\.athark\.org\/support\.html/i, "support page has a canonical public URL");

const expectedSupportUrl = "https://www.athark.org/support.html";
for (const relativePath of [
  "ios/fastlane/release/metadata/ar-SA/support_url.txt",
  "ios/fastlane/metadata/ar-SA/support_url.txt",
  "ios/fastlane/metadata/en-US/support_url.txt",
]) {
  const url = (await readFile(path.join(repoRoot, relativePath), "utf8")).trim();
  assert.equal(url, expectedSupportUrl, "Every App Store locale points to the support page");
}

console.log("Support page content checks passed.");
