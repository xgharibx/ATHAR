/** Shared worker-side account gate for notification schedules and delivery. */
export class ReminderWorkerOwnerGate {
  private activeOwner: string | null = null;
  private transitioning = false;
  private transitionTargetSet = false;

  get isTransitioning(): boolean {
    return this.transitioning;
  }

  get currentOwner(): string | null {
    return this.activeOwner;
  }

  hydrate(owner: string | null): void {
    // Hydration may finish after a transition has started. Accept it until the
    // transition selects its target, but never let it replace that target.
    if (this.transitioning && this.transitionTargetSet) return;
    this.activeOwner = owner;
  }

  beginTransition(targetOwner?: string): void {
    this.transitioning = true;
    this.transitionTargetSet = targetOwner !== undefined;
    if (targetOwner !== undefined) this.activeOwner = targetOwner;
  }

  tryBeginTransition(): boolean {
    if (this.transitioning) return false;
    this.beginTransition();
    return true;
  }

  canBeginTransition(sourceOwner: unknown, targetOwner?: unknown): boolean {
    if (this.activeOwner === null) return typeof sourceOwner === "string" && sourceOwner.length > 0;
    if (typeof sourceOwner !== "string" || sourceOwner.length === 0) return false;
    // A second tab may still believe the outgoing owner is active after the
    // first tab completed the same transition. Let that idempotent cleanup
    // finish, while rejecting requests that target a different account.
    return sourceOwner === this.activeOwner || targetOwner === this.activeOwner;
  }

  setTargetOwner(targetOwner: string): void {
    if (!this.transitioning) return;
    this.activeOwner = targetOwner;
    this.transitionTargetSet = true;
  }

  completeTransition(): void {
    this.transitioning = false;
    this.transitionTargetSet = false;
  }

  canDeliver(owner: unknown): boolean {
    if (this.transitioning || typeof owner !== "string" || owner.length === 0) return false;
    return this.activeOwner === null || owner === this.activeOwner;
  }
}

/** Allow a queued or crash-recovery transition to retarget from its persisted source. */
export function canContinueOwnerTransition(
  sourceOwner: unknown,
  targetOwner: unknown,
  transitionSourceOwner: unknown,
  allowPreviousSource: boolean,
): boolean {
  return allowPreviousSource &&
    typeof sourceOwner === "string" &&
    sourceOwner.length > 0 &&
    sourceOwner === transitionSourceOwner &&
    typeof targetOwner === "string" &&
    targetOwner.length > 0 &&
    targetOwner !== sourceOwner;
}

/** Prevents a delayed tab from rolling a newer account transition back. */
export function isOwnerTransitionFresh(
  incomingAtMs: number,
  currentAtMs: number,
  incomingTargetOwner: unknown,
  currentTargetOwner: unknown,
): boolean {
  if (!Number.isFinite(incomingAtMs) || incomingAtMs <= 0) return false;
  if (incomingAtMs > currentAtMs) return true;
  return incomingAtMs === currentAtMs && incomingTargetOwner === currentTargetOwner;
}
