/**
 * Shadow Friends (§6.1)
 *
 * At sign-up, 10 already-registered users are picked deterministically for
 * each user and stored in `shadow_friends`. The SHA-256 hashes of those 10
 * users' public keys become a permanent ingredient of every conversation key
 * that user participates in.
 *
 * The assignment is:
 *   - deterministic  seed = SHA-256("{userId}:shadow:{i}") over the sorted user list
 *   - invisible       never surfaced in the UI
 *   - undeletable    no DELETE policy exists on the table, and re-assignment
 *                     never happens once any row exists
 */

import { supabase } from "../supabase";
import { fetchUserPublicKeyHash } from "./keys";
import { sha256, toHex, fromHex } from "./derive";

export const SHADOW_FRIEND_COUNT = 10;

/**
 * Stand-in for a peer whose public key we could not resolve (e.g. they have
 * never initialised crypto). Keeps the hash set a fixed size of 10 so the
 * derived key is identical on both sides regardless of who has keys yet.
 */
export const MISSING_KEY_PLACEHOLDER = "0".repeat(64);

// ─── Assignment ─────────────────────────────────────────────────

/**
 * Deterministic selection: for i in 0..count-1 the seed
 * SHA-256("{userId}:shadow:{i}") indexes into the sorted user list, probing
 * forward past anything already taken.
 */
export async function pickShadowFriendIds(
  userId: string,
  allIds: string[],
  count: number = SHADOW_FRIEND_COUNT
): Promise<string[]> {
  const candidates = allIds.filter((id) => id && id !== userId).sort();
  if (candidates.length === 0) return [];

  const picked: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count && candidates.length > 0; i++) {
    const digest = toHex(await sha256(`${userId}:shadow:${i}`));
    let idx = parseInt(digest.slice(0, 12), 16) % candidates.length;

    let guard = 0;
    while (seen.has(candidates[idx]) && guard < candidates.length) {
      idx = (idx + 1) % candidates.length;
      guard++;
    }
    if (seen.has(candidates[idx])) break;

    seen.add(candidates[idx]);
    picked.push(candidates[idx]);
  }

  return picked;
}

/**
 * Assign this user's 10 shadow friends. Idempotent: once any row exists the
 * assignment is frozen for the lifetime of the account.
 */
export async function assignShadowFriends(userId: string): Promise<void> {
  const { data: existing, error: readError } = await (supabase as any)
    .from("shadow_friends")
    .select("shadow_user_id")
    .eq("user_id", userId);

  if (readError) {
    console.error("assignShadowFriends: read failed:", readError.message);
    return;
  }
  if (existing && existing.length > 0) return; // permanent — never re-assign

  const { data: profiles } = await supabase.from("profiles").select("id").order("id");
  const allIds: string[] = (profiles ?? []).map((p: any) => p.id as string);

  const picked = await pickShadowFriendIds(userId, allIds);
  if (picked.length === 0) return;

  const { error } = await (supabase as any)
    .from("shadow_friends")
    .upsert(
      picked.map((shadowUserId) => ({ user_id: userId, shadow_user_id: shadowUserId })),
      { onConflict: "user_id,shadow_user_id" }
    );

  if (error) {
    console.error("assignShadowFriends: insert failed:", error.message);
  }
}

// ─── Reads ──────────────────────────────────────────────────────

/**
 * The user's shadow-friend ids, sorted for determinism.
 */
export async function getShadowFriendIds(userId: string): Promise<string[]> {
  const { data } = await (supabase as any)
    .from("shadow_friends")
    .select("shadow_user_id")
    .eq("user_id", userId)
    .order("shadow_user_id", { ascending: true });

  return (data ?? []).map((row: any) => row.shadow_user_id as string);
}

/**
 * §6.2 ingredient 2 — SHA-256 over the sorted, re-hashed public-key hashes of
 * this user's shadow friends. Always 32 bytes.
 */
export async function getShadowFriendsHash(userId: string): Promise<Uint8Array> {
  const ids = await getShadowFriendIds(userId);

  const hashes: string[] = [];
  for (const id of ids) {
    const publicKeyHash = await fetchUserPublicKeyHash(id);
    hashes.push(publicKeyHash ?? MISSING_KEY_PLACEHOLDER);
  }

  hashes.sort();
  return sha256(hashes.join("|"));
}

/** Same as getShadowFriendsHash but hex-encoded, for composing group inputs. */
export async function getShadowFriendsHashHex(userId: string): Promise<string> {
  return toHex(await getShadowFriendsHash(userId));
}

/** Convenience re-export so callers can turn hex back into bytes. */
export { fromHex };