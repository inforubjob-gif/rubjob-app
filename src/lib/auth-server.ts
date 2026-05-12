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

    const db = getRequestContext().env.DB;
    if (!db) return null;

    const rubber = await db.prepare(
      "SELECT id, name FROM rubber_users WHERE id = ?"
    ).bind(token).first() as { id: string; name: string } | null;

    return rubber;
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
