import { describe, expect, it } from "vitest";
import { getHomeAdhkarAction } from "@/lib/homeTimeActions";

describe("time-aware Home adhkar action", () => {
  it.each([
    [3, "sleep", "ابدأ بأذكار النوم"],
    [4, "morning", "ابدأ بأذكار الصباح"],
    [14, "morning", "ابدأ بأذكار الصباح"],
    [15, "evening", "ابدأ بأذكار المساء"],
    [20, "evening", "ابدأ بأذكار المساء"],
    [21, "sleep", "ابدأ بأذكار النوم"],
  ])("selects the right action at hour %i", (hour, id, label) => {
    expect(getHomeAdhkarAction(hour)).toEqual({ id, label });
  });
});
