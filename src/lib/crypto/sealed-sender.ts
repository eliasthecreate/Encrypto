/**
 * Sealed Sender Engine
 *
 * Implements Layer 1: Identity & Metadata Protection
 *
 * Sealed Sender hides the sender's identity from the server when delivering messages.
 * The server only sees:
 *   - recipient_id ("Deliver to V")
 *   - sender_id = "sealed_sender" (masked on network / server table)
 *   - content = SEALED_V1::<AES-256-GCM encrypted envelope>
 *
 * Inside the encrypted envelope, the recipient decrypts:
 *   - True sender_id
 *   - Sender's public_uuid
 *   - Message content (plaintext)
 *   - Sender timestamp
 */

import { encryptMessage, decryptMessage, isEncrypted } from "./index";
import { getCurrentUserId, supabase } from "../supabase";
import { ensureUserPublicUuid } from "./credentials";

export interface SealedSenderEnvelope {
  version: "1.0";
  sender_id: string;
  sender_uuid: string;
  recipient_id: string;
  plaintext: string;
  timestamp: number;
  sender_proof?: string;
}

export interface DecryptedSealedMessage {
  sender_id: string;
  sender_uuid: string;
  plaintext: string;
  timestamp: number;
  isSealed: boolean;
}

const SEALED_PREFIX = "SEALED_V1::";

/**
 * Encrypt a message using Sealed Sender protocol.
 * The inner envelope contains the true sender_id and sender_uuid.
 * The output payload is encrypted via AES-256-GCM using the Argon2id session key.
 */
export async function encryptSealedSenderMessage(
  conversationId: string,
  recipientId: string,
  plaintext: string
): Promise<{ sealedPayload: string; senderUuid: string }> {
  const senderId = await getCurrentUserId();
  if (!senderId) {
    throw new Error("Cannot send sealed message: User not authenticated");
  }

  // Get sender profile to embed public_uuid
  let senderUuid = "";
  try {
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("public_uuid")
      .eq("id", senderId)
      .maybeSingle();

    senderUuid = await ensureUserPublicUuid(senderId, profile?.public_uuid);
  } catch (e) {
    senderUuid = `cc-uuid-${senderId.slice(0, 8)}`;
  }

  const envelope: SealedSenderEnvelope = {
    version: "1.0",
    sender_id: senderId,
    sender_uuid: senderUuid,
    recipient_id: recipientId,
    plaintext,
    timestamp: Date.now(),
  };

  const jsonEnvelope = JSON.stringify(envelope);

  // Encrypt the inner envelope using session key (derived from shadow/live fragments)
  const encryptedEnvelope = await encryptMessage(conversationId, recipientId, jsonEnvelope);

  // Prefix payload with SEALED_V1 indicator
  return {
    sealedPayload: `${SEALED_PREFIX}${encryptedEnvelope}`,
    senderUuid,
  };
}

/**
 * Decrypt a message received from conversation, returning the unmasked sender identity and plaintext.
 */
export async function decryptSealedSenderMessage(
  conversationId: string,
  rawContent: string,
  fallbackSenderId: string
): Promise<DecryptedSealedMessage> {
  if (!rawContent) {
    return {
      sender_id: fallbackSenderId,
      sender_uuid: "",
      plaintext: "",
      timestamp: Date.now(),
      isSealed: false,
    };
  }

  // Check if content is sealed format
  if (rawContent.startsWith(SEALED_PREFIX)) {
    const encryptedBody = rawContent.slice(SEALED_PREFIX.length);
    try {
      const decryptedEnvelopeJson = await decryptMessage(conversationId, fallbackSenderId, encryptedBody);
      const envelope: SealedSenderEnvelope = JSON.parse(decryptedEnvelopeJson);

      if (envelope && envelope.sender_id && envelope.plaintext !== undefined) {
        return {
          sender_id: envelope.sender_id,
          sender_uuid: envelope.sender_uuid || "",
          plaintext: envelope.plaintext,
          timestamp: envelope.timestamp || Date.now(),
          isSealed: true,
        };
      }
    } catch (err) {
      console.warn("Failed to unpack sealed sender envelope, falling back to legacy decrypt:", err);
    }
  }

  // Fallback for non-sealed or legacy messages
  let plaintext = rawContent;
  if (isEncrypted(rawContent)) {
    plaintext = await decryptMessage(conversationId, fallbackSenderId, rawContent);
  }

  return {
    sender_id: fallbackSenderId,
    sender_uuid: "",
    plaintext,
    timestamp: Date.now(),
    isSealed: false,
  };
}
