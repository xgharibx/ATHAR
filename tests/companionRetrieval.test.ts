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
  finalContent: [] as Array<{ type: string; name?: string; input?: Record<string, unknown> }>,
  stream: vi.fn(),
  request: undefined as { system?: Array<{ text: string }> } | undefined,
}));

vi.mock("@/lib/authClient", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/companionKnowledge", () => ({
  detectMood: () => "",
  retrievePassages: mocks.retrievePassages,
  retrievePassagesAsync: mocks.retrievePassagesAsync,
  retrieveUserRemindersAsPassages: () => [],
  verifyAnswerAsync: vi.fn(async () => ({ flagged: false, notes: [] })),
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
          finalMessage: async () => ({ stop_reason: "end_turn", content: mocks.finalContent }),
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
    mocks.finalContent = [];
    mocks.request = undefined;
  });

  it("sends no library excerpts or route list: the server gathers the evidence", async () => {
    await streamCompanionReply([{ role: "user", content: "ما معنى آية الكرسي؟" }], { onText: vi.fn() });

    expect(mocks.retrievePassagesAsync).not.toHaveBeenCalled();
    const systemText = mocks.request?.system?.map((block) => block.text).join("\n") ?? "";
    expect(systemText).not.toContain("معرّف المصدر");
    expect(systemText).not.toContain("المسارات الصالحة");
    expect(systemText.startsWith("أنت «أثر»")).toBe(true);
    expect(systemText.length).toBeLessThan(1_500);
  });

  it.each([
    ["unknown IDs", "invented:1", "نص مرجعي يجب أن يصل"],
    ["invented excerpts", "tafsir:2:255", "نص مختلق لا يظهر في أي مصدر داخلي"],
  ])("does not render a citation for %s", async (_case, source, excerpt) => {
    mocks.finalContent = [{ type: "tool_use", name: "cite", input: { source, excerpt } }];
    const output: string[] = [];
    let verification: { flagged: boolean; notes: string[] } | undefined;

    await streamCompanionReply([{ role: "user", content: "ما معنى الآية؟" }], {
      onText: (chunk) => output.push(chunk),
      onDone: (_text, report) => { verification = report; },
    });

    expect(output.join(" ")).not.toContain(":::cite(");
    expect(verification).toMatchObject({ flagged: true, notes: [expect.stringContaining("المقتطف")] });
  });

  it("never renders a library citation, because no library excerpts are sent", async () => {
    mocks.finalContent = [{ type: "tool_use", name: "cite", input: { source: "tafsir:2:255", excerpt: "يجب أن يصل إلى أول إجابة" } }];
    const output: string[] = [];

    await streamCompanionReply([{ role: "user", content: "ما معنى الآية؟" }], { onText: (chunk) => output.push(chunk) });

    expect(output.join(" ")).not.toContain(":::cite(");
  });
});
