import { D1Database } from "@cloudflare/workers-types";

/**
 * Simple rate limiting using D1 for login endpoints.
 * Tracks failed login attempts per IP or key within a sliding window.
 *
 * For production, consider Cloudflare WAF Rate Limiting Rules instead.
 * Example: limit login endpoints to 5 requests per 15 minutes per IP.
 */

/**
 * Check if a key (IP address or email) has exceeded the rate limit.
 * @returns true if the request is ALLOWED, false if rate-limited
 */
export async function checkRateLimit(
  db: D1Database,
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const count = await db.prepare(
      "SELECT COUNT(*) as c FROM login_attempts WHERE ip_key = ? AND created_at > ?"
    ).bind(key, cutoff).first() as { c: number } | null;
    return (count?.c || 0) < maxAttempts;
  } catch {
    // If table doesn't exist yet, allow the request
    return true;
  }
}

/**
 * Record a failed login attempt for rate limiting.
 */
export async function recordLoginAttempt(
  db: D1Database,
  key: string
): Promise<void> {
  try {
    await db.prepare(
      "INSERT INTO login_attempts (id, ip_key, created_at) VALUES (?, ?, ?)"
    ).bind(
      `${key}-${Date.now()}`,
      key,
      new Date().toISOString()
    ).run();
  } catch {
    // Silently fail — rate limiting is best-effort
  }
}

/**
 * Clean up old login attempts (call periodically or from cron).
 */
export async function cleanupLoginAttempts(
  db: D1Database,
  olderThanMs: number = 60 * 60 * 1000 // 1 hour
): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - olderThanMs).toISOString();
    await db.prepare(
      "DELETE FROM login_attempts WHERE created_at < ?"
    ).bind(cutoff).run();
  } catch {
    // Silently fail
  }
}
