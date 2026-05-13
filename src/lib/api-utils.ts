/**
 * API Error Sanitization Utility
 * 
 * Prevents internal error details (SQL errors, stack traces) from
 * being exposed to clients through API responses.
 */

/**
 * Extracts a safe, user-facing error message from an unknown error.
 * Strips SQLITE/D1/internal details to prevent information leakage.
 */
export function safeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    // Don't expose SQL/database internals
    if (
      msg.includes("SQLITE") ||
      msg.includes("D1") ||
      msg.includes("UNIQUE constraint") ||
      msg.includes("FOREIGN KEY") ||
      msg.includes("no such table") ||
      msg.includes("no such column")
    ) {
      return "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง";
    }
    return msg;
  }
  return "เกิดข้อผิดพลาดที่ไม่คาดคิด";
}
