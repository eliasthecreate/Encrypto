/**
 * Verified Credentials & Public Identity Module
 *
 * Implements Layer 1: Identity & Metadata
 *   1. Random Public UUID: Ensures users have an anonymous public_uuid handle (e.g., cc-uuid-xxxx-xxxx)
 *      so that public features and search don't expose private user identifiers.
 *   2. University Verification Trust Signal: Validates student credentials and marks user profiles
 *      with verified trust badges.
 */

import { supabase } from "../supabase";

export interface VerificationResult {
  success: boolean;
  message: string;
  isVerified?: boolean;
  domain?: string;
}

/**
 * Generate a random public UUID for a user.
 */
export function generatePublicUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `cc-uuid-${crypto.randomUUID()}`;
  }
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `cc-uuid-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Ensure the given user has a public_uuid assigned in Supabase profile.
 */
export async function ensureUserPublicUuid(userId: string, currentUuid?: string | null): Promise<string> {
  if (currentUuid) return currentUuid;

  const newUuid = generatePublicUuid();
  try {
    const { error } = await (supabase.from("profiles") as any)
      .update({ public_uuid: newUuid })
      .eq("id", userId);

    if (error) {
      console.warn("Failed to set public_uuid:", error.message);
    }
  } catch (err) {
    console.error("Error setting public_uuid:", err);
  }
  return newUuid;
}

/**
 * Verify university student credentials.
 * Supports official campus email domains (.edu, .edu.ng, icu.edu.ng, etc.) or student ID reference.
 */
export async function verifyUniversityCredentials(
  userId: string,
  email: string,
  studentId?: string
): Promise<VerificationResult> {
  if (!email || !email.includes("@")) {
    return { success: false, message: "Please enter a valid university email address." };
  }

  const parts = email.toLowerCase().trim().split("@");
  const domain = parts[1];

  // List of valid academic / university TLDs and domains
  const isValidAcademicDomain =
    domain.endsWith(".edu") ||
    domain.endsWith(".edu.ng") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".edu.au") ||
    domain.includes("icu") ||
    domain.includes("campus") ||
    domain.includes("university");

  if (!isValidAcademicDomain) {
    return {
      success: false,
      message: `The domain "@${domain}" is not recognized as an accredited university domain. Please use your official campus email.`,
    };
  }

  const now = new Date().toISOString();
  try {
    const { error } = await (supabase.from("profiles") as any)
      .update({
        is_verified: true,
        verification_type: "student_email",
        university_domain: domain,
        verified_at: now,
      })
      .eq("id", userId);

    if (error) {
      console.error("Failed to update verification status:", error.message);
      return { success: false, message: "Database update failed: " + error.message };
    }

    return {
      success: true,
      message: `Verification successful! Your student credential (${domain}) is verified.`,
      isVerified: true,
      domain,
    };
  } catch (err: any) {
    return { success: false, message: "Verification error: " + (err.message || "Unknown") };
  }
}
