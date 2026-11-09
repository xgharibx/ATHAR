// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSubmitPayload,
  adoptLeaderboardIdentity,
  exportLeaderboardIdentity,
  getLeaderboardIdentity,
  validateLeaderboardAlias,
  type LeaderboardScoreBundle,
} from "@/lib/leaderboard";
import { validateSubmitPayload } from "@/lib/leaderboardPolicy";

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("validateLeaderboardAlias", () => {
  it("rejects empty input", () => {
    expect(validateLeaderboardAlias("").ok).toBe(false);
    expect(validateLeaderboardAlias("   ").ok).toBe(false);
    expect(validateLeaderboardAlias(undefined).ok).toBe(false);
    expect(validateLeaderboardAlias(null).ok).toBe(false);
  });

  it("rejects names under 3 characters", () => {
    const r = validateLeaderboardAlias("ab");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too-short");
  });

  it("accepts a normal Arabic or Latin name", () => {
    expect(validateLeaderboardAlias("محمد الخير").ok).toBe(true);
    expect(validateLeaderboardAlias("Ahmad_99").ok).toBe(true);
  });

  it("rejects names containing links", () => {
    expect(validateLeaderboardAlias("زوروا https://evil.example").ok).toBe(false);
    expect(validateLeaderboardAlias("visit www.example.com").ok).toBe(false);
  });

  it("rejects disallowed characters (emoji, symbols)", () => {
    const r = validateLeaderboardAlias("محمد🔥🔥");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("bad-chars");
  });

  it("rejects spammy repeated-character names", () => {
    const r = validateLeaderboardAlias("aaaaaaaaaa");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("spam");
  });

  it("rejects reserved / impersonation-prone names, case-insensitively", () => {
    for (const bad of ["admin", "Admin", "ADMINISTRATOR", "support", "moderator", "owner", "system", "athar", "أثر", "مشرف", "الدعم"]) {
      const r = validateLeaderboardAlias(bad);
      expect(r.ok, `"${bad}" should be rejected as reserved`).toBe(false);
      expect(r.reason).toBe("reserved");
    }
  });

  it("strips invisible characters and collapses whitespace before validating", () => {
    const withInvisible = "محمد​​ الخير";
    const r = validateLeaderboardAlias(withInvisible);
    expect(r.ok).toBe(true);
    expect(r.value).toBe("محمد الخير");
  });

  it("truncates to the max alias length instead of rejecting", () => {
    const long = "a".repeat(4) + " " + "b".repeat(100);
    const r = validateLeaderboardAlias(long);
    expect(r.value.length).toBeLessThanOrEqual(40);
  });
});

describe("getLeaderboardIdentity", () => {
  it("creates unique identities with Web Crypto when randomUUID is unavailable", () => {
    let nextByte = 1;
    vi.stubGlobal("crypto", {
      getRandomValues<T extends ArrayBufferView>(array: T): T {
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = nextByte++ % 256;
        }
        return array;
      },
    });

    const first = getLeaderboardIdentity();
    localStorage.clear();
    const second = getLeaderboardIdentity();

    expect(first.id).not.toBe("anon_fallback");
    expect(first.secret).not.toBe("fallback_secret");
    expect(second.id).not.toBe("anon_fallback");
    expect(second.secret).not.toBe("fallback_secret");
    expect(second.id).not.toBe(first.id);
    expect(second.secret).not.toBe(first.secret);
  });

  it("refuses to build a server submission with the shared emergency identity", async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", { subtle: originalCrypto.subtle });
    const scores: LeaderboardScoreBundle = {
      global: 0,
      dhikr: 0,
      quran: 0,
      prayers: 0,
      tasbeehDaily: 0,
      sections: {},
    };

    await expect(buildSubmitPayload("2026-11-09", scores)).rejects.toThrow("secure-randomness-unavailable");
    expect(exportLeaderboardIdentity()).toBeNull();
  });

  it("rejects the old shared emergency identity from cloud sync and queued submissions", () => {
    expect(adoptLeaderboardIdentity({ id: "anon_fallback", secret: "fallback_secret" })).toBe(false);
    expect(validateSubmitPayload({
      v: 1,
      generatedAt: new Date().toISOString(),
      day: new Date().toISOString().slice(0, 10),
      identity: { id: "anon_fallback", alias: "مستخدم ١", fingerprint: "a".repeat(64) },
      scores: { global: 0, dhikr: 0, quran: 0, prayers: 0, tasbeehDaily: 0, sections: {} },
      checksum: "a".repeat(64),
    })).toEqual({ ok: false, reason: "bad-identity" });
  });

  it("rotates a previously persisted shared emergency identity to secure credentials", async () => {
    const originalCrypto = globalThis.crypto;
    let nextByte = 1;
    vi.stubGlobal("crypto", {
      subtle: originalCrypto.subtle,
      getRandomValues<T extends ArrayBufferView>(array: T): T {
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let index = 0; index < bytes.length; index += 1) bytes[index] = nextByte++ % 256;
        return array;
      },
    });
    localStorage.setItem("noor_lb_schema_version", "2");
    localStorage.setItem("noor_lb_id_v2", "anon_fallback");
    localStorage.setItem("noor_lb_secret_v2", "fallback_secret");
    localStorage.setItem("noor_lb_queue_v2", JSON.stringify([{ legacy: true }]));

    const identity = getLeaderboardIdentity();
    const scores: LeaderboardScoreBundle = {
      global: 0,
      dhikr: 0,
      quran: 0,
      prayers: 0,
      tasbeehDaily: 0,
      sections: {},
    };
    const payload = await buildSubmitPayload("2026-11-09", scores);

    expect(identity.id).toMatch(/^anon_/);
    expect(identity.id).not.toBe("anon_fallback");
    expect(identity.secret).toMatch(/^sec_/);
    expect(identity.secret).not.toBe("fallback_secret");
    expect(payload.identity.id).toBe(identity.id);
    expect(localStorage.getItem("noor_lb_queue_v2")).toBeNull();
  });
});
