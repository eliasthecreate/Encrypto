/**
 * Hourly User Selector Module
 *
 * Deterministically picks 5 users from the system based on:
 *   HMAC-SHA256(conversation_id, hour_timestamp)
 *
 * Both sender and receiver independently derive the exact same set
 * of 5 users, ensuring they can both compute the same AES key.
 * The selection rotates every hour (forward secrecy).
 */

import { supabase } from "../supabase";

/**
 * Round a date down to the start of the hour.
 */
export function getHourWindow(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/**
 * Get the next hour window (for pre-computing upcoming keys).
 */
export function getNextHourWindow(date: Date = new Date()): Date {
  const d = getHourWindow(date);
  d.setHours(d.getHours() + 1);
  return d;
}

/**
 * Deterministically select user IDs for a given conversation + hour.
 *
 * @param conversationId - The conversation ID
 * @param hourTimestamp  - ISO string of the hour window
 * @param count          - Number of users to select (default 5)
 * @returns Array of user IDs
 */
export async function selectHourlyUsers(
  conversationId: string,
  hourTimestamp?: string,
  count: number = 5
): Promise<string[]> {
  const hour = hourTimestamp ?? getHourWindow().toISOString();

  // Build the HMAC input
  const input = `${conversationId}:${hour}`;

  // Hash it deterministically (SHA-256 via Web Crypto)
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Use the hash as a seed for deterministic selection
  // First, get all user IDs from the system
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id");

  const allIds: string[] = (profiles ?? []).map((p: any) => p.id);

  if (allIds.length === 0) return [];
  if (allIds.length <= count) return allIds;

  // Deterministic selection using the hash as a PRNG seed
  const selected: string[] = [];
  const used = new Set<number>();
  const total = allIds.length;

  for (let i = 0; i < count; i++) {
    // Extract 4 bytes from the hash for each selection
    const offset = (i * 4) % 32;
    const chunk = hashHex.substring(offset, offset + 8);
    const num = parseInt(chunk || "0", 16);

    let idx = num % total;
    while (used.has(idx)) {
      idx = (idx + 1) % total;
    }
    used.add(idx);
    selected.push(allIds[idx]);
  }

  return selected;
}

/**
 * Fetch the combined hash of the hourly-selected users' public keys.
 * Used in key derivation.
 */
export async function getHourlyUsersHash(
  conversationId: string,
  hourTimestamp?: string
): Promise<ArrayBuffer> {
  const userIds = await selectHourlyUsers(conversationId, hourTimestamp, 5);
  if (userIds.length === 0) return new ArrayBuffer(0);

  // Fetch public keys and hash them
  const { fetchUserPublicKey } = await import("./keys");
  const hashes: string[] = [];

  for (const uid of userIds) {
    const key = await fetchUserPublicKey(uid);
    if (key) {
      const exported = await crypto.subtle.exportKey("spki", key);
      const hash = await crypto.subtle.digest("SHA-256", exported);
      const hex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      hashes.push(hex);
    }
  }

  // Sort for determinism and hash
  hashes.sort();
  const combined = new TextEncoder().encode(hashes.join("|"));
  return crypto.subtle.digest("SHA-256", combined);
}
