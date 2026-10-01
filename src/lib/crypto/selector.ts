/**
 * Hourly User Selector (§6.1)
 *
 * Deterministically picks 5 users from the whole platform based on:
 *   seed = SHA-256("{conversationId}:{hourISO}")
 *
 * Sender and receiver independently derive the exact same set, so both can
 * compute the same AES key. The selection rotates every hour, which is what
 * gives the scheme its forward secrecy.
 */

import { supabase } from "../supabase";
import { fetchUserPublicKeyHash } from "./keys";
import { sha256, toHex } from "./derive";

export const HOURLY_USER_COUNT = 5;

/**
 * Round a date down to the start of the hour, in UTC.
 *
 * Deliberately UTC and not local: the window has to be identical for two
 * devices in different timezones, otherwise the same wall-clock hour maps to
 * two different ISO instants and the derived keys diverge.
 */
export function getHourWindow(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

/** ISO string of the current hour window — the `hourISO` used in derivation. */
export function getHourIso(date: Date = new Date()): string {
  return getHourWindow(date).toISOString();
}

/**
 * Deterministically select user IDs for a given conversation + hour.
 */
export async function selectHourlyUsers(
  conversationId: string,
  hourTimestamp?: string,
  count: number = HOURLY_USER_COUNT
): Promise<string[]> {
  const hour = hourTimestamp ?? getHourIso();

  const seedHex = toHex(await sha256(`${conversationId}:${hour}`));

  const { data: profiles } = await supabase.from("profiles").select("id").order("id");
  const allIds: string[] = (profiles ?? []).map((p: any) => p.id as string).filter(Boolean);

  if (allIds.length === 0) return [];
  if (allIds.length <= count) return allIds;

  const selected: string[] = [];
  const used = new Set<number>();
  const total = allIds.length;

  for (let i = 0; i < count; i++) {
    // 4 bytes of the seed per pick, wrapped around the 32-byte digest
    const offset = (i * 8) % 64;
    const chunk = seedHex.substring(offset, offset + 8);
    let idx = parseInt(chunk || "0", 16) % total;

    let guard = 0;
    while (used.has(idx) && guard < total) {
      idx = (idx + 1) % total;
      guard++;
    }
    if (used.has(idx)) continue;

    used.add(idx);
    selected.push(allIds[idx]);
  }

  return selected;
}

/**
 * §6.2 ingredient 3 — SHA-256 over the sorted, combined public-key hashes of the
 * hourly-selected users. Always 32 bytes, even on an empty platform.
 */
export async function getHourlyUsersHash(
  conversationId: string,
  hourTimestamp?: string
): Promise<Uint8Array> {
  const userIds = await selectHourlyUsers(conversationId, hourTimestamp, HOURLY_USER_COUNT);

  const hashes: string[] = [];
  for (const uid of userIds) {
    const publicKeyHash = await fetchUserPublicKeyHash(uid);
    if (publicKeyHash) hashes.push(publicKeyHash);
  }

  hashes.sort();
  return sha256(hashes.join("|"));
}