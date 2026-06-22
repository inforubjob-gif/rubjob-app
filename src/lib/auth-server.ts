import { cookies } from "next/headers";
import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * Verify admin session by checking cookie value against admin_users table
 * Cookie stores the admin's email
 */
export async function getAdminSession(): Promise<{ id: string; email: string; role: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return null;

    const db = getRequestContext().env.DB;
    if (!db) return null;

    const admin = await db.prepare(
      "SELECT id, email, role, name FROM admin_users WHERE email = ?"
    ).bind(token).first() as { id: string; email: string; role: string; name: string } | null;

    return admin;
  } catch {
    return null;
  }
}

/**
 * Verify store session by checking cookie value against stores table
 * Cookie stores the store's ID
 */
export async function getStoreSession(): Promise<{ id: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("store_token")?.value;
    if (!token) return null;

    const db = getRequestContext().env.DB;
    if (!db) return null;

    const store = await db.prepare(
      "SELECT id, name FROM stores WHERE id = ? AND isActive = 1"
    ).bind(token).first() as { id: string; name: string } | null;

    return store;
  } catch {
    return null;
  }
}

/**
 * Verify rubber session by checking cookie value against rubber_users table
 * Cookie stores the rubber's ID
 */
export async function getRubberSession(): Promise<{ id: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rubber_token")?.value;
    if (!token) return null;

    // Parse "id:sessionToken" format (login sets cookie as "RUB-XXX:hash8")
    // Also supports legacy plain-id cookies for backward compatibility
    const colonIndex = token.lastIndexOf(":");
    const rubberId = colonIndex !== -1 ? token.substring(0, colonIndex) : token;
    const sessionToken = colonIndex !== -1 ? token.substring(colonIndex + 1) : null;

    const db = getRequestContext().env.DB;
    if (!db) return null;

    const rubber = await db.prepare(
      "SELECT id, name, password FROM rubber_users WHERE id = ?"
    ).bind(rubberId).first() as { id: string; name: string; password: string } | null;

    if (!rubber) return null;

    // Verify session token against last 8 chars of password hash
    // This ensures sessions are invalidated when password changes
    if (sessionToken && rubber.password) {
      const expectedToken = String(rubber.password).slice(-8);
      if (sessionToken !== expectedToken) return null;
    }

    return { id: rubber.id, name: rubber.name };
  } catch {
    return null;
  }
}

/**
 * Verify provider session by checking cookie value against provider_users table
 * Cookie stores the provider's ID
 */
export async function getProviderSession(): Promise<{ id: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("provider_token")?.value;
    if (!token) return null;

    const db = getRequestContext().env.DB;
    if (!db) return null;

    const provider = await db.prepare(
      "SELECT id, name FROM provider_users WHERE id = ?"
    ).bind(token).first() as { id: string; name: string } | null;

    return provider;
  } catch {
    return null;
  }
}
