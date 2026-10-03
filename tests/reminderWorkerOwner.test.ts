import { describe, expect, it } from "vitest";
import {
  canContinueOwnerTransition,
  isOwnerTransitionFresh,
  ReminderWorkerOwnerGate,
} from "@/lib/reminderWorkerOwner";

describe("ReminderWorkerOwnerGate", () => {
  it("blocks stale and new-account schedules during cleanup, then permits only the target owner", () => {
    const gate = new ReminderWorkerOwnerGate();
    gate.hydrate("user:previous");

    expect(gate.canDeliver("user:previous")).toBe(true);
    gate.beginTransition("user:next");
    expect(gate.canDeliver("user:previous")).toBe(false);
    expect(gate.canDeliver("user:next")).toBe(false);

    gate.completeTransition();
    expect(gate.canDeliver("user:previous")).toBe(false);
    expect(gate.canDeliver("user:next")).toBe(true);
  });

  it("rejects missing owner metadata after an owner has been established", () => {
    const gate = new ReminderWorkerOwnerGate();
    gate.hydrate("local");

    expect(gate.canDeliver(undefined)).toBe(false);
    expect(gate.canDeliver("local")).toBe(true);
  });

  it("does not let late storage hydration overwrite an in-flight target owner", () => {
    const gate = new ReminderWorkerOwnerGate();
    gate.beginTransition("user:next");
    gate.hydrate("user:previous");
    gate.completeTransition();

    expect(gate.canDeliver("user:next")).toBe(true);
    expect(gate.canDeliver("user:previous")).toBe(false);
  });

  it("accepts a transition only from the currently active owner", () => {
    const gate = new ReminderWorkerOwnerGate();
    gate.hydrate("user:current");

    expect(gate.canBeginTransition("user:stale")).toBe(false);
    expect(gate.canBeginTransition("user:current")).toBe(true);
    expect(gate.canBeginTransition(undefined)).toBe(false);
    expect(gate.canBeginTransition("user:previous", "user:current")).toBe(true);
    expect(gate.canBeginTransition("user:previous", "user:other")).toBe(false);
  });

  it("blocks duplicate transition requests without changing the first transition", () => {
    const gate = new ReminderWorkerOwnerGate();
    gate.hydrate("user:current");

    expect(gate.tryBeginTransition()).toBe(true);
    expect(gate.tryBeginTransition()).toBe(false);
    gate.setTargetOwner("user:next");
    gate.completeTransition();

    expect(gate.canDeliver("user:next")).toBe(true);
    expect(gate.canDeliver("user:current")).toBe(false);
  });

  it("allows a queued newer account target to follow an interrupted owner transition", () => {
    expect(canContinueOwnerTransition("user:a", "user:c", "user:a", true)).toBe(true);
    expect(canContinueOwnerTransition("user:a", "user:a", "user:a", true)).toBe(false);
    expect(canContinueOwnerTransition("user:a", "user:c", "user:a", false)).toBe(false);
    expect(canContinueOwnerTransition("user:x", "user:c", "user:a", true)).toBe(false);
  });

  it("rejects an older target after a newer owner transition has settled", () => {
    expect(isOwnerTransitionFresh(100, 200, "user:b", "user:c")).toBe(false);
    expect(isOwnerTransitionFresh(200, 200, "user:c", "user:c")).toBe(true);
    expect(isOwnerTransitionFresh(201, 200, "user:d", "user:c")).toBe(true);
    expect(isOwnerTransitionFresh(Number.NaN, 200, "user:d", "user:c")).toBe(false);
  });
});
