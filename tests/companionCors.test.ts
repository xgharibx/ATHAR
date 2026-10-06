import { describe, expect, it } from "vitest";
import { companionCorsHeaders } from "../supabase/functions/companion/cors";

describe("Companion Edge Function CORS", () => {
  it("allows the streaming helper header used by the current Anthropic SDK", () => {
    const headers = companionCorsHeaders(new Request("https://api.example/v1/messages", {
      method: "OPTIONS",
      headers: {
        origin: "https://athark.org",
        "access-control-request-headers": "authorization,content-type,x-stainless-helper-method",
      },
    }));

    expect(headers["Access-Control-Allow-Origin"]).toBe("https://athark.org");
    expect(headers["Access-Control-Allow-Headers"].toLowerCase().split(/,\s*/))
      .toContain("x-stainless-helper-method");
  });

  it("does not grant browser access to an unrecognized origin", () => {
    const headers = companionCorsHeaders(new Request("https://api.example/v1/messages", {
      method: "OPTIONS",
      headers: { origin: "https://untrusted.example" },
    }));

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
