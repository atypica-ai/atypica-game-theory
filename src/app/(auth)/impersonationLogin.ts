import { decryptText, encryptText } from "@/lib/cipher";

export interface ImpersonationLoginPayload {
  userId: number;
  timestamp: number;
  expiresAt: number;
}

/**
 * Generate a impersonation login token for a user
 * @param userId - The user ID to generate token for
 * @param expiryHours - How many hours the token should be valid (default: 24)
 * @returns The encrypted token string
 */
export function generateImpersonationLoginToken(userId: number, expiryHours: number = 24): string {
  const now = Date.now();
  const expiresAt = now + expiryHours * 60 * 60 * 1000; // Convert hours to milliseconds

  const payload: ImpersonationLoginPayload = {
    userId,
    timestamp: now,
    expiresAt,
  };

  return encryptText(JSON.stringify(payload));
}

/**
 * Verify and decode a impersonation login token
 * @param token - The encrypted token to verify
 * @returns The decoded payload if valid, null if invalid or expired
 */
export function verifyImpersonationLoginToken(token: string): ImpersonationLoginPayload | null {
  try {
    const decryptedText = decryptText(token);
    const payload: ImpersonationLoginPayload = JSON.parse(decryptedText);

    // Validate payload structure
    if (
      typeof payload.userId !== "number" ||
      typeof payload.timestamp !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    // Check if token has expired
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch (error) {
    console.log(error);
    // Decryption failed or invalid JSON
    return null;
  }
}

/**
 * Generate a complete impersonation login URL
 * @param userId - The user ID to generate URL for
 * @param siteOrigin - The site origin URL (e.g., "https://example.com")
 * @param expiryHours - How many hours the token should be valid (default: 24)
 * @param callbackUrl - Optional URL to redirect to after successful login (default: "/")
 * @returns The complete impersonation login URL
 */
export function generateImpersonationLoginUrl(
  userId: number,
  siteOrigin: string,
  expiryHours: number = 24,
  callbackUrl?: string,
): string {
  const token = generateImpersonationLoginToken(userId, expiryHours);
  const url = new URL(`${siteOrigin}/auth/impersonation-login`);
  url.searchParams.set("token", token);
  if (callbackUrl) {
    url.searchParams.set("callbackUrl", callbackUrl);
  }
  return url.toString();
}
