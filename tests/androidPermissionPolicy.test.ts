import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const manifest = readFileSync(resolve(process.cwd(), "android/app/src/main/AndroidManifest.xml"), "utf8");
const permissionNames = [...new JSDOM(manifest, { contentType: "text/xml" }).window.document
  .getElementsByTagName("uses-permission")]
  .map((permission) => permission.getAttribute("android:name"));

describe("Android Play permission policy", () => {
  it("uses the user-granted exact-alarm permission instead of the restricted auto-granted one", () => {
    expect(permissionNames).toContain("android.permission.SCHEDULE_EXACT_ALARM");
    expect(permissionNames).not.toContain("android.permission.USE_EXACT_ALARM");
  });
});