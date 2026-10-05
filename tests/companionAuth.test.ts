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

import { clearMemory, recordMemory, streamCompanionReply } from "@/lib/companionAI";
import { updateProfile } from "@/lib/companionProfile";
import { useNoorStore } from "@/store/noorStore";

describe("Companion guest and account access", () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.clientOptions = undefined;
    mocks.stream.mockReset();
    mocks.finalMessage = { stop_reason: "end_turn", content: [] };
    clearMemory();
    updateProfile({ includePersonalContext: false, greetingName: "", goals: ["consistency"], concerns: ["none"], onboarded: false });
    useNoorStore.setState({
      activity: {},
      sectionCompletions: {},
      quranDailyAyahs: {},
      quranLastRead: null,
      tasbeehDailyLog: {},
      khatmaStartISO: null,
      khatmaDays: null,
      khatmaDone: {},
    } as unknown as Partial<ReturnType<typeof useNoorStore.getState>>);
  });

  it("lets a guest use Companion through the public quota-limited proxy", async () => {
    mocks.getSession.mockResolvedValue(null);
    const onError = vi.fn();

    await streamCompanionReply([{ role: "user", content: "سؤال تجريبي" }], { onText: vi.fn(), onError });

    const options = mocks.clientOptions as { defaultHeaders?: Record<string, string> };
    expect(onError).not.toHaveBeenCalled();
    expect(options.defaultHeaders?.Authorization).toBe(`Bearer ${options.defaultHeaders?.apikey}`);
    expect(mocks.stream).toHaveBeenCalledOnce();
  });

  it("does not create a model client or send an oversized user message", async () => {
    const onError = vi.fn();

    await streamCompanionReply([{ role: "user", content: "x".repeat(8_001) }], { onText: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ detail: "message-too-long" }));
    expect(mocks.getSession).not.toHaveBeenCalled();
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

  it("omits saved profile, progress, mood, and memory unless personal context is enabled", async () => {
    mocks.getSession.mockResolvedValue({ access_token: "synthetic-user-token" });
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    useNoorStore.setState({
      activity: { [today]: 9 },
      sectionCompletions: { morning: [today] },
      quranLastRead: { surahId: 83 },
    } as unknown as Partial<ReturnType<typeof useNoorStore.getState>>);
    updateProfile({ greetingName: "اسم ملف سري", goals: ["quran"], concerns: ["loneliness"], onboarded: true });
    recordMemory("سؤال سابق خاص لا ينبغي إرساله افتراضيًا");

    await streamCompanionReply([{ role: "user", content: "أنا أشعر بقلق شديد، ما معنى الإخلاص؟" }], { onText: vi.fn() });

    const request = mocks.stream.mock.calls[0]?.[0] as { system?: Array<{ text: string }> };
    const systemText = request.system?.map((block) => block.text).join("\n") ?? "";
    expect(systemText).not.toContain("اسم ملف سري");
    expect(systemText).not.toContain("سؤال سابق خاص لا ينبغي إرساله افتراضيًا");
    expect(systemText).not.toContain("سورة رقم 83");
    expect(systemText).not.toContain("أذكار الصباح ✓");
    expect(systemText).not.toContain("حزين أو مهموم");
  });

  it("includes profile, progress, and memory only after the user opts in", async () => {
    mocks.getSession.mockResolvedValue({ access_token: "synthetic-user-token" });
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    useNoorStore.setState({
      activity: { [today]: 9 },
      sectionCompletions: { morning: [today] },
      quranLastRead: { surahId: 83 },
    } as unknown as Partial<ReturnType<typeof useNoorStore.getState>>);
    updateProfile({ includePersonalContext: true, greetingName: "اسم ملف مختار", goals: ["quran"], concerns: ["loneliness"], onboarded: true });
    recordMemory("سؤال سابق اخترت مشاركته");

    await streamCompanionReply([{ role: "user", content: "أشعر بالقلق، كيف أستعيد سؤالنا السابق؟" }], { onText: vi.fn() });

    const request = mocks.stream.mock.calls[0]?.[0] as { system?: Array<{ text: string }> };
    const systemText = request.system?.map((block) => block.text).join("\n") ?? "";
    expect(systemText).toContain("اسم ملف مختار");
    expect(systemText).toContain("سؤال سابق اخترت مشاركته");
    expect(systemText).toContain("سورة رقم 83");
    expect(systemText).toContain("أذكار الصباح ✓");
    expect(systemText).toContain("حزين أو مهموم");
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
