// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  clientOptions: undefined as Record<string, unknown> | undefined,
  stream: vi.fn(),
  finalMessage: { stop_reason: "end_turn", content: [] as Array<Record<string, unknown>> },
}));

vi.mock("@/lib/authClient", () => ({ getSession: mocks.getSession }));
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status?: number;
    constructor(message: string, status?: number) { super(message); this.status = status; }
  }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class APIConnectionError extends Error {}
  class AnthropicMock {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    static APIConnectionError = APIConnectionError;
    messages = {
      stream: (...args: unknown[]) => {
        mocks.stream(...args);
        return {
          controller: { abort: vi.fn() },
          async *[Symbol.asyncIterator]() {},
          finalMessage: async () => mocks.finalMessage,
        };
      },
    };
    constructor(options: Record<string, unknown>) { mocks.clientOptions = options; }
  }
  return { default: AnthropicMock };
});

import { clearMemory, streamCompanionReply } from "@/lib/companionAI";

describe("Companion signed-in access", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.clientOptions = undefined;
    mocks.stream.mockReset();
    mocks.finalMessage = { stop_reason: "end_turn", content: [] };
    clearMemory();
  });

  it("does not create a model client or process context for a guest", async () => {
    mocks.getSession.mockResolvedValue(null);
    const onError = vi.fn();

    await streamCompanionReply([{ role: "user", content: "سؤال تجريبي" }], { onText: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: "auth", message: expect.stringContaining("تسجيل الدخول") }));
    expect(mocks.clientOptions).toBeUndefined();
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it("sends the user's access token as bearer auth and the public key as apikey", async () => {
    mocks.getSession.mockResolvedValue({ access_token: "synthetic-user-token" });

    await streamCompanionReply([{ role: "user", content: "سؤال تجريبي" }], { onText: vi.fn() });

    const options = mocks.clientOptions as { defaultHeaders?: Record<string, string> };
    expect(options.defaultHeaders?.Authorization).toBe("Bearer synthetic-user-token");
    expect(options.defaultHeaders?.apikey).toBeTruthy();
    expect(options.defaultHeaders?.Authorization).not.toBe(`Bearer ${options.defaultHeaders?.apikey}`);
    expect(mocks.stream).toHaveBeenCalledOnce();
    clearMemory();
  });

  it("waits for reminder dispatch to finish before completing the assistant turn", async () => {
    mocks.getSession.mockResolvedValue({ access_token: "synthetic-user-token" });
    mocks.finalMessage = {
      stop_reason: "end_turn",
      content: [{
        type: "tool_use",
        name: "create_reminder",
        input: { category: "dhikr", title: "أذكار الصباح", repeat: "daily" },
      }],
    };
    const order: string[] = [];

    await streamCompanionReply([{ role: "user", content: "ذكّرني بأذكار الصباح" }], {
      onText: vi.fn(),
      onToolCalls: async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        order.push("reminder-dispatched");
      },
      onDone: () => order.push("assistant-completed"),
    });

    expect(order).toEqual(["reminder-dispatched", "assistant-completed"]);
    clearMemory();
  });
});
