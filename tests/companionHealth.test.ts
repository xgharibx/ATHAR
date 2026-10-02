import { afterEach, describe, expect, it, vi } from "vitest";
import { checkCompanionHealth } from "@/lib/companionHealth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkCompanionHealth", () => {
  it("reports the proxy ready for a successful preflight", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(checkCompanionHealth(true)).resolves.toMatchObject({ status: "ready" });
  });

  it("reports quota and authorization failures as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 402 })));

    await expect(checkCompanionHealth(true)).resolves.toMatchObject({
      status: "unreachable",
      reason: "HTTP 402 from proxy",
    });
  });

  it("reports method failures as unavailable to browser clients", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 405 })));

    await expect(checkCompanionHealth(true)).resolves.toMatchObject({
      status: "unreachable",
      reason: "HTTP 405 from proxy",
    });
  });
});
