import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random token for public investigation URLs.
 * Uses 24 bytes = 48 hex chars. Non-guessable, non-sequential.
 */
export function generatePublicToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Generate a short random ID for display purposes
 */
export function generateShortId(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Hash an IP address for privacy-preserving storage
 */
export async function hashIP(ip: string): Promise<string> {
  const { createHash } = await import('crypto');
  return createHash('sha256')
    .update(ip + (process.env.JWT_SECRET || 'salt'))
    .digest('hex')
    .substring(0, 16);
}
