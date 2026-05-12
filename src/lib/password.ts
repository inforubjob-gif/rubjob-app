import bcrypt from "bcryptjs";

/**
 * Hash a plaintext password using bcrypt (10 rounds)
 * Safe for Cloudflare Edge Runtime (pure JS implementation)
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Compare a plaintext password against a bcrypt hash
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Check if a stored password is already a bcrypt hash
 * Bcrypt hashes always start with $2a$ or $2b$
 */
export function isBcryptHash(value: string): boolean {
  return /^\$2[ab]\$\d{2}\$/.test(value);
}
