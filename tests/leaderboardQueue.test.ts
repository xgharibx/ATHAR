// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueuePayload, flushQueue, getRateLimitBackoffRemainingMs, isRateLimited } from "@/lib/leaderboard";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
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

  it("stops after a retryable server failure and keeps every unsent snapshot queued", async () => {
    enqueuePayload(makePayload({ id: "anon_first_user", global: 8, generatedAt: new Date().toISOString() }));
    enqueuePayload(makePayload({ id: "anon_second_user", global: 13, generatedAt: new Date().toISOString() }));
    const fetchMock = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const failed = await flushQueue("https://leaderboard.example/submit");

    expect(failed).toMatchObject({ ok: false, reason: "network_retry" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(readQueue()).toHaveLength(2);

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const recovered = await flushQueue("https://leaderboard.example/submit");

    expect(recovered).toMatchObject({ ok: true, sent: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(readQueue()).toEqual([]);
  });

  it("honors an HTTP-date Retry-After and exposes the remaining cooldown", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T10:00:00.000Z"));
    enqueuePayload(makePayload({ global: 8, generatedAt: new Date().toISOString() }));
    const fetchMock = vi.fn().mockResolvedValue(new Response("slow down", {
      status: 429,
      headers: { "Retry-After": new Date(Date.now() + 6000).toUTCString() },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await flushQueue("https://leaderboard.example/submit");

    expect(result).toMatchObject({ ok: false, reason: "rate_limited", retryAfterMs: 6000 });
    expect(getRateLimitBackoffRemainingMs()).toBe(6000);
    expect(isRateLimited()).toBe(true);
    vi.advanceTimersByTime(6000);
    expect(getRateLimitBackoffRemainingMs()).toBe(0);
    expect(isRateLimited()).toBe(false);
  });
});
