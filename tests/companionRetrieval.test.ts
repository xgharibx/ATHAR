// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  retrievePassages: vi.fn(() => []),
  retrievePassagesAsync: vi.fn(async () => [{
    source: "tafsir:2:255",
    sourceLabel: "مصدر محلي موثوق",
    text: "نص مرجعي يجب أن يصل إلى أول إجابة للمستخدم.",
  }]),
  stream: vi.fn(),
  request: undefined as { system?: Array<{ text: string }> } | undefined,
}));

vi.mock("@/lib/authClient", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/companionKnowledge", () => ({
  detectMood: () => "",
  retrievePassages: mocks.retrievePassages,
  retrievePassagesAsync: mocks.retrievePassagesAsync,
  retrieveUserRemindersAsPassages: () => [],
  verifyAnswer: () => ({ flagged: false, notes: [] }),
  warmQuranVerses: vi.fn(),
}));
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error { status?: number; }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class APIConnectionError extends Error {}
  class AnthropicMock {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    static APIConnectionError = APIConnectionError;
    messages = {
      stream: (request: typeof mocks.request) => {
        mocks.request = request;
        mocks.stream(request);
        return {
          controller: { abort: vi.fn() },
          async *[Symbol.asyncIterator]() {},
          finalMessage: async () => ({ stop_reason: "end_turn", content: [] }),
        };
      },
    };
    constructor(_options: Record<string, unknown>) {}
  }
  return { default: AnthropicMock };
});

import { streamCompanionReply } from "@/lib/companionAI";

describe("Companion first-turn retrieval", () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ access_token: "synthetic-user-token" });
    mocks.retrievePassages.mockReset().mockReturnValue([]);
    mocks.retrievePassagesAsync.mockReset().mockResolvedValue([{
      source: "tafsir:2:255",
      sourceLabel: "مصدر محلي موثوق",
      text: "نص مرجعي يجب أن يصل إلى أول إجابة للمستخدم.",
    }]);
    mocks.stream.mockReset();
    mocks.request = undefined;
  });

  it("waits for a cold local index and includes its passage in the first request", async () => {
    await streamCompanionReply([{ role: "user", content: "ما معنى آية الكرسي؟" }], { onText: vi.fn() });

    expect(mocks.retrievePassagesAsync).toHaveBeenCalledWith("ما معنى آية الكرسي؟", 5);
    const systemText = mocks.request?.system?.map((block) => block.text).join("\n") ?? "";
    expect(systemText).toContain("نص مرجعي يجب أن يصل إلى أول إجابة للمستخدم");
  });
});
