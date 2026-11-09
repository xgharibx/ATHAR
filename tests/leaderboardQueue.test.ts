// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { enqueuePayload } from "@/lib/leaderboard";

afterEach(() => {
  localStorage.clear();
});

function makePayload(options: {
  id?: string;
  day?: string;
  global: number;
  generatedAt: string;
}) {
  return {
    v: 1 as const,
    generatedAt: options.generatedAt,
    day: options.day ?? new Date().toISOString().slice(0, 10),
    identity: {
      id: options.id ?? "anon_test_user",
      alias: "مستخدم اختبار",
      fingerprint: "a".repeat(64),
    },
    scores: {
      global: options.global,
      dhikr: options.global,
      quran: 0,
      prayers: 0,
      tasbeehDaily: 0,
      sections: {},
    },
    checksum: "b".repeat(64),
  };
}

function readQueue() {
  return JSON.parse(localStorage.getItem("noor_lb_queue_v2") ?? "[]");
}

describe("leaderboard offline queue", () => {
  it("keeps the newest complete snapshot for an identity and day", () => {
    const now = Date.now();
    const first = makePayload({ global: 10, generatedAt: new Date(now).toISOString() });
    const latest = makePayload({ global: 18, generatedAt: new Date(now + 1_000).toISOString() });

    enqueuePayload(first);
    enqueuePayload(latest);

    expect(readQueue()).toEqual([latest]);
  });

  it("preserves snapshots belonging to other identities or days", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    const now = Date.now();
    const otherDay = makePayload({ day: yesterday, global: 5, generatedAt: new Date(now).toISOString() });
    const otherIdentity = makePayload({ id: "anon_other_user", day: today, global: 6, generatedAt: new Date(now).toISOString() });
    const oldToday = makePayload({ day: today, global: 10, generatedAt: new Date(now).toISOString() });
    const latestToday = makePayload({ day: today, global: 12, generatedAt: new Date(now + 1_000).toISOString() });

    enqueuePayload(otherDay);
    enqueuePayload(otherIdentity);
    enqueuePayload(oldToday);
    enqueuePayload(latestToday);

    expect(readQueue()).toEqual([otherDay, otherIdentity, latestToday]);
  });
});
