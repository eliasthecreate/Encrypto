/**
 * Crypto System — public API (§6)
 *
 *   1. Identity        one RSA-OAEP 2048 / SHA-256 pair per user (§6.1)
 *   2. Shadow friends  10 deterministic users per account, permanent (§6.1)
 *   3. Hourly selector 5 deterministic users per conversation + hour (§6.1)
 *   4. Derivation      AES-256 = import(SHA-256(peerPubKeyHash ‖ shadows ‖
 *                      hourlyUsersHash ‖ ":conv:{id}:hour:{hourISO}")) (§6.2)
 *   5. Envelope        AES-256-GCM, base64(IV(12) ‖ ciphertext ‖ tag) (§6.3)
 */

import { generateKeyPair, uploadPublicKey, fetchUserPublicKeyHash } from "./keys";
import {
  assignShadowFriends,
  getShadowFriendsHashHex,
  SHADOW_FRIEND_COUNT,
  MISSING_KEY_PLACEHOLDER,
} from "./shadows";
import { getHourlyUsersHash, getHourIso, getHourWindow, selectHourlyUsers } from "./selector";
import {
  deriveConversationKey,
  encryptWithDerivedKey,
  decryptWithDerivedKey,
  sha256,
  toHex,
  fromHex,
} from "./derive";
import { getCurrentUserId, supabase } from "../supabase";
import { ensureUserPublicUuid, generatePublicUuid, verifyUniversityCredentials } from "./credentials";
import { encryptSealedSenderMessage, decryptSealedSenderMessage } from "./sealed-sender";

/**
 * Ingredients 1 and 2 for the "other side" of a conversation.
 *
 * For a 1:1 chat this is exactly the peer's public-key hash and the peer's
 * shadow-friends hash. For a group it is the SHA-256 over every other
 * participant's corresponding hashes, which both sides compute identically
 * because each excludes only themselves.
 */
export interface PeerKeyMaterial {
  publicKeyHash: Uint8Array;
  shadowFriendsHash: Uint8Array;
}

async function resolvePeerKeyMaterial(
  conversationId: string,
  fallbackPeerId?: string | null
): Promise<PeerKeyMaterial | null> {
  const myId = await getCurrentUserId();
  if (!myId) return null;

  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);

  let peers: string[] = (parts ?? [])
    .map((row: any) => row.user_id as string)
    .filter((id) => id && id !== myId);

  if (peers.length === 0 && fallbackPeerId && fallbackPeerId !== myId) {
    peers = [fallbackPeerId];
  }
  if (peers.length === 0) return null;

  peers.sort();

  const publicKeyHashes: string[] = [];
  const shadowHashes: string[] = [];

  for (const peer of peers) {
    const publicKeyHash = await fetchUserPublicKeyHash(peer);
    // No identity key on the other side → caller falls back to plaintext (§6.4)
    if (!publicKeyHash) return null;
    publicKeyHashes.push(publicKeyHash);
    shadowHashes.push(await getShadowFriendsHashHex(peer));
  }

  if (peers.length === 1) {
    return {
      publicKeyHash: fromHex(publicKeyHashes[0]),
      shadowFriendsHash: fromHex(shadowHashes[0]),
    };
  }

  publicKeyHashes.sort();
  shadowHashes.sort();

  return {
    publicKeyHash: await sha256(publicKeyHashes.join("|")),
    shadowFriendsHash: await sha256(shadowHashes.join("|")),
  };
}

async function deriveConversationKeyFor(
  conversationId: string,
  fallbackPeerId?: string | null
): Promise<CryptoKey | null> {
  const peer = await resolvePeerKeyMaterial(conversationId, fallbackPeerId);
  if (!peer) return null;

  // Resolve the hour once: two calls could straddle an hour boundary and
  // derive a key the other side can never reproduce.
  const hourIso = getHourIso();
  const hourlyUsersHash = await getHourlyUsersHash(conversationId, hourIso);

  return deriveConversationKey({
    peerPublicKeyHash: peer.publicKeyHash,
    peerShadowFriendsHash: peer.shadowFriendsHash,
    hourlyUsersHash,
    conversationId,
    hourIso,
  });
}

/**
 * Initialise crypto material for a user (sign-up / first login).
 * Failures are logged and swallowed — the app still works, unencrypted.
 */
export async function initializeUserCrypto(userId: string): Promise<void> {
  try {
    // 1. RSA-OAEP 2048 identity pair (private key stays in IndexedDB)
    const { publicKeyPem } = await generateKeyPair(userId);
    await uploadPublicKey(userId, publicKeyPem);

    // 2. Permanent shadow-friends assignment
    await assignShadowFriends(userId);

    // 3. Public identity handle
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("public_uuid")
      .eq("id", userId)
      .maybeSingle();

    await ensureUserPublicUuid(userId, profile?.public_uuid);
  } catch (err) {
    console.error("Failed to initialize user crypto:", err);
  }
}

/**
 * Called when a friend request is accepted.
 *
 * There is nothing to rotate: shadow friends are permanent and the hourly
 * selector is conversation-scoped, so accepting a friendship changes no key
 * ingredient. Kept so the friend flow can stay explicit.
 */
export async function onFriendConfirmed(userId: string, friendId: string): Promise<void> {
  try {
    await assignShadowFriends(userId);
    await assignShadowFriends(friendId);
  } catch (err) {
    console.error("Failed to assign shadow friends on friend confirmation:", err);
  }
}

/**
 * Called when a friendship is removed.
 *
 * Deliberately a no-op: shadow friends are permanent ingredients and are never
 * returned to the pool (§6.1). Removing a friend does not change any key.
 */
export async function onFriendRemoved(_userId: string, _friendId: string): Promise<void> {}

/**
 * Encrypt a message for the other side of a conversation.
 */
export async function encryptMessage(
  conversationId: string,
  recipientId: string,
  plaintext: string
): Promise<string> {
  try {
    if (!(await getCurrentUserId())) return plaintext;

    const key = await deriveConversationKeyFor(conversationId, recipientId);
    if (!key) return plaintext;

    return await encryptWithDerivedKey(key, plaintext);
  } catch (err) {
    console.error("Encryption error:", err);
    return plaintext; // §6.4 known weakness: silent plaintext fallback
  }
}

/**
 * Decrypt a message received in a conversation.
 */
export async function decryptMessage(
  conversationId: string,
  senderId: string,
  ciphertext: string
): Promise<string> {
  if (!ciphertext || !isEncrypted(ciphertext)) {
    return ciphertext; // legacy / never-encrypted message
  }

  try {
    if (!(await getCurrentUserId())) return ciphertext;

    const key = await deriveConversationKeyFor(conversationId, senderId);
    if (!key) return ciphertext;

    return await decryptWithDerivedKey(key, ciphertext);
  } catch (err) {
    console.error("Decryption error:", err);
    return ciphertext;
  }
}

/**
 * Heuristic for "this looks like a base64 AES-GCM payload".
 * Anything shorter than a real envelope is treated as plaintext.
 */
export function isEncrypted(text: string): boolean {
  return text.length >= 20 && /^[A-Za-z0-9+/=]+$/.test(text);
}

export {
  assignShadowFriends,
  getHourlyUsersHash,
  getHourIso,
  getHourWindow,
  selectHourlyUsers,
  SHADOW_FRIEND_COUNT,
  MISSING_KEY_PLACEHOLDER,
  ensureUserPublicUuid,
  generatePublicUuid,
  verifyUniversityCredentials,
  encryptSealedSenderMessage,
  decryptSealedSenderMessage,
  toHex,
};