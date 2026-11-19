// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  events: [] as Array<Record<string, unknown>>,
  finalMessage: { stop_reason: "end_turn", content: [] as Array<Record<string, unknown>> },
}));

vi.mock("@/lib/authClient", () => ({ getSession: async () => null }));
vi.mock("@anthropic-ai/sdk/client", () => ({ BaseAnthropic: class { constructor() {} } }));
vi.mock("@anthropic-ai/sdk/resources/messages/messages", () => ({
  Messages: class {
    stream() {
      return {
        controller: { abort: vi.fn() },
        async *[Symbol.asyncIterator]() { for (const event of mocks.events) yield event; },
        finalMessage: async () => mocks.finalMessage,
      };
    }
  },
}));

import { SERVICE_DOWN_MESSAGE, describeError, streamCompanionReply } from "@/lib/companionAI";
import { followUpsFor } from "@/lib/companionFollowUps";

const text = (value: string) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: value } });

describe("waiting for a reply", () => {
  beforeEach(() => { mocks.events = []; });

  it("passes on each step the server reports, and its suggested questions", async () => {
    mocks.events = [
      { type: "athar_status", stage: "gathering" },
      { type: "athar_status", stage: "searching" },
      { type: "athar_status", stage: "made-up" },
      { type: "athar_followups", items: ["ما فضل صيام الخميس؟", 42, ""] },
      { type: "athar_status", stage: "writing" },
      { type: "message_start", message: { content: [] } },
      { type: "athar_status", stage: "verifying" },
      text("الجواب."),
    ];
    const stages: string[] = [];
    const followUps: string[][] = [];
    const onDone = vi.fn();
    await streamCompanionReply([{ role: "user", content: "ما حكم صيام يوم الجمعة منفردا؟" }], {
      onText: vi.fn(),
      onStage: (stage) => stages.push(stage),
      onFollowUps: (items) => followUps.push(items),
      onDone,
    });
    expect(stages).toEqual(["gathering", "searching", "writing", "verifying"]);
    expect(followUps).toEqual([["ما فضل صيام الخميس؟"]]);
    expect(onDone).toHaveBeenCalledWith("الجواب.", expect.anything());
  });
});

describe("when the service itself is down", () => {
  it("says so plainly, instead of asking the reader to sign in or retry at once", () => {
    const error = Object.assign(new Error("model service unavailable"), {
      status: 503,
      error: { type: "error", error: { type: "service_unavailable", message: "model service unavailable" } },
    });
    expect(describeError(error)).toMatchObject({ kind: "unavailable", message: SERVICE_DOWN_MESSAGE });
  });

  it("reads the same error when it arrives inside the stream", () => {
    const error = Object.assign(new Error("stream error"), { error: { type: "error", error: { type: "service_unavailable" } } });
    expect(describeError(error).kind).toBe("unavailable");
  });
});

describe("suggested next questions", () => {
  it("uses the server's suggestions when there are any", () => {
    expect(followUpsFor(["سؤال أول؟", "سؤال ثان؟"], "أي سؤال")).toEqual(["سؤال أول؟", "سؤال ثان؟"]);
  });
  it("otherwise matches the question's own words, not the answer's", () => {
    // «أبو هريرة» in an answer once offered a question about parents.
    expect(followUpsFor([], "ما حكم صيام يوم الجمعة منفردا؟")).toEqual([]);
    expect(followUpsFor([], "أشعر بقلق وضيق هذه الأيام")).toEqual(["اقترح دعاءً يصرف الهم"]);
  });
});
