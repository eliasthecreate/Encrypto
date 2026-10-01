/**
 * Key Derivation Module
 *
 * Conversation key derivation (§6.2):
 *
 *   AES-256 key = import(SHA-256(
 *        recipientPubKeyHash   (32 B)
 *      ‖ shadowFriendsHash     (32 B)   <- 10 shadows, sorted, re-hashed
 *      ‖ hourlyUsersHash       (32 B)   <- 5 users for this conversation + hour
 *      ‖ ":conv:{id}:hour:{hourISO}"
 *   ))
 *
 * Sender and receiver recompute the identical input tuple, so both arrive at
 * the same AES-256 key without ever exchanging it. The key is imported
 * non-extractable: it can encrypt/decrypt but can never be read back out.
 */

export interface ConversationKeyInputs {
  /** SHA-256 of the peer's RSA-OAEP public key (SPKI). */
  peerPublicKeyHash: Uint8Array;
  /** SHA-256 of the peer's shadow-friends public-key hash set. */
  peerShadowFriendsHash: Uint8Array;
  /** SHA-256 of the hourly-selected users' public-key hash set. */
  hourlyUsersHash: Uint8Array;
  conversationId: string;
  /** ISO string of the hour window (UTC-floored). */
  hourIso: string;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

/** SHA-256 of a UTF-8 string. */
export async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return new Uint8Array(digest);
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

/**
 * Derive the AES-256-GCM conversation key from the four input ingredients.
 */
export async function deriveConversationKey(
  inputs: ConversationKeyInputs
): Promise<CryptoKey> {
  const context = new TextEncoder().encode(
    `:conv:${inputs.conversationId}:hour:${inputs.hourIso}`
  );

  const material = concatBytes([
    inputs.peerPublicKeyHash,
    inputs.peerShadowFriendsHash,
    inputs.hourlyUsersHash,
    context,
  ]);

  const digest = await crypto.subtle.digest("SHA-256", material as any);

  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plaintext with the derived conversation key.
 *
 * Returns base64 of IV(12) ‖ ciphertext ‖ auth tag(16).
 */
export async function encryptWithDerivedKey(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    encoded as any
  );

  return toHexlessBase64(concatBytes([iv, new Uint8Array(sealed)]));
}

/**
 * Decrypt a payload produced by encryptWithDerivedKey.
 */
export async function decryptWithDerivedKey(
  key: CryptoKey,
  payload: string
): Promise<string> {
  const combined = base64ToBytes(payload);
  const iv = combined.slice(0, 12);
  const body = combined.slice(12);

  const opened = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    body as any
  );

  return new TextDecoder().decode(opened);
}

// ─── base64 helpers ─────────────────────────────────────────────

function toHexlessBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}