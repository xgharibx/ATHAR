import { describe, expect, it } from "vitest";
import { createMaxResponseSizePlugin } from "@/lib/offlineCacheBudget";

describe("service-worker response cache budget", () => {
  it("rejects an oversized response from caching without consuming the caller's response", async () => {
    const response = new Response("12345", { headers: { "content-type": "application/json" } });
    const plugin = createMaxResponseSizePlugin(4);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBeNull();
    await expect(response.text()).resolves.toBe("12345");
  });

  it("admits a response within the byte budget", async () => {
    const response = new Response("1234", { headers: { "content-type": "application/json" } });
    const plugin = createMaxResponseSizePlugin(4);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBe(response);
  });

  it("uses Content-Length to reject a known oversized response before reading its body", async () => {
    const response = new Response("small", { headers: { "content-length": "500" } });
    const plugin = createMaxResponseSizePlugin(4);

    await expect(plugin.cacheWillUpdate({ response })).resolves.toBeNull();
    await expect(response.text()).resolves.toBe("small");
  });
});
