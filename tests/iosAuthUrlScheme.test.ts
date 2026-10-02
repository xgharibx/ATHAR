import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { NATIVE_AUTH_REDIRECT } from "@/lib/authClient";

describe("iOS native authentication URL registration", () => {
  it("registers the app's sign-in callback scheme with iOS", () => {
    const plist = readFileSync(resolve(process.cwd(), "ios/App/App/Info.plist"), "utf8");
    const { document } = new JSDOM(plist, { contentType: "text/xml" }).window;
    const urlTypesKey = Array.from(document.querySelectorAll("key"))
      .find((key) => key.textContent === "CFBundleURLTypes");
    const urlTypes = urlTypesKey?.nextElementSibling;
    const registeredSchemes = Array.from(urlTypes?.querySelectorAll("dict") ?? [])
      .flatMap((entry) => {
        const schemesKey = Array.from(entry.querySelectorAll("key"))
          .find((key) => key.textContent === "CFBundleURLSchemes");
        return Array.from(schemesKey?.nextElementSibling?.querySelectorAll("string") ?? [])
          .map((scheme) => scheme.textContent);
      });

    expect(new URL(NATIVE_AUTH_REDIRECT).protocol).toBe("app.athar:");
    expect(registeredSchemes).toContain("app.athar");
  });

  it("discloses the prayer and mosque services that can receive location coordinates", () => {
    const plist = readFileSync(resolve(process.cwd(), "ios/App/App/Info.plist"), "utf8");
    const { document } = new JSDOM(plist, { contentType: "text/xml" }).window;
    const locationKey = Array.from(document.querySelectorAll("key"))
      .find((key) => key.textContent === "NSLocationWhenInUseUsageDescription");
    const description = locationKey?.nextElementSibling?.textContent ?? "";

    expect(description).toContain("Aladhan");
    expect(description).toContain("Overpass");
    expect(description).not.toMatch(/never leaves your device/i);
  });
});
