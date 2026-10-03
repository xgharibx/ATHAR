import { describe, expect, it } from "vitest";
import { checkNativeVersionParity } from "../tools/scripts/check-native-version-parity.mjs";

const packageSource = JSON.stringify({ version: "1.2.62", released: { android: "1.2.62" } });
const androidSource = `defaultConfig { versionCode 74; versionName "1.2.62" }`;
const iosSource = `MARKETING_VERSION = 1.2.62; CURRENT_PROJECT_VERSION = 74;\nMARKETING_VERSION = 1.2.62; CURRENT_PROJECT_VERSION = 74;`;

describe("native release version parity", () => {
  it("accepts matching web, Android, and iOS version metadata", () => {
    expect(checkNativeVersionParity(packageSource, androidSource, iosSource)).toEqual([]);
  });

  it("reports mismatched marketing versions and platform build numbers", () => {
    const issues = checkNativeVersionParity(
      packageSource,
      `defaultConfig { versionCode 75; versionName "1.2.63" }`,
      `MARKETING_VERSION = 1.2.62; CURRENT_PROJECT_VERSION = 74;`,
    );

    expect(issues).toEqual([
      "package 1.2.62 does not match Android 1.2.63",
      "Android build 75 does not match iOS build 74",
    ]);
  });

  it("rejects different values between iOS build configurations", () => {
    const issues = checkNativeVersionParity(
      packageSource,
      androidSource,
      `MARKETING_VERSION = 1.2.62; CURRENT_PROJECT_VERSION = 74;\nMARKETING_VERSION = 1.2.63; CURRENT_PROJECT_VERSION = 75;`,
    );

    expect(issues).toContain("iOS MARKETING_VERSION is inconsistent: 1.2.62, 1.2.63");
    expect(issues).toContain("iOS CURRENT_PROJECT_VERSION is inconsistent: 74, 75");
  });
});
