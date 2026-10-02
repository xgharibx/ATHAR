/** Bind a public leaderboard id to its existing private fingerprint atomically. */
type OwnershipDatabase = {
  rpc: (name: string, args: Record<string, string>) => PromiseLike<{ data: unknown; error: unknown }>;
};

type OwnershipResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function authorizeLeaderboardIdentity(
  db: OwnershipDatabase,
  identity: { id?: unknown; fingerprint?: unknown } | null | undefined,
): Promise<OwnershipResult> {
  if (
    typeof identity?.id !== "string" || !identity.id || identity.id.length > 120 ||
    typeof identity.fingerprint !== "string" || !/^[a-f0-9]{64}$/i.test(identity.fingerprint)
  ) {
    return { ok: false, status: 400, error: "bad-identity" };
  }

  // The SQL function claims a new id once, or verifies its existing claim
  // under a row lock. An isolate-local read/check/write would race enrollment.
  const result = await db.rpc("leaderboard_claim_identity", {
    p_user_id: identity.id,
    p_fingerprint_hash: identity.fingerprint.toLowerCase(),
  });
  if (result.error || typeof result.data !== "boolean") {
    return { ok: false, status: 503, error: "identity-verification-unavailable" };
  }
  if (!result.data) return { ok: false, status: 403, error: "identity-mismatch" };
  return { ok: true };
}
