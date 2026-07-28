/**
 * Key Derivation Module
 *
 * Combines all key sources into a deterministic AES-GCM 256-bit key:
 *
 *   AES Key = SHA-256(
 *     recipientPublicKeyHash +
 *     shadowFriendsHash +
 *     hourlyUsersHash +
 *     hourTimestamp +
 *     conversationId
 *   )
 *
 * Both parties derive the EXACT same key because all inputs
 * are deterministically available to both sender and receiver.
 */

import { getHourWindow } from "./selector";

export interface DerivationInputs {
  /** SHA-256 hash of the recipient's exported public key (SPKI) */
  recipientPublicKeyHash: ArrayBuffer;
  /** SHA-256 hash of all shadow friends' combined public keys */
  shadowFriendsHash: ArrayBuffer;
  /** SHA-256 hash of hourly-selected users' combined public keys */
  hourlyUsersHash: ArrayBuffer;
  /** The conversation ID */
  conversationId: string;
  /** Optional: override the hour timestamp (for testing) */
  hourTimestamp?: string;
}

/**
 * Derive an AES-GCM 256-bit key from all contributing sources.
 *
 * This is deterministic: given the same inputs, the same key is derived.
 * Uses HKDF-expand style derivation.
 */
export async function deriveAESKey(inputs: DerivationInputs): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const hour = inputs.hourTimestamp ?? getHourWindow().toISOString();

  // Concatenate all inputs into a single buffer
  const parts: Uint8Array[] = [
    new Uint8Array(inputs.recipientPublicKeyHash),
    new Uint8Array(inputs.shadowFriendsHash),
    new Uint8Array(inputs.hourlyUsersHash),
    encoder.encode(`:conv:${inputs.conversationId}:hour:${hour}`),
  ];

  // Calculate total length
  const totalLen = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.byteLength;
  }

  // Hash the combined material
  const derivedKeyMaterial = await crypto.subtle.digest("SHA-256", combined as any);

  // Import as AES-GCM 256 key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    derivedKeyMaterial,
    { name: "AES-GCM" },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );

  return aesKey;
}

/**
 * Generate a random 96-bit IV for AES-GCM encryption.
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt plaintext using AES-GCM with the derived key.
 *
 * @param aesKey - The derived AES-GCM key
 * @param plaintext - The message to encrypt
 * @returns Base64-encoded ciphertext (IV + ciphertext concatenated)
 */
export async function encryptWithKey(
  aesKey: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = generateIV();
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    aesKey,
    encoded as any
  );

  // Combine IV + ciphertext into a single base64 string
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);

  // Convert to base64
  let binary = "";
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypt ciphertext using AES-GCM with the derived key.
 *
 * @param aesKey - The derived AES-GCM key
 * @param ciphertext - Base64-encoded ciphertext (IV + ciphertext)
 * @returns Decrypted plaintext string
 */
export async function decryptWithKey(
  aesKey: CryptoKey,
  ciphertext: string
): Promise<string> {
  // Decode from base64
  const binary = atob(ciphertext);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  // Extract IV (first 12 bytes) and actual ciphertext
  const iv = new Uint8Array(combined.buffer, 0, 12);
  const encryptedData = new Uint8Array(combined.buffer, 12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    aesKey,
    encryptedData as any
  );

  return new TextDecoder().decode(decrypted);
}
