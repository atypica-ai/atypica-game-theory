import { decryptText, encryptText } from "./cipher";

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

    // Check if token has expired
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    // Validate payload structure
    if (
      typeof payload.userId !== "number" ||
      typeof payload.timestamp !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    return payload;
  } catch (error) {
    // Decryption failed or invalid JSON
    return null;
  }
}

/**
 * Generate a complete impersonation login URL
 * @param userId - The user ID to generate URL for
 * @param baseUrl - The base URL of the application (e.g., "https://example.com")
 * @param expiryHours - How many hours the token should be valid (default: 24)
 * @returns The complete impersonation login URL
 */
export function generateImpersonationLoginUrl(
  userId: number,
  baseUrl: string,
  expiryHours: number = 24,
): string {
  const token = generateImpersonationLoginToken(userId, expiryHours);
  return `${baseUrl}/auth/impersonation-login?token=${encodeURIComponent(token)}`;
}
