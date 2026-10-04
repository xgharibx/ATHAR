import { describe, expect, it } from "vitest";
import { buildOutboundMessages } from "@/lib/companionAI";

describe("Companion outbound conversation limits", () => {
  it("sends only the recent complete conversation suffix", () => {
    const history = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      content: `turn-${index}`,
    }));
    history.push({ role: "user", content: "latest question" });

    const result = buildOutboundMessages(history);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.messages.length).toBeLessThanOrEqual(16);
    expect(result.messages[0]?.role).toBe("user");
    expect(result.messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(48_000);
    expect(result.messages[0]?.content).not.toContain("turn-0");
    expect(result.messages.at(-1)?.content).toBe("latest question");
  });

  it("rejects an oversized current user message without returning it for upload", () => {
    const result = buildOutboundMessages([
      { role: "assistant", content: "old answer" },
      { role: "user", content: "x".repeat(8_001) },
    ]);

    expect(result).toEqual({ ok: false, reason: "user-message-too-long" });
  });

  it("keeps the newest message while trimming old history to the aggregate character cap", () => {
    const history = [
      { role: "user" as const, content: "old question".repeat(4_000) },
      { role: "assistant" as const, content: "old answer".repeat(4_000) },
      { role: "user" as const, content: "latest question" },
    ];

    const result = buildOutboundMessages(history);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.messages[0]?.role).toBe("user");
    expect(result.messages.at(-1)?.content).toBe("latest question");
    expect(result.messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(48_000);
  });
});
