/**
 * Shadow Friends Module
 *
 * On sign-up, a user is assigned 10 "shadow friends" — invisible
 * user accounts whose public keys serve as permanent key material.
 * Shadow friends:
 *   - Cannot be deleted
 *   - Are invisible in the UI
 *   - Their public key hashes are used in key derivation
 *
 * The assignment is deterministic: we hash the user's ID with a
 * counter to select 10 stable user IDs from the system.
 */

import { supabase } from "../supabase";
import { fetchUserPublicKey } from "./keys";

/**
 * Assign 10 shadow friends to a new user.
 * Called once during sign-up.
 * Picks 10 random existing profiles to be shadow friends.
 */
export async function assignShadowFriends(userId: string): Promise<void> {
  // Check if already assigned
  const { data: existing } = await supabase
    .from("shadow_friends")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) {
    return; // Already assigned
  }

  // Fetch all other user IDs from profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .neq("id", userId);

  const allUserIds: string[] = (profiles ?? []).map((p: any) => p.id);

  if (allUserIds.length === 0) {
    // No other users exist yet — can't assign shadows
    console.warn("No other users to assign as shadow friends");
    return;
  }

  // Deterministically pick 10 users based on userId hash
  const selectedIds = pickDeterministic(allUserIds, userId, 10);

  // Insert shadow friend entries
  const rows = selectedIds.map((shadowId) => ({
    user_id: userId,
    shadow_user_id: shadowId,
  }));

  const { error } = await supabase.from("shadow_friends").insert(rows as any);
  if (error) {
    console.error("Failed to assign shadow friends:", error.message);
  }
}

/**
 * Get the combined hash of all shadow friends' public keys.
 * Returns a SHA-256 digest that's used in key derivation.
 */
export async function getShadowFriendsHash(userId: string): Promise<ArrayBuffer> {
  const { data: shadows } = await supabase
    .from("shadow_friends")
    .select("shadow_user_id")
    .eq("user_id", userId);

  const shadowIds: string[] = (shadows ?? []).map((s: any) => s.shadow_user_id);

  if (shadowIds.length === 0) {
    // No shadows — return empty hash
    return new ArrayBuffer(0);
  }

  // Fetch each shadow's public key PEM from our local cache/DB
  const pems: string[] = [];
  for (const sid of shadowIds) {
    const key = await fetchUserPublicKey(sid);
    if (key) {
      const exported = await crypto.subtle.exportKey("spki", key);
      const hash = await crypto.subtle.digest("SHA-256", exported);
      // Convert hash to hex string for concatenation
      const hex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      pems.push(hex);
    }
  }

  // Sort for deterministic ordering
  pems.sort();

  // Combine all hashes and hash again
  const combined = new TextEncoder().encode(pems.join("|"));
  return crypto.subtle.digest("SHA-256", combined);
}

/**
 * Deterministically pick `count` items from an array using a seed hash.
 */
function pickDeterministic<T>(items: T[], seed: string, count: number): T[] {
  const sorted = [...items].sort(); // Deterministic ordering
  const result: T[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < Math.min(count, sorted.length); i++) {
    // Create a deterministic index based on seed + i
    const hashInput = `${seed}:shadow:${i}`;
    let hash = 0;
    for (let j = 0; j < hashInput.length; j++) {
      hash = (hash * 31 + hashInput.charCodeAt(j)) | 0;
    }
    const idx = Math.abs(hash) % sorted.length;

    // Find next unused index
    let pickIdx = idx;
    while (usedIndices.has(pickIdx)) {
      pickIdx = (pickIdx + 1) % sorted.length;
    }

    usedIndices.add(pickIdx);
    result.push(sorted[pickIdx]);
  }

  return result;
}
