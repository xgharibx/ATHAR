import { describe, expect, it } from "vitest";
import { vendorChunk } from "../tools/build/vendorChunks";

describe("startup vendor isolation", () => {
  it.each([
    ["react", "vendor-react"], ["react-dom", "vendor-react"],
    ["@react-three/fiber", "vendor-three"], ["three", "vendor-three"],
    ["lottie-react", "vendor-lottie"], ["lottie-web", "vendor-lottie"],
    ["lucide-react", "vendor-ui"], ["@radix-ui/react-dialog", "vendor-ui"],
    ["@tanstack/react-query", "vendor-query"], ["react-router-dom", "vendor-router"],
    ["react-router", "vendor-router"], ["framer-motion", "vendor-react"],
  ])("isolates %s without matching React substrings", (name, expected) => {
    expect(vendorChunk(`/repo/node_modules/${name}/dist/index.js`)).toBe(expected);
    expect(vendorChunk(`C:\\repo\\node_modules\\${name.replaceAll("/", "\\")}\\dist\\index.js`)).toBe(expected);
  });
  it("does not classify source code or unrelated React integrations as the runtime", () => {
    expect(vendorChunk("/repo/src/reactive.ts")).toBeUndefined();
    expect(vendorChunk("/repo/node_modules/react-markdown/index.js")).toBeUndefined();
  });
  it("keeps shared preload helpers out of the deferred 3D engine", () => {
    expect(vendorChunk("\0vite/preload-helper.js")).toBe("vendor-react");
    expect(vendorChunk("\0commonjsHelpers.js")).toBe("vendor-react");
  });
});
