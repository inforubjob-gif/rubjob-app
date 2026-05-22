/**
 * Server-side helper to create in-app notifications for users.
 * Import this from any API route to push a notification.
 */

export interface CreateNotificationParams {
  userId: string;
  userType: "rubber" | "store" | "customer";
  type: "support_reply" | "earning" | "withdrawal" | "order_update" | "system" | "cash_advance" | "cash_advance_settled";
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(db: any, params: CreateNotificationParams) {
  const { userId, userType, type, title, message, link } = params;
  const id = `NTF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  // Self-healing: ensure table exists
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userType TEXT DEFAULT 'rubber',
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        isRead INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (e) {}

  await db.prepare(`
    INSERT INTO notifications (id, userId, userType, type, title, message, link)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, userId, userType, type, title, message, link || null).run();

  return id;
}
