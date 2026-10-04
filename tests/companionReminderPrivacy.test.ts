import { beforeEach, describe, expect, it, vi } from "vitest";

const { getState } = vi.hoisted(() => ({ getState: vi.fn() }));

vi.mock("@/store/noorStore", () => ({ useNoorStore: { getState } }));

import { retrieveUserRemindersAsPassages } from "@/lib/companionKnowledge";

describe("Companion saved-reminder context privacy", () => {
  beforeEach(() => {
    getState.mockReturnValue({
      customReminders: [{
        id: "private-reminder",
        title: "تذكير دواء خاص",
        description: "معلومة شخصية لا تُرسل عند سؤال عام",
        repeat: "daily",
        atTimeOfDay: "09:00",
      }],
    });
  });

  it.each([
    "ما معنى كلمة تذكير؟",
    "أنشئ تذكيرًا للورد",
    "What does reminder mean?",
    "schedule an adhkar reminder",
  ])("does not attach private reminders to a generic or creation request: %s", (query) => {
    expect(retrieveUserRemindersAsPassages(query)).toEqual([]);
  });

  it("includes saved reminders when the user explicitly asks for their list", () => {
    expect(retrieveUserRemindersAsPassages("ما تذكيراتي المحفوظة؟")).toEqual([
      expect.objectContaining({
        source: "customReminder:private-reminder",
        text: expect.stringContaining("معلومة شخصية لا تُرسل عند سؤال عام"),
      }),
    ]);
  });
});
