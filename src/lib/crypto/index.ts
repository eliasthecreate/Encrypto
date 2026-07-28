/**
 * Crypto Module — Public API
 *
 * Usage:
 *   import { initializeUserCrypto, encryptMessage, decryptMessage } from "./crypto";
 *
 *   await initializeUserCrypto(userId); // called on sign-up
 *   const cipher = await encryptMessage(convId, recipientId, "Hello!");
 *   const plain = await decryptMessage(convId, senderId, cipher);
 */

import {
  generateKeyPair,
  uploadPublicKey,
  fetchUserPublicKey,
  getOwnPrivateKey,
} from "./keys";
import { assignShadowFriends, getShadowFriendsHash } from "./shadows";
import { getHourlyUsersHash } from "./selector";
import {
  deriveAESKey,
  encryptWithKey,
  decryptWithKey,
  type DerivationInputs,
} from "./derive";

/**
 * Initialize a user's crypto material.
 * Should be called once right after sign-up:
 *   1. Generate RSA key pair
 *   2. Upload public key to Supabase
 *   3. Assign 10 shadow friends
 */
export async function initializeUserCrypto(userId: string): Promise<void> {
  try {
    // 1. Generate key pair
    const { publicKeyPem } = await generateKeyPair(userId);

    // 2. Upload public key
    await uploadPublicKey(userId, publicKeyPem);

    // 3. Assign shadow friends
    await assignShadowFriends(userId);
  } catch (err) {
    console.error("Failed to initialize user crypto:", err);
    // Don't throw — the app should still work without encryption
  }
}

/**
 * Encrypt a message for a specific conversation/recipient.
 *
 * Derives an AES key from:
 *   - Recipient's public key hash
 *   - Sender's shadow friends' public key hashes
 *   - Hourly-selected users' public key hashes
 *   - Hour timestamp
 *   - Conversation ID
 *
 * @returns Base64-encoded ciphertext, or the original plaintext
 *          if encryption fails (graceful fallback).
 */
export async function encryptMessage(
  conversationId: string,
  recipientId: string,
  plaintext: string,
  hourTimestamp?: string
): Promise<string> {
  try {
    // 1. Get recipient's public key hash
    const recipientKey = await fetchUserPublicKey(recipientId);
    if (!recipientKey) {
      console.warn("Cannot encrypt: recipient has no public key");
      return plaintext; // Fallback to plaintext
    }
    const exportedRecipient = await crypto.subtle.exportKey("spki", recipientKey);
    const recipientPublicKeyHash = await crypto.subtle.digest("SHA-256", exportedRecipient);

    // 2. Get shadow friends hash (from OUR shadow friends)
    const { getCurrentUserId } = await import("../supabase");
    const myId = await getCurrentUserId();
    if (!myId) return plaintext;

    const shadowFriendsHash = await getShadowFriendsHash(myId);

    // 3. Get hourly users hash
    const hourlyUsersHash = await getHourlyUsersHash(conversationId, hourTimestamp);

    // 4. Derive the AES key
    const inputs: DerivationInputs = {
      recipientPublicKeyHash,
      shadowFriendsHash,
      hourlyUsersHash,
      conversationId,
      hourTimestamp,
    };

    const aesKey = await deriveAESKey(inputs);

    // 5. Encrypt
    return await encryptWithKey(aesKey, plaintext);
  } catch (err) {
    console.error("Encryption failed:", err);
    return plaintext; // Graceful fallback
  }
}

/**
 * Decrypt a message received in a conversation.
 *
 * Derives the same AES key (deterministically) and decrypts.
 *
 * @returns Decrypted plaintext, or the original ciphertext
 *          if decryption fails (handles unencrypted messages).
 */
export async function decryptMessage(
  conversationId: string,
  senderId: string,
  ciphertext: string
): Promise<string> {
  // If it doesn't look like base64-encoded encrypted data, it's plaintext
  if (!ciphertext || ciphertext.length < 20) {
    return ciphertext;
  }

  try {
    // 1. Get sender's public key hash
    const senderKey = await fetchUserPublicKey(senderId);
    if (!senderKey) return ciphertext;

    const exportedSender = await crypto.subtle.exportKey("spki", senderKey);
    const senderPublicKeyHash = await crypto.subtle.digest("SHA-256", exportedSender);

    // 2. Get shadow friends hash
    const { getCurrentUserId } = await import("../supabase");
    const myId = await getCurrentUserId();
    if (!myId) return ciphertext;

    const shadowFriendsHash = await getShadowFriendsHash(myId);

    // 3. Get hourly users hash
    const hourlyUsersHash = await getHourlyUsersHash(conversationId);

    // 4. Derive the same AES key
    const inputs: DerivationInputs = {
      recipientPublicKeyHash: senderPublicKeyHash,
      shadowFriendsHash,
      hourlyUsersHash,
      conversationId,
    };

    const aesKey = await deriveAESKey(inputs);

    // 5. Try to decrypt
    return await decryptWithKey(aesKey, ciphertext);
  } catch (err) {
    // If decryption fails, it might be an unencrypted message
    return ciphertext;
  }
}

/**
 * Check if a string looks like encrypted ciphertext.
 */
export function isEncrypted(text: string): boolean {
  return text.length >= 20 && /^[A-Za-z0-9+/=]+$/.test(text);
}
