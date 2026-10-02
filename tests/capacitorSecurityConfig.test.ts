import config from "../capacitor.config";
import { describe, expect, it } from "vitest";

describe("Android WebView transport security", () => {
  it("does not enable mixed HTTP/HTTPS content", () => {
    expect(config.android?.allowMixedContent).not.toBe(true);
  });
});